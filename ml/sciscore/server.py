"""The inference API. Serves every trained task under SCISCORE_MODEL_DIR.

  POST /score   { "task": "defense_impact", "text": "..." }   ->  { score, stars }
  POST /score   { "task": "...", "texts": ["...", ...] }      ->  { results: [...] }
  GET  /tasks   list available trained tasks
  GET  /health

Auth: if SCISCORE_API_KEY is set, require  Authorization: Bearer <key>.
Run:  sciscore serve --models-dir models --port 8000
"""
from __future__ import annotations
import os
from typing import Optional

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

from .infer import Predictor

MODEL_DIR = os.environ.get("SCISCORE_MODEL_DIR", "models")
API_KEY = os.environ.get("SCISCORE_API_KEY", "")

app = FastAPI(title="sciscore", version="1")
_cache: dict[str, Predictor] = {}


def _auth(authorization: Optional[str]):
    if not API_KEY:
        return
    token = (authorization or "").removeprefix("Bearer ").strip()
    if token != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")


def _predictor(task: str) -> Predictor:
    if task not in _cache:
        path = os.path.join(MODEL_DIR, task)
        if not os.path.isdir(path):
            raise HTTPException(status_code=404, detail=f"No trained model for task '{task}'")
        _cache[task] = Predictor(path)
    return _cache[task]


class ScoreIn(BaseModel):
    task: str
    text: Optional[str] = None
    texts: Optional[list[str]] = None


@app.get("/health")
def health():
    return {"ok": True, "model_dir": MODEL_DIR, "loaded": list(_cache)}


@app.get("/tasks")
def tasks():
    if not os.path.isdir(MODEL_DIR):
        return {"tasks": []}
    return {"tasks": [d for d in os.listdir(MODEL_DIR) if os.path.isdir(os.path.join(MODEL_DIR, d))]}


@app.post("/score")
def score(body: ScoreIn, authorization: Optional[str] = Header(default=None)):
    _auth(authorization)
    texts = body.texts if body.texts is not None else ([body.text] if body.text is not None else [])
    if not texts:
        raise HTTPException(status_code=400, detail="Provide 'text' or 'texts'.")
    results = _predictor(body.task).score(texts)
    if body.texts is None:
        return {"task": body.task, **results[0]}
    return {"task": body.task, "results": results}
