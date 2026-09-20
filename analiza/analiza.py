#!/usr/bin/env python3
"""Liczy wszystkie tabele do rozdziału 3 — czasy i zasoby, z jednego miejsca.

    .venv/bin/python analiza/analiza.py
    .venv/bin/python analiza/analiza.py --sesje ses_02 ses_03
    .venv/bin/python analiza/analiza.py --bez-odstajacych

Wyniki lądują w data/analiza/*.csv (do wklejenia) i na ekranie (do przejrzenia).
"""
import argparse
import csv
import glob
import os
import re
import sys
from collections import defaultdict

try:
    import numpy as np
    from scipy import stats
except ImportError:
    sys.exit("❌ Brak scipy/numpy. Uruchom: python3 -m venv .venv && .venv/bin/pip install scipy")

KATALOG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WYJSCIE = os.path.join(KATALOG, "data", "analiza")

PLATFORMY = {
    "react_native": "REACT_NATIVE", "react-native": "REACT_NATIVE",
    "reactnative": "REACT_NATIVE", "rn": "REACT_NATIVE",
    "ionic": "IONIC", "io": "IONIC",
}
RN, IONIC = "REACT_NATIVE", "IONIC"

NIZEJ_LEPIEJ = True


def norm_platforma(s):
    return PLATFORMY.get(s.strip().lower().replace(" ", ""), s.strip().upper())


def wczytaj_czasy(sesje=None):
    """data/metrics/metrics_ses_*.csv → [(sesja, scenariusz, metryka, platforma, iteracja, wartość)]"""
    wiersze = []
    wzorzec = os.path.join(KATALOG, "data", "metrics", "metrics_ses_*.csv")
    for sciezka in sorted(glob.glob(wzorzec)):
        with open(sciezka) as f:
            for r in csv.DictReader(f):
                if sesje and r["session_id"] not in sesje:
                    continue
                wiersze.append({
                    "sesja": r["session_id"],
                    "scenariusz": r["scenario"],
                    "metryka": r["metric"],
                    "platforma": norm_platforma(r["platform"]),
                    "iteracja": int(r["iteration"]),
                    "wartosc": float(r["value"]),
                })
    return wiersze


def wczytaj_zasoby(z_pilotazem=False, sesje=None):
    """data/resources/*.csv → wiersze z PSS i CPU. Scenariusz wyciągamy z run_id (…_S1).

    `sesje` filtruje po numerze sesji zaszytym w run_id (`ses_04r_S1` → ses_04).
    Bez tego filtra dane z różnych warunków pomiarowych (pilotaż vs sesje poprawione)
    trafiały do jednej puli — czyli dokładnie to, czego w pracy robić nie wolno.
    """
    wiersze = []
    wzorce = [os.path.join(KATALOG, "data", "resources", "*.csv")]
    if z_pilotazem:
        wzorce.append(os.path.join(KATALOG, "data", "archiwum-pilotaz", "resources_*.csv"))

    for sciezka in sorted(sum([glob.glob(w) for w in wzorce], [])):
        with open(sciezka) as f:
            for r in csv.DictReader(f):
                run_id = r["run_id"]
                if sesje:
                    m_ses = re.search(r"(ses_\d+)", run_id)
                    if not m_ses or m_ses.group(1) not in sesje:
                        continue
                m = re.search(r"[Ss]([123])\b|_[Ss]([123])$|_[Ss]([123])_", run_id)
                scenariusz = "S" + next(g for g in (m.groups() if m else []) if g) if m else "?"
                cpu_surowy = r["cpu_percent"].strip()
                wiersze.append({
                    "scenariusz": scenariusz,
                    "platforma": norm_platforma(r["platform"]),
                    "run_id": run_id,
                    "pss_mb": float(r["pss_mb"]),
                    "cpu": None if cpu_surowy == "0" else float(cpu_surowy),
                })
    return wiersze


