import { AppError } from "./errors.js";

export function pageParams(query, defaultSize = 20) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const requested = Number.parseInt(query.pageSize, 10) || defaultSize;
  const pageSize = Math.min(50, Math.max(1, requested));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export function pageMeta(page, pageSize, total) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export function parseDateRange(query, { defaultDays = 30 } = {}) {
  const from = parseDay(query.from, false) || new Date(Date.now() - defaultDays * 24 * 60 * 60 * 1000);
  const to = parseDay(query.to, true) || new Date();
  if (from > to) throw new AppError(400, "INVALID_DATE", "The start date must be before the end date");
  const span = to.getTime() - from.getTime();
  if (span > 366 * 24 * 60 * 60 * 1000) {
    throw new AppError(400, "INVALID_DATE", "Choose a date range of one year or less");
  }
  return { from, to };
}

function parseDay(value, end) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}+05:30`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError(400, "INVALID_DATE", "Use a valid date");
  return date;
}

export function istDay(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
