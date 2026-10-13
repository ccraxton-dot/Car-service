// Works out when each maintenance item is next due for a vehicle.

import { SCHEDULES, SERVICES, VEHICLES } from './data.js';
import { ESSENTIALS, DIY } from './essentials.js';

const DAY = 86400000;
export const SOON_MILES = 1000;
export const SOON_DAYS = 30;
const DEFAULT_MILES_PER_YEAR = 12000;

export function addMonths(dateStr, months) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d;
}

const today = () => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; };

export function vehicleRecords(records, vehicleId) {
  return records
    .filter((r) => r.vehicleId === vehicleId)
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.mileage || 0) - (a.mileage || 0));
}

// Estimate driving rate and today's odometer from receipts and manual readings.
export function odometer(records, vehicleId, manual) {
  const points = vehicleRecords(records, vehicleId)
    .filter((r) => r.mileage && r.date)
    .map((r) => ({ miles: r.mileage, date: new Date(r.date + 'T12:00:00') }));
  if (manual && manual.miles && manual.date) points.push({ miles: manual.miles, date: new Date(manual.date + 'T12:00:00') });
  if (!points.length) return { miles: null, estimated: false, perYear: DEFAULT_MILES_PER_YEAR, rateKnown: false };

  points.sort((a, b) => a.date - b.date);
  const first = points[0];
  const last = points.reduce((best, p) => (p.date > best.date || (+p.date === +best.date && p.miles > best.miles) ? p : best), points[0]);
  const spanDays = (last.date - first.date) / DAY;

  let perYear = DEFAULT_MILES_PER_YEAR;
  let rateKnown = false;
  if (spanDays >= 60 && last.miles > first.miles) {
    perYear = Math.round(((last.miles - first.miles) / spanDays) * 365);
    rateKnown = true;
  }
  const daysSince = Math.max(0, (today() - last.date) / DAY);
  const est = Math.round(last.miles + (perYear / 365) * daysSince);
  return { miles: est, lastReading: last.miles, lastDate: last.date, estimated: daysSince > 7, perYear, rateKnown };
}

// mode: 'full' (manufacturer schedule) or 'essential' (only what matters, stretched where safe).
// User overrides always win over both.
export function scheduleFor(vehicleId, overrides = {}, mode = 'full') {
  return (SCHEDULES[vehicleId] || []).map((item) => {
    const ess = (ESSENTIALS[vehicleId] || {})[item.service] || { tier: 'essential' };
    let it = { ...item, tier: ess.tier, wait: ess.wait, diy: DIY[item.service] || null };
    if (mode === 'essential') {
      if ('miles' in ess) it.miles = ess.miles;
      if ('months' in ess) it.months = ess.months;
      if ('miles' in ess || 'months' in ess) it.stretched = true;
    }
    const o = overrides[item.service];
    if (o) it = { ...it, ...o, customized: true };
    return it;
  });
}

// inService: ISO date the vehicle was first sold/registered (approximation).
export function dueItems(vehicleId, records, odo, overrides, inService, mode = 'full') {
  const recs = vehicleRecords(records, vehicleId);
  const now = today();
  const curMiles = odo.miles;

  return scheduleFor(vehicleId, overrides, mode).map((item) => {
    const done = recs.filter((r) => (r.services || []).includes(item.service));
    const last = done[0] || null;
    const count = done.length;

    // Base point: last time it was done, else when the car went into service.
    const baseDate = last ? last.date : inService;
    const baseMiles = last ? (last.mileage ?? null) : 0;
    const useFirst = !last;
    const miInt = useFirst && item.firstMiles ? item.firstMiles : item.miles;
    const moInt = useFirst && item.firstMonths ? item.firstMonths : item.months;

    const dueMiles = miInt && baseMiles !== null ? baseMiles + miInt : null;
    const dueDate = moInt && baseDate ? addMonths(baseDate, moInt) : null;

    let milesLeft = dueMiles !== null && curMiles !== null ? dueMiles - curMiles : null;
    let daysLeft = dueDate ? Math.round((dueDate - now) / DAY) : null;

    // Estimate the calendar date the mileage limit will be reached.
    let mileDate = null;
    if (milesLeft !== null && odo.perYear > 0) {
      mileDate = new Date(now.getTime() + (milesLeft / odo.perYear) * 365 * DAY);
    }

    let status;
    const overdue = (milesLeft !== null && milesLeft <= 0) || (daysLeft !== null && daysLeft <= 0);
    const soon = (milesLeft !== null && milesLeft <= SOON_MILES) || (daysLeft !== null && daysLeft <= SOON_DAYS);
    const unknown = milesLeft === null && daysLeft === null;
    if ((!last && overdue) || (!last && unknown)) status = 'norecord';
    else if (overdue) status = 'overdue';
    else if (soon) status = 'soon';
    else status = 'ok';
    // In Essentials mode, "can wait" items are not scheduled — just watched for warning signs.
    if (mode === 'essential' && item.tier === 'wait') status = 'wait';

    // Which limit comes first (for sorting).
    const candidates = [dueDate, mileDate].filter(Boolean);
    const effectiveDate = candidates.length ? new Date(Math.min(...candidates)) : null;

    return {
      ...item,
      name: SERVICES[item.service].name,
      last, count, dueMiles, dueDate, milesLeft, daysLeft, status, effectiveDate,
    };
  }).sort((a, b) => {
    const rank = { overdue: 0, soon: 1, norecord: 2, ok: 3, wait: 4 };
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
    return (a.effectiveDate || Infinity) - (b.effectiveDate || Infinity);
  });
}

export function defaultInService(vehicleId) {
  const v = VEHICLES.find((x) => x.id === vehicleId);
  // Model years usually go on sale in the fall of the prior year; mid-year is a fair default.
  return `${v.year - 1}-10-01`;
}

// Group what's coming up into one shop trip plus a do-it-yourself list,
// so you go to the shop as rarely as possible.
export const BUNDLE_DAYS = 120;
export function planVisits(items, mode) {
  const tracked = items.filter((i) => i.status !== 'wait' && i.effectiveDate);
  const isDiy = (i) => i.tier === 'diy';
  const shop = tracked.filter((i) => !isDiy(i)).sort((a, b) => a.effectiveDate - b.effectiveDate);
  let visit = null;
  if (shop.length) {
    const now = today();
    const first = shop[0].effectiveDate < now ? now : shop[0].effectiveDate;
    const cutoff = new Date(first.getTime() + BUNDLE_DAYS * DAY);
    visit = { date: first, overdue: shop[0].effectiveDate <= now, items: shop.filter((i) => i.effectiveDate <= cutoff) };
  }
  const diy = tracked.filter((i) => isDiy(i) && ['overdue', 'soon', 'norecord'].includes(i.status));
  return { visit, diy, mode };
}
