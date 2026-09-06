/** Adres backendu.
 *  Fizyczny telefon   → http://localhost:3000 przez `adb reverse tcp:3000 tcp:3000`
 *  Emulator Androida  → http://10.0.2.2:3000
 */
export const API_URL = "http://localhost:3000";

/* Seria pomiarowa. Ustawiaj przez `maestro/scripts/set-run.sh`, potem przebuduj
   aplikację — zła wartość po cichu podpisze cały przebieg złym scenariuszem. */
export const SESSION_ID = "ses_01";
export const SCENARIO: "S1" | "S2" | "S3" = "S1";
export const RUN_ID = `${SESSION_ID}_${SCENARIO}`;

export const ADMIN_TOKEN = "token-do-endpointow-badawczych";

export const APP_VERSION = "1.0.0";

export const PAGE_SIZE = 30;

export const SEARCH_DEBOUNCE_MS = 300;

export const TEST_USER = {
  email: "test@badanie.pl",
  password: "HasloTestowe123",
  fullName: "Jan Kowalski",
};
