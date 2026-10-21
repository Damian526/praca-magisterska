#!/usr/bin/env python3
"""Weryfikacja hipotez w wersji do pracy — dokładnie tak, jak chce promotor.

    .venv/bin/python analiza/weryfikacja_hipotez.py
    .venv/bin/python analiza/weryfikacja_hipotez.py --sesja ses_05   # tylko kontrola powtarzalności

Każda hipoteza = jedna tabela 30 surowych prób (React Native vs Ionic), pod nią średnia
i współczynnik zmienności V, a potem procedura z wykładu „6_Analiza statystyczna”:
Shapiro-Wilk (współczynniki a_i z tablicy) → Levene (z medianą, tylko gdy obie grupy normalne)
→ t-Studenta albo U Manna-Whitneya z wartością krytyczną z tablic. Bez p, Z, median i siły efektu.

Sposób doboru prób jest ustalony z góry i NIE wolno go zmieniać pod wynik:
- sesja: pierwsza sesja badania właściwego (ses_04); zasoby Ionica z pierwszej sesji po poprawce
  pomiaru renderera WebView (ses_07),
- czas uruchamiania: 30 zimnych startów z S1,
- czas reakcji: 5 rodzajów działań × 6 prób (co piąta iteracja: 1, 6, 11, 16, 21, 26),
- RAM i CPU: 3 scenariusze × 10 prób; próba = średnia z odczytów z kolejnej 1/10 czasu przebiegu.

Wyniki lądują w data/analiza/hipotezy/ (CSV z „;” i przecinkiem dziesiętnym — otwierają się w Excelu).
"""
import argparse
import csv
import os
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from analiza import IONIC, KATALOG, RN, wczytaj_czasy, wczytaj_zasoby  # noqa: E402

import numpy as np  # noqa: E402
from scipy import stats  # noqa: E402

# ──────────────────────────────────────────────────────────────
#  Ustawienia (ustalone z góry — patrz docstring)
# ──────────────────────────────────────────────────────────────
SESJA_DOMYSLNA = "ses_04"
# sesja czasów i zasobów RN → sesja zasobów Ionica (Ionic zmierzony ponownie skryptem v2, z rendererem)
SESJA_ZASOBY_IONIC = {"ses_04": "ses_07", "ses_05": "ses_08", "ses_06": "ses_09"}

ITERACJE_REAKCJA = [1, 6, 11, 16, 21, 26]
DZIALANIA = [
    ("S2", "UI_RESPONSE_MS", "Otwarcie szczegółów usługi"),
    ("S3", "UI_RESPONSE_MS", "Otwarcie szczegółów usługi po przewinięciu listy"),
    ("S3", "API_REQUEST_MS", "Wysłanie zamówienia do API"),
    ("S3", "RENDER_CHECKOUT_MS", "Wyświetlenie ekranu po złożeniu zamówienia"),
    ("S3", "RENDER_ORDERS_MS", "Wyświetlenie historii zamówień"),
]
# REQUEST_BUILD_MS pominięty: leży poniżej rozdzielczości zegara w WebView (OPIS_STANOWISKA §7.2)

LICZBA_ODCINKOW = 10
SCENARIUSZE_ZASOBY = [
    ("S1", "Uruchamianie aplikacji"),
    ("S2", "Przeglądanie szczegółów usługi"),
    ("S3", "Ścieżka zakupowa"),
]

N = 30          # liczba prób w każdej grupie
MIEJSCA = 2     # zaokrąglenie wartości w tabelach; statystyki liczone są z tych samych, zaokrąglonych liczb

# Wartości krytyczne dla α = 0,05
W_KR = 0.927                                  # Shapiro-Wilk, n = 30 (tablica, slajd 63)
U_KR = 317                                    # U Manna-Whitneya, n1 = n2 = 30, test dwustronny
F_KR = float(stats.f.ppf(0.95, 1, 2 * N - 2))  # Levene: F-Snedecor, df1 = k − 1 = 1, df2 = N − k = 58
T_KR = float(stats.t.ppf(0.975, 2 * N - 2))    # t-Studenta, k = n1 + n2 − 2 = 58

