/**
 * @packageDocumentation
 * Foundation utilities for the CRM application.
 * Provides browser compatibility checks, DOM utilities, and helper functions.
 * @module @crm/foundations
 */

export { default as CompatibilityValidator } from "./CompatibilityValidator";
export { default as DomGuard } from "./dom/DomGuard";
export { default as DeepFreeze } from "./globals/deepFreeze";
export { default as DeepSeal } from "./globals/deepSeal";
export { default as EventBinder } from "./dom/EventBinder.js";
export { default as DateMapper } from "./dates/DateMapper.js";
export { default as DateValidator } from "./dates/DateValidator.js";
export { default as DOMValidator } from "./dom/DOMValidator.js";
