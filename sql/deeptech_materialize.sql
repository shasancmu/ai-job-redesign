-- ============================================================================
-- Deep-tech track: slim, clustered materialized tables.
--
-- WHY: BigQuery bills by bytes scanned. The raw lake (openalex.works ~250M fat
-- rows) is a landmine. These jobs run OFFLINE (monthly is plenty; deep-tech data
-- moves slowly) and read the CURATED tables to produce a handful of small,
-- clustered tables. Every per-request module query then hits only these -> a few
-- MB scanned -> effectively free (well inside BigQuery's 1 TiB/month free tier).
--
-- We deliberately AVOID openalex.works: scientifiq_prod.pubs is already the
-- scored subset with authorships/orgs/fields/doi, and RoS carries the patent
-- citations. The one feature that needs raw works (paper->paper forward
-- citations) is the least important and is dropped.
--
-- DESTINATION: the com-sci-2 service account is read-only, so write these into a
-- dataset YOUR account controls. Replace `DEST` below (e.g. your own GCP project
-- `my-proj.superadditive`). Or export the slim tables into Supabase/Postgres and
-- serve the hot path from there for literally $0 per request.
--
-- ID NOTES to verify once against the data:
--   * scientifiq_prod uses OpenAlex ids for researchers (res_id ~ 'A...') and
--     institutions (org ids ~ 'I...' / OpenAlex institution id). Confirm the
--     res_orgs id format matches openalex.institutions.id; if not, bridge via
--     derived_crosswalks.
--   * RoS `patent` is like 'US-7557385' / 'US-2012206294'; patentsview.patent_id
--     is the bare number '7557385'. Join on the normalized numeric part.
-- ============================================================================

-- Set once per run (BigQuery script variables).
DECLARE min_year INT64 DEFAULT 2018;

-- ----------------------------------------------------------------------------
-- 1) researcher_geo  ->  this IS the entire Nearest Expert backend.
--    Researcher + score + primary institution geo (city, lat/long).
--    Small enough to also live in Postgres with a GIST index on (lat,lng).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE TABLE `DEST.researcher_geo`
CLUSTER BY main_field, country AS
SELECT
  r.res_id,
  r.res_name                              AS name,
  r.res_compot                            AS compot,
  r.res_scipot                            AS scipot,
  r.res_mainfields[SAFE_OFFSET(0)]        AS main_field,
  r.res_subfields_string                  AS subfields,
  r.res_top10_keywords_string             AS keywords,
  r.res_orgs[SAFE_OFFSET(0)]              AS org_id,
  i.display_name                          AS org_name,
  i.geo.city                              AS city,
  i.geo.region                            AS region,
  COALESCE(i.geo.country, r.res_countries[SAFE_OFFSET(0)]) AS country,
  i.geo.latitude                          AS lat,
  i.geo.longitude                         AS lng,
  r.res_current_assignee[SAFE_OFFSET(0)]  AS current_company,
  r.res_total_pubs                        AS pubs,
  r.res_last_publication_year             AS last_year
FROM `com-sci-2.scientifiq_prod.researchers` r
LEFT JOIN `com-sci-2.openalex.institutions` i
  ON i.id = r.res_orgs[SAFE_OFFSET(0)]   -- verify id format / bridge via crosswalk if needed
WHERE r.res_compot IS NOT NULL
  AND r.res_total_pubs >= 3
  AND r.res_last_publication_year >= min_year;

-- ----------------------------------------------------------------------------
-- 2) radar_paper_scores  ->  "the science you cite", scored.
--    Given a set of cited DOIs, return scores + researchers + orgs + field.
--    Clustered by doi so an IN-list lookup scans almost nothing.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE TABLE `DEST.radar_paper_scores`
CLUSTER BY doi AS
SELECT
  LOWER(p.pub_doi)          AS doi,
  p.pub_title               AS title,
  p.pub_year                AS year,
  p.pub_main_field          AS main_field,
  p.pub_subfields_string    AS subfields,
  p.pub_compot              AS compot,
  p.pub_scipot              AS scipot,
  p.pub_pat_paper_cites     AS patent_cites,
  p.pub_keywords_string     AS keywords,
  p.pub_researcher_ids      AS researcher_ids,
  p.pub_org_ids             AS org_ids,
  p.pub_countries           AS countries
FROM `com-sci-2.scientifiq_prod.pubs` p
WHERE p.pub_doi IS NOT NULL
  AND p.pub_compot IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3) frontier_by_subfield  ->  Science Radar's whitespace panel, precomputed.
