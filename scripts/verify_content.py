#!/usr/bin/env python3
"""Mechanical checks on agent-generated content before it ships.

- movie exists in movies.json (fuzzy title match) and year within ±1
- dialogue/katha text must not leak title words (>3 chars)
- trivia options: 4 distinct, answer present
Human (Claude) review still required for factual attribution.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
movies = json.loads((ROOT / "data" / "movies.json").read_text())


def norm(s):
    return re.sub(r"[^a-z0-9]+", "", s.lower())


by_title = {}
for m in movies:
    by_title.setdefault(norm(m["title"]), []).append(m)


def find(title, year):
    hits = by_title.get(norm(title), [])
    for h in hits:
        if abs(h["year"] - year) <= 1:
            return "ok"
    if hits:
        return f"year-mismatch (dataset has {[h['year'] for h in hits]})"
    return "title-not-in-dataset"


def leaks(text, title):
    words = [w for w in re.findall(r"[A-Za-z]{4,}", title)]
    hits = [w for w in words if re.search(rf"\b{re.escape(w)}\b", text, re.I)]
    return hits


def main(path):
    d = json.loads(Path(path).read_text())
    problems = []
    for i, x in enumerate(d.get("dialogues", [])):
        st = find(x["movie"], x["year"])
        if st != "ok":
            problems.append(f"dialogue[{i}] {x['movie']} ({x['year']}): {st}")
        lk = leaks(x["text"], x["movie"])
        if lk:
            problems.append(f"dialogue[{i}] {x['movie']}: TITLE LEAK {lk} in '{x['text']}'")
    for i, x in enumerate(d.get("kathas", [])):
        st = find(x["movie"], x["year"])
        if st != "ok":
            problems.append(f"katha[{i}] {x['movie']} ({x['year']}): {st}")
        lk = leaks(x["story"], x["movie"])
        if lk:
            problems.append(f"katha[{i}] {x['movie']}: TITLE LEAK {lk}")
    for i, x in enumerate(d.get("trivia", [])):
        opts = [x["answer"], *x["wrong"]]
        if len(set(opts)) != 4:
            problems.append(f"trivia[{i}]: options not 4 distinct: {opts}")
    print(f"dialogues={len(d.get('dialogues', []))} kathas={len(d.get('kathas', []))} trivia={len(d.get('trivia', []))}")
    print(f"problems={len(problems)}")
    for p in problems:
        print(" -", p)


if __name__ == "__main__":
    main(sys.argv[1])
