"""Self-play data generation for the AlphaZero-style value-to-go head.

The Impact Optimizer is a self-play engine: from an abstract, a proposer (LLM)
suggests scientific extensions, and the free scorer (Scientifiq / sciscore) rates
each. This script runs that game over many real abstracts and records, for every
state it visits, the realized VALUE-TO-GO — the best target score reachable from
that state onward (the Monte-Carlo return). Those (abstract, value_to_go) pairs are
the training set for the value head (ml/tasks/value_to_go_*.yaml).

Cost: the only spend is proposer tokens (use a cheap model — Haiku). Scoring is the
free oracle. One-time; the trained head is free forever.

Usage:
  # 1. get abstracts (any CSV/JSONL with an 'abstract' column/field), e.g. via bq:
  #    bq query --use_legacy_sql=false --format=csv < sql/sample_abstracts.sql > data/abstracts.csv
  # 2. set env (see README), then:
  python -m ml.selfplay.rollout --abstracts data/abstracts.csv --out data/valuetogo_commercial.csv \
      --target commercial --depth 3 --beam 3 --k 4 --limit 1500 --concurrency 8
  # cheap smoke test first:
  python -m ml.selfplay.rollout --abstracts data/abstracts.csv --out /tmp/vtg_test.csv --limit 3

Env (see selfplay/config.example.env):
  AI_API_KEY / ANTHROPIC_API_KEY   proposer key
  AI_BASE_URL                      default https://api.anthropic.com  (Anthropic native)
                                   or an OpenAI-compatible base ending in /v1
  PROPOSER_MODEL                   default claude-haiku-4-5-20251001
  SCIENTIFIQ_API_KEY               scorer key (for commercial/scientific/social)
  SCIENTIFIQ_BASE_URL              default https://api.scientifiq.ai/api/v1
  SCISCORE_URL / SCISCORE_API_KEY  only if --scorer sciscore (defense/complex/interdisciplinary)
"""
from __future__ import annotations

import argparse
import asyncio
import csv
import json
import os
import re
import sys
from dataclasses import dataclass, field
from typing import Optional

import httpx

# ---- config ---------------------------------------------------------------

TARGET_LABEL = {
    "commercial": "commercial potential (how likely industry is to build on this work)",
    "scientific": "scientific potential (how likely it is to attract academic citations)",
    "social": "social-impact potential",
    "defense": "defense / national-security relevance",
    "complex_invention": "complex-invention potential (feeding complex, multi-disciplinary technology)",
    "interdisciplinary": "interdisciplinary potential (influence beyond its own field)",
}
NATIVE = {"commercial", "scientific", "social"}  # scored by Scientifiq sandbox
SCISCORE_TASK = {"defense": "defense_impact", "complex_invention": "complex_invention", "interdisciplinary": "interdisciplinary"}
# local surrogate models (ml/tasks/*_local.yaml, trained on pub_compot/pub_scipot):
# a fast, free, in-process stand-in for the Scientifiq sandbox during bulk self-play.
LOCAL_TASK = {"commercial": "commercial_local", "scientific": "scientific_local", "social": "social_local"}


@dataclass
class Cfg:
    ai_key: str
    ai_base: str
    proposer_model: str
    sci_key: str
    sci_base: str
    sciscore_url: str
    sciscore_key: str
    target: str
    depth: int
    beam: int
    k: int
    scorer: str
    concurrency: int
    model_dir: str


def load_cfg(args) -> Cfg:
    ai_base = (os.environ.get("AI_BASE_URL") or "https://api.anthropic.com").rstrip("/")
    return Cfg(
        ai_key=os.environ.get("AI_API_KEY") or os.environ.get("ANTHROPIC_API_KEY") or "",
        ai_base=ai_base,
        proposer_model=os.environ.get("PROPOSER_MODEL") or "claude-haiku-4-5-20251001",
        sci_key=os.environ.get("SCIENTIFIQ_API_KEY") or "",
        sci_base=(os.environ.get("SCIENTIFIQ_BASE_URL") or "https://api.scientifiq.ai/api/v1").rstrip("/"),
        sciscore_url=(os.environ.get("SCISCORE_URL") or "").rstrip("/"),
        sciscore_key=os.environ.get("SCISCORE_API_KEY") or "",
        target=args.target,
        depth=args.depth,
        beam=args.beam,
        k=args.k,
        scorer=args.scorer,
        concurrency=args.concurrency,
        model_dir=args.model_dir,
    )


