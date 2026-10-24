import { z } from 'zod';
import { dateOnly } from '../common/date.js';

export const STORY_POINTS = [1, 2, 3, 5, 8, 13];

const status = z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE']);
const priority = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
const storyPoints = z
  .number()
  .refine(
    (n) => STORY_POINTS.includes(n),
    'Story points must be 1, 2, 3, 5, 8 or 13',
  );

export const createTicketSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(5000).optional(),
  status: status.optional(), // defaults to BACKLOG in the database
  priority: priority.optional(), // defaults to MEDIUM
  storyPoints: storyPoints.optional(),
  dueDate: dateOnly.optional(),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

// null clears an optional field, a missing key leaves it unchanged
export const updateTicketSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  status: status.optional(),
  priority: priority.optional(),
  storyPoints: storyPoints.nullable().optional(),
  dueDate: dateOnly.nullable().optional(),
});
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

export const listTicketsSchema = z.object({
  status: status.optional(),
  priority: priority.optional(),
  q: z.string().trim().max(100).optional(),
  sort: z
    .enum(['number', 'createdAt', 'dueDate', 'priority', 'storyPoints'])
    .default('number'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListTicketsQuery = z.infer<typeof listTicketsSchema>;
