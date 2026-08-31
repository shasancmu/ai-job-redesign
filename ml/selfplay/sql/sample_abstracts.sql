-- Sample real abstracts as self-play roots for value-to-go data generation.
-- Run with the read-only BigQuery service account (same one used elsewhere):
--   bq --project_id=com-sci-2 query --use_legacy_sql=false --max_rows=2000 --format=csv \
--     < ml/selfplay/sql/sample_abstracts.sql > ml/selfplay/data/abstracts.csv
--
-- A broad, deterministic slice: papers with a substantive abstract, in stable
-- pseudo-random order (FARM_FINGERPRINT) so re-runs are reproducible.
SELECT
  pub_abstract AS abstract
FROM `com-sci-2.scientifiq_prod.pubs`
WHERE pub_abstract IS NOT NULL
  AND LENGTH(pub_abstract) BETWEEN 300 AND 3500
  AND pub_year >= 2016
ORDER BY FARM_FINGERPRINT(CAST(pub_id AS STRING))
LIMIT 2000
