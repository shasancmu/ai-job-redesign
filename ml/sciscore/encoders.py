"""Text -> vector encoders. Frozen BERT / SciBERT embeddings (mean-pooled).

The encoder is the ONE heavy dependency. Everything downstream (the head, the
API) operates on the vectors it produces, so swapping SciBERT for BERT, PubMedBERT,
or any HF encoder is a one-line config change per task.
"""
from __future__ import annotations
from typing import List
import numpy as np

# Friendly names -> HF model ids. Add your own; any HF encoder id works too.
ENCODERS = {
    "scibert": "allenai/scibert_scivocab_uncased",
    "bert": "bert-base-uncased",
    "pubmedbert": "microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract",
}


def pick_device() -> str:
    """CUDA if present, else Apple-Silicon GPU (MPS), else CPU."""
    import torch

    if torch.cuda.is_available():
        return "cuda"
    if getattr(torch.backends, "mps", None) is not None and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


class Encoder:
    """Mean-pooled contextual embeddings from a frozen transformer encoder."""

    def __init__(self, name: str = "scibert", device: str | None = None, max_length: int = 256):
        import torch
        from transformers import AutoModel, AutoTokenizer

        self.name = name
        self.model_id = ENCODERS.get(name, name)
        self.device = device or pick_device()
        self.max_length = max_length
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_id)
        self.model = AutoModel.from_pretrained(self.model_id).to(self.device).eval()
        self.dim = int(self.model.config.hidden_size)

    def embed(self, texts: List[str], batch_size: int = 64) -> np.ndarray:
        """Return an (N, dim) float32 matrix of mean-pooled embeddings."""
        import torch

        out: list[np.ndarray] = []
        for i in range(0, len(texts), batch_size):
            batch = [(t or "").strip() for t in texts[i : i + batch_size]]
            enc = self.tokenizer(
                batch, padding=True, truncation=True,
                max_length=self.max_length, return_tensors="pt",
            ).to(self.device)
            with torch.no_grad():
                hidden = self.model(**enc).last_hidden_state          # (B, T, H)
            mask = enc["attention_mask"].unsqueeze(-1).float()        # (B, T, 1)
            summed = (hidden * mask).sum(dim=1)                       # (B, H)
            counts = mask.sum(dim=1).clamp(min=1e-9)
            pooled = (summed / counts).cpu().numpy().astype(np.float32)
            out.append(pooled)
        return np.vstack(out) if out else np.zeros((0, self.dim), dtype=np.float32)
