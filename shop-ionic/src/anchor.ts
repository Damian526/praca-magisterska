/* Kotwica startu aplikacji — MUSI być importowana jako pierwsza w main.tsx.
 *
 * Dlaczego osobny moduł: deklaracje `import` są hoistowane, więc przypisanie
 * zapisane wprost w main.tsx wykonywało się dopiero PO ewaluacji całego grafu
 * modułów (React, @ionic/react, router, ekrany, CSS). W zbudowanym bundlu
 * lądowało na 99,3% pliku, przez co STARTUP_MS pomijał koszt załadowania
 * frameworka — a odpowiednik w React Native (index.js, require() w czasie
 * wykonania) ten koszt wliczał. Metryki mierzyły różne przedziały.
 *
 * Moduł bez importów wykonuje się przed pozostałymi, więc kotwica wraca
 * na początek bundla i oba pomiary obejmują ten sam etap startu.
 */
globalThis.__APP_START__ = globalThis.performance?.now() ?? Date.now()
