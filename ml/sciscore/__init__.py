"""sciscore — a modular text -> target estimator on frozen BERT/SciBERT embeddings.

A task is (encoder, target kind, labeled data). Embed the text once with a frozen
transformer, fit a lightweight head on the vectors, serve it behind one API.
Add a task by adding a YAML file. defense_impact is the first one.
"""
from .tasks import Task, load_task
from .encoders import Encoder, ENCODERS

__all__ = ["Task", "load_task", "Encoder", "ENCODERS"]
__version__ = "0.1.0"
