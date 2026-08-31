WITH defense_assignees AS (
  SELECT id FROM `com-sci-2.patentsview.assignee`
  WHERE REGEXP_CONTAINS(LOWER(organization), r'lockheed|raytheon|northrop|grumman|general dynamics|bae systems|l3 ?harris|l-3 communications|leidos|\bsaic\b|science applications international|draper laborator|\bmitre\b|aerospace corporation|textron|huntington ingalls|sandia|los alamos|livermore|applied physics laborator|\bdarpa\b|naval research|air force research|army research|missile defense|threat reduction|\biarpa\b|department of the (navy|army|air force)|department of defense|national security agency')),
defense_patents AS (SELECT DISTINCT pa.patent_id FROM `com-sci-2.patentsview.patent_assignee` pa JOIN defense_assignees da ON pa.assignee_id=da.id),
defense_dois AS (SELECT DISTINCT LOWER(r.doi) AS doi FROM `com-sci-2.misc.ros_pat_paper_cites_2023_05_29` r JOIN defense_patents dp ON REGEXP_REPLACE(r.patent_id_short,r'^[A-Z]{2}-','')=dp.patent_id WHERE r.doi IS NOT NULL AND r.patent_id_short LIKE 'US-%'),
complex_patents AS (SELECT patent_id FROM `com-sci-2.patentsview.cpc` GROUP BY patent_id HAVING COUNT(DISTINCT section_id)>=3),
complex_dois AS (SELECT DISTINCT LOWER(r.doi) AS doi FROM `com-sci-2.misc.ros_pat_paper_cites_2023_05_29` r JOIN complex_patents cp ON REGEXP_REPLACE(r.patent_id_short,r'^[A-Z]{2}-','')=cp.patent_id WHERE r.doi IS NOT NULL AND r.patent_id_short LIKE 'US-%'),
w AS (
  SELECT id, LOWER(REGEXP_REPLACE(doi, r'^https?://(dx\.)?doi\.org/','')) AS ndoi,
    (SELECT c.display_name FROM UNNEST(concepts) c WHERE c.level=0 ORDER BY c.score DESC LIMIT 1) AS field,
    referenced_works, cited_by_count,
    (SELECT inst.id FROM UNNEST(authorships) a, UNNEST(a.institutions) inst WHERE inst.id IS NOT NULL LIMIT 1) AS inst_id
  FROM `com-sci-2.openalex.works` WHERE doi IS NOT NULL),
edges AS (SELECT ref AS cited_id, w.field AS citer_field FROM w, UNNEST(w.referenced_works) ref WHERE w.field IS NOT NULL AND ARRAY_LENGTH(w.referenced_works)>0),
agg AS (SELECT e.cited_id, COUNT(*) n_citers, COUNTIF(e.citer_field != cw.field) n_out FROM edges e JOIN w cw ON e.cited_id=cw.id WHERE cw.field IS NOT NULL GROUP BY e.cited_id),
intd AS (SELECT cw.ndoi AS doi FROM agg a JOIN w cw ON a.cited_id=cw.id WHERE a.n_citers>=10 AND SAFE_DIVIDE(a.n_out,a.n_citers)>=0.5 AND cw.ndoi IS NOT NULL),
inst_size AS (SELECT id, NTILE(5) OVER (ORDER BY works_count) q FROM `com-sci-2.openalex.institutions` WHERE works_count>0),
labeled AS (
  SELECT s.q AS size_q,
    CASE WHEN w.cited_by_count=0 THEN 'a:0' WHEN w.cited_by_count<10 THEN 'b:1-9' ELSE 'c:10+' END AS cite_bucket,
    IF(dd.doi IS NOT NULL,1,0) is_def, IF(cd.doi IS NOT NULL,1,0) is_cplx, IF(i.doi IS NOT NULL,1,0) is_intd
  FROM w JOIN inst_size s ON w.inst_id=s.id
  LEFT JOIN defense_dois dd ON w.ndoi=dd.doi
  LEFT JOIN complex_dois cd ON w.ndoi=cd.doi
  LEFT JOIN intd i ON w.ndoi=i.doi)
SELECT size_q, cite_bucket, COUNT(*) papers,
  ROUND(100*AVG(is_def),4) def_pct, ROUND(100*AVG(is_cplx),4) cplx_pct, ROUND(100*AVG(is_intd),4) intd_pct
FROM labeled GROUP BY size_q, cite_bucket ORDER BY cite_bucket, size_q
