/**
 * @file zod-validation.pipe.ts
 * @description NestJS validation pipe using Zod schemas
 * @module common/validation
 * @version 1.4.0
 * @since 2025-02-09
 *
 * Features:
 * - Type-safe validation using Zod schemas
 * - Automatic sanitization via DOMPurify
 * - Detailed error messages
 * - SQL injection detection
 */

import {
  PipeTransform,
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { ZodSchema } from 'zod';
import { ZodError } from 'zod';
import { SanitizerService } from './sanitizer.service';
import SafeJsonUtil from '../json/safe-json.util';

export interface ZodValidationPipeOptions {
  /** Whether to sanitize string inputs */
  sanitize?: boolean;
  /** Whether to allow HTML in string inputs */
  allowHtml?: boolean;
  /** Whether to block on SQL injection detection */
  blockSqlInjection?: boolean;
  /** Whether to log validation errors */
  logErrors?: boolean;
}

const DEFAULT_OPTIONS: Required<ZodValidationPipeOptions> = {
  sanitize: true,
  allowHtml: false,
  blockSqlInjection: true,
  logErrors: true,
};

@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  private readonly logger = new Logger(ZodValidationPipe.name);
  private readonly sanitizer = new SanitizerService();
  private readonly options: Required<ZodValidationPipeOptions>;

  constructor(
    private readonly schema: ZodSchema<T>,
    options?: ZodValidationPipeOptions,
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  transform(value: unknown, metadata: ArgumentMetadata): T {
    // Skip validation for non-body/query/param types
    if (
      metadata.type !== 'body' &&
      metadata.type !== 'query' &&
      metadata.type !== 'param'
    ) {
      return value as T;
    }

    try {
      // Pre-sanitization security scan
      if (typeof value === 'object' && value !== null) {
        this.scanObjectForThreats(value as Record<string, unknown>);
      }

      // Sanitize if enabled
      let sanitizedValue = value;
      if (
        this.options.sanitize &&
        typeof value === 'object' &&
        value !== null
      ) {
        sanitizedValue = this.sanitizer.sanitizeObject(
          value as Record<string, unknown>,
          this.options.allowHtml,
        );
      }

      // Validate with Zod schema
      const result = this.schema.parse(sanitizedValue);
      return result;
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = this.formatZodError(error);

        if (this.options.logErrors) {
          this.logger.warn(
            `Validation failed: ${SafeJsonUtil.stringify(formattedErrors, '{}')}`,
          );
        }

        throw new BadRequestException({
          message: 'Erro de validação',
          errors: formattedErrors,
          statusCode: 400,
        });
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException({
        message: 'Erro de validação desconhecido',
        statusCode: 400,
      });
    }
  }

  /**
   * Scan object for security threats before validation
   */
  private scanObjectForThreats(obj: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        const scan = this.sanitizer.fullScan(value);

        if (this.options.blockSqlInjection && scan.hasSqlInjection) {
          this.logger.error(
            `SQL injection detected in field "${key}": ${scan.patterns.join(', ')}`,
          );
          throw new BadRequestException({
            message: 'Conteúdo suspeito detectado',
            field: key,
            statusCode: 400,
          });
        }

        if (scan.hasXss && !this.options.allowHtml) {
          this.logger.warn(
            `XSS pattern detected in field "${key}", will be sanitized`,
          );
        }
      } else if (typeof value === 'object' && value !== null) {
        this.scanObjectForThreats(value as Record<string, unknown>);
      }
    }
  }

  /**
   * Format Zod errors into user-friendly structure
   */
  private formatZodError(error: ZodError): Record<string, string[]> {
    const formattedErrors: Record<string, string[]> = {};

    for (const issue of error.issues) {
      const path = issue.path.join('.') || '_root';
      if (!formattedErrors[path]) {
        formattedErrors[path] = [];
      }
      formattedErrors[path].push(issue.message);
    }

    return formattedErrors;
  }
}

/**
 * Factory function to create a ZodValidationPipe
 * @param schema - Zod schema to validate against
 * @param options - Validation options
 * @returns ZodValidationPipe instance
 */
export function createZodPipe<T>(
  schema: ZodSchema<T>,
  options?: ZodValidationPipeOptions,
): ZodValidationPipe<T> {
  return new ZodValidationPipe(schema, options);
}

/**
 * Decorator factory for using Zod validation on controller methods
 * Usage: @UsePipes(ZodValidation(CreateTemplateSchema))
 */
export function ZodValidation<T>(
  schema: ZodSchema<T>,
  options?: ZodValidationPipeOptions,
): ZodValidationPipe<T> {
  return new ZodValidationPipe(schema, options);
}
