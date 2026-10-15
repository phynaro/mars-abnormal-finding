/**
 * Pure title → part/symptom classifier.
 * Phrases are passed in; this module does not touch the database.
 * Optional FailureModeCode fills symptom only when title has none.
 */

/** Cedar FailureModeCode → dictionary symptom codes (case-insensitive). */
const FAILURE_MODE_TO_SYMPTOM = {
  BROKEN: 'broken',
  ME18: 'broken',
  CRACKED: 'broken',
  ME12: 'leak',
  ME21: 'worn',
  ME04: 'worn',
  CORROSION: 'worn',
  EL08: 'worn',
  ABRASION: 'worn',
  STRETCH: 'worn',
  ME13: 'loose',
  LOOSEN: 'loose',
  HARD: 'loose',
  EL07: 'loose',
  ME14: 'stuck',
  LOCKED: 'stuck',
  UNBALANCE: 'vibration',
  ME08: 'vibration',
  ERROR: 'error',
  EL09: 'error',
  EL10: 'error',
  EL11: 'error',
  BURNT: 'failed',
  EL05: 'failed',
  EL06: 'failed',
  HIGHCUR: 'failed',
  BENT: 'broken',
  ME03: 'broken',
  DEFORMED: 'broken',
  DEFECTED: 'broken',
};

function mapFailureModeToSymptom(failureModeCode) {
  if (failureModeCode == null || failureModeCode === '') return null;
  const key = String(failureModeCode).trim().toUpperCase();
  if (!key || key === 'NONE') return null;
  return FAILURE_MODE_TO_SYMPTOM[key] || null;
}

function normalizeTitle(title) {
  return String(title || '')
    .normalize('NFKC')
    .replace(/\u0E4D\u0E32/g, '\u0E33')
    .replace(/[\u200b\u200c\u200d]/g, '')
    .toLowerCase()
    .replace(/[-–—_/,_“”"]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripNoise(text) {
  const noise = { side: null, station: null };
  let next = text;

  const station = next.match(/s#\s*(\d+)|section\s*(\d+)/);
  if (station) {
    noise.station = station[1] || station[2];
  }
  next = next.replace(/s#\s*\d+|section\s*\d+/g, ' ');

  const side = next.match(/(?:^|\s)([lr])(?:\s|$)/);
  if (side) {
    noise.side = side[1].toUpperCase();
  }
  next = next.replace(/(?:^|\s)[lr](?=\s|$)/g, ' ');

  return {
    text: next.replace(/\s+/g, ' ').trim(),
    ...noise,
  };
}

/**
 * @param {string} title
 * @param {Array<{ phrase: string, kind: 'part'|'symptom', code: string }>} phrases
 * @param {{ failureModeCode?: string|null }} [options]
 */
function classifyTitle(title, phrases = [], options = {}) {
  const cleaned = normalizeTitle(title);
  const { text, side, station } = stripNoise(cleaned);

  const ordered = [...phrases].sort((a, b) => {
    const lenDiff = String(b.phrase || '').length - String(a.phrase || '').length;
    if (lenDiff !== 0) return lenDiff;
    return String(a.phrase || '').localeCompare(String(b.phrase || ''));
  });

  let working = text;
  let part = null;
  let symptom = null;

  for (const rule of ordered) {
    const phrase = normalizeTitle(rule.phrase);
    if (!phrase || !working.includes(phrase)) continue;

    working = working.split(phrase).join(' ');

    if (rule.kind === 'part' && !part) part = rule.code;
    if (rule.kind === 'symptom' && !symptom) symptom = rule.code;
  }

  let symptomSource = null;
  if (symptom) {
    symptomSource = 'title';
  } else {
    const fromFm = mapFailureModeToSymptom(options.failureModeCode);
    if (fromFm) {
      symptom = fromFm;
      symptomSource = 'failure_mode';
    }
  }

  return {
    part,
    symptom,
    symptomSource,
    side,
    station,
    matched: Boolean(part && symptom),
  };
}

function getMatchBucket(result) {
  if (result.part && result.symptom) return 'full';
  if (result.part && !result.symptom) return 'part_only';
  if (!result.part && result.symptom) return 'symptom_only';
  return 'none';
}

module.exports = {
  normalizeTitle,
  classifyTitle,
  getMatchBucket,
  mapFailureModeToSymptom,
  FAILURE_MODE_TO_SYMPTOM,
};
