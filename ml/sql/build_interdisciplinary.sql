-- Interdisciplinary training set (BigQuery, project com-sci-2). ~$1.22, ~196 GB.
-- Output: abstract, interdisciplinary (1/0).
-- Label = the paper is cited by works spanning >=3 distinct OpenAlex level-0
-- fields (with >=5 citing works) — i.e. its influence crosses disciplines rather
-- than staying inside its own. Built by exploding every work's referenced_works
-- tagged with the CITING work's primary field, then aggregating per cited paper.
--   node bq_run.mjs --sql-file build_interdisciplinary.sql --out interdisc.csv
--
-- Note: this is the weakest of the three models (val AUROC ~0.72) — cross-field
-- influence is diffuse. A sharper label (share of citers OUTSIDE the home field,
-- not a raw field count) is the obvious next refinement.
WITH wf AS (
  SELECT id,
    (SELECT c.display_name FROM UNNEST(concepts) c WHERE c.level=0 ORDER BY c.score DESC LIMIT 1) AS field,
    referenced_works
  FROM `com-sci-2.openalex.works`
  WHERE ARRAY_LENGTH(referenced_works) > 0
),
edges AS (
  SELECT ref AS cited_id, wf.field AS citer_field
  FROM wf, UNNEST(wf.referenced_works) AS ref
  WHERE wf.field IS NOT NULL
),
stats AS (
  SELECT cited_id, COUNT(DISTINCT citer_field) AS n_fields, COUNT(*) AS n_citers
  FROM edges GROUP BY cited_id
),
cited AS (
  SELECT w.doi AS doi_url, IF(s.n_fields >= 3 AND s.n_citers >= 5, 1, 0) AS interdisciplinary
  FROM stats s JOIN `com-sci-2.openalex.works` w ON w.id = s.cited_id
  WHERE w.doi IS NOT NULL
),
labeled AS (
  SELECT p.pub_abstract AS abstract, c.interdisciplinary
  FROM cited c JOIN `com-sci-2.scientifiq_prod.pubs` p
    ON LOWER(REGEXP_REPLACE(p.pub_doi, r'^https?://(dx\.)?doi\.org/','')) = LOWER(REGEXP_REPLACE(c.doi_url, r'^https?://(dx\.)?doi\.org/',''))
  WHERE p.pub_abstract IS NOT NULL AND LENGTH(p.pub_abstract) >= 120 AND p.pub_year >= 2000
)
(SELECT abstract, interdisciplinary FROM labeled WHERE interdisciplinary=1 ORDER BY RAND() LIMIT 5000)
UNION ALL
(SELECT abstract, interdisciplinary FROM labeled WHERE interdisciplinary=0 ORDER BY RAND() LIMIT 5000)