# ---- retry wrapper --------------------------------------------------------

async def _post(client: httpx.AsyncClient, url: str, headers: dict, payload: dict, tries: int = 4) -> Optional[dict]:
    delay = 1.5
    for attempt in range(tries):
        try:
            r = await client.post(url, headers=headers, json=payload, timeout=90)
            if r.status_code in (429, 500, 502, 503, 504):
                raise httpx.HTTPStatusError("retryable", request=r.request, response=r)
            r.raise_for_status()
            return r.json()
        except Exception as e:  # noqa: BLE001 — retry any transient failure
            if attempt == tries - 1:
                print(f"  ! request failed after {tries} tries: {e}", file=sys.stderr)
                return None
            await asyncio.sleep(delay)
            delay *= 2
    return None


# ---- scorer ---------------------------------------------------------------

# Global cap on concurrent scorer calls — the Scientifiq sandbox is an interactive
# (~3s) endpoint that 502s if you burst it. Set in main_async; decoupled from root
# concurrency so many roots can be in flight without flooding the scorer.
_score_sem: Optional[asyncio.Semaphore] = None


async def score(client: httpx.AsyncClient, cfg: Cfg, abstract: str) -> float:
    if _score_sem is not None:
        async with _score_sem:
            return await _score(client, cfg, abstract)
    return await _score(client, cfg, abstract)


# in-process local surrogate predictors (loaded once per task)
_predictors: dict = {}


def _local_task(target: str) -> str:
    return LOCAL_TASK.get(target) or SCISCORE_TASK.get(target, target)


def _get_predictor(task: str, model_dir: str):
    if task not in _predictors:
        import os as _os
        from ml.sciscore.infer import Predictor
        path = _os.path.join(model_dir, task)
        if not _os.path.isdir(path):
            raise SystemExit(f"No local model at {path}. Train it first (see ml/selfplay/README.md).")
        _predictors[task] = Predictor(path)
    return _predictors[task]


async def score_many(client: httpx.AsyncClient, cfg: Cfg, abstracts: list[str]) -> list[float]:
    """Score a batch. Local: one batched SciBERT forward pass off the event loop
    (fast, free). Remote: individual throttled calls."""
    if not abstracts:
        return []
    if cfg.scorer == "local":
        task = _local_task(cfg.target)
        pred = _get_predictor(task, cfg.model_dir)

        # Synchronous batched forward pass. torch inference off the main thread
        # segfaults on macOS, so we score inline; a batch is fast (~100ms) and the
        # brief block is fine since scoring, not the event loop, is the bottleneck.
        valid = [(i, a) for i, a in enumerate(abstracts) if len(a.strip()) >= 40]
        out = [-1.0] * len(abstracts)
        if not valid:
            return out
        try:
            res = pred.score([a[:5000] for _, a in valid])
            for (i, _), r in zip(valid, res):
                v = r.get("score")
                out[i] = float(v) if isinstance(v, (int, float)) else -1.0
        except Exception:  # noqa: BLE001
            pass
        return out
    return await asyncio.gather(*[score(client, cfg, a) for a in abstracts])


