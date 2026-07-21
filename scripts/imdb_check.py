#!/usr/bin/env python3
"""Cross-check movies.json against IMDb's official datasets.

For every film: find IMDb candidates by normalized title with year ±1, then
compare our (Wikipedia-derived) director against IMDb's. Any candidate
agreeing counts as a match (same-title remakes disambiguate via director).

Outputs data/imdb_check.json {id: {status, tconst, imdbDirectors}} and a
summary. IMDb datasets: free for personal non-commercial use.
"""
import csv
import gzip
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMDB = ROOT / "data" / "imdb"
movies = json.loads((ROOT / "data" / "movies.json").read_text())


def norm(s):
    return re.sub(r"[^a-z0-9]+", "", s.lower())


def person_key(s):
    return re.sub(r"[^a-z0-9]+", "", s.lower())


# ---- 1. index our titles ----
want = {}
for m in movies:
    want.setdefault(norm(m["title"]), []).append(m)

# ---- 2. stream title.basics ----
print("scanning title.basics…", file=sys.stderr)
candidates = {}  # our movie id -> [tconst]
tconst_year = {}
with gzip.open(IMDB / "title.basics.tsv.gz", "rt", encoding="utf-8") as f:
    r = csv.reader(f, delimiter="\t", quoting=csv.QUOTE_NONE)
    next(r)
    for row in r:
        if len(row) < 6 or row[1] not in ("movie", "tvMovie"):
            continue
        y = row[5]
        if not y.isdigit():
            continue
        y = int(y)
        if y < 1925 or y > 2027:
            continue
        for t in {norm(row[2]), norm(row[3])}:
            if t in want:
                for m in want[t]:
                    if abs(m["year"] - y) <= 1:
                        candidates.setdefault(m["id"], []).append(row[0])
                        tconst_year[row[0]] = y

matched_ids = set(candidates)
all_tconsts = {t for ts in candidates.values() for t in ts}
print(f"title matches: {len(matched_ids)}/{len(movies)} ({len(all_tconsts)} tconsts)", file=sys.stderr)

# ---- 3. directors for candidate tconsts ----
print("scanning title.crew…", file=sys.stderr)
crew = {}
with gzip.open(IMDB / "title.crew.tsv.gz", "rt", encoding="utf-8") as f:
    r = csv.reader(f, delimiter="\t", quoting=csv.QUOTE_NONE)
    next(r)
    for row in r:
        if row[0] in all_tconsts and row[1] != "\\N":
            crew[row[0]] = row[1].split(",")

need_names = {n for ds in crew.values() for n in ds}
print(f"director nconsts: {len(need_names)}", file=sys.stderr)

print("scanning name.basics…", file=sys.stderr)
names = {}
with gzip.open(IMDB / "name.basics.tsv.gz", "rt", encoding="utf-8") as f:
    r = csv.reader(f, delimiter="\t", quoting=csv.QUOTE_NONE)
    next(r)
    for row in r:
        if row[0] in need_names:
            names[row[0]] = row[1]

# ---- 4. compare ----
import difflib


def toks(name):
    return {
        t
        for t in re.sub(r"[^a-z ]", " ", name.lower().replace(".", " ")).split()
        if len(t) >= 3
    }


def same_person(a, b):
    """Order-insensitive, initial-stripped, spelling-tolerant name match:
    'Kishore Tirumala' == 'Thirumala Kishore', 'Madhusudhana' ~ 'Madhusudan'."""
    ta, tb = toks(a), toks(b)
    if not ta or not tb:
        return False
    if ta <= tb or tb <= ta:
        return True
    ja, jb = "".join(sorted(ta)), "".join(sorted(tb))
    return difflib.SequenceMatcher(None, ja, jb).ratio() > 0.8


def director_match(ours, theirs):
    """ours: comma-joined display names; theirs: list of IMDb names."""
    for a in ours.split(","):
        for b in theirs:
            if a.strip() and b and same_person(a, b):
                return True
    return False


report = {}
agree = disagree = untitled = nodirector = 0
for m in movies:
    mid = m["id"]
    if mid not in candidates:
        untitled += 1
        report[mid] = {"status": "no-imdb-title"}
        continue
    ds_all = []
    ok = False
    best = None
    for t in candidates[mid]:
        imdb_dirs = [names.get(n, "") for n in crew.get(t, [])]
        imdb_dirs = [x for x in imdb_dirs if x]
        if not imdb_dirs:
            continue
        ds_all.append((t, imdb_dirs))
        if m["director"] and director_match(m["director"], imdb_dirs):
            ok = True
            best = (t, imdb_dirs)
            break
    if not ds_all:
        nodirector += 1
        report[mid] = {"status": "no-imdb-director"}
    elif ok:
        agree += 1
        report[mid] = {"status": "ok", "tconst": best[0], "imdbDirectors": best[1]}
    else:
        disagree += 1
        report[mid] = {
            "status": "director-mismatch",
            "ours": m["director"],
            "imdb": [{"tconst": t, "directors": d} for t, d in ds_all[:3]],
            "title": m["title"],
            "year": m["year"],
        }

(ROOT / "data" / "imdb_check.json").write_text(json.dumps(report, ensure_ascii=False, indent=0))
total = len(movies)
print(json.dumps({
    "total": total,
    "title_matched": len(matched_ids),
    "director_agree": agree,
    "director_mismatch": disagree,
    "no_imdb_title": untitled,
    "no_imdb_director_data": nodirector,
}, indent=1))
