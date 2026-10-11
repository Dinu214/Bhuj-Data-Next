export const cleanStr = (v: unknown): string | null =>
  v !== undefined && v !== null && String(v).trim().length > 0 ? String(v).trim() : null;

export const cleanDate = (d: unknown): string | null => {
  if (!d) return null;
  const s = String(d).trim().split('T')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [, m, day] = s.split('-').map(Number);
  if (m < 1 || m > 12 || day < 1 || day > 31) return null;
  return s;
};

export const cleanInt = (n: unknown): number | null => {
  if (n === undefined || n === null || n === '') return null;
  const num = parseInt(String(n), 10);
  return isNaN(num) || num <= 0 ? null : num;
};

export const cleanEnum = (val: unknown, allowed: string[]): string | null =>
  val && allowed.includes(String(val).toLowerCase()) ? String(val).toLowerCase() : null;
