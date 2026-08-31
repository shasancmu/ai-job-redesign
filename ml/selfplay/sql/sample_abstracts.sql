-- Sample real abstracts as self-play roots for value-to-go data generation.
-- Run with the read-only BigQuery service account (same one used elsewhere):
--   bq query --use_legacy_sql=false --max_rows=2000 --format=csv \
--     < ml/selfplay/sql/sample_abstracts.sql > ml/selfplay/data/abstracts.csv
--
-- A broad, deterministic slice: papers with a substantive abstract, in stable
-- pseudo-random order (FARM_FINGERPRINT) so re-runs are reproducible. If your
-- pubs table names the year column differently, adjust or drop the pub_year line.
SELECT
  abstract
FROM `com-sci-2.scientifiq_prod.pubs`
WHERE abstract IS NOT NULL
  AND LENGTH(abstract) BETWEEN 300 AND 3500
  -- AND pub_year >= 2016            -- uncomment/adjust if the column exists
ORDER BY FARM_FINGERPRINT(abstract)
LIMIT 2000
