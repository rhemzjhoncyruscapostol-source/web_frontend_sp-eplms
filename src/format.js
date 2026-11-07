const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
export const money = (n) => peso.format(Number(n) || 0);

export function fmtDate(value) {
  if (!value) return '-';
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function fmtRange(start, end) {
  return start === end ? fmtDate(start) : `${fmtDate(start)} to ${fmtDate(end)}`;
}

export function fmtMonth(period) {
  if (!period) return '-';
  const d = new Date(`${period}-01T00:00:00`);
  return Number.isNaN(d.getTime()) ? period : d.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
}

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const thisMonth = () => today().slice(0, 7);

export function fmtDateTime(value) {
  if (!value) return '-';
  const d = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** Monday-to-Friday days between two YYYY-MM-DD dates, inclusive (matches the server). */
export function weekdaysBetween(start, end) {
  if (!start || !end || end < start) return 0;
  const d = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  let n = 0;
  for (let i = 0; d <= e && i < 400; i++) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
}

export const num = (n) => new Intl.NumberFormat('en-PH', { maximumFractionDigits: 1 }).format(Number(n) || 0);
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
