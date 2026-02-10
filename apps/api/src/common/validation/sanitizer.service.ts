/**
 * @file sanitizer.service.ts
 * @description HTML sanitization service using DOMPurify + Zod validation
 * @module common/validation
 * @version 1.4.0
 * @since 2025-02-09
 *
 * Security features:
 * - XSS protection via DOMPurify
 * - SQL injection pattern detection
 * - Script tag removal
 * - Event handler removal
 * - Dangerous protocol filtering
 */

import DOMPurify from 'isomorphic-dompurify';
import { Injectable, Logger } from '@nestjs/common';

/**
 * SQL injection patterns to detect in input
 * These are common attack vectors
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION|DECLARE|CAST)\b)/i,
  /('|"|;|--|\bOR\b|\bAND\b)\s*(\d+=\d+|\w+=\w+)/i,
  /(\bOR\b|\bAND\b)\s*\d+\s*=\s*\d+/i,
  /(\bOR\b|\bAND\b)\s*'[^']*'\s*=\s*'[^']*'/i,
  /\b(UNION\s+ALL\s+SELECT|UNION\s+SELECT)\b/i,
  /;\s*(DROP|DELETE|TRUNCATE|ALTER)\s/i,
  /(\bEXEC\b|\bXP_)\s/i,
  /\b(WAITFOR|BENCHMARK|SLEEP)\s*\(/i,
  /\b(CHAR|NCHAR|VARCHAR|NVARCHAR)\s*\(\s*\d+\s*\)/i,
  /\b(CONVERT|CAST)\s*\([^)]*\bAS\b/i,
  /';\s*--/i,
  /1\s*=\s*1/,
  /'\s*=\s*'/,
];

/**
 * XSS patterns beyond what DOMPurify catches
 */
const XSS_PATTERNS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /javascript\s*:/gi,
  /vbscript\s*:/gi,
  /data\s*:\s*text\/html/gi,
  /on\w+\s*=/gi,
  /expression\s*\(/gi,
  /url\s*\(\s*['"]?\s*javascript:/gi,
];

/**
 * DOMPurify configuration for HTML sanitization
 */
const DOMPURIFY_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'b',
    'i',
    'u',
    'strong',
    'em',
    'a',
    'ul',
    'ol',
    'li',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'blockquote',
    'pre',
    'code',
    'span',
    'div',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'img',
    'hr',
  ],
  ALLOWED_ATTR: [
    'href',
    'src',
    'alt',
    'title',
    'class',
    'id',
    'style',
    'target',
    'rel',
    'width',
    'height',
    'colspan',
    'rowspan',
  ],
  ALLOW_DATA_ATTR: false,
  ALLOWED_URI_REGEXP:
    /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  ADD_ATTR: ['target'],
  ADD_TAGS: [],
  FORBID_TAGS: [
    'script',
    'style',
    'iframe',
    'frame',
    'frameset',
    'object',
    'embed',
    'applet',
  ],
  FORBID_ATTR: [
    'onerror',
    'onload',
    'onclick',
    'onmouseover',
    'onfocus',
    'onblur',
  ],
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_TRUSTED_TYPE: false,
  SANITIZE_DOM: true,
  WHOLE_DOCUMENT: false,
  FORCE_BODY: false,
};

/**
 * Strict DOMPurify config for plain text (no HTML allowed)
 */
const DOMPURIFY_STRICT_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
};

export interface SanitizationResult {
  isValid: boolean;
  sanitized: string;
  original: string;
  warnings: string[];
  sqlInjectionDetected: boolean;
  xssDetected: boolean;
  modified: boolean;
}

export interface ScanResult {
  hasSqlInjection: boolean;
  hasXss: boolean;
  patterns: string[];
  risk: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

@Injectable()
export class SanitizerService {
  private readonly logger = new Logger(SanitizerService.name);

  /**
   * Sanitize HTML content removing dangerous elements
   * @param html - Raw HTML string
   * @returns Sanitized HTML string
   */
  sanitizeHtml(html: string): string {
    if (!html || typeof html !== 'string') {
      return '';
    }
    return DOMPurify.sanitize(
      html,
      DOMPURIFY_CONFIG as unknown as Parameters<typeof DOMPurify.sanitize>[1],
    );
  }

  /**
   * Sanitize text content (strip ALL HTML)
   * @param text - Raw text that might contain HTML
   * @returns Plain text with all HTML removed
   */
  sanitizeText(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }
    return DOMPurify.sanitize(
      text,
      DOMPURIFY_STRICT_CONFIG as unknown as Parameters<
        typeof DOMPurify.sanitize
      >[1],
    );
  }