def odstajace(x):
    """Indeksy odstających metodą MAD (odporna na to, że sama odstająca psuje odchylenie).

    Sam MAD nie wystarcza: przy bardzo skupionym rozkładzie (np. UI_RESPONSE_MS 100–153 ms
    przy medianie 115) MAD jest tak mały, że próg 3σ wypada kilka ms od mediany i skrypt
    oznacza jako "odstającą" jedną trzecią normalnych pomiarów. Dlatego drugi warunek:
    odchylenie musi być też duże względnie (>25% mediany). Odstająca to ma być zakłócenie
    widoczne gołym okiem, a nie każdy pomiar powyżej średniej.
    """
    x = np.asarray(x, dtype=float)
    med = np.median(x)
    mad = np.median(np.abs(x - med))
    if mad == 0 or med < 1.0:
        return np.zeros(len(x), dtype=bool)
    odchylenie = x - med
    return (odchylenie > 3 * 1.4826 * mad) & (odchylenie > 0.25 * med)


def opis(x):
    x = np.asarray(x, dtype=float)
    q1, q3 = np.percentile(x, [25, 75])
    return {
        "n": len(x),
        "mediana": float(np.median(x)),
        "q1": float(q1), "q3": float(q3),
        "p95": float(np.percentile(x, 95)),
        "srednia": float(np.mean(x)),
    }


def porownaj(a, b):
    """a = React Native, b = Ionic. Zwraca p Shapiro, p Manna-Whitneya i siłę efektu."""
    wynik = {"shapiro_rn": None, "shapiro_ionic": None, "p": None, "efekt": None, "efekt_opis": "—"}
    if len(a) < 3 or len(b) < 3:
        return wynik

    for klucz, probka in (("shapiro_rn", a), ("shapiro_ionic", b)):
        if 3 <= len(probka) <= 5000 and len(set(probka)) > 1:
            wynik[klucz] = float(stats.shapiro(probka).pvalue)

    if len(set(a)) == 1 and len(set(b)) == 1 and set(a) == set(b):
        return wynik

    u, p = stats.mannwhitneyu(a, b, alternative="two-sided")
    wynik["p"] = float(p)
    r = 2 * u / (len(a) * len(b)) - 1
    wynik["efekt"] = float(r)
    wynik["efekt_opis"] = (
        "znikoma" if abs(r) < 0.1 else
        "mała" if abs(r) < 0.3 else
        "średnia" if abs(r) < 0.5 else "duża"
    )
    return wynik


def gwiazdki(p):
    """Przecinek dziesiętny wstawiamy tylko w liczbie — inaczej "n.i." robi się "n,i,"."""
    if p is None:
        return "—"
    if p < 0.001:
        return "<0,001 ***"
    liczba = f"{p:.3f}".replace(".", ",")
    if p < 0.01:
        return f"{liczba} **"
    if p < 0.05:
        return f"{liczba} *"
    return f"{liczba} n.i."


def licz(x):
    return f"{x:.1f}".replace(".", ",") if x is not None else "—"


