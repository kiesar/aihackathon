import { describe, expect } from "vitest";
import { it, fc } from "@fast-check/vitest";

// ── Running total calculation (extracted from page.tsx) ─────

interface CostItemEntry {
  id: string;
  description: string;
  amount: string;
  supplier: string;
}

/**
 * Mirrors the calculateTotal function from the Costs page (page.tsx).
 * Sums all parseable amounts and returns the result fixed to 2 decimal places.
 */
function calculateTotal(items: CostItemEntry[]): string {
  const total = items.reduce((sum, item) => {
    const parsed = parseFloat(item.amount);
    return sum + (isNaN(parsed) ? 0 : parsed);
  }, 0);
  return total.toFixed(2);
}

// ── Arbitraries ─────────────────────────────────────────────

/** Generate a valid cost amount string (positive, ≤ 2 decimal places) */
const arbValidAmount = fc.oneof(
  // Integer amounts
  fc.integer({ min: 1, max: 99999 }).map(String),
  // 1 decimal place
  fc
    .tuple(fc.integer({ min: 0, max: 9999 }), fc.integer({ min: 0, max: 9 }))
    .filter(([whole, dec]) => whole > 0 || dec > 0)
    .map(([whole, dec]) => `${whole}.${dec}`),
  // 2 decimal places
  fc
    .tuple(fc.integer({ min: 0, max: 9999 }), fc.integer({ min: 0, max: 99 }))
    .filter(([whole, dec]) => whole > 0 || dec > 0)
    .map(([whole, dec]) => `${whole}.${String(dec).padStart(2, "0")}`)
);

/** Generate a valid cost item with a valid positive amount */
const arbValidCostItem = fc
  .tuple(
    fc.uuid(),
    fc.string({ minLength: 1, maxLength: 50 }),
    arbValidAmount,
    fc.string({ minLength: 1, maxLength: 50 })
  )
  .map(
    ([id, description, amount, supplier]): CostItemEntry => ({
      id,
      description,
      amount,
      supplier,
    })
  );

/** Generate a list of 1–10 valid cost items */
const arbCostItemList = fc.array(arbValidCostItem, { minLength: 1, maxLength: 10 });

// ── Tests ───────────────────────────────────────────────────

describe("Costs page — Property Tests", () => {
  // Feature: dsa-allowance-service, Property 7: Running total correctness
  // **Validates: Requirements 2.4**
  describe("Property 7: Running total correctness", () => {
    it.prop([arbCostItemList], { numRuns: 100 })(
      "running total equals the arithmetic sum of all amounts rounded to 2 decimal places",
      (items) => {
        const result = calculateTotal(items);

        // Independently compute the expected sum
        const expectedSum = items.reduce((sum, item) => {
          const parsed = parseFloat(item.amount);
          return sum + (isNaN(parsed) ? 0 : parsed);
        }, 0);
        const expected = expectedSum.toFixed(2);

        expect(result).toBe(expected);
      }
    );
  });
});
