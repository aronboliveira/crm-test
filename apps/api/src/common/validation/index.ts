/**
 * @file index.ts
 * @description Barrel export for common validation module
 * @module common/validation
 * @version 1.4.0
 * @since 2025-02-09
 */

// Template schemas
export * from './template.schema';

// Sanitizer service
export { SanitizerService, sanitizer } from './sanitizer.service';
export type { SanitizationResult, ScanResult } from './sanitizer.service';

// Zod validation pipe
export { ZodValidationPipe, createZodPipe, ZodValidation } from './zod-validation.pipe';
export type { ZodValidationPipeOptions } from './zod-validation.pipe';
