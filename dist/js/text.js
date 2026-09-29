// Funzioni di solo calcolo, senza pagina né MIDI (si possono provare direttamente nei test):
// semitoni del Transpose, sillabazione dei nomi effetto, colori delle categorie, nome delle note, mediana.

// v1.64: semitoni del Transpose come li scrive il Player: +2, 0, −2 (segno meno tipografico).
export function signedSemitones(value) {
  if (!Number.isInteger(value)) return "—";
  return value > 0 ? `+${value}` : value < 0 ? `−${-value}` : "0";
}

export function longestWord(text) {
  return Math.max(5, ...String(text).replace(/\u00ad/g, "").split(/\s+/).map((word) => word.length));
}

// Punti di sillabazione (trattino morbido) per le parole lunghe: se il nome non entra,
// il browser va a capo in quel punto mostrando "-" (es. Com-pres-sor), mai a metà a caso.
const isVowel = (char) => "aeiouy".includes(char);
// Gruppi di consonanti che in inglese iniziano una sillaba (Com-pres-sor, Chro-ma-tic).
const SYLLABLE_ONSETS = new Set(["pr", "br", "tr", "dr", "cr", "gr", "fr", "pl", "bl", "cl", "gl", "fl", "sh", "ch", "th", "ph", "wh"]);
export function softHyphenate(text) {
  return String(text).split(" ").map((word) => {
    if (word.length < 7 || /[^a-z]/i.test(word)) return word;
    const w = word.toLowerCase();
    const cuts = [];
    let i = 0;
    while (i < w.length) {
      if (!isVowel(w[i])) { i += 1; continue; }
      let j = i;
      while (j < w.length && isVowel(w[j])) j += 1; // prima consonante dopo le vocali
      let k = j;
      while (k < w.length && !isVowel(w[k])) k += 1; // vocale successiva
      if (k >= w.length || k === j) break;
      const cluster = w.slice(j, k);
      const cut = cluster.endsWith("ck") ? k : cluster.length === 1 ? j : SYLLABLE_ONSETS.has(cluster.slice(-2)) ? k - 2 : k - 1;
      if (cut >= 3 && w.length - cut >= 3 && (!cuts.length || cut - cuts[cuts.length - 1] >= 2)) cuts.push(cut);
      i = k;
    }
    let out = "";
    let from = 0;
    for (const cut of cuts) { out += `${word.slice(from, cut)}\u00ad`; from = cut; }
    return out + word.slice(from);
  }).join(" ");
}

// v1.39: colori delle categorie come sul Kemper (manuale Profiler/Player):
// Wah arancio, Distorsione/Booster/Shaper rosso, EQ e Widener giallo, Compressore/Gate ciano,
// Chorus/Vibrato/Rotary/Tremolo blu, Phaser/Flanger viola, Pitch bianco, Delay verde,
// Delay con pitch verde chiaro, Riverbero verde, Effect Loop rosa.
export function effectTone(type) {
  if (type === null || type === undefined) return "standard";
  if (type === 0) return "empty";
  if (type === 11 || type === 13) return "pitch"; // Pedal Pitch, Pedal Vinyl Stop
  if (type >= 1 && type <= 16) return "wah";
  if (type >= 17 && type <= 48) return "drive";
  if (type >= 49 && type <= 63) return "dynamics";
  if (type >= 64 && type <= 80) return "chorus";
  if (type >= 81 && type <= 96) return "phaser";
  if (type >= 97 && type <= 112) return "eq";
  if (type >= 113 && type <= 120) return "drive";
  if (type >= 121 && type <= 128) return "loop";
  if (type >= 129 && type <= 144) return "pitch";
  if ([150, 151, 152, 162, 163, 165, 166].includes(type)) return "pitchdelay";
  if (type >= 145 && type <= 176) return "delay";
  if (type >= 177) return "reverb";
  return "standard";
}

export function midiNoteName(note) {
  const names = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
  const name = names[note % 12];
  return `${name}${Math.floor(note / 12) - 1}`;
}

export function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
