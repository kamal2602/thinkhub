/**
 * Pass-through fields that should NOT be normalized, cleaned, or processed by smart intelligence.
 * These fields preserve the exact value from the Excel file throughout the entire workflow.
 *
 * Use case: cosmetic_notes should stay exactly as written by the supplier
 * without any standardization or learning.
 */

export const PASSTHROUGH_FIELDS = new Set([
  'cosmetic_notes',
  'specifications.cosmetic_notes',
  'specs.cosmetic_notes',
]);

/**
 * Check if a field should be treated as pass-through (no normalization/intelligence)
 */
export function isPassthroughField(fieldName: string): boolean {
  return PASSTHROUGH_FIELDS.has(fieldName);
}

/**
 * Check if a specification key should be treated as pass-through
 */
export function isPassthroughSpec(specKey: string): boolean {
  return PASSTHROUGH_FIELDS.has(`specifications.${specKey}`) ||
         PASSTHROUGH_FIELDS.has(`specs.${specKey}`) ||
         specKey === 'cosmetic_notes';
}

/**
 * Add a new pass-through field dynamically (for future extensibility)
 */
export function addPassthroughField(fieldName: string): void {
  PASSTHROUGH_FIELDS.add(fieldName);
}

/**
 * Get all pass-through fields
 */
export function getPassthroughFields(): string[] {
  return Array.from(PASSTHROUGH_FIELDS);
}