async def _score(client: httpx.AsyncClient, cfg: Cfg, abstract: str) -> float:
    """Target score in [0,1], or -1 on failure."""
    if len(abstract.strip()) < 40:
        return -1.0
    if cfg.scorer == "scientifiq" and cfg.target in NATIVE:
        url = f"{cfg.sci_base}/sandbox/{cfg.target}"
        data = await _post(client, url, {"Authorization": f"Bearer {cfg.sci_key}"}, {"abstract": abstract[:5000]})
        if not data:
            return -1.0
        # Scientifiq wraps the result: { status, message, data: { predictions: {...} } }
        env = data.get("data") if isinstance(data.get("data"), dict) else data
        pred = (env or {}).get("predictions") or {}
        cap = cfg.target.capitalize()
        v = pred.get(f"raw{cap}")
        return float(v) if isinstance(v, (int, float)) else -1.0
    # sciscore-served targets
    task = SCISCORE_TASK.get(cfg.target, cfg.target)
    if not cfg.sciscore_url:
        return -1.0
    hdr = {"Authorization": f"Bearer {cfg.sciscore_key}"} if cfg.sciscore_key else {}
    data = await _post(client, f"{cfg.sciscore_url}/score", hdr, {"task": task, "text": abstract[:5000]})
    if not data:
        return -1.0
    v = data.get("score")
    return float(v) if isinstance(v, (int, float)) else -1.0


# ---- proposer (mirrors lib/ai.ts proposeExtensionsAI) ---------------------

def _proposer_system(cfg: Cfg, n: int, current: float, goal: float) -> str:
    label = TARGET_LABEL.get(cfg.target, cfg.target)
    cur100, goal100 = round(current * 100), round(goal * 100)
    goal_line = (
        f"\nGOAL (return-to-go): the current {label} score is {cur100}/100; aim to reach {goal100}/100 — "
        f"{max(0, goal100 - cur100)} points to close. Favor the extensions most likely to make the biggest "
        "CREDIBLE jump toward that goal, not incremental polish."
    )
    return (
        f"You are a research strategist. Given an abstract, propose {n} concrete SCIENTIFIC EXTENSIONS — "
        f"pieces of work the authors could actually DO next — that would most raise this work's {label}.{goal_line}\n\n"
        "These are additions to the SCIENCE, not rewordings. Examples of moves: demonstrate the method on real / "
        "at-scale / clinical data; extend it to a new application or domain; add a missing experiment, mechanism, or "
        "causal result; integrate it with another technology to enable a concrete product; validate against a real "
        "benchmark or against incumbents; show generality across cases.\n\n"
        "The abstract you are given may already incorporate earlier extensions — propose the NEXT most valuable "
        "additions BEYOND what it already states. For EACH extension, write the abstract AS IT WOULD READ if that work "
        "were completed — a plausible near-future version of the paper that includes the new science — so its potential "
        "can be measured. Be realistic and specific to THIS work; do not fabricate implausible breakthroughs, and keep "
        "the prior findings intact.\n\n"
        'Return STRICT JSON only:\n'
        '{ "extensions": [ { "gap": "the specific missing science — what to DO, one line", '
        '"abstract": "the abstract as it would read once that work is done" } ] }'
    )


def _extract_json(text: str) -> Optional[dict]:
    if not text:
        return None
    text = text.strip()
    # the Anthropic path may be prefilled with "{", or wrapped in a fence
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    if not text.startswith("{"):
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if not m:
            return None
        text = m.group(0)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # last resort: cut to the last closing brace
        try:
            return json.loads(text[: text.rfind("}") + 1])
        except Exception:  # noqa: BLE001
            return None


