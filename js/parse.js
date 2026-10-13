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

// Receipts scanned or copied from a photo often come out one cell per line,
// so labels and values end up far apart. These helpers work line by line.
const splitLines = (text) => text.split('\n').map((l) => l.trim()).filter(Boolean);
const VIN = /\b[A-HJ-NPR-Z0-9]{17}\b/;

function mileageValue(str) {
  const nums = str.match(/\b\d{1,3}(?:,\d{3})+\b|\b\d{3,6}\b/g) || [];
  for (const n of nums) {
    const val = +n.replace(/,/g, '');
    if (val >= 100 && val < 400000 && !(val >= 1990 && val <= 2035 && !n.includes(','))) return val;
  }
  return null;
}

export function detectMileage(text) {
  const lines = splitLines(text);
  const labelled = /(mileage|odometer|odo\b|miles\s*in|mi\s*in|in\s*miles|km\s*in|current\s*miles)/i;
  const skip = /(next|due|recommend|return|out\b)/i;
  // 1. "Mileage In: 41,236" on one line, or the number on the next line.
  for (let i = 0; i < lines.length; i++) {
    if (!labelled.test(lines[i]) || skip.test(lines[i])) continue;
    const val = mileageValue(lines[i]) ?? (/^[\d,]+$/.test(lines[i + 1] || '') ? mileageValue(lines[i + 1]) : null);
    if (val) return val;
  }
  // 2. A bare number just after the license plate or VIN (vehicle info block).
  const plates = VEHICLES.map((v) => fuzzy(v.plate));
  for (let i = 0; i < lines.length; i++) {
    const isPlate = plates.some((p) => fuzzy(lines[i]) === p || fuzzy(lines[i]).endsWith(p));
    if (!isPlate && !VIN.test(lines[i])) continue;
    for (const next of lines.slice(i + 1, i + 4)) {
      if (/^\d{1,3}(,\d{3})+$|^\d{3,6}$/.test(next)) {
        const val = mileageValue(next);
        if (val) return val;
      }
    }
  }
  return null;
}

const MONEY = /\(?\$?\s?(\d{1,5}(?:,\d{3})*\.\d{2})\)?/g;

export function detectTotal(text) {
  const lines = splitLines(text);
  const label = /(\btotal\b|amount due|balance due|grand|amount paid|pay this|total due)/i;
  const notTotal = /sub\s*-?total|\btax\b|labor\s*total|parts\s*total|savings|discount/i;
  let best = null;
  for (let i = 0; i < lines.length; i++) {
    if (!label.test(lines[i]) || notTotal.test(lines[i])) continue;
    // Amount on the same line, or on the next line when it's in its own cell.
    let amts = lines[i].match(MONEY);
    if (!amts && /^\(?\$?\s?[\d,]+\.\d{2}\)?$/.test(lines[i + 1] || '')) amts = lines[i + 1].match(MONEY);
    if (!amts) continue;
    const v = +amts[amts.length - 1].replace(/[$,()\s]/g, '');
    // "Amount Due Today" / "Total" usually agree; the last labelled amount wins.
    best = v;
  }
  if (best !== null) return best;
  // Fall back to the largest dollar amount on the receipt.
  const all = text.match(/\$\s?\d{1,5}(?:,\d{3})*\.\d{2}/g);
  if (!all) return null;
  return Math.max(...all.map((a) => +a.replace(/[$,\s]/g, '')));
}

const SHOP_WORDS = /\b(oil|lube|auto|automotive|tire|tires|motors?|kia|nissan|garage|repair|car care|service center|valvoline|jiffy|firestone|pep boys|midas|meineke|goodyear|costco|walmart|discount tire|les schwab|mavis|monro|take 5|grease monkey|express)\b/i;
const NOT_SHOP = /(technician|customer|checklist|invoice|receipt|repair order|surcharge|\bfilter\b|\bchange\b|cleaner|\bsystem\b|\bfluid\b|\bpoints\b|www\.|http|@)/i;

