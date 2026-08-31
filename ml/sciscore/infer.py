"""Load a trained task and score raw text. Embed with the same encoder used in
training, run the head, return {score, stars}. One forward pass — no uncertainty."""
from __future__ import annotations
import json
import os
from typing import List

from .encoders import Encoder


class Predictor:
    def __init__(self, model_dir: str):
        import joblib

        with open(os.path.join(model_dir, "meta.json")) as f:
            self.meta = json.load(f)
        self.kind = self.meta.get("kind", "binary")
        self.model = joblib.load(os.path.join(model_dir, "head.joblib"))
        self.encoder = Encoder(self.meta["encoder"], max_length=self.meta.get("max_length", 256))

    def _stars(self, s: float) -> int:
        # both heads output a 0-1 score, so stars map the same way
        return max(1, min(5, int(round(s * 5))))

    def score(self, texts: List[str]) -> List[dict]:
        X = self.encoder.embed(texts)
        if self.kind == "binary":
            preds = self.model.predict_proba(X)[:, 1]
        else:
            # Ridge is unbounded; clamp regression scores to [0,1] so a "score" is
            # always a valid 0-1 potential (never 1.14).
            preds = self.model.predict(X)
        out = []
        for p in preds:
            s = float(p)
            if self.kind != "binary":
                s = min(1.0, max(0.0, s))
            out.append({"score": s, "stars": self._stars(s)})
        return out