--    Top-N highest commercial-potential researchers per SUBFIELD (sharper than
--    main field). At request time: filter to the company's subfields, drop the
--    orgs it already cites -> the labs it has no tie to.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE TABLE `DEST.frontier_by_subfield`
CLUSTER BY subfield AS
WITH ranked AS (
  SELECT
    sf                                    AS subfield,
    r.res_id, r.res_name AS name, r.res_compot AS compot,
    r.res_orgs[SAFE_OFFSET(0)]            AS org_id,
    r.res_top10_keywords_string           AS keywords,
    r.res_countries[SAFE_OFFSET(0)]       AS country,
    ROW_NUMBER() OVER (PARTITION BY sf ORDER BY r.res_compot DESC) AS rk
  FROM `com-sci-2.scientifiq_prod.researchers` r,
       UNNEST(r.res_subfields) AS sf
  WHERE r.res_compot IS NOT NULL
    AND r.res_last_publication_year >= min_year
)
SELECT * EXCEPT(rk) FROM ranked WHERE rk <= 300;

-- ----------------------------------------------------------------------------
-- 4) assignee_patents  ->  company -> its patents (clean, no flaky API filter).
--    Clustered by assignee_norm so "Samsung" scans only its block.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE TABLE `DEST.assignee_patents`
CLUSTER BY assignee_norm AS
SELECT
  LOWER(a.organization)     AS assignee_norm,
  a.organization            AS assignee_name,
  pa.patent_id              AS patent_num,          -- bare number, e.g. '7557385'
  CONCAT('US-', pa.patent_id) AS ros_patent         -- RoS join key for US patents
FROM `com-sci-2.patentsview.patent_assignee` pa
JOIN `com-sci-2.patentsview.assignee` a ON a.id = pa.assignee_id
WHERE a.organization IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 5) patent_cited_papers  ->  slim RoS, clustered by patent (patent -> cited).
--    Keep a second copy clustered by doi for the "who else cites this" reverse.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE TABLE `DEST.patent_cited_papers`
CLUSTER BY patent AS
SELECT patent, LOWER(doi) AS doi, magid
FROM `com-sci-2.misc.ros_pat_paper_cites_2023_05_29`
WHERE doi IS NOT NULL AND wherefound IN ('frontonly','both');

CREATE OR REPLACE TABLE `DEST.paper_cited_by_patents`
CLUSTER BY doi AS
SELECT LOWER(doi) AS doi, patent, MIN(filing_year) AS filing_year
FROM `com-sci-2.misc.ros_pat_paper_cites_2023_05_29`
WHERE doi IS NOT NULL AND wherefound IN ('frontonly','both')
GROUP BY doi, patent;


-- ============================================================================
-- PER-REQUEST QUERIES (each hits only slim clustered tables; pass a tight
-- maxBytesBilled, e.g. 300 MB, from bqQuery). Cache the whole report by input.
-- ============================================================================

-- Science Radar, patent-rich firm (e.g. Samsung) --------------------------------
-- a) the company's cited science, scored:
--   WITH pats AS (SELECT ros_patent FROM DEST.assignee_patents WHERE assignee_norm=@co)
--   , cited AS (SELECT DISTINCT doi FROM DEST.patent_cited_papers
--               WHERE patent IN (SELECT ros_patent FROM pats))
--   SELECT s.* FROM DEST.radar_paper_scores s JOIN cited c USING(doi);
-- b) competitors on the same science:
--   SELECT p.patent, a.assignee_name, COUNT(*) shared
--   FROM DEST.paper_cited_by_patents p JOIN DEST.assignee_patents a ON a.ros_patent=p.patent
--   WHERE p.doi IN (SELECT doi FROM cited) AND a.assignee_norm!=@co
--   GROUP BY 1,2 ORDER BY shared DESC;
-- c) whitespace: top frontier researchers in the company's subfields, minus orgs
--    it already cites:
--   SELECT f.* FROM DEST.frontier_by_subfield f
--   WHERE f.subfield IN UNNEST(@companySubfields)
--     AND f.org_id NOT IN UNNEST(@orgsAlreadyCited)
--   ORDER BY f.compot DESC LIMIT 25;

-- Nearest Expert / SME problem mode (e.g. Surat ice-cream machines) --------------
-- 1) Scientifiq API semantic search(problem statement) -> candidate res_ids
--    (the API does the matching; nothing scanned in BQ).
-- 2) rank them by distance to the user's geocoded (lat,lng), then ladder them:
--   SELECT g.*, ST_DISTANCE(ST_GEOGPOINT(g.lng,g.lat), ST_GEOGPOINT(@userLng,@userLat))/1000 AS km
--   FROM DEST.researcher_geo g
--   WHERE g.res_id IN UNNEST(@candidateIds)
--   ORDER BY km;                       -- nearest = local; global = top compot ignoring km
-- (If researcher_geo lives in Postgres/PostGIS, this runs there for $0.)
