import { describe, it, expect } from "vitest";
import {
  validateRequired,
  validateCostAmount,
  ValidationError,
} from "@/lib/validation";

/**
 * Tests for the Costs page validation logic.
 * Validates: cost item description (required), amount (positive, ≤2dp),
 * supplier (required), and at least one cost item present.
 */

interface CostInput {
  id: string;
  description: string;
  amount: string;
  supplier: string;
}

function validateCosts(items: CostInput[]): ValidationError[] {
  const errors: ValidationError[] = [];

  if (items.length === 0) {
    errors.push({
      field: "costs",
      message: "You must add at least one cost item",
    });
  }

  items.forEach((item, index) => {
    const descErr = validateRequired(
      item.description,
      `description-${item.id}`,
      `a description for cost item ${index + 1}`
    );
    if (descErr) errors.push(descErr);

    const amountErr = validateCostAmount(item.amount, `amount-${item.id}`);
    if (amountErr) errors.push(amountErr);

    const supplierErr = validateRequired(
      item.supplier,
      `supplier-${item.id}`,
      `a supplier for cost item ${index + 1}`
    );
    if (supplierErr) errors.push(supplierErr);
  });

  return errors;
}

describe("Costs page — Validation", () => {
  it("accepts a valid cost item", () => {
    const errors = validateCosts([
      { id: "1", description: "Laptop", amount: "500.00", supplier: "Dell" },
    ]);
    expect(errors).toHaveLength(0);
  });

  it("accepts multiple valid cost items", () => {
    const errors = validateCosts([
      { id: "1", description: "Laptop", amount: "500", supplier: "Dell" },
      { id: "2", description: "Software", amount: "99.99", supplier: "Adobe" },
    ]);
    expect(errors).toHaveLength(0);
  });

  it("errors when zero cost items are provided", () => {
    const errors = validateCosts([]);
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("costs");
    expect(errors[0].message).toContain("at least one cost item");
  });

  it("requires description", () => {
    const errors = validateCosts([
      { id: "1", description: "", amount: "100", supplier: "Acme" },
    ]);
    expect(errors.some((e) => e.field === "description-1")).toBe(true);
  });

  it("requires supplier", () => {
    const errors = validateCosts([
      { id: "1", description: "Laptop", amount: "100", supplier: "" },
    ]);
    expect(errors.some((e) => e.field === "supplier-1")).toBe(true);
  });

  it("requires amount", () => {
    const errors = validateCosts([
      { id: "1", description: "Laptop", amount: "", supplier: "Dell" },
    ]);
    expect(errors.some((e) => e.field === "amount-1")).toBe(true);
  });

  it("rejects negative amount", () => {
    const errors = validateCosts([
      { id: "1", description: "Laptop", amount: "-50", supplier: "Dell" },
    ]);
    expect(errors.some((e) => e.field === "amount-1")).toBe(true);
  });

  it("rejects amount with more than 2 decimal places", () => {
    const errors = validateCosts([
      { id: "1", description: "Laptop", amount: "100.999", supplier: "Dell" },
    ]);
    expect(errors.some((e) => e.field === "amount-1")).toBe(true);
  });

  it("rejects non-numeric amount", () => {
    const errors = validateCosts([
      { id: "1", description: "Laptop", amount: "abc", supplier: "Dell" },
    ]);
    expect(errors.some((e) => e.field === "amount-1")).toBe(true);
  });

  it("accepts amount with 1 decimal place", () => {
    const errors = validateCosts([
      { id: "1", description: "Laptop", amount: "100.5", supplier: "Dell" },
    ]);
    expect(errors).toHaveLength(0);
  });

  it("accepts whole number amount", () => {
    const errors = validateCosts([
      { id: "1", description: "Laptop", amount: "100", supplier: "Dell" },
    ]);
    expect(errors).toHaveLength(0);
  });

  it("collects errors from multiple items", () => {
    const errors = validateCosts([
      { id: "1", description: "", amount: "", supplier: "" },
      { id: "2", description: "", amount: "", supplier: "" },
    ]);
    // 3 errors per item × 2 items = 6
    expect(errors).toHaveLength(6);
  });
});

describe("Costs page — Running total", () => {
  function calculateTotal(items: CostInput[]): string {
    const total = items.reduce((sum, item) => {
      const parsed = parseFloat(item.amount);
      return sum + (isNaN(parsed) ? 0 : parsed);
    }, 0);
    return total.toFixed(2);
  }

  it("returns 0.00 for empty list", () => {
    expect(calculateTotal([])).toBe("0.00");
  });

  it("sums a single item", () => {
    expect(
      calculateTotal([{ id: "1", description: "A", amount: "125.50", supplier: "B" }])
    ).toBe("125.50");
  });

  it("sums multiple items", () => {
    expect(
      calculateTotal([
        { id: "1", description: "A", amount: "100", supplier: "B" },
        { id: "2", description: "C", amount: "50.25", supplier: "D" },
        { id: "3", description: "E", amount: "0.75", supplier: "F" },
      ])
    ).toBe("151.00");
  });

  it("ignores non-numeric amounts in total", () => {
    expect(
      calculateTotal([
        { id: "1", description: "A", amount: "abc", supplier: "B" },
        { id: "2", description: "C", amount: "50", supplier: "D" },
      ])
    ).toBe("50.00");
  });
});
