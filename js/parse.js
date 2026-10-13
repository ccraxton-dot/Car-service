// Turn raw OCR text from a receipt into suggested form values.
// Everything here is a best guess — the user reviews it before saving.

import { VEHICLES, SERVICES } from './data.js';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const norm = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

// OCR often confuses these characters; compare plates loosely.
const fuzzy = (s) => norm(s).replace(/O/g, '0').replace(/[IL]/g, '1').replace(/S/g, '5').replace(/B/g, '8').replace(/Z/g, '2');

export function detectVehicle(text) {
  const compact = fuzzy(text);
  for (const v of VEHICLES) {
    if (compact.includes(fuzzy(v.plate))) return v.id;
  }
  const lower = text.toLowerCase();
  if (/carnival/.test(lower)) return 'carnival';
  if (/kicks/.test(lower)) return 'kicks';
  if (/\bleaf\b/.test(lower)) return 'leaf';
  if (/\bkia\b/.test(lower)) return 'carnival';
  return null;
}

function validDate(y, m, d) {
  if (y < 100) y += 2000;
  const dt = new Date(y, m - 1, d);
  if (dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  const now = new Date();
  if (dt > new Date(now.getTime() + 86400000) || y < 2010) return null;
  return dt;
}

// Dates on a receipt that are NOT the service date.
const OTHER_DATE = /(deliv|in[\s-]*serv|warrant|prod(uction)?\b|prod\.? ?date|sold|purchas|expir|\bexp\b|next|due\b|recommend|remind|birth|\bdob\b|valid|since|start|member|reg(istration)?\b|cert)/i;
// Labels that usually sit next to the service date.
const SERVICE_DATE = /(date|invoice|\binv\b|\br\.?\s?o\b|repair order|work order|opened|closed|complet|ready|printed|visit|served|time\s*in|in\s*time)/i;

function monthIndex(name) {
  return MONTHS.indexOf(name.toLowerCase().slice(0, 3)) + 1;
}

function datesInLine(raw) {
  // Fix common OCR slips inside numbers: O→0, l/I→1, and spaces around separators.
  const line = raw
    .replace(/(?<=\d)[Oo](?=[\d\/\-.])|(?<=[\d\/\-.])[Oo](?=\d)/g, '0')
    .replace(/(?<=\d)[lI|](?=[\d\/\-.])|(?<=[\d\/\-.])[lI|](?=\d)/g, '1')
    .replace(/(\d)\s*([\/\-.])\s*(?=\d)/g, '$1$2');
  const found = [];
  let m;
  // 10/13/2026, 10-13-26, 10.13.2026 (US month first; falls back to day first)
  const re1 = /(?<![\d\/\-.])(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4}|\d{2})(?![\d\/\-.])/g;
  while ((m = re1.exec(line))) {
    const d = validDate(+m[3], +m[1], +m[2]) || validDate(+m[3], +m[2], +m[1]);
    if (d) found.push(d);
  }
  // 2026-10-13
  const re2 = /\b(20\d{2})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/g;
  while ((m = re2.exec(line))) {
    const d = validDate(+m[1], +m[2], +m[3]);
    if (d) found.push(d);
  }
  // Oct 13, 2026 · October 13 2026 · Oct. 13, 26
  const re3 = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*(\d{1,2})(?!\d)(?:st|nd|rd|th)?,?\s*'?(\d{4}|\d{2})\b/gi;
  while ((m = re3.exec(line))) {
    const d = validDate(+m[3], monthIndex(m[1]), +m[2]);
    if (d) found.push(d);
  }
  // 13 Oct 2026 · 13-OCT-26 · 13OCT26 (dealer systems)
  const re4 = /\b(\d{1,2})[\s\-]?(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?[\s\-,]?'?(\d{4}|\d{2})\b/gi;
  while ((m = re4.exec(line))) {
    const d = validDate(+m[3], monthIndex(m[2]), +m[1]);
    if (d) found.push(d);
  }
  return found;
}

export function detectDate(text) {
  const lines = text.split('\n');
  const candidates = [];
  lines.forEach((line, i) => {
    const dates = datesInLine(line);
    if (!dates.length) return;
    // A label can sit alone on the line above the date ("Invoice Date" / "10/13/26").
    const prev = lines[i - 1] || '';
    const label = datesInLine(prev).length ? '' : prev;
    const context = line + ' ' + label;
    if (OTHER_DATE.test(line) || (!SERVICE_DATE.test(line) && OTHER_DATE.test(label))) return;
    const score = SERVICE_DATE.test(context) ? 2 : 1;
    for (const d of dates) candidates.push({ d, score });
  });
  if (!candidates.length) return null;
  // Prefer labelled dates; among equals, the most recent one (the visit itself,
  // not an older date such as when the car was bought).
  candidates.sort((a, b) => b.score - a.score || b.d - a.d);
  return toISODate(candidates[0].d);
}

export function toISODate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function detectMileage(text) {
  const lines = text.split('\n');
  const labelled = /(mileage|odometer|odo\b|miles\s*in|mi\s*in|in\s*miles|km\s*in|mileage\s*in|current\s*miles)/i;
  const skip = /(next|due|recommend|return|out\b)/i;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!labelled.test(line) || skip.test(line)) continue;
    const nums = (line + ' ' + (lines[i + 1] || '')).match(/\b\d{1,3}(?:,\d{3})+\b|\b\d{3,6}\b/g);
    if (nums) {
      for (const n of nums) {
        const val = +n.replace(/,/g, '');
        if (val >= 100 && val < 400000 && !(val >= 1990 && val <= 2035 && !n.includes(','))) return val;
      }
    }
  }
  return null;
}

