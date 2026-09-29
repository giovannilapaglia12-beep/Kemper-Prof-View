// Nome, versione, tempi e chiavi di memoria del telefono.
// Le chiavi restano "kemper-stage-view-…" (nome dell'app fino alla v1.36): così nomi e impostazioni non si perdono.
// Altre chiavi scritte direttamente nel codice: "kemper-stage-view-mode" (scheda aperta, views.js e app.js),
// "kemper-stage-view-bank-names" e "kemper-stage-view-names-reset-v135" (rig-names.js).

export const APP_NAME = "Kemper Profiler View";
export const APP_VERSION = "1.63";
export const MAX_BANKS_KEY = "kemper-stage-view-max-bank";
export const AUTO_SYNC_INTERVAL = 1500;
export const FIXED_FX_SYNC_INTERVAL = 4500;
export const TUNER_STREAM_INTERVAL = 100;
export const TEMPO_UNITS_PER_BPM = 64;

export const RIG_NAMES_KEY = "kemper-stage-view-rig-names";

export const BANK_NAMES_KEY = "kemper-stage-view-bank-names";
export const BIDI_KEY = "kemper-stage-view-bidi"; // le chiavi di memoria restano quelle della v1.36: così nomi e impostazioni non si perdono
export const LOOPER_HALF_KEY = "kemper-stage-view-looper-half";
export const LOOPER_REVERSE_KEY = "kemper-stage-view-looper-reverse";
export const QUANTIZE_KEY = "kemper-stage-view-looper-quantize";
export const PLAYER_SEEN_KEY = "kemper-stage-view-player-seen";
export const THEME_KEY = "kemper-stage-view-theme";