export function detectShop(text) {
  const lines = splitLines(text).slice(0, 30);
  // A short name-like line in capitals that sounds like a shop ("OIL CHANGERS").
  for (const l of lines) {
    const words = l.split(/\s+/);
    if (words.length > 5 || /\d/.test(l) || NOT_SHOP.test(l)) continue;
    if (SHOP_WORDS.test(l) && l === l.toUpperCase()) return titleCase(l);
  }
  for (const l of lines) {
    if (l.split(/\s+/).length <= 5 && !/\d/.test(l) && !NOT_SHOP.test(l) && SHOP_WORDS.test(l)) return titleCase(l);
  }
  // The shop's website name (www.oilchangers.com).
  const site = text.match(/www\.([a-z0-9-]+)\.(com|net|biz|us)/i);
  if (site) return titleCase(site[1].replace(/-/g, ' '));
  for (const l of lines.slice(0, 5)) {
    const letters = l.replace(/[^A-Za-z]/g, '');
    if (letters.length >= 4 && !/invoice|receipt|repair order|date|phone|www\.|http/i.test(l)) {
      return l.replace(/[^\w&'.,\- ]/g, '').trim().slice(0, 60);
    }
  }
  return '';
}

function titleCase(s) {
  return s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()).trim().slice(0, 60);
}

// Inspection checklists list items with a status ("Brake Fluid · Checked",
// "Wiper Blades · OK"). Those were looked at, not replaced.
const STATUS_ONLY = /^(ok|okay|good|fine|full|filled|checked|inspected|completed?|done|n\/?a|maintenance free|low|topped off|top off|pass(ed)?|fail(ed)?|yes|no|green|yellow|red|clean|dirty|serviceable|needs attention|level)\.?$/i;
const STATUS_WORD = /\b(ok|checked|inspected|filled|topped|top off|level|good|maintenance free)\b/i;
const DID_WORK = /(chang|replac|flush|exchang|install|rotat|\bnew\b|r&r|drain|refill|recharge|mount|balanc|align|\$|\d+\.\d{2})/i;

export function detectServices(text) {
  const found = new Set();
  const lines = splitLines(text);
  lines.forEach((raw, i) => {
    const line = raw.toLowerCase();
    const next = lines[i + 1] || '';
    const checklistItem = STATUS_ONLY.test(next) || (STATUS_WORD.test(line) && !DID_WORK.test(line));
    for (const [id, svc] of Object.entries(SERVICES)) {
      if (!svc.keywords.length) continue;
      if (svc.exclude && svc.exclude.some((x) => line.includes(x))) continue;
      if (!svc.keywords.some((k) => line.includes(k))) continue;
      if (checklistItem) continue;
      found.add(id);
    }
  });
  // "spark plug" would also match "plugs" in tire-plug repairs; keep it only if explicit.
  if (found.has('spark_plugs') && !/spark/i.test(text)) found.delete('spark_plugs');
  // "blade" alone is weak; require "wiper".
  if (found.has('wipers') && !/wiper/i.test(text)) found.delete('wipers');
  return [...found];
}

// Technician comments and recommendations ("oil filter housing cap damaged").
const CONCERN = /(damag|leak|seep|worn|wear\b|crack|torn|broken|cracked|recommend|advis|suggest|needs?\b|replace soon|soon\b|low\b|failing|weak|noise|vibrat|corro|rust|loose|missing|bad\b|check\b.*\b(cap|leak|noise|light))/i;
const BOILERPLATE = /(guarantee|privacy|policy|claim|signature|waive|reimburse|approve|warranty|thank|visit|scan|qr code|www\.|http|procedure|terms|disclaimer)/i;
const CHECKLIST_LABEL = /^(battery|lights|belts|hoses|wipers?|wiper blades|tires?|tire pressures?|brake fluid|washer fluid|coolant reservoir|air filter)$/i;

export function detectNotes(text) {
  const lines = splitLines(text);
  const notes = [];
  for (const l of lines) {
    if (l.length < 8 || l.length > 140 || BOILERPLATE.test(l) || CHECKLIST_LABEL.test(l)) continue;
    if (STATUS_ONLY.test(l)) continue;
    if (CONCERN.test(l) && !notes.includes(l)) notes.push(l);
  }
  return notes.join('\n');
}

export function parseReceipt(text) {
  return {
    vehicleId: detectVehicle(text),
    date: detectDate(text),
    mileage: detectMileage(text),
    total: detectTotal(text),
    shop: detectShop(text),
    services: detectServices(text),
    notes: detectNotes(text),
  };
}