export function detectTotal(text) {
  const lines = text.split('\n');
  let best = null;
  for (const line of lines) {
    if (!/(total|amount due|balance due|grand|amount paid|pay this)/i.test(line)) continue;
    if (/sub\s*-?total|tax|labor\s*total|parts\s*total/i.test(line)) continue;
    const amts = line.match(/\$?\s?(\d{1,5}(?:,\d{3})*\.\d{2})/g);
    if (!amts) continue;
    const v = +amts[amts.length - 1].replace(/[$,\s]/g, '');
    if (best === null || v > best) best = v;
  }
  if (best !== null) return best;
  // Fall back to the largest dollar amount on the receipt.
  const all = text.match(/\$\s?\d{1,5}(?:,\d{3})*\.\d{2}/g);
  if (!all) return null;
  return Math.max(...all.map((a) => +a.replace(/[$,\s]/g, '')));
}

export function detectShop(text) {
  // First non-trivial line is usually the business name.
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const l of lines.slice(0, 5)) {
    const letters = l.replace(/[^A-Za-z]/g, '');
    if (letters.length >= 4 && !/invoice|receipt|repair order|date|phone|www\.|http/i.test(l)) {
      return l.replace(/[^\w&'.,\- ]/g, '').trim().slice(0, 60);
    }
  }
  return '';
}

export function detectServices(text) {
  const found = new Set();
  const lines = text.toLowerCase().split('\n');
  for (const line of lines) {
    for (const [id, svc] of Object.entries(SERVICES)) {
      if (!svc.keywords.length) continue;
      if (svc.exclude && svc.exclude.some((x) => line.includes(x))) continue;
      if (svc.keywords.some((k) => line.includes(k))) found.add(id);
    }
  }
  // "spark plug" would also match "plugs" in tire-plug repairs; keep it only if explicit.
  if (found.has('spark_plugs') && !/spark/i.test(text)) found.delete('spark_plugs');
  // "blade" alone is weak; require "wiper".
  if (found.has('wipers') && !/wiper/i.test(text)) found.delete('wipers');
  return [...found];
}

export function parseReceipt(text) {
  return {
    vehicleId: detectVehicle(text),
    date: detectDate(text),
    mileage: detectMileage(text),
    total: detectTotal(text),
    shop: detectShop(text),
    services: detectServices(text),
  };
}
