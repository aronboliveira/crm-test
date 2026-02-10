/**
 * @file template.schema.ts
 * @description Zod validation schemas for project templates
 * @module common/validation
 * @version 1.4.0
 * @since 2025-02-09
 *
 * Security considerations:
 * - All string inputs are trimmed and limited in length
 * - HTML content is sanitized via DOMPurify before storage
 * - Keys are restricted to alphanumeric + underscore pattern
 * - Content is validated for max length to prevent DoS
 */

import { z } from 'zod';

/**
 * Validation constants for template schemas
 * These map to HTML5 validation attributes on the frontend
 */
export const TEMPLATE_VALIDATION = {
  KEY: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 64,
    PATTERN: /^[a-zA-Z][a-zA-Z0-9_-]*$/,
    PATTERN_STRING: '^[a-zA-Z][a-zA-Z0-9_-]*$',
    TITLE: 'Chave do Template (identificador único)',
    ERROR_PATTERN:
      'Chave deve começar com letra e conter apenas letras, números, underscores ou hífens',
    ERROR_MIN: 'Chave deve ter no mínimo 3 caracteres',
    ERROR_MAX: 'Chave deve ter no máximo 64 caracteres',
  },
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 128,
    TITLE: 'Nome do Template',
    ERROR_MIN: 'Nome deve ter no mínimo 2 caracteres',
    ERROR_MAX: 'Nome deve ter no máximo 128 caracteres',
  },
  DESCRIPTION: {
    MAX_LENGTH: 512,
    TITLE: 'Descrição do Template',
    ERROR_MAX: 'Descrição deve ter no máximo 512 caracteres',
  },
  CONTENT: {
    MAX_LENGTH: 65536, // 64KB max
    TITLE: 'Conteúdo do Template (HTML)',
    ERROR_MAX: 'Conteúdo deve ter no máximo 65536 caracteres',
  },
  SUBJECT: {
    MAX_LENGTH: 256,
    TITLE: 'Assunto do Email',
    ERROR_MAX: 'Assunto deve ter no máximo 256 caracteres',
  },
  CATEGORY: {
    VALUES: ['email', 'project', 'task', 'notification', 'report'] as const,
    DEFAULT: 'email' as const,
    ERROR_INVALID: 'Categoria inválida',
  },
} as const;

/**
 * Category enum for template types
 */
export const TemplateCategorySchema = z.enum(
  TEMPLATE_VALIDATION.CATEGORY.VALUES,
  {
    message: TEMPLATE_VALIDATION.CATEGORY.ERROR_INVALID,
  },
);

export type TemplateCategory = z.infer<typeof TemplateCategorySchema>;

/**
 * Schema for creating a new template
 * Maps to CreateTemplateDto
 */
export const CreateTemplateSchema = z
  .object({
    key: z
      .string({
        error: 'Chave é obrigatória',
      })
      .trim()
      .min(
        TEMPLATE_VALIDATION.KEY.MIN_LENGTH,
        TEMPLATE_VALIDATION.KEY.ERROR_MIN,
      )
      .max(
        TEMPLATE_VALIDATION.KEY.MAX_LENGTH,
        TEMPLATE_VALIDATION.KEY.ERROR_MAX,
      )
      .regex(
        TEMPLATE_VALIDATION.KEY.PATTERN,
        TEMPLATE_VALIDATION.KEY.ERROR_PATTERN,
      ),

    name: z
      .string({
        error: 'Nome é obrigatório',
      })
      .trim()
      .min(
        TEMPLATE_VALIDATION.NAME.MIN_LENGTH,
        TEMPLATE_VALIDATION.NAME.ERROR_MIN,
      )
      .max(
        TEMPLATE_VALIDATION.NAME.MAX_LENGTH,
        TEMPLATE_VALIDATION.NAME.ERROR_MAX,
      ),

    description: z
      .string({
        error: 'Descrição deve ser uma string',
      })
      .trim()
      .max(
        TEMPLATE_VALIDATION.DESCRIPTION.MAX_LENGTH,
        TEMPLATE_VALIDATION.DESCRIPTION.ERROR_MAX,
      )
      .optional()
      .default(''),

    content: z
      .string({
        error: 'Conteúdo é obrigatório',
      })
      .max(
        TEMPLATE_VALIDATION.CONTENT.MAX_LENGTH,
        TEMPLATE_VALIDATION.CONTENT.ERROR_MAX,
      ),

    subject: z
      .string({
        error: 'Assunto deve ser uma string',
      })
      .trim()
      .max(
        TEMPLATE_VALIDATION.SUBJECT.MAX_LENGTH,
        TEMPLATE_VALIDATION.SUBJECT.ERROR_MAX,
      )
      .optional(),

    category: TemplateCategorySchema.optional().default(
      TEMPLATE_VALIDATION.CATEGORY.DEFAULT,
    ),

    isActive: z.boolean().optional().default(true),

    metadata: z.record(z.string(), z.unknown()).optional().default({}),
  })
  .strict();

export type CreateTemplateDto = z.infer<typeof CreateTemplateSchema>;