async def propose(client: httpx.AsyncClient, cfg: Cfg, abstract: str, n: int, current: float, goal: float) -> list[dict]:
    system = _proposer_system(cfg, n, current, goal)
    user = f"ORIGINAL ABSTRACT:\n{abstract[:5000]}"
    is_anthropic = "anthropic.com" in cfg.ai_base
    if is_anthropic:
        url = f"{cfg.ai_base}/v1/messages"
        headers = {"x-api-key": cfg.ai_key, "anthropic-version": "2023-06-01", "content-type": "application/json"}
        payload = {
            "model": cfg.proposer_model,
            "max_tokens": 3200,
            "temperature": 0.75,
            "system": system,
            "messages": [{"role": "user", "content": user}, {"role": "assistant", "content": "{"}],
        }
        data = await _post(client, url, headers, payload)
        if not data:
            return []
        parts = data.get("content") or []
        text = "".join(p.get("text", "") for p in parts if p.get("type") == "text")
        text = "{" + text  # undo the prefill
    else:  # OpenAI-compatible
        url = f"{cfg.ai_base}/chat/completions"
        headers = {"Authorization": f"Bearer {cfg.ai_key}", "content-type": "application/json"}
        payload = {
            "model": cfg.proposer_model,
            "max_tokens": 3200,
            "temperature": 0.75,
            "response_format": {"type": "json_object"},
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        }
        data = await _post(client, url, headers, payload)
        if not data:
            return []
        text = (((data.get("choices") or [{}])[0]).get("message") or {}).get("content", "")
    parsed = _extract_json(text)
    exts = (parsed or {}).get("extensions")
    if not isinstance(exts, list):
        return []
    out = []
    for e in exts[:n]:
        gap, ab = str(e.get("gap", "")).strip(), str(e.get("abstract", "")).strip()
        if len(ab) >= 60:
            out.append({"gap": gap[:300], "abstract": ab})
    return out


# ---- one self-play game (beam) --------------------------------------------

@dataclass
class Chain:
    scores: list[float] = field(default_factory=list)
    abstracts: list[str] = field(default_factory=list)


async def rollout_root(client: httpx.AsyncClient, cfg: Cfg, root: str) -> dict[str, float]:
    """Beam self-play from `root`. Returns {abstract: value_to_go} for every state
    visited on a retained chain. value_to_go = best score reachable from that state."""
    base = (await score_many(client, cfg, [root]))[0]
    if base < 0:
        return {}
    # the return-to-go goal the proposer conditions on (matches the app's default stretch)
    goal = min(0.92, max(base + 0.05, min(0.90, base + 0.25)))
    chains = [Chain(scores=[base], abstracts=[root])]

    for _ in range(cfg.depth):
        # expand every chain
        proposals = await asyncio.gather(*[propose(client, cfg, c.abstracts[-1], cfg.k, c.scores[-1], goal) for c in chains])
        cand: list[Chain] = []
        meta = []  # (parent_chain, child_abstract)
        for parent, exts in zip(chains, proposals):
            for e in exts:
                meta.append((parent, e["abstract"]))
        if not meta:
            break
        child_scores = await score_many(client, cfg, [a for _, a in meta])
        for (parent, child_abs), sc in zip(meta, child_scores):
            if sc < 0:
                continue
            cand.append(Chain(scores=parent.scores + [sc], abstracts=parent.abstracts + [child_abs]))
        if not cand:
            break
        # keep the top BEAM by latest score, deduped by abstract
        cand.sort(key=lambda c: c.scores[-1], reverse=True)
        kept, seen = [], set()
        for c in cand:
            key = c.abstracts[-1][:200]
            if key in seen:
                continue
            seen.add(key)
            kept.append(c)
            if len(kept) >= cfg.beam:
                break
        chains = kept

    # label every visited state with its realized value-to-go (suffix-max of scores)
    vtg: dict[str, float] = {}
    for c in chains:
        best_from = -1.0
        for i in range(len(c.scores) - 1, -1, -1):
            best_from = max(best_from, c.scores[i])
            ab = c.abstracts[i]
            if len(ab) >= 40:
                vtg[ab] = max(vtg.get(ab, -1.0), best_from)
    return vtg


# ---- driver ---------------------------------------------------------------

def load_abstracts(path: str) -> list[str]:
    out = []
    if path.endswith(".jsonl"):
        with open(path) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                    a = obj.get("abstract") or obj.get("text")
                    if a:
                        out.append(str(a))
                except json.JSONDecodeError:
                    continue
    else:  # CSV
        with open(path, newline="") as f:
            reader = csv.DictReader(f)
            col = None
            for c in ("abstract", "text", "Abstract"):
                if reader.fieldnames and c in reader.fieldnames:
                    col = c
                    break
            if not col:
                raise SystemExit(f"No 'abstract'/'text' column in {path}. Columns: {reader.fieldnames}")
            for row in reader:
                a = (row.get(col) or "").strip()
                if a:
                    out.append(a)
    return out


