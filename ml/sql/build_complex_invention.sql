-- Complex-Invention training set (BigQuery, project com-sci-2). ~$0.29, ~47 GB.
-- Output: abstract, complex_cited (1/0).
-- Label = the paper is cited by a patent whose CPC classification spans >=3
-- distinct sections — a genuinely multi-domain ("complex") invention. Only ~7%
-- of patents qualify, so the label is discriminative.
--   node bq_run.mjs --sql-file build_complex_invention.sql --out complex.csv
WITH complex_patents AS (
  SELECT patent_id FROM `com-sci-2.patentsview.cpc`
  GROUP BY patent_id HAVING COUNT(DISTINCT section_id) >= 3
),
complex_dois AS (
  SELECT DISTINCT LOWER(r.doi) AS doi
  FROM `com-sci-2.misc.ros_pat_paper_cites_2023_05_29` r
  JOIN complex_patents cp ON REGEXP_REPLACE(r.patent_id_short, r'^[A-Z]{2}-','') = cp.patent_id
  WHERE r.doi IS NOT NULL AND r.patent_id_short LIKE 'US-%'
),
labeled AS (
  SELECT p.pub_abstract AS abstract, IF(d.doi IS NOT NULL,1,0) AS complex_cited
  FROM `com-sci-2.scientifiq_prod.pubs` p
  LEFT JOIN complex_dois d ON LOWER(REGEXP_REPLACE(p.pub_doi, r'^https?://(dx\.)?doi\.org/','')) = d.doi
  WHERE p.pub_abstract IS NOT NULL AND LENGTH(p.pub_abstract) >= 120 AND p.pub_year >= 2000
)
(SELECT abstract, complex_cited FROM labeled WHERE complex_cited=1 ORDER BY RAND() LIMIT 5000)
UNION ALL
(SELECT abstract, complex_cited FROM labeled WHERE complex_cited=0 ORDER BY RAND() LIMIT 5000)
