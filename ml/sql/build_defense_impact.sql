-- Build the defense_impact training set directly in BigQuery (project com-sci-2).
-- Output columns: abstract, defense_cited (1/0). ~$0.30, ~47 GB scanned.
--
-- Label = the paper is cited by a patent assigned to a defense entity, the direct
-- analog of the commercial-potential DV (cited by a RENEWED patent). Sources:
--   patentsview.assignee / patent_assignee   patent -> assignee organization
--   misc.ros_pat_paper_cites_2023_05_29       paper DOI -> citing patent (Reliance on Science)
--   scientifiq_prod.pubs                      abstracts, keyed by pub_doi (a doi.org URL)
--
-- Join keys (verified live): ros.patent_id_short is "US-<number>" (kind code stripped);
-- patentsview.patent_id is the bare number. ros.doi is a bare uppercase DOI;
-- pubs.pub_doi is a full https://doi.org/<doi> URL.
--
-- Run:  node bq_run.mjs --sql-file build_defense_impact.sql --out defense.csv
WITH defense_assignees AS (
  SELECT id FROM `com-sci-2.patentsview.assignee`
  WHERE REGEXP_CONTAINS(LOWER(organization),
    r'lockheed|raytheon|northrop|grumman|general dynamics|bae systems|l3 ?harris|l-3 communications|leidos|\bsaic\b|science applications international|draper laborator|\bmitre\b|aerospace corporation|textron|huntington ingalls|sandia|los alamos|livermore|applied physics laborator|\bdarpa\b|naval research|air force research|army research|missile defense|threat reduction|\biarpa\b|department of the (navy|army|air force)|department of defense|national security agency')
),
defense_patents AS (
  SELECT DISTINCT pa.patent_id
  FROM `com-sci-2.patentsview.patent_assignee` pa
  JOIN defense_assignees da ON pa.assignee_id = da.id
),
defense_dois AS (
  SELECT DISTINCT LOWER(r.doi) AS doi
  FROM `com-sci-2.misc.ros_pat_paper_cites_2023_05_29` r
  JOIN defense_patents dp
    ON REGEXP_REPLACE(r.patent_id_short, r'^[A-Z]{2}-', '') = dp.patent_id
  WHERE r.doi IS NOT NULL AND r.patent_id_short LIKE 'US-%'
),
labeled AS (
  SELECT p.pub_abstract AS abstract,
         IF(d.doi IS NOT NULL, 1, 0) AS defense_cited
  FROM `com-sci-2.scientifiq_prod.pubs` p
  LEFT JOIN defense_dois d
    ON LOWER(REGEXP_REPLACE(p.pub_doi, r'^https?://(dx\.)?doi\.org/', '')) = d.doi
  WHERE p.pub_abstract IS NOT NULL AND LENGTH(p.pub_abstract) >= 120
    AND p.pub_year >= 2000
)
-- Balanced 10k: simulations say ~10k frozen-embedding rows is sufficient.
(SELECT abstract, defense_cited FROM labeled WHERE defense_cited = 1 ORDER BY RAND() LIMIT 5000)
UNION ALL
(SELECT abstract, defense_cited FROM labeled WHERE defense_cited = 0 ORDER BY RAND() LIMIT 5000)
