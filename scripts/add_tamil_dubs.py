#!/usr/bin/env python3
"""Add famous Tamil films that every Telugu family knows by their dub titles.

The year lists the dataset was scraped from cover straight Telugu productions
only, so blockbusters like Narasimha (Padayappa) or Robo (Enthiran) were
unplayable. Entries use the TELUGU dub title; `w` points at the original
film's Wikipedia article so posters and plot snippets keep working.
Idempotent: entries already present (title+year) are skipped.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# (telugu title, year, director, cast, wikipedia article of the original)
DUBS = [
    ("Narasimha", 1999, "K. S. Ravikumar", ["Rajinikanth", "Soundarya", "Ramya Krishnan"], "Padayappa"),
    ("Manmadha", 2004, "A. J. Murugan", ["Silambarasan", "Jyothika"], "Manmadhan (film)"),
    ("Ghajini", 2005, "A. R. Murugadoss", ["Suriya", "Asin", "Nayanthara"], "Ghajini (2005 film)"),
    ("Aparichitudu", 2005, "S. Shankar", ["Vikram", "Sadha"], "Anniyan"),
    ("Shivaji", 2007, "S. Shankar", ["Rajinikanth", "Shriya Saran"], "Sivaji (film)"),
    ("Robo", 2010, "S. Shankar", ["Rajinikanth", "Aishwarya Rai"], "Enthiran"),
    ("Robo 2.0", 2018, "S. Shankar", ["Rajinikanth", "Amy Jackson"], "2.0 (film)"),
    ("Chandramukhi", 2005, "P. Vasu", ["Rajinikanth", "Jyothika", "Nayanthara"], "Chandramukhi"),
    ("Baasha", 1995, "Suresh Krissna", ["Rajinikanth", "Nagma"], "Baashha"),
    ("Muthu", 1995, "K. S. Ravikumar", ["Rajinikanth", "Meena"], "Muthu (film)"),
    ("Arunachalam", 1997, "Sundar C", ["Rajinikanth", "Soundarya"], "Arunachalam (film)"),
    ("Dalapathi", 1991, "Mani Ratnam", ["Rajinikanth", "Shobana", "Mammootty"], "Thalapathi"),
    ("Nayakudu", 1987, "Mani Ratnam", ["Kamal Haasan", "Saranya"], "Nayakan"),
    ("Roja", 1992, "Mani Ratnam", ["Arvind Swamy", "Madhoo"], "Roja"),
    ("Bombay", 1995, "Mani Ratnam", ["Arvind Swamy", "Manisha Koirala"], "Bombay (film)"),
    ("Premikudu", 1994, "S. Shankar", ["Prabhu Deva", "Nagma"], "Kadhalan"),
    ("Bharateeyudu", 1996, "S. Shankar", ["Kamal Haasan", "Manisha Koirala", "Urmila Matondkar"], "Indian (1996 film)"),
    ("Oke Okkadu", 1999, "S. Shankar", ["Arjun Sarja", "Manisha Koirala"], "Mudhalvan"),
    ("Jeans", 1998, "S. Shankar", ["Prashanth", "Aishwarya Rai"], "Jeans (film)"),
    ("Sakhi", 2000, "Mani Ratnam", ["Madhavan", "Shalini"], "Alaipayuthey"),
    ("Amrutha", 2002, "Mani Ratnam", ["Madhavan", "Simran"], "Kannathil Muthamittal"),
    ("Boys", 2003, "S. Shankar", ["Siddharth", "Genelia D'Souza"], "Boys (2003 film)"),
    ("Dasavatharam", 2008, "K. S. Ravikumar", ["Kamal Haasan", "Asin"], "Dasavatharam"),
    ("Manoharudu", 2015, "S. Shankar", ["Vikram", "Amy Jackson"], "I (film)"),
    ("Kabali", 2016, "Pa. Ranjith", ["Rajinikanth", "Radhika Apte"], "Kabali (film)"),
    ("Kaala", 2018, "Pa. Ranjith", ["Rajinikanth", "Huma Qureshi"], "Kaala (film)"),
    ("Petta", 2019, "Karthik Subbaraj", ["Rajinikanth", "Trisha"], "Petta (film)"),
    ("Darbar", 2020, "A. R. Murugadoss", ["Rajinikanth", "Nayanthara"], "Darbar (film)"),
    ("Jailer", 2023, "Nelson Dilipkumar", ["Rajinikanth", "Ramya Krishnan"], "Jailer (2023 Tamil film)"),
    ("Master", 2021, "Lokesh Kanagaraj", ["Vijay", "Malavika Mohanan", "Vijay Sethupathi"], "Master (2021 film)"),
    ("Vikram", 2022, "Lokesh Kanagaraj", ["Kamal Haasan", "Vijay Sethupathi", "Fahadh Faasil"], "Vikram (2022 film)"),
    ("Leo", 2023, "Lokesh Kanagaraj", ["Vijay", "Trisha"], "Leo (2023 Indian film)"),
    ("Adirindhi", 2017, "Atlee", ["Vijay", "Samantha", "Kajal Aggarwal"], "Mersal (film)"),
    ("Tupaki", 2012, "A. R. Murugadoss", ["Vijay", "Kajal Aggarwal"], "Thuppakki"),
    ("Jilla", 2014, "R. T. Neason", ["Vijay", "Kajal Aggarwal", "Mohanlal"], "Jilla"),
    ("Kaththi", 2014, "A. R. Murugadoss", ["Vijay", "Samantha"], "Kaththi"),
    ("Policeodu", 2016, "Atlee", ["Vijay", "Samantha"], "Theri (film)"),
    ("Whistle", 2019, "Atlee", ["Vijay", "Nayanthara"], "Bigil"),
    ("Sarkar", 2018, "A. R. Murugadoss", ["Vijay", "Keerthy Suresh"], "Sarkar (2018 film)"),
    ("Beast", 2022, "Nelson Dilipkumar", ["Vijay", "Pooja Hegde"], "Beast (2022 Indian film)"),
    ("Bhamane Satyabhamane", 1996, "K. S. Ravikumar", ["Kamal Haasan", "Meena"], "Avvai Shanmughi"),
    ("Michael Madana Kama Raju", 1990, "Singeetam Srinivasa Rao", ["Kamal Haasan", "Khushbu", "Urvashi"], "Michael Madana Kama Rajan"),
    ("Gharshana", 1988, "Mani Ratnam", ["Karthik", "Amala", "Prabhu"], "Agni Natchathiram"),
    ("Rakshakudu", 1997, "Praveen Gandhi", ["Nagarjuna", "Sushmita Sen"], "Ratchagan"),
    ("Priyuralu Pilichindi", 2000, "Rajiv Menon", ["Ajith Kumar", "Tabu", "Aishwarya Rai"], "Kandukondain Kandukondain"),
]


def slug(title: str, year: int) -> str:
    s = "".join(c if c.isalnum() else "-" for c in title.lower())
    while "--" in s:
        s = s.replace("--", "-")
    return f"{s.strip('-')}-{year}"


def update(path: Path) -> int:
    movies = json.loads(path.read_text())
    have = {(m["title"].lower(), m["year"]) for m in movies}
    ids = {m["id"] for m in movies}
    added = 0
    for title, year, director, cast, w in DUBS:
        if (title.lower(), year) in have or slug(title, year) in ids:
            continue
        movies.append({
            "title": title,
            "year": year,
            "director": director,
            "cast": cast,
            "linked": True,
            "w": w,
            "id": slug(title, year),
            "dub": True,
        })
        added += 1
    movies.sort(key=lambda m: m["year"])  # stable: keeps original order within a year
    path.write_text(json.dumps(movies, indent=1, ensure_ascii=False) + "\n")
    return added


if __name__ == "__main__":
    for p in [ROOT / "data" / "movies.json", ROOT / "app" / "public" / "movies.json"]:
        print(p, "+", update(p))
