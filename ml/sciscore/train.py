"""Train one task: embed the text with the task's encoder, fit a lightweight head
on the frozen vectors, save. No MC-dropout, no calibration — just the estimator.
A linear head on frozen SciBERT embeddings trains in seconds on ~10k rows and is
what the simulations found sufficient."""
from __future__ import annotations
import json
import os
from typing import List

import numpy as np

from .encoders import Encoder
from .tasks import Task


def train_task(task: Task, texts: List[str], labels: List[float], out_dir: str, val_frac: float = 0.15) -> dict:
    import joblib
    from sklearn.model_selection import train_test_split

    os.makedirs(out_dir, exist_ok=True)
    enc = Encoder(task.encoder, max_length=task.max_length)
    X = enc.embed(texts)
    y = np.asarray(labels, dtype=np.float32)

    stratify = (y > 0.5) if task.kind == "binary" else None
    Xtr, Xva, ytr, yva = train_test_split(X, y, test_size=val_frac, random_state=42, stratify=stratify)

    metric = {}
    if task.kind == "binary":
        from sklearn.linear_model import LogisticRegression
        from sklearn.metrics import average_precision_score, roc_auc_score

        model = LogisticRegression(max_iter=2000, class_weight="balanced", C=task.C)
        model.fit(Xtr, (ytr > 0.5).astype(int))
        pva = model.predict_proba(Xva)[:, 1]
        try:
            metric = {"val_auroc": float(roc_auc_score((yva > 0.5).astype(int), pva)),
                      "val_auprc": float(average_precision_score((yva > 0.5).astype(int), pva))}
        except ValueError:
            metric = {}
    else:
        from sklearn.linear_model import Ridge
        from sklearn.metrics import r2_score

        model = Ridge(alpha=1.0 / max(task.C, 1e-6))
        model.fit(Xtr, ytr)
        metric = {"val_r2": float(r2_score(yva, model.predict(Xva)))}

    joblib.dump(model, os.path.join(out_dir, "head.joblib"))
    meta = {
        "task": task.name, "kind": task.kind, "encoder": task.encoder,
        "max_length": task.max_length, "dim": enc.dim,
        "n_train": int(len(Xtr)), "n_val": int(len(Xva)),
        "description": task.description, **metric,
    }
    with open(os.path.join(out_dir, "meta.json"), "w") as f:
        json.dump(meta, f, indent=2)
    return meta