  /**
   * Full sanitization with detailed result
   * @param input - Raw input string
   * @param allowHtml - Whether to allow safe HTML tags
   * @returns Detailed sanitization result
   */
  sanitize(input: string, allowHtml = true): SanitizationResult {
    const warnings: string[] = [];
    let sqlInjectionDetected = false;
    let xssDetected = false;

    if (!input || typeof input !== 'string') {
      return {
        isValid: true,
        sanitized: '',
        original: input ?? '',
        warnings: [],
        sqlInjectionDetected: false,
        xssDetected: false,
        modified: false,
      };
    }

    // Check for SQL injection patterns
    const sqlScan = this.scanForSqlInjection(input);
    if (sqlScan.hasSqlInjection) {
      sqlInjectionDetected = true;
      warnings.push(
        `SQL injection pattern detected: ${sqlScan.patterns.join(', ')}`,
      );
      this.logger.warn(
        `SQL injection attempt detected: ${sqlScan.patterns.join(', ')}`,
      );
    }

    // Check for XSS patterns
    const xssScan = this.scanForXss(input);
    if (xssScan.hasXss) {
      xssDetected = true;
      warnings.push(`XSS pattern detected: ${xssScan.patterns.join(', ')}`);
      this.logger.warn(`XSS attempt detected: ${xssScan.patterns.join(', ')}`);
    }

    // Sanitize based on allowHtml flag
    const sanitized = allowHtml
      ? this.sanitizeHtml(input)
      : this.sanitizeText(input);

    return {
      isValid: !sqlInjectionDetected && !xssDetected,
      sanitized,
      original: input,
      warnings,
      sqlInjectionDetected,
      xssDetected,
      modified: sanitized !== input,
    };
  }

  /**
   * Scan input for SQL injection patterns
   * @param input - String to scan
   * @returns Scan result with detected patterns
   */
  scanForSqlInjection(input: string): ScanResult {
    if (!input || typeof input !== 'string') {
      return {
        hasSqlInjection: false,
        hasXss: false,
        patterns: [],
        risk: 'none',
      };
    }

    const detectedPatterns: string[] = [];

    for (const pattern of SQL_INJECTION_PATTERNS) {
      const match = input.match(pattern);
      if (match) {
        detectedPatterns.push(match[0]);
      }
    }

    const risk = this.calculateRisk(detectedPatterns.length, 'sql');

    return {
      hasSqlInjection: detectedPatterns.length > 0,
      hasXss: false,
      patterns: detectedPatterns,
      risk,
    };
  }

  /**
   * Scan input for XSS patterns
   * @param input - String to scan
   * @returns Scan result with detected patterns
   */
  scanForXss(input: string): ScanResult {
    if (!input || typeof input !== 'string') {
      return {
        hasSqlInjection: false,
        hasXss: false,
        patterns: [],
        risk: 'none',
      };
    }

    const detectedPatterns: string[] = [];

    for (const pattern of XSS_PATTERNS) {
      const match = input.match(pattern);
      if (match) {
        detectedPatterns.push(match[0]);
      }
    }

    const risk = this.calculateRisk(detectedPatterns.length, 'xss');

    return {
      hasSqlInjection: false,
      hasXss: detectedPatterns.length > 0,
      patterns: detectedPatterns,
      risk,
    };
  }

  /**
   * Full security scan of input
   * @param input - String to scan
   * @returns Combined scan result
   */
  fullScan(input: string): ScanResult {
    const sqlScan = this.scanForSqlInjection(input);
    const xssScan = this.scanForXss(input);

    const allPatterns = [...sqlScan.patterns, ...xssScan.patterns];
    const risk = this.calculateCombinedRisk(sqlScan.risk, xssScan.risk);

    return {
      hasSqlInjection: sqlScan.hasSqlInjection,
      hasXss: xssScan.hasXss,
      patterns: allPatterns,
      risk,
    };
  }

  /**
   * Calculate risk level based on pattern count
   */
  private calculateRisk(
    patternCount: number,
    type: 'sql' | 'xss',
  ): ScanResult['risk'] {
    if (patternCount === 0) return 'none';
    if (patternCount === 1) return 'low';
    if (patternCount <= 3) return 'medium';
    if (patternCount <= 5) return 'high';
    return 'critical';
  }

  /**
   * Combine two risk levels
   */
  private calculateCombinedRisk(
    risk1: ScanResult['risk'],
    risk2: ScanResult['risk'],
  ): ScanResult['risk'] {
    const riskLevels = ['none', 'low', 'medium', 'high', 'critical'] as const;
    const idx1 = riskLevels.indexOf(risk1);
    const idx2 = riskLevels.indexOf(risk2);
    return riskLevels[Math.max(idx1, idx2)];
  }

  /**
   * Escape HTML entities for safe display
   * @param str - String to escape
   * @returns Escaped string
   */
  escapeHtml(str: string): string {
    if (!str || typeof str !== 'string') {
      return '';
    }
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;',
    };
    return str.replace(/[&<>"'`=/]/g, (char) => htmlEscapes[char]);
  }

  /**
   * Sanitize object recursively
   * @param obj - Object to sanitize
   * @param allowHtml - Whether to allow HTML in string values
   * @returns Sanitized object
   */
  sanitizeObject<T extends Record<string, unknown>>(
    obj: T,
    allowHtml = false,
  ): T {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = allowHtml
          ? this.sanitizeHtml(value)
          : this.sanitizeText(value);
      } else if (Array.isArray(value)) {
        result[key] = value.map((item) =>
          typeof item === 'string'
            ? allowHtml
              ? this.sanitizeHtml(item)
              : this.sanitizeText(item)
            : typeof item === 'object' && item !== null
              ? this.sanitizeObject(item as Record<string, unknown>, allowHtml)
              : item,
        );
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.sanitizeObject(
          value as Record<string, unknown>,
          allowHtml,
        );
      } else {
        result[key] = value;
      }
    }

    return result as T;
  }
}

/**
 * Export singleton for non-DI usage
 */
export const sanitizer = new SanitizerService();
