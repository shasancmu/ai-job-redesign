"""Build the labeled training CSV for the defense_impact task.

Inputs (export these once from the Scientifiq / Reliance-on-Science data — the
same sources the app's lib/defenseImpact.ts already queries):

  papers.csv   id, doi, abstract          # papers with title+abstract
  citing.csv   doi, assignee              # (paper DOI -> citing-patent assignee) rows

Output:
  defense.csv  abstract, defense_cited     # 1 if any citing patent is a defense entity

  python ml/scripts/build_defense_dataset.py --papers papers.csv --citing citing.csv --out defense.csv

Positives are papers with >=1 defense-assigned citing patent. Negatives are a
matched sample of the rest (patent-cited but non-defense, plus uncited), so the
model learns defense relevance rather than "gets cited at all".
"""
from __future__ import annotations
import argparse
import re

import pandas as pd

# Keep in sync with lib/defenseImpact.ts DEFENSE_PATTERNS.
DEFENSE = re.compile(
    r"lockheed|raytheon|\brtx\b|northrop|grumman|general dynamics|\bbae systems\b|"
    r"l3\s*harris|\bl3\b|l-3 communications|boeing|leidos|\bsaic\b|"
    r"science applications international|draper laborator|\bmitre\b|aerospace corporation|"
    r"textron|huntington ingalls|sandia|los alamos|livermore|applied physics laborator|"
    r"\bdarpa\b|defense advanced research|naval research|\bonr\b|air force research|\bafosr\b|"
    r"\bafrl\b|army research|\barl\b|\baro\b|missile defense|threat reduction|\bdtra\b|\biarpa\b|"
    r"department of defense|\bdod\b|secretary of (defense|the navy|the army|the air force)|"
    r"national security agency|\bnsa\b",
    re.IGNORECASE,
)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--papers", required=True)
    ap.add_argument("--citing", required=True)
    ap.add_argument("--out", default="defense.csv")
    ap.add_argument("--neg-ratio", type=float, default=1.0, help="negatives per positive")
    args = ap.parse_args()

    papers = pd.read_csv(args.papers).dropna(subset=["doi", "abstract"])
    papers["doi"] = papers["doi"].str.lower().str.strip()
    citing = pd.read_csv(args.citing).dropna(subset=["doi", "assignee"])
    citing["doi"] = citing["doi"].str.lower().str.strip()

    citing["is_def"] = citing["assignee"].astype(str).str.contains(DEFENSE)
    defense_dois = set(citing.loc[citing["is_def"], "doi"])

    papers["defense_cited"] = papers["doi"].isin(defense_dois).astype(int)
    pos = papers[papers["defense_cited"] == 1]
    neg = papers[papers["defense_cited"] == 0].sample(
        min(len(papers) - len(pos), int(len(pos) * args.neg_ratio)), random_state=42
    )
    out = pd.concat([pos, neg]).sample(frac=1, random_state=42)[["abstract", "defense_cited"]]
    out.to_csv(args.out, index=False)
    print(f"Wrote {len(out)} rows ({len(pos)} positive) -> {args.out}")


if __name__ == "__main__":
    main()