# ──────────────────────────────────────────────────────────────
#  Tabele
# ──────────────────────────────────────────────────────────────
def tabela_porownawcza(dane, nazwa_wartosci, tytul, plik):
    """dane: {(scenariusz, metryka): {platforma: [wartości]}}"""
    print(f"\n{'═' * 100}\n  {tytul}\n{'═' * 100}")
    naglowek = f"{'Scen.':<6}{'Metryka':<22}{'n':>5}  {'RN mediana':>14}  {'Ionic mediana':>15}  {'p (M-W)':>12}  {'efekt':>16}  lepsza"
    print(naglowek)
    print("─" * 100)

    wiersze_csv = []
    for (scenariusz, metryka) in sorted(dane.keys()):
        a = dane[(scenariusz, metryka)].get(RN, [])
        b = dane[(scenariusz, metryka)].get(IONIC, [])
        if not a or not b:
            continue

        o_rn, o_io = opis(a), opis(b)
        t = porownaj(a, b)

        if t["p"] is not None and t["p"] < 0.05:
            lepsza = "Ionic" if o_rn["mediana"] > o_io["mediana"] else "RN"
        else:
            lepsza = "bez różnicy"

        print(f"{scenariusz:<6}{metryka:<22}{min(o_rn['n'], o_io['n']):>5}  "
              f"{licz(o_rn['mediana']):>14}  {licz(o_io['mediana']):>15}  "
              f"{gwiazdki(t['p']):>12}  "
              f"{(licz(t['efekt']) + ' ' + t['efekt_opis']) if t['efekt'] is not None else '—':>16}  {lepsza}")

        wiersze_csv.append({
            "scenariusz": scenariusz, "metryka": metryka, "jednostka": nazwa_wartosci,
            "n_rn": o_rn["n"], "n_ionic": o_io["n"],
            "rn_mediana": round(o_rn["mediana"], 2),
            "rn_q1": round(o_rn["q1"], 2), "rn_q3": round(o_rn["q3"], 2), "rn_p95": round(o_rn["p95"], 2),
            "ionic_mediana": round(o_io["mediana"], 2),
            "ionic_q1": round(o_io["q1"], 2), "ionic_q3": round(o_io["q3"], 2), "ionic_p95": round(o_io["p95"], 2),
            "shapiro_p_rn": round(t["shapiro_rn"], 5) if t["shapiro_rn"] is not None else "",
            "shapiro_p_ionic": round(t["shapiro_ionic"], 5) if t["shapiro_ionic"] is not None else "",
            "mannwhitney_p": round(t["p"], 6) if t["p"] is not None else "",
            "efekt_r": round(t["efekt"], 3) if t["efekt"] is not None else "",
            "efekt_opis": t["efekt_opis"],
            "lepsza": lepsza,
        })

    if wiersze_csv:
        zapisz_csv(plik, wiersze_csv)
    else:
        print("  (brak danych)")
    return wiersze_csv


def tabela_sesji(czasy):
    """Czy sesje dają zgodne wyniki? Bez tego nie wiadomo, czy różnica jest powtarzalna."""
    print(f"\n{'═' * 100}\n  ZGODNOŚĆ MIĘDZY SESJAMI (mediany per sesja)\n{'═' * 100}")
    grupy = defaultdict(lambda: defaultdict(list))
    sesje = sorted({w["sesja"] for w in czasy})
    for w in czasy:
        grupy[(w["scenariusz"], w["metryka"], w["platforma"])][w["sesja"]].append(w["wartosc"])

    print(f"{'Scen.':<6}{'Metryka':<22}{'Platforma':<15}" + "".join(f"{s:>12}" for s in sesje))
    print("─" * 100)
    wiersze = []
    for klucz in sorted(grupy.keys()):
        scenariusz, metryka, platforma = klucz
        kom = [licz(float(np.median(grupy[klucz][s]))) if grupy[klucz].get(s) else "—" for s in sesje]
        print(f"{scenariusz:<6}{metryka:<22}{platforma:<15}" + "".join(f"{c:>12}" for c in kom))
        wiersze.append(dict({"scenariusz": scenariusz, "metryka": metryka, "platforma": platforma},
                            **{s: k for s, k in zip(sesje, kom)}))
    zapisz_csv("zgodnosc_sesji.csv", wiersze)


def raport_odstajacych(czasy):
    print(f"\n{'═' * 100}\n  WARTOŚCI ODSTAJĄCE (MAD, próg 3σ) — do udokumentowania decyzji w pracy\n{'═' * 100}")
    grupy = defaultdict(list)
    for w in czasy:
        grupy[(w["sesja"], w["scenariusz"], w["metryka"], w["platforma"])].append(w)

    wiersze = []
    for klucz in sorted(grupy.keys()):
        paczka = sorted(grupy[klucz], key=lambda w: w["iteracja"])
        if len(paczka) < 5:
            continue
        maska = odstajace([w["wartosc"] for w in paczka])
        znalezione = [w for w, jest in zip(paczka, maska) if jest]
        if not znalezione:
            continue
        sesja, scenariusz, metryka, platforma = klucz
        iteracje = ", ".join(str(w["iteracja"]) for w in znalezione)
        zakres = f"{min(w['wartosc'] for w in znalezione):.0f}–{max(w['wartosc'] for w in znalezione):.0f}"
        mediana = float(np.median([w["wartosc"] for w in paczka]))
        print(f"  {sesja} {scenariusz} {metryka} {platforma}: {len(znalezione)} szt. "
              f"(iteracje {iteracje}) — {zakres} ms przy medianie {mediana:.0f} ms")
        wiersze.append({"sesja": sesja, "scenariusz": scenariusz, "metryka": metryka,
                        "platforma": platforma, "liczba": len(znalezione), "iteracje": iteracje,
                        "zakres": zakres, "mediana_bloku": round(mediana, 1)})
    if not wiersze:
        print("  Brak — żaden blok nie ma wartości odstających.")
    else:
        zapisz_csv("odstajace.csv", wiersze)
        print("\n  ⚠️ Jeśli odstająca pojawia się w jednej sesji, a w drugiej nie — to zakłócenie,")
        print("     nie cecha technologii. Napisz w pracy, czy ją wykluczasz, i dlaczego.")


