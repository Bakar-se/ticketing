import { z } from 'zod';

// Date-only strings ("2026-11-05"): no time, so no timezone surprises
export const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .refine((s) => {
    const d = new Date(`${s}T00:00:00.000Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s); // rejects 2026-02-31
  }, 'Invalid date');

// undefined = leave unchanged, null = clear, string = set
export function toDate(value: string | null | undefined) {
  if (value === undefined || value === null) return value;
  return new Date(`${value}T00:00:00.000Z`);
}