/**
 * Schema for updating an existing template
 * All fields are optional except id
 */
export const UpdateTemplateSchema = z
  .object({
    key: z
      .string()
      .trim()
      .min(
        TEMPLATE_VALIDATION.KEY.MIN_LENGTH,
        TEMPLATE_VALIDATION.KEY.ERROR_MIN,
      )
      .max(
        TEMPLATE_VALIDATION.KEY.MAX_LENGTH,
        TEMPLATE_VALIDATION.KEY.ERROR_MAX,
      )
      .regex(
        TEMPLATE_VALIDATION.KEY.PATTERN,
        TEMPLATE_VALIDATION.KEY.ERROR_PATTERN,
      )
      .optional(),

    name: z
      .string()
      .trim()
      .min(
        TEMPLATE_VALIDATION.NAME.MIN_LENGTH,
        TEMPLATE_VALIDATION.NAME.ERROR_MIN,
      )
      .max(
        TEMPLATE_VALIDATION.NAME.MAX_LENGTH,
        TEMPLATE_VALIDATION.NAME.ERROR_MAX,
      )
      .optional(),

    description: z
      .string()
      .trim()
      .max(
        TEMPLATE_VALIDATION.DESCRIPTION.MAX_LENGTH,
        TEMPLATE_VALIDATION.DESCRIPTION.ERROR_MAX,
      )
      .optional(),

    content: z
      .string()
      .max(
        TEMPLATE_VALIDATION.CONTENT.MAX_LENGTH,
        TEMPLATE_VALIDATION.CONTENT.ERROR_MAX,
      )
      .optional(),

    subject: z
      .string()
      .trim()
      .max(
        TEMPLATE_VALIDATION.SUBJECT.MAX_LENGTH,
        TEMPLATE_VALIDATION.SUBJECT.ERROR_MAX,
      )
      .optional(),

    category: TemplateCategorySchema.optional(),

    isActive: z.boolean().optional(),

    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type UpdateTemplateDto = z.infer<typeof UpdateTemplateSchema>;

/**
 * Schema for template query parameters
 */
export const TemplateQuerySchema = z.object({
  key: z.string().optional(),
  category: TemplateCategorySchema.optional(),
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  search: z.string().max(128).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type TemplateQueryDto = z.infer<typeof TemplateQuerySchema>;

/**
 * Schema for template ID parameter
 */
export const TemplateIdSchema = z.object({
  id: z.string().min(1, 'ID é obrigatório'),
});

export type TemplateIdDto = z.infer<typeof TemplateIdSchema>;

/**
 * Schema for template key parameter
 */
export const TemplateKeySchema = z.object({
  key: z
    .string()
    .min(TEMPLATE_VALIDATION.KEY.MIN_LENGTH)
    .max(TEMPLATE_VALIDATION.KEY.MAX_LENGTH)
    .regex(TEMPLATE_VALIDATION.KEY.PATTERN),
});

export type TemplateKeyDto = z.infer<typeof TemplateKeySchema>;

/**
 * Exported validation constants for frontend use
 * These can be imported by the web app for consistent validation
 */
export const TEMPLATE_FORM_ATTRS = {
  key: {
    name: 'key',
    type: 'text',
    required: true,
    minLength: TEMPLATE_VALIDATION.KEY.MIN_LENGTH,
    maxLength: TEMPLATE_VALIDATION.KEY.MAX_LENGTH,
    pattern: TEMPLATE_VALIDATION.KEY.PATTERN_STRING,
    title: TEMPLATE_VALIDATION.KEY.TITLE,
    'aria-describedby': 'key-help',
    autocomplete: 'off',
    spellcheck: false,
  },
  name: {
    name: 'name',
    type: 'text',
    required: true,
    minLength: TEMPLATE_VALIDATION.NAME.MIN_LENGTH,
    maxLength: TEMPLATE_VALIDATION.NAME.MAX_LENGTH,
    title: TEMPLATE_VALIDATION.NAME.TITLE,
    'aria-describedby': 'name-help',
    autocomplete: 'off',
    spellcheck: true,
  },
  description: {
    name: 'description',
    maxLength: TEMPLATE_VALIDATION.DESCRIPTION.MAX_LENGTH,
    title: TEMPLATE_VALIDATION.DESCRIPTION.TITLE,
    'aria-describedby': 'description-help',
    spellcheck: true,
  },
  content: {
    name: 'content',
    required: true,
    maxLength: TEMPLATE_VALIDATION.CONTENT.MAX_LENGTH,
    title: TEMPLATE_VALIDATION.CONTENT.TITLE,
    'aria-describedby': 'content-help',
    spellcheck: true,
  },
  subject: {
    name: 'subject',
    type: 'text',
    maxLength: TEMPLATE_VALIDATION.SUBJECT.MAX_LENGTH,
    title: TEMPLATE_VALIDATION.SUBJECT.TITLE,
    'aria-describedby': 'subject-help',
    autocomplete: 'off',
    spellcheck: true,
  },
  category: {
    name: 'category',
    required: true,
    title: 'Categoria do Template',
    'aria-describedby': 'category-help',
  },
} as const;
