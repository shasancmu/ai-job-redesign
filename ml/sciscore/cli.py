"""sciscore CLI:  train | score | serve

  sciscore train --task ml/tasks/defense_impact.yaml --data defense.csv --out models/defense_impact
  sciscore score --model models/defense_impact --text "an abstract..."
  sciscore serve --models-dir models --port 8000
"""
from __future__ import annotations
import argparse
import json
import os
import sys


def main(argv=None):
    argv = argv if argv is not None else sys.argv[1:]
    p = argparse.ArgumentParser(prog="sciscore")
    sub = p.add_subparsers(dest="cmd", required=True)

    t = sub.add_parser("train", help="train a task from a labeled CSV/Parquet")
    t.add_argument("--task", required=True, help="path to the task YAML")
    t.add_argument("--data", required=True, help="CSV/Parquet with text + label columns")
    t.add_argument("--out", required=True, help="output model directory")

    s = sub.add_parser("score", help="score text with a trained model")
    s.add_argument("--model", required=True, help="trained model directory")
    s.add_argument("--text", required=True)

    v = sub.add_parser("serve", help="run the inference API")
    v.add_argument("--models-dir", default="models")
    v.add_argument("--host", default="0.0.0.0")
    v.add_argument("--port", type=int, default=8000)

    args = p.parse_args(argv)

    if args.cmd == "train":
        from .data import load_rows
        from .tasks import load_task
        from .train import train_task

        task = load_task(args.task)
        texts, labels = load_rows(args.data, task)
        print(f"Training '{task.name}' ({task.kind}) on {len(texts)} rows via {task.encoder}…", file=sys.stderr)
        meta = train_task(task, texts, labels, args.out)
        print(json.dumps(meta, indent=2))

    elif args.cmd == "score":
        from .infer import Predictor

        print(json.dumps(Predictor(args.model).score([args.text])[0], indent=2))

    elif args.cmd == "serve":
        import uvicorn

        os.environ["SCISCORE_MODEL_DIR"] = args.models_dir
        uvicorn.run("sciscore.server:app", host=args.host, port=args.port)


if __name__ == "__main__":
    main()
