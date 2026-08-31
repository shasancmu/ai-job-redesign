"""A Task is the whole spec for one text->target model: which encoder, what kind
of target, and where the labels live. Add a task = add a YAML file; no code."""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Literal
import os


@dataclass
class Task:
    name: str
    kind: Literal["binary", "regression"] = "binary"
    encoder: str = "scibert"
    text_col: str = "text"
    label_col: str = "label"
    sample_size: int = 10000          # simulations say ~10k frozen-embedding rows is plenty
    max_length: int = 256
    description: str = ""
    C: float = 1.0                    # head regularization (LogisticRegression / Ridge)

    def stars(self, score: float) -> int:
        return max(1, min(5, int(round(score * 5)))) if self.kind == "binary" else max(1, min(5, int(round(score))))


def load_task(path: str) -> Task:
    """Load a Task from a YAML (or JSON) file."""
    import yaml  # PyYAML also parses JSON

    with open(path, "r") as f:
        data = yaml.safe_load(f) or {}
    known = {k: data[k] for k in Task.__dataclass_fields__ if k in data}
    if "name" not in known:
        known["name"] = os.path.splitext(os.path.basename(path))[0]
    return Task(**known)