async def main_async(args):
    global _score_sem
    cfg = load_cfg(args)
    _score_sem = asyncio.Semaphore(args.score_concurrency)
    if cfg.scorer == "local":  # load SciBERT once, before any worker races on it
        print(f"Loading local scorer '{_local_task(cfg.target)}' from {cfg.model_dir}…", file=sys.stderr)
        _get_predictor(_local_task(cfg.target), cfg.model_dir)
    if not cfg.ai_key:
        raise SystemExit("Set AI_API_KEY (or ANTHROPIC_API_KEY) for the proposer.")
    if cfg.scorer == "scientifiq" and not cfg.sci_key:
        raise SystemExit("Set SCIENTIFIQ_API_KEY for the scorer (or use --scorer sciscore).")

    abstracts = load_abstracts(args.abstracts)
    if args.limit:
        abstracts = abstracts[: args.limit]
    print(f"Loaded {len(abstracts)} root abstracts. target={cfg.target} depth={cfg.depth} beam={cfg.beam} k={cfg.k} "
          f"model={cfg.proposer_model} scorer={cfg.scorer}", file=sys.stderr)

    os.makedirs(os.path.dirname(os.path.abspath(args.out)) or ".", exist_ok=True)
    new_file = not os.path.exists(args.out)
    out_f = open(args.out, "a", newline="")
    writer = csv.writer(out_f)
    if new_file:
        writer.writerow(["text", "label"])
        out_f.flush()

    sem = asyncio.Semaphore(cfg.concurrency)
    write_lock = asyncio.Lock()
    done = {"roots": 0, "rows": 0}

    async with httpx.AsyncClient() as client:
        async def worker(i: int, root: str):
            async with sem:
                try:
                    vtg = await rollout_root(client, cfg, root)
                except Exception as e:  # noqa: BLE001 — one bad root never sinks the run
                    print(f"  ! root {i} failed: {e}", file=sys.stderr)
                    vtg = {}
            async with write_lock:
                for ab, label in vtg.items():
                    writer.writerow([ab.replace("\r", " "), round(label, 5)])
                    done["rows"] += 1
                out_f.flush()
                done["roots"] += 1
                if done["roots"] % 25 == 0 or done["roots"] == len(abstracts):
                    print(f"  {done['roots']}/{len(abstracts)} roots · {done['rows']} labeled states", file=sys.stderr)

        await asyncio.gather(*[worker(i, r) for i, r in enumerate(abstracts)])

    out_f.close()
    print(f"Done. {done['rows']} (text,label) rows -> {args.out}", file=sys.stderr)


def main():
    p = argparse.ArgumentParser(description="Self-play data generation for the value-to-go head.")
    p.add_argument("--abstracts", required=True, help="CSV (abstract/text column) or JSONL (abstract/text field)")
    p.add_argument("--out", required=True, help="output CSV (text,label); appended to, so runs resume-safe")
    p.add_argument("--target", default="commercial", choices=list(TARGET_LABEL))
    p.add_argument("--depth", type=int, default=3, help="rollout depth (compounding steps)")
    p.add_argument("--beam", type=int, default=3, help="beam width (retained chains per step)")
    p.add_argument("--k", type=int, default=4, help="proposals per state per step")
    p.add_argument("--limit", type=int, default=0, help="cap number of root abstracts (0 = all)")
    p.add_argument("--scorer", default="local", choices=["local", "scientifiq", "sciscore"],
                   help="local = in-process surrogate (fast/free, default); scientifiq = /sandbox (rate-limited); sciscore = your Cloud Run service")
    p.add_argument("--model-dir", default="ml/models", help="dir of local sciscore models (for --scorer local)")
    p.add_argument("--concurrency", type=int, default=6, help="concurrent roots")
    p.add_argument("--score-concurrency", type=int, default=16, help="global cap on concurrent scorer calls (low for the Scientifiq sandbox; high is fine for local)")
    args = p.parse_args()
    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
