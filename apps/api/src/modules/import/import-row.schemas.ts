import { z } from 'zod';

const DATE_RE = /^\d{4}-\d{2}-\d{2}(?:[T ][\d:.+-Z]*)?$/;

const baseRowSchema = z.object({
  type: z.enum(['project', 'task']),
  name: z
    .string()
    .trim()
    .min(1, 'name is required')
    .max(180, 'name too long'),
  description: z.string().trim().max(4000).optional().default(''),
  status: z.string().trim().min(1).max(40),
  priority: z.coerce.number().int().min(1).max(5).default(3),
  dueAt: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : ''))
    .refine((value) => !value || DATE_RE.test(value), {
      message: 'dueAt must be an ISO-like date',
    }),
  tags: z
    .array(z.string().trim().min(1).max(64))
    .max(30)
    .default([]),
  projectId: z.string().trim().max(128).optional().default(''),
  code: z.string().trim().max(64).optional().default(''),
});

const projectStatusSchema = z.enum([
  'active',
  'archived',
  'planned',
  'blocked',
  'done',
]);
const taskStatusSchema = z.enum(['todo', 'doing', 'done', 'blocked']);

export const projectImportRowSchema = baseRowSchema
  .extend({
    type: z.literal('project'),
    status: projectStatusSchema.default('planned'),
    priority: z.coerce.number().int().min(1).max(5).default(3),
  })
  .transform((row) => ({
    ...row,
    code: row.code
      ? row.code.trim().toUpperCase()
      : row.name
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
          .slice(0, 24),
  }));

export const taskImportRowSchema = baseRowSchema.extend({
  type: z.literal('task'),
  status: taskStatusSchema.default('todo'),
  priority: z.coerce.number().int().min(1).max(5).default(3),
});

export type ProjectImportRow = z.infer<typeof projectImportRowSchema>;
export type TaskImportRow = z.infer<typeof taskImportRowSchema>;
export type ValidatedImportRow = ProjectImportRow | TaskImportRow;