def zapisz_csv(nazwa, wiersze):
    os.makedirs(WYJSCIE, exist_ok=True)
    sciezka = os.path.join(WYJSCIE, nazwa)
    with open(sciezka, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(wiersze[0].keys()))
        w.writeheader()
        w.writerows(wiersze)
    print(f"  → zapisano: {os.path.relpath(sciezka, KATALOG)}")


# ──────────────────────────────────────────────────────────────
def main():
    p = argparse.ArgumentParser(description="Analiza pomiarów: czasy + zasoby.")
    p.add_argument("--sesje", nargs="*", help="np. --sesje ses_02 ses_03 (domyślnie wszystkie)")
    p.add_argument("--bez-odstajacych", action="store_true", help="odrzuć odstające (MAD 3σ) przed testami")
    p.add_argument("--z-pilotazem", action="store_true", help="dolicz zasoby z data/archiwum-pilotaz/")
    args = p.parse_args()

    czasy = wczytaj_czasy(args.sesje)
    if not czasy:
        sys.exit("❌ Brak danych czasowych w data/metrics/. Najpierw: maestro/scripts/export-metrics.sh ses_03")
    print(f"Wczytano {len(czasy)} pomiarów czasowych z sesji: {', '.join(sorted({w['sesja'] for w in czasy}))}")

    if args.bez_odstajacych:
        grupy = defaultdict(list)
        for w in czasy:
            grupy[(w["sesja"], w["scenariusz"], w["metryka"], w["platforma"])].append(w)
        zostaw, odrzucone = [], 0
        for paczka in grupy.values():
            if len(paczka) < 5:
                zostaw.extend(paczka)
                continue
            maska = odstajace([w["wartosc"] for w in paczka])
            zostaw.extend([w for w, jest in zip(paczka, maska) if not jest])
            odrzucone += int(maska.sum())
        czasy = zostaw
        print(f"⚠️  Tryb --bez-odstajacych: odrzucono {odrzucone} pomiarów.")

    dane_czasy = defaultdict(lambda: defaultdict(list))
    for w in czasy:
        dane_czasy[(w["scenariusz"], w["metryka"])][w["platforma"]].append(w["wartosc"])
    tabela_porownawcza(dane_czasy, "ms", "CZASY — React Native vs Ionic", "czasy.csv")

    zasoby = wczytaj_zasoby(args.z_pilotazem, args.sesje)
    if zasoby:
        print(f"\nWczytano {len(zasoby)} próbek zasobów.")
        dane_zasoby = defaultdict(lambda: defaultdict(list))
        for w in zasoby:
            dane_zasoby[(w["scenariusz"], "RAM_PSS_MB")][w["platforma"]].append(w["pss_mb"])
            if w["cpu"] is not None:
                dane_zasoby[(w["scenariusz"], "CPU_PERCENT")][w["platforma"]].append(w["cpu"])
        tabela_porownawcza(dane_zasoby, "MB / %", "ZASOBY — RAM (PSS) i CPU", "zasoby.csv")
    else:
        print("\n⚠️  Brak danych zasobowych w data/resources/ — H1.3 i H1.4 zostają niezweryfikowane.")
        print("    Zbierz je: maestro/scripts/sample-resources.sh <pakiet> <PLATFORMA> ses_03r_S1 600 &")

    tabela_sesji(czasy)
    raport_odstajacych(czasy)
    print(f"\n✅ Gotowe. Tabele w {os.path.relpath(WYJSCIE, KATALOG)}/\n")


if __name__ == "__main__":
    main()
