#!/usr/bin/env python3
"""Build the Tollywood movie graph from Wikipedia's List_of_Telugu_films_of_YYYY pages.

Output: data/movies.json  — [{id, title, year, director, cast, linked}]
  - cast is top-billed order (index 0 ~ hero, 1 ~ heroine, per table convention)
  - linked=True if the film has its own Wikipedia article (popularity proxy)
Raw HTML is cached in data/raw/ so re-runs don't refetch.
"""
import json
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
RAW.mkdir(parents=True, exist_ok=True)

API = "https://en.wikipedia.org/w/api.php?action=parse&format=json&prop=text&page="
HEADERS = {"User-Agent": "TollyPlay-dataset/0.1 (personal game project)"}

YEARS = range(1935, 2027)


def fetch_year(year):
    cache = RAW / f"{year}.html"
    if cache.exists():
        return cache.read_text()
    page = f"List_of_Telugu_films_of_{year}"
    url = API + urllib.parse.quote(page)
    d = None
    for attempt, backoff in enumerate([0, 15, 45, 90]):
        if backoff:
            print(f"{year}: rate-limited, retrying in {backoff}s", file=sys.stderr)
            time.sleep(backoff)
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30) as r:
                d = json.load(r)
            break
        except urllib.error.HTTPError as e:
            if e.code == 429:
                continue
            print(f"{year}: fetch error {e}", file=sys.stderr)
            return None
        except Exception as e:
            print(f"{year}: fetch error {e}", file=sys.stderr)
            return None
    if not d or "parse" not in d:
        return None
    html = d["parse"]["text"]["*"]
    cache.write_text(html)
    time.sleep(1.5)  # be polite
    return html


def clean(s):
    s = unicodedata.normalize("NFKC", s)
    s = re.sub(r"\[\d+\]", "", s)  # footnote markers
    s = re.sub(r"\s+", " ", s).strip(" ​'\"")
    return s


def cell_names(cell):
    """Extract person names from a table cell, preferring link text."""
    names = []
    for a in cell.find_all("a"):
        t = clean(a.get_text())
        if t and not re.match(r"^\d+$", t):
            names.append(t)
    if not names:
        # plain-text cell: split on commas
        names = [clean(x) for x in clean(cell.get_text()).split(",")]
    seen, out = set(), []
    for n in names:
        if n and n.lower() not in seen and len(n) > 1:
            seen.add(n.lower())
            out.append(n)
    return out


def expand_table(table):
    """Rowspan/colspan-aware expansion of a wikitable into a cell grid."""
    grid = []
    pending = {}  # col -> (cell, rows_left)
    for tr in table.find_all("tr"):
        row = []
        col = 0
        cells = tr.find_all(["td", "th"])
        ci = 0
        while ci < len(cells) or col in pending:
            if col in pending:
                cell, left = pending[col]
                row.append(cell)
                if left - 1 <= 0:
                    del pending[col]
                else:
                    pending[col] = (cell, left - 1)
                col += 1
                continue
            if ci >= len(cells):
                break
            cell = cells[ci]
            ci += 1
            rs = int(cell.get("rowspan", 1) or 1)
            cs = int(cell.get("colspan", 1) or 1)
            for k in range(cs):
                row.append(cell)
                if rs > 1:
                    pending[col + k] = (cell, rs - 1)
            col += cs
        grid.append(row)
    return grid


def parse_year(year, html):
    soup = BeautifulSoup(html, "html.parser")
    movies = []
    for table in soup.find_all("table", class_="wikitable"):
        grid = expand_table(table)
        if not grid:
            continue
        header = [clean(c.get_text()).lower() for c in grid[0]]
        def col(name):
            for i, h in enumerate(header):
                if name in h:
                    return i
            return None
        ti, di, ca = col("title"), col("director"), col("cast")
        if ti is None or di is None or ca is None:
            continue
        for row in grid[1:]:
            if len(row) <= max(ti, di, ca):
                continue
            tcell = row[ti]
            title = clean(tcell.get_text())
            title = re.sub(r"\s*\((\d{4} )?film\)\s*$", "", title)
            if not title or title.lower() in ("title",):
                continue
            director = ", ".join(cell_names(row[di])[:2])
            cast = cell_names(row[ca])[:6]
            link = tcell.find("a")
            linked = bool(link and not (link.get("class") and "new" in link.get("class")))
            if not director and not cast:
                continue
            movies.append({
                "title": title,
                "year": year,
                "director": director,
                "cast": cast,
                "linked": linked,
            })
    return movies


def main():
    all_movies, per_year = [], {}
    for year in YEARS:
        html = fetch_year(year)
        if html is None:
            per_year[year] = 0
            continue
        ms = parse_year(year, html)
        per_year[year] = len(ms)
        all_movies.extend(ms)
        print(f"{year}: {len(ms)} films", flush=True)

    # de-dup (title, year)
    seen, out = set(), []
    for m in all_movies:
        key = (m["title"].lower(), m["year"])
        if key in seen:
            continue
        seen.add(key)
        m["id"] = f"{re.sub(r'[^a-z0-9]+', '-', m['title'].lower()).strip('-')}-{m['year']}"
        out.append(m)

    (ROOT / "data" / "movies.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=1))

    decades = {}
    for y, n in per_year.items():
        decades[y // 10 * 10] = decades.get(y // 10 * 10, 0) + n
    report = {
        "total": len(out),
        "linked": sum(1 for m in out if m["linked"]),
        "by_decade": {str(k) + "s": v for k, v in sorted(decades.items())},
        "empty_years": [y for y, n in per_year.items() if n == 0],
    }
    (ROOT / "data" / "coverage.json").write_text(json.dumps(report, indent=1))
    print(json.dumps(report, indent=1))


if __name__ == "__main__":
    main()
