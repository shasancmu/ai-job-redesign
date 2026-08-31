"""Where (text, label) rows come from. The default adapter is a CSV/Parquet file
with a text column and a label column — the trainer never needs to know how the
labels were built. For defense_impact, see scripts/build_dataset in the README:
positives = papers cited by a defense-assigned patent, negatives = matched sample.
"""
from __future__ import annotations
from typing import List, Tuple
import random

from .tasks import Task


def load_rows(path: str, task: Task) -> Tuple[List[str], List[float]]:
    """Read a CSV/Parquet, return (texts, labels), sampled to task.sample_size.
    For binary tasks the sample is stratified so both classes stay represented."""
    import pandas as pd

    df = pd.read_parquet(path) if path.endswith(".parquet") else pd.read_csv(path)
    if task.text_col not in df.columns or task.label_col not in df.columns:
        raise ValueError(f"Data must have columns '{task.text_col}' and '{task.label_col}'. Got {list(df.columns)}.")
    df = df[[task.text_col, task.label_col]].dropna()
    df = df[df[task.text_col].astype(str).str.len() >= 40]

    n = task.sample_size
    if n and len(df) > n:
        if task.kind == "binary":
            per = max(1, n // 2)
            pos = df[df[task.label_col] > 0.5]
            neg = df[df[task.label_col] <= 0.5]
            take = lambda d, k: d.sample(min(len(d), k), random_state=42)
            df = pd.concat([take(pos, per), take(neg, n - min(len(pos), per))]).sample(frac=1, random_state=42)
        else:
            df = df.sample(n, random_state=42)

    texts = df[task.text_col].astype(str).tolist()
    labels = df[task.label_col].astype(float).tolist()
    return texts, labels