# Współczynniki a_i(30) testu Shapiro-Wilka (Shapiro, Wilk 1965); suma kwadratów = 0,5
A_30 = [0.4254, 0.2944, 0.2487, 0.2148, 0.1870, 0.1630, 0.1415, 0.1219,
        0.1036, 0.0862, 0.0697, 0.0537, 0.0381, 0.0227, 0.0076]

GRUPY = ((RN, "React Native", "pierwszej"), (IONIC, "Ionic", "drugiej"))


# ──────────────────────────────────────────────────────────────
#  Formatowanie
# ──────────────────────────────────────────────────────────────
def pl(x, miejsca=MIEJSCA):
    return f"{x:.{miejsca}f}".replace(".", ",")


def zapisz_csv(sciezka, naglowek, wiersze):
    # utf-8-sig, żeby Excel poprawnie pokazał polskie znaki
    with open(sciezka, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(naglowek)
        w.writerows(wiersze)


# ──────────────────────────────────────────────────────────────
#  Budowa tabel surowych wyników
# ──────────────────────────────────────────────────────────────
def proby_czasowe(sesja):
    czasy = defaultdict(dict)
    for w in wczytaj_czasy([sesja]):
        czasy[(w["scenariusz"], w["metryka"], w["platforma"])][w["iteracja"]] = w["wartosc"]

    def wartosc(scenariusz, metryka, platforma, iteracja):
        try:
            return czasy[(scenariusz, metryka, platforma)][iteracja]
        except KeyError:
            sys.exit(f"❌ Brak pomiaru {sesja} {scenariusz} {metryka} {platforma} iteracja {iteracja}.")

    start = [("—", i, wartosc("S1", "STARTUP_MS", RN, i), wartosc("S1", "STARTUP_MS", IONIC, i))
             for i in range(1, N + 1)]

    reakcja = []
    for scenariusz, metryka, nazwa in DZIALANIA:
        for i in ITERACJE_REAKCJA:
            reakcja.append((nazwa, len(reakcja) + 1,
                            wartosc(scenariusz, metryka, RN, i), wartosc(scenariusz, metryka, IONIC, i)))
    return start, reakcja


def proby_zasobowe(sesja_rn, sesja_ionic):
    """Próbki z każdego przebiegu dzielone na 10 kolejnych, równych części; próba = średnia z części."""
    probki = defaultdict(lambda: defaultdict(list))
    for w in wczytaj_zasoby(sesje=[sesja_rn, sesja_ionic]):
        probki[(w["platforma"], w["scenariusz"])]["ram"].append(w["pss_mb"])
        if w["cpu"] is not None:
            probki[(w["platforma"], w["scenariusz"])]["cpu"].append(w["cpu"])

    ram, cpu, liczba_probek = [], [], {}
    for scenariusz, nazwa in SCENARIUSZE_ZASOBY:
        odcinki = {}
        for platforma, _, _ in GRUPY:
            p = probki.get((platforma, scenariusz))
            if not p or len(p["ram"]) < LICZBA_ODCINKOW or len(p["cpu"]) < LICZBA_ODCINKOW:
                sys.exit(f"❌ Za mało próbek zasobów: {platforma} {scenariusz}.")
            liczba_probek[(platforma, scenariusz)] = (len(p["ram"]), len(p["cpu"]))
            odcinki[platforma] = {k: [float(np.mean(c)) for c in np.array_split(p[k], LICZBA_ODCINKOW)]
                                  for k in ("ram", "cpu")}
        for j in range(LICZBA_ODCINKOW):
            ram.append((nazwa, len(ram) + 1, odcinki[RN]["ram"][j], odcinki[IONIC]["ram"][j]))
            cpu.append((nazwa, len(cpu) + 1, odcinki[RN]["cpu"][j], odcinki[IONIC]["cpu"][j]))
    return ram, cpu, liczba_probek


# ──────────────────────────────────────────────────────────────
#  Analiza ilościowa
# ──────────────────────────────────────────────────────────────
def opis(x):
    x = np.asarray(x, dtype=float)
    srednia = float(np.mean(x))
    s = float(np.std(x, ddof=1))  # SD² = Σ(X − X̄)² / (N − 1)
    return {"srednia": srednia, "s": s, "v": 100 * s / srednia}


def stabilnosc(v):
    if v <= 25:
        return "stabilne"
    if v <= 45:
        return "średnio stabilne — wyjaśnij przyczynę"
    return "niestabilne — wyjaśnij przyczynę"


# ──────────────────────────────────────────────────────────────
#  Testy (wzory z wykładu)
# ──────────────────────────────────────────────────────────────
def shapiro_wilk(x):
    """W = [Σ a_i(n)·(x_{n−i+1} − x_i)]² / Σ(x_i − x̄)², a_i(30) z tablicy."""
    x = np.sort(np.asarray(x, dtype=float))
    n = len(x)
    assert n == N, "współczynniki a_i są wpisane tylko dla n = 30"
    licznik = sum(A_30[i] * (x[n - 1 - i] - x[i]) for i in range(n // 2))
    mianownik = float(np.sum((x - x.mean()) ** 2))
    w = licznik ** 2 / mianownik
    kontrola = float(stats.shapiro(x).statistic)
    if abs(w - kontrola) > 0.02:
        print(f"⚠️  Shapiro-Wilk: W z tablicy {w:.4f} a scipy {kontrola:.4f} — sprawdź dane.")
    return {"W": w, "suma_a": licznik, "suma_kw": mianownik, "normalny": w > W_KR}


def levene_mediana(a, b):
    """Z_ij = |Y_ij − mediana grupy|; W = (N − k)/(k − 1) · Σ N_i(Z̄_i − Z̄)² / ΣΣ(Z_ij − Z̄_i)²."""
    z = [np.abs(np.asarray(g, dtype=float) - np.median(g)) for g in (a, b)]
    k, n_cal = 2, len(a) + len(b)
    zi = [g.mean() for g in z]
    zc = np.concatenate(z).mean()
    licznik = sum(len(g) * (m - zc) ** 2 for g, m in zip(z, zi))
    mianownik = sum(float(np.sum((g - m) ** 2)) for g, m in zip(z, zi))
    w = (n_cal - k) / (k - 1) * licznik / mianownik
    kontrola = float(stats.levene(a, b, center="median").statistic)
    assert abs(w - kontrola) < 1e-9, (w, kontrola)
    return {"W": w, "jednorodne": w <= F_KR}


def t_studenta(a, b):
    """T = (X̄1 − X̄2) / S, S = √[((n1−1)s1² + (n2−1)s2²)/(n1+n2−2) · (1/n1 + 1/n2)]."""
    a, b = np.asarray(a, dtype=float), np.asarray(b, dtype=float)
    n1, n2 = len(a), len(b)
    s = np.sqrt(((n1 - 1) * a.var(ddof=1) + (n2 - 1) * b.var(ddof=1)) / (n1 + n2 - 2) * (1 / n1 + 1 / n2))
    t = float((a.mean() - b.mean()) / s)
    assert abs(t - float(stats.ttest_ind(a, b).statistic)) < 1e-9
    return {"t": t, "odrzucamy": abs(t) >= T_KR}


def mann_whitney(a, b):
    """Rangowanie (rangi wiązane = średnia), R1, R2, U1, U2, U = min(U1, U2)."""
    n1, n2 = len(a), len(b)
    rangi = stats.rankdata(np.concatenate([a, b]))  # domyślnie rangi wiązane jako średnia
    r1, r2 = float(rangi[:n1].sum()), float(rangi[n1:].sum())
    u1 = n1 * n2 + n1 * (n1 + 1) / 2 - r1
    u2 = n1 * n2 + n2 * (n2 + 1) / 2 - r2
    assert abs(u1 + u2 - n1 * n2) < 1e-9, "kontrola U1 + U2 = n1·n2 nie wyszła"
    u = min(u1, u2)
    u_scipy = float(stats.mannwhitneyu(a, b).statistic)
    assert abs(u - min(u_scipy, n1 * n2 - u_scipy)) < 1e-9
    return {"R1": r1, "R2": r2, "U1": u1, "U2": u2, "U": u, "odrzucamy": u <= U_KR}


def weryfikuj(a, b):
    wynik = {"shapiro": [shapiro_wilk(a), shapiro_wilk(b)], "levene": None}
    if all(s["normalny"] for s in wynik["shapiro"]):
        wynik["levene"] = levene_mediana(a, b)
        if wynik["levene"]["jednorodne"]:
            wynik["test"] = "t"
            wynik["t"] = t_studenta(a, b)
            wynik["odrzucamy"] = wynik["t"]["odrzucamy"]
            return wynik
    wynik["test"] = "U"
    wynik["u"] = mann_whitney(a, b)
    wynik["odrzucamy"] = wynik["u"]["odrzucamy"]
    return wynik


# ──────────────────────────────────────────────────────────────
#  Teksty do pracy
# ──────────────────────────────────────────────────────────────
def tekst_ilosciowa(h, tabela):
    a = [w[2] for w in tabela]
    b = [w[3] for w in tabela]
    o_rn, o_io = opis(a), opis(b)
    j = h["jednostka"]
    lepsza = "React Native" if o_rn["srednia"] < o_io["srednia"] else "Ionic"
    linie = [f"Średnia wartość wynosiła {pl(o_rn['srednia'])} {j} dla React Native oraz "
             f"{pl(o_io['srednia'])} {j} dla Ionic — różnica na korzyść technologii {lepsza} "
             f"(niższa wartość jest korzystniejsza)."]
    rodzaje = list(dict.fromkeys(w[0] for w in tabela))
    # dla tabel z kilkoma rodzajami działań V całości nic nie mówi — stabilność tylko per działanie
    ocena = stabilnosc if len(rodzaje) == 1 else (lambda v: "nie dotyczy — różne działania")
    wiersze_csv = [("całość", "React Native", pl(o_rn["srednia"]), pl(o_rn["s"]), pl(o_rn["v"]), ocena(o_rn["v"])),
                   ("całość", "Ionic", pl(o_io["srednia"]), pl(o_io["s"]), pl(o_io["v"]), ocena(o_io["v"]))]

    if len(rodzaje) == 1:
        for nazwa, o in (("React Native", o_rn), ("Ionic", o_io)):
            linie.append(f"Współczynnik zmienności dla {nazwa}: V = {pl(o['v'])}% → wyniki {stabilnosc(o['v'])}.")
    else:
        linie.append("Stabilność liczona osobno dla każdego rodzaju działania (dla całej tabeli nie ma sensu, "
                     "bo działania są różne):")
        for r in rodzaje:
            ra = opis([w[2] for w in tabela if w[0] == r])
            rb = opis([w[3] for w in tabela if w[0] == r])
            lepsza_r = "React Native" if ra["srednia"] < rb["srednia"] else "Ionic"
            linie.append(f"  • {r}: średnia RN {pl(ra['srednia'])} {j}, Ionic {pl(rb['srednia'])} {j} "
                         f"(korzystniej: {lepsza_r}); V RN = {pl(ra['v'])}% ({stabilnosc(ra['v'])}), "
                         f"V Ionic = {pl(rb['v'])}% ({stabilnosc(rb['v'])}).")
            wiersze_csv += [(r, "React Native", pl(ra["srednia"]), pl(ra["s"]), pl(ra["v"]), stabilnosc(ra["v"])),
                            (r, "Ionic", pl(rb["srednia"]), pl(rb["s"]), pl(rb["v"]), stabilnosc(rb["v"]))]
    return linie, wiersze_csv


def tekst_statystyczna(h, w):
    linie = [f"H₁: {h['brzmienie']}", f"H₀: {h['brzmienie_0']}", "", "Test normalności rozkładu"]
    for (_, nazwa, ktora), s in zip(GRUPY, w["shapiro"]):
        if s["normalny"]:
            wniosek = (f"W > W_kr, tak więc nie ma podstaw do odrzucenia H₀ zakładającej normalność rozkładu "
                       f"— rozkład jest normalny.")
        else:
            wniosek = "W ≤ W_kr, tak więc odrzucamy H₀ zakładającą normalność rozkładu."
        linie += [f"Dla grupy {ktora} ({nazwa}):",
                  f"  • W = {pl(s['W'], 3)};",
                  f"  • W_kr = {pl(W_KR, 3)}.",
                  f"Wniosek: {wniosek}"]
    linie.append("")

    if w["levene"] is None:
        nienormalne = [f"{ktora} ({nazwa})" for (_, nazwa, ktora), s in zip(GRUPY, w["shapiro"])
                       if not s["normalny"]]
        dla = "dla obu grup" if len(nienormalne) == 2 else f"dla grupy {nienormalne[0]}"
        linie.append(f"W związku z tym, że nie został spełniony warunek normalności rozkładu ({dla}), "
                     f"do weryfikacji hipotezy zastosowano nieparametryczny test U Manna-Whitneya.")
    else:
        lv = w["levene"]
        wniosek = ("W ≤ W_kr, tak więc nie ma podstaw do odrzucenia H₀ zakładającej jednorodność wariancji."
                   if lv["jednorodne"] else "W > W_kr, tak więc odrzucamy H₀ zakładającą jednorodność wariancji.")
        linie += ["Test jednorodności wariancji (Levene'a)",
                  f"  • W = {pl(lv['W'], 3)};",
                  f"  • W_kr = {pl(F_KR, 3)}.",
                  f"Wniosek: {wniosek}", ""]
        if lv["jednorodne"]:
            linie.append("W związku z tym, że spełnione zostały warunki normalności rozkładu i jednorodności "
                         "wariancji, do weryfikacji hipotezy zastosowano parametryczny test t-Studenta "
                         "dla prób niezależnych.")
        else:
            linie.append("W związku z tym, że nie został spełniony warunek jednorodności wariancji, "
                         "do weryfikacji hipotezy zastosowano nieparametryczny test U Manna-Whitneya.")

    if w["test"] == "U":
        u = w["u"]
        linie += [f"  • U = {pl(u['U'], 1)};", f"  • U_kr = {U_KR}."]
        koniec = ("U ≤ U_kr. Tak więc odrzucamy H₀, a przyjmujemy H₁." if u["odrzucamy"]
                  else "U > U_kr. Tak więc nie ma podstaw do odrzucenia H₀.")
    else:
        t = w["t"]
        linie += [f"  • t = {pl(t['t'], 3)};", f"  • t_kr = {pl(T_KR, 3)}."]
        koniec = ("|t| ≥ t_kr. Tak więc odrzucamy H₀, a przyjmujemy H₁." if t["odrzucamy"]
                  else "|t| < t_kr. Tak więc nie ma podstaw do odrzucenia H₀.")
    linie.append(f"Wniosek końcowy: {koniec}")
    return linie


def tekst_posredni(w):
    """Wartości pośrednie — do pokazania obliczeń albo na pytanie na obronie."""
    linie = []
    for (_, nazwa, _), s in zip(GRUPY, w["shapiro"]):
        linie.append(f"  Shapiro-Wilk {nazwa}: Σ a_i·(x_(n−i+1) − x_i) = {pl(s['suma_a'], 4)}, "
                     f"jej kwadrat = {pl(s['suma_a'] ** 2, 4)}, Σ(x_i − x̄)² = {pl(s['suma_kw'], 4)}, "
                     f"W = {pl(s['W'], 4)}")
    if w["levene"]:
        linie.append(f"  Levene: W = {pl(w['levene']['W'], 4)}, W_kr = F(0,05; 1; {2 * N - 2}) = {pl(F_KR, 4)}")
    if w["test"] == "U":
        u = w["u"]
        linie.append(f"  U Manna-Whitneya: R1 = {pl(u['R1'], 1)}, R2 = {pl(u['R2'], 1)}, "
                     f"U1 = {pl(u['U1'], 1)}, U2 = {pl(u['U2'], 1)}, U1 + U2 = {pl(u['U1'] + u['U2'], 1)} "
                     f"= n1·n2 = {N * N}, U = min(U1, U2) = {pl(u['U'], 1)}")
    else:
        linie.append(f"  t-Studenta: t = {pl(w['t']['t'], 4)}, t_kr(k = {2 * N - 2}) = {pl(T_KR, 4)}")
    return linie


def tekst_wnioski(hipotezy, wyniki):
    linie = ["Na podstawie wyników analizy ilościowej i statystycznej można stwierdzić, że:"]
    for i, (h, w) in enumerate(zip(hipotezy, wyniki)):
        koniec = "." if i == len(hipotezy) - 1 else ";"
        if w["odrzucamy"]:
            linie.append(f"  • szczegółowa hipoteza badawcza brzmiąca: „{h['brzmienie']}” została potwierdzona – "
                         f"potwierdziły ją wyniki analizy ilościowej, a wyniki analizy statystycznej dały "
                         f"podstawy do odrzucenia H₀{koniec}")
        else:
            linie.append(f"  • nic nie można powiedzieć na temat prawdziwości lub fałszywości szczegółowej "
                         f"hipotezy badawczej brzmiącej: „{h['brzmienie']}”; co prawda występowanie różnic "
                         f"potwierdziły wyniki analizy ilościowej, jednak wyniki analizy statystycznej "
                         f"nie dały podstaw do odrzucenia H₀{koniec}")
    potwierdzone = sum(w["odrzucamy"] for w in wyniki)
    glowna = ("„Przypuszczam, że istnieją istotne różnice w wydajności aplikacji mobilnej "
              "zaimplementowanej na bazie analizowanych technologii”")
    linie.append("")
    if potwierdzone == len(wyniki):
        linie.append(f"Na podstawie powyższego można stwierdzić, że główna hipoteza badawcza brzmiąca: "
                     f"{glowna} została potwierdzona.")
    elif potwierdzone:
        linie.append(f"Na podstawie powyższego można stwierdzić, że główna hipoteza badawcza brzmiąca: "
                     f"{glowna} została potwierdzona, jednak nie w całym zakresie zmiennej zależnej – "
                     f"wydajności aplikacji mobilnej zdefiniowanej w niniejszej pracy.")
    else:
        linie.append(f"Na podstawie powyższego nic nie można powiedzieć na temat prawdziwości lub fałszywości "
                     f"głównej hipotezy badawczej brzmiącej: {glowna}.")
    return linie


# ──────────────────────────────────────────────────────────────
def main():
    p = argparse.ArgumentParser(description="Weryfikacja hipotez (wersja do pracy).")
    p.add_argument("--sesja", default=SESJA_DOMYSLNA, choices=sorted(SESJA_ZASOBY_IONIC),
                   help="sesja czasów i zasobów RN; inne niż ses_04 służą tylko do kontroli powtarzalności")
    args = p.parse_args()

    sesja_rn, sesja_io = args.sesja, SESJA_ZASOBY_IONIC[args.sesja]
    wyjscie = os.path.join(KATALOG, "data", "analiza", "hipotezy")
    if args.sesja != SESJA_DOMYSLNA:
        wyjscie = os.path.join(wyjscie, f"kontrola_{args.sesja}")
    os.makedirs(wyjscie, exist_ok=True)

    start, reakcja = proby_czasowe(sesja_rn)
    ram, cpu, liczba_probek = proby_zasobowe(sesja_rn, sesja_io)

    def zaokraglij(tabela):
        return [(r, i, round(a, MIEJSCA), round(b, MIEJSCA)) for r, i, a, b in tabela]

    pocz = "Przypuszczam, że {} istotne różnice w "
    hipotezy = [
        {"plik": "tab_1_czas_uruchamiania.csv", "tabela": zaokraglij(start), "jednostka": "ms",
         "tytul": "Czas uruchamiania się aplikacji",
         "tresc": "czasie uruchamiania się projektowanej aplikacji zaimplementowanej na bazie analizowanych "
                  "technologii."},
        {"plik": "tab_2_czas_reakcji.csv", "tabela": zaokraglij(reakcja), "jednostka": "ms",
         "tytul": "Czas reakcji aplikacji na działania użytkownika",
         "tresc": "czasie reakcji projektowanej aplikacji na wybrane działania użytkownika, zaimplementowanej "
                  "na bazie analizowanych technologii."},
        {"plik": "tab_3_srednie_zuzycie_ram.csv", "tabela": zaokraglij(ram), "jednostka": "MB",
         "tytul": "Średnie zużycie pamięci operacyjnej RAM",
         "tresc": "średnim zużyciu pamięci operacyjnej RAM przez aplikację zaimplementowaną na bazie "
                  "analizowanych technologii podczas realizacji działań użytkownika."},
        {"plik": "tab_4_srednie_obciazenie_cpu.csv", "tabela": zaokraglij(cpu), "jednostka": "%",
         "tytul": "Średnie obciążenie procesora",
         "tresc": "średnim obciążeniu procesora przez aplikację zaimplementowaną na bazie analizowanych "
                  "technologii podczas realizacji działań użytkownika."},
    ]
    for h in hipotezy:
        h["brzmienie"] = pocz.format("istnieją") + h["tresc"]
        h["brzmienie_0"] = pocz.format("nie istnieją") + h["tresc"]

    raport = [f"WERYFIKACJA HIPOTEZ — czasy i zasoby RN: {sesja_rn}, zasoby Ionic: {sesja_io}",
              f"Wartości krytyczne (α = 0,05): W_kr = {pl(W_KR, 3)} (Shapiro-Wilk, n = {N}); "
              f"U_kr = {U_KR} (n1 = n2 = {N}); W_kr Levene'a = F(0,05; 1; {2 * N - 2}) = {pl(F_KR, 3)}; "
              f"t_kr = {pl(T_KR, 3)} (k = {2 * N - 2}).",
              "Liczba odczytów zasobów (RAM / CPU) użytych w odcinkach: " + ", ".join(
                  f"{'RN' if pf == RN else 'Ionic'} {sc}: {r}/{c}" for (pf, sc), (r, c) in sorted(liczba_probek.items())),
              ""]
    ilosciowa_csv, wyniki = [], []

    for nr, h in enumerate(hipotezy, 1):
        tabela = h["tabela"]
        assert len(tabela) == N, (h["plik"], len(tabela))
        j = h["jednostka"]
        if len({w[0] for w in tabela}) == 1:
            zapisz_csv(os.path.join(wyjscie, h["plik"]),
                       ["Nr próby", f"React Native [{j}]", f"Ionic [{j}]"],
                       [(i, pl(a), pl(b)) for _, i, a, b in tabela])
        else:
            zapisz_csv(os.path.join(wyjscie, h["plik"]),
                       ["Rodzaj działania", "Nr próby", f"React Native [{j}]", f"Ionic [{j}]"],
                       [(r, i, pl(a), pl(b)) for r, i, a, b in tabela])

        a = [w[2] for w in tabela]
        b = [w[3] for w in tabela]
        w = weryfikuj(a, b)
        wyniki.append(w)
        linie_il, wiersze_il = tekst_ilosciowa(h, tabela)
        ilosciowa_csv += [(h["tytul"],) + r for r in wiersze_il]

        raport += ["═" * 100, f"{nr}. {h['tytul'].upper()}  (tabela: {h['plik']})", "═" * 100,
                   f"Brzmienie hipotezy: {h['brzmienie']}", "",
                   "— ANALIZA ILOŚCIOWA —"] + linie_il + ["",
                   "— ANALIZA STATYSTYCZNA —"] + tekst_statystyczna(h, w) + ["",
                   "— Wartości pośrednie (nie wklejać, do kontroli) —"] + tekst_posredni(w) + [""]

    raport += ["═" * 100, "WNIOSKI", "═" * 100] + tekst_wnioski(hipotezy, wyniki)

    zapisz_csv(os.path.join(wyjscie, "ilosciowa.csv"),
               ["Hipoteza", "Rodzaj działania", "Technologia", "Średnia", "Odchylenie standardowe s",
                "Współczynnik zmienności V [%]", "Ocena stabilności"],
               ilosciowa_csv)
    with open(os.path.join(wyjscie, "wyniki_weryfikacji.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(raport) + "\n")

    print("\n".join(raport))
    print(f"\n✅ Zapisano w {os.path.relpath(wyjscie, KATALOG)}/")


if __name__ == "__main__":
    main()
