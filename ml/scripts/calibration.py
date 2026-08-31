"""Calibration / reliability for the trained sciscore models.

Re-embeds each dataset, reproduces the exact 85/15 split (seed 42), predicts on
the held-out 15% with the saved head, then bins predicted probability vs the
empirical positive rate. Reports a reliability table, Brier score, and ECE.

  PYTHONPATH=. .venv/bin/python scripts/calibration.py
"""
from __future__ import annotations
import json
import sys

import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, brier_score_loss

from sciscore.encoders import Encoder
from sciscore.tasks import load_task
from sciscore.data import load_rows

TASKS = [
    ("tasks/defense_impact.yaml", "defense.csv", "models/defense_impact", "Defense"),
    ("tasks/complex_invention.yaml", "complex.csv", "models/complex_invention", "Complex"),
    ("tasks/interdisciplinary.yaml", "interdisc.csv", "models/interdisciplinary", "Interdisc"),
]
BINS = 10


def calibrate(task_yaml, csv, model_dir):
    task = load_task(task_yaml)
    texts, labels = load_rows(csv, task)
    X = Encoder(task.encoder).embed(texts)
    y = np.array([1 if l > 0.5 else 0 for l in labels])
    _, Xva, _, yva = train_test_split(X, y, test_size=0.15, random_state=42, stratify=y)
    model = joblib.load(f"{model_dir}/head.joblib")
    p = model.predict_proba(Xva)[:, 1]

    edges = np.linspace(0, 1, BINS + 1)
    bins, ece = [], 0.0
    for i in range(BINS):
        m = (p >= edges[i]) & (p <= edges[i + 1]) if i == BINS - 1 else (p >= edges[i]) & (p < edges[i + 1])
        if m.sum() == 0:
            continue
        mp, er, n = float(p[m].mean()), float(yva[m].mean()), int(m.sum())
        bins.append({"lo": round(edges[i], 2), "mean_pred": round(mp, 3), "emp_rate": round(er, 3), "n": n})
        ece += (n / len(yva)) * abs(mp - er)
    return {
        "auroc": round(float(roc_auc_score(yva, p)), 3),
        "brier": round(float(brier_score_loss(yva, p)), 3),
        "ece": round(float(ece), 3),
        "n_val": int(len(yva)),
        "bins": bins,
    }


out = {}
for task_yaml, csv, model_dir, name in TASKS:
    print(f"calibrating {name}…", file=sys.stderr)
    out[name] = calibrate(task_yaml, csv, model_dir)
print(json.dumps(out, indent=2))
