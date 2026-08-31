# sciscore — text → target on frozen BERT/SciBERT embeddings

A small, modular estimator framework. A **task** is `(encoder, target kind, labeled data)`.
Embed the text once with a frozen transformer (SciBERT by default), fit a lightweight
head on the vectors, and serve every task behind one API. Add a task by adding a YAML
file — no code. `defense_impact` is the first task; the same machinery does interdisciplinary
impact, complex-invention impact, or any text→label/score you can label.

Design choices (deliberately lean): **frozen** embeddings + a linear head, **no**
MC-dropout, **no** calibration. At ~10k labeled rows this is fast, cheap, and — per the
simulations — sufficient. Everything is swappable if you want more later.

## Layout

```
sciscore/
  encoders.py   frozen BERT/SciBERT/PubMedBERT embeddings (mean-pooled)   ← the one heavy dep
  tasks.py      Task spec + YAML loader
  data.py       CSV/Parquet -> (texts, labels), stratified sample to N
  train.py      embed -> fit head (LogisticRegression / Ridge) -> save
  infer.py      load -> score raw text
  server.py     FastAPI /score, /tasks, /health
  cli.py        train | score | serve
tasks/          one YAML per task (defense_impact.yaml)
scripts/        build_defense_dataset.py — build the labeled CSV from Scientifiq/RoS exports
```

## Install

```bash
cd ml
pip install -e .            # or: pip install -r requirements.txt
```

## 1. Build the defense_impact dataset (once)

Export two CSVs from the Scientifiq / Reliance-on-Science data the app already
queries (`papers.csv`: `id,doi,abstract`; `citing.csv`: `doi,assignee`), then:

```bash
python scripts/build_defense_dataset.py --papers papers.csv --citing citing.csv --out defense.csv
```

## 2. Train (≈10k rows)

```bash
sciscore train --task tasks/defense_impact.yaml --data defense.csv --out models/defense_impact
```

Prints validation AUROC/AUPRC. Trains in seconds once embeddings are computed
(embedding 10k abstracts is the only slow part; a GPU helps, CPU is fine).

## 3. Serve the API

```bash
export SCISCORE_API_KEY=$(openssl rand -hex 24)     # optional but recommended
sciscore serve --models-dir models --port 8000
```

```bash
curl -X POST localhost:8000/score \
  -H "Authorization: Bearer $SCISCORE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"task":"defense_impact","text":"<abstract>"}'
# -> { "task": "defense_impact", "score": 0.78, "stars": 4 }
```

Or containerized: `docker build -t sciscore ml && docker run -p 8000:8000 -v $PWD/models:/app/models sciscore`.

## 4. Point the app at it

Set in the Next.js app's env:

```
SCISCORE_URL=http://localhost:8000        # or your deployed service URL
SCISCORE_API_KEY=<same key as above>
```

The app's Defense Impact module and `/api/v1/defense-impact` then use the SciBERT
score for the number (falling back to the AI estimate if the service is down), and
keep the LLM only for the qualitative read (domains, pathways, verdict).

## Add another task

```yaml
# tasks/interdisciplinary_impact.yaml
name: interdisciplinary_impact
kind: binary
encoder: scibert
text_col: abstract
label_col: cross_field_cited   # 1 if cited from outside its primary field
sample_size: 10000
```

```bash
sciscore train --task tasks/interdisciplinary_impact.yaml --data interdisc.csv --out models/interdisciplinary_impact
```

It's live on the same server instantly.
