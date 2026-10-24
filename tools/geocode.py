#!/usr/bin/env python3
"""Holt Koordinaten fuer data/orte.csv bei OpenStreetMap Nominatim und schreibt site/orte.json.

Aufruf: python3 tools/geocode.py data/orte.csv site/orte.json

- Schon bekannte Orte (gleicher Name und gleiche Adresse) werden aus orte.json uebernommen,
  es gibt also keine doppelten Anfragen.
- Die optionalen CSV-Spalten Lat und Lon ueberschreiben die Suche (fuer Korrekturen).
- Hoechstens 1 Anfrage pro Sekunde, eigener User-Agent (Nominatim-Nutzungsregeln).
"""
import csv
import json
import math
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://nominatim.openstreetmap.org/search"
UA = "Fasan-Karte/1.0 (+https://github.com/CUK999/Fasan-Karte)"
VIEWBOX = "-9.50,38.83,-9.05,38.62"  # Lissabon, Almada, Cascais
NAH_M = 400  # Name- und Adresstreffer gelten bis zu diesem Abstand als derselbe Ort


class Gesperrt(Exception):
    pass


fehler_in_folge = 0


def suche(q):
    global fehler_in_folge
    if fehler_in_folge >= 3:
        raise Gesperrt
    url = API + "?" + urllib.parse.urlencode({
        "q": q, "format": "jsonv2", "limit": 1, "countrycodes": "pt",
        "viewbox": VIEWBOX, "bounded": 1})
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "pt,de"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            treffer = json.load(r)
        fehler_in_folge = 0
    except Exception as e:  # Netz- oder HTTP-Fehler: Ort bleibt offen, naechster Lauf versucht es neu
        fehler_in_folge += 1
        print(f"  Fehler bei '{q}': {e}")
        return None
    finally:
        time.sleep(1.1)
    if not treffer:
        return None
    return round(float(treffer[0]["lat"]), 6), round(float(treffer[0]["lon"]), 6)


def abstand_m(a, b):
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    dp, dl = p2 - p1, math.radians(b[1] - a[1])
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(h))


def stadt(adresse):
    letzter = adresse.split(",")[-1].strip()
    woerter = [w for w in letzter.split() if not any(c.isdigit() for c in w)]
    return " ".join(woerter) or letzter


def finde(name, adresse):
    a = suche(adresse)
    n = suche(f"{name}, {stadt(adresse)}")
    if a and n:
        return (n, "name") if abstand_m(a, n) <= NAH_M else (a, "pruefen")
    if a:
        return a, "adresse"
    if n:
        return n, "pruefen"
    return None, "fehlt"


def main(csv_pfad, json_pfad):
    ziel = Path(json_pfad)
    bekannt = {}
    if ziel.exists():
        for o in json.loads(ziel.read_text(encoding="utf-8")):
            if o.get("lat") is not None:
                bekannt[(o["name"], o["adresse"])] = o
    orte, gesperrt = [], False
    with open(csv_pfad, encoding="utf-8", newline="") as f:
        for z in csv.DictReader(f):
            name, adresse = z["Name"].strip(), z["Adresse"].strip()
            o = {"name": name, "adresse": adresse,
                 "kategorie": z["Kategorie"].strip(), "notiz": (z.get("Notiz") or "").strip()}
            lat, lon = (z.get("Lat") or "").strip(), (z.get("Lon") or "").strip()
            if lat and lon:
                o.update(lat=float(lat), lon=float(lon), quelle="manuell")
            elif (name, adresse) in bekannt:
                b = bekannt[(name, adresse)]
                o.update(lat=b["lat"], lon=b["lon"], quelle=b.get("quelle", "adresse"))
            elif gesperrt:
                o.update(lat=None, lon=None, quelle="fehlt")
            else:
                try:
                    pos, quelle = finde(name, adresse)
                except Gesperrt:
                    gesperrt, pos, quelle = True, None, "fehlt"
                    print("Nominatim antwortet nicht, Rest beim naechsten Lauf.")
                o.update(lat=pos[0] if pos else None, lon=pos[1] if pos else None, quelle=quelle)
                print(f"{quelle:8} {name}")
            orte.append(o)
    ziel.write_text(json.dumps(orte, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    offen = [o["name"] for o in orte if o["lat"] is None]
    pruefen = [o["name"] for o in orte if o["quelle"] == "pruefen"]
    print(f"\n{len(orte) - len(offen)} von {len(orte)} Orten mit Koordinaten.")
    if pruefen:
        print("Bitte auf der Karte pruefen:", ", ".join(pruefen))
    if offen:
        print("Ohne Kartenpunkt:", ", ".join(offen))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("Aufruf: python3 tools/geocode.py data/orte.csv site/orte.json")
    main(sys.argv[1], sys.argv[2])
