// Works out when each maintenance item is next due for a vehicle.

import { SCHEDULES, SERVICES, VEHICLES } from './data.js';

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

export function scheduleFor(vehicleId, overrides = {}) {
  return (SCHEDULES[vehicleId] || []).map((item) => {
    const o = overrides[item.service];
    return o ? { ...item, ...o, customized: true } : item;
  });
}

// inService: ISO date the vehicle was first sold/registered (approximation).
export function dueItems(vehicleId, records, odo, overrides, inService) {
  const recs = vehicleRecords(records, vehicleId);
  const now = today();
  const curMiles = odo.miles;

  return scheduleFor(vehicleId, overrides).map((item) => {
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

    // Which limit comes first (for sorting).
    const candidates = [dueDate, mileDate].filter(Boolean);
    const effectiveDate = candidates.length ? new Date(Math.min(...candidates)) : null;

    return {
      ...item,
      name: SERVICES[item.service].name,
      last, count, dueMiles, dueDate, milesLeft, daysLeft, status, effectiveDate,
    };
  }).sort((a, b) => {
    const rank = { overdue: 0, soon: 1, norecord: 2, ok: 3 };
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
    return (a.effectiveDate || Infinity) - (b.effectiveDate || Infinity);
  });
}

export function defaultInService(vehicleId) {
  const v = VEHICLES.find((x) => x.id === vehicleId);
  // Model years usually go on sale in the fall of the prior year; mid-year is a fair default.
  return `${v.year - 1}-10-01`;
}
