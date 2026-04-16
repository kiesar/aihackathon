import { describe, expect } from "vitest";
import { it, fc } from "@fast-check/vitest";
import { validateRequired, ValidationError } from "./validation";

// ── Helper: simulates a form page with required fields ──────

interface FieldDefinition {
  field: string;
  label: string;
  value: string;
}

/**
 * Validates a set of required fields, mirroring how a form page
 * calls validateRequired for each required field and collects errors
 * into both an error summary list and inline error objects.
 */
function validatePage(fields: FieldDefinition[]): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const f of fields) {
    const err = validateRequired(f.value, f.field, f.label);
    if (err) errors.push(err);
  }
  return errors;
}

// ── Arbitraries ─────────────────────────────────────────────

/** Generate a non-blank value (at least one non-whitespace character) */
const arbNonBlankValue = fc
  .stringOf(fc.constantFrom("a", "b", "c", "1", "2", " ", "X"), {
    minLength: 1,
    maxLength: 20,
  })
  .filter((s) => s.trim().length > 0);

/** Generate a blank value (empty, whitespace-only, undefined-like) */
const arbBlankValue = fc.constantFrom("", "   ", "  ", "\t", " \t ");

/** Generate a valid field name (lowercase letters + optional digits) */
const arbFieldName = fc
  .stringOf(fc.constantFrom("a", "b", "c", "d", "e", "f", "g", "h"), {
    minLength: 2,
    maxLength: 10,
  })
  .map((s, i) => `${s}${i ?? ""}`);

/** Generate a human-readable label */
const arbLabel = fc
  .constantFrom(
    "your forename(s)",
    "your surname",
    "your address",
    "your postcode",
    "your university",
    "your course name",
    "a description",
    "a supplier name",
  );

/** Generate a field definition with a specific value */
function arbFieldDef(arbValue: fc.Arbitrary<string>): fc.Arbitrary<FieldDefinition> {
  return fc.record({
    field: arbFieldName,
    label: arbLabel,
    value: arbValue,
  });
}

/**
 * Generate a list of field definitions where at least one is blank.
 * Returns { fields, blankIndices } so we know which ones should error.
 */
const arbFieldsWithSomeBlanks = fc
  .record({
    filledFields: fc.array(arbFieldDef(arbNonBlankValue), { minLength: 0, maxLength: 5 }),
    blankFields: fc.array(arbFieldDef(arbBlankValue), { minLength: 1, maxLength: 5 }),
  })
  .chain(({ filledFields, blankFields }) => {
    // Ensure unique field names by appending index
    const allFields = [
      ...filledFields.map((f, i) => ({ ...f, field: `filled_${i}` })),
      ...blankFields.map((f, i) => ({ ...f, field: `blank_${i}` })),
    ];
    return fc.shuffledSubarray(allFields, {
      minLength: allFields.length,
      maxLength: allFields.length,
    }).map((shuffled) => ({
      fields: shuffled,
      blankFieldNames: blankFields.map((_, i) => `blank_${i}`),
      filledFieldNames: filledFields.map((_, i) => `filled_${i}`),
    }));
  });

/** Generate a list of fields where ALL are blank */
const arbAllBlankFields = fc
  .array(arbFieldDef(arbBlankValue), { minLength: 1, maxLength: 6 })
  .map((fields) => fields.map((f, i) => ({ ...f, field: `field_${i}` })));

/** Generate a list of fields where ALL are filled */
const arbAllFilledFields = fc
  .array(arbFieldDef(arbNonBlankValue), { minLength: 1, maxLength: 6 })
  .map((fields) => fields.map((f, i) => ({ ...f, field: `field_${i}` })));

// ── Tests ───────────────────────────────────────────────────

// Feature: dsa-allowance-service, Property 2: Required field validation completeness
// **Validates: Requirements 1.4**
describe("Property 2: Required field validation completeness", () => {
  it.prop([arbFieldsWithSomeBlanks], { numRuns: 100 })(
    "for any set of required fields with some blank, each blank field produces an error with both field and message",
    ({ fields, blankFieldNames, filledFieldNames }) => {
      const errors = validatePage(fields);
      const errorFieldNames = errors.map((e) => e.field);

      // Every blank field must have a corresponding error
      for (const blankName of blankFieldNames) {
        expect(errorFieldNames).toContain(blankName);
      }

      // Every error must have a non-empty field (for inline display) and message (for summary)
      for (const err of errors) {
        expect(err.field).toBeTruthy();
        expect(typeof err.field).toBe("string");
        expect(err.field.length).toBeGreaterThan(0);

        expect(err.message).toBeTruthy();
        expect(typeof err.message).toBe("string");
        expect(err.message.length).toBeGreaterThan(0);
      }

      // Filled fields must NOT produce errors
      for (const filledName of filledFieldNames) {
        expect(errorFieldNames).not.toContain(filledName);
      }
    },
  );

  it.prop([arbAllBlankFields], { numRuns: 100 })(
    "when all required fields are blank, every field has an error in the summary",
    (fields) => {
      const errors = validatePage(fields);

      // Error count must equal field count — one error per blank field
      expect(errors.length).toBe(fields.length);

      // Each field must appear exactly once in the errors
      const errorFieldNames = errors.map((e) => e.field);
      for (const f of fields) {
        expect(errorFieldNames).toContain(f.field);
      }

      // Each error has both field (inline) and message (summary)
      for (const err of errors) {
        expect(err.field.length).toBeGreaterThan(0);
        expect(err.message.length).toBeGreaterThan(0);
      }
    },
  );

  it.prop([arbAllFilledFields], { numRuns: 100 })(
    "when all required fields are filled, no errors are produced",
    (fields) => {
      const errors = validatePage(fields);
      expect(errors).toHaveLength(0);
    },
  );

  it.prop(
    [arbBlankValue, arbFieldName, arbLabel],
    { numRuns: 100 },
  )(
    "each individual blank field error contains the field identifier and a descriptive message",
    (blankValue, fieldName, label) => {
      const error = validateRequired(blankValue, fieldName, label);

      // Must produce an error
      expect(error).not.toBeNull();

      // field property matches the field identifier (for inline error targeting)
      expect(error!.field).toBe(fieldName);

      // message contains the label text (for the error summary display)
      expect(error!.message).toContain(label);

      // message is non-empty
      expect(error!.message.length).toBeGreaterThan(0);
    },
  );
});
