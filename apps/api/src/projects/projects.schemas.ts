import { z } from 'zod';
import { dateOnly } from '../common/date.js';

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,5}$/, 'Key must be 2 to 5 letters'),
  description: z.string().trim().max(2000).optional(),
  targetDate: dateOnly.optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

// The key is deliberately not editable: ticket ids like WEB-12 depend on it
export const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  targetDate: dateOnly.nullable().optional(),
  archived: z.boolean().optional(),
});
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const listProjectsSchema = z.object({
  archived: z.enum(['true', 'false']).default('false'),
});
export type ListProjectsQuery = z.infer<typeof listProjectsSchema>;
