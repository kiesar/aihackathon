"use client";

import { useState, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useFormContext, CostItemEntry } from "@/lib/form-context";
import {
  validateRequired,
  validateCostAmount,
  ValidationError,
} from "@/lib/validation";

const MAX_COST_ITEMS = 10;

let nextId = 1;
function generateId(): string {
  return `cost-${nextId++}`;
}

function createEmptyCostItem(): CostItemEntry {
  return { id: generateId(), description: "", amount: "", supplier: "" };
}

export default function CostsPage() {
  const router = useRouter();
  const { formData, setCosts } = useFormContext();

  const [items, setItems] = useState<CostItemEntry[]>(() =>
    formData.costs.length > 0 ? formData.costs : [createEmptyCostItem()]
  );
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  function getErrorForField(field: string): string | undefined {
    return errors.find((e) => e.field === field)?.message;
  }

  function updateItem(id: string, field: keyof Omit<CostItemEntry, "id">, value: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  function addItem() {
    if (items.length < MAX_COST_ITEMS) {
      setItems((prev) => [...prev, createEmptyCostItem()]);
    }
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function calculateTotal(): string {
    const total = items.reduce((sum, item) => {
      const parsed = parseFloat(item.amount);
      return sum + (isNaN(parsed) ? 0 : parsed);
    }, 0);
    return total.toFixed(2);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const newErrors: ValidationError[] = [];

    // Check at least one cost item exists
    if (items.length === 0) {
      newErrors.push({
        field: "costs",
        message: "You must add at least one cost item",
      });
    }

    // Validate each item
    items.forEach((item, index) => {
      const descErr = validateRequired(
        item.description,
        `description-${item.id}`,
        `a description for cost item ${index + 1}`
      );
      if (descErr) newErrors.push(descErr);

      const amountErr = validateCostAmount(item.amount, `amount-${item.id}`);
      if (amountErr) newErrors.push(amountErr);

      const supplierErr = validateRequired(
        item.supplier,
        `supplier-${item.id}`,
        `a supplier for cost item ${index + 1}`
      );
      if (supplierErr) newErrors.push(supplierErr);
    });

    setErrors(newErrors);

    if (newErrors.length > 0) {
      setTimeout(() => errorSummaryRef.current?.focus(), 0);
      return;
    }

    setCosts(items);
    router.push("/apply/check-answers");
  }

  return (
    <div className="govuk-width-container">
      <a
        href="#"
        className="govuk-back-link"
        onClick={(e) => {
          e.preventDefault();
          router.back();
        }}
      >
        Back
      </a>

      <main className="govuk-main-wrapper" id="main-content" role="main">
        {errors.length > 0 && (
          <div
            className="govuk-error-summary"
            aria-labelledby="error-summary-title"
            role="alert"
            tabIndex={-1}
            ref={errorSummaryRef}
            data-module="govuk-error-summary"
          >
            <h2 className="govuk-error-summary__title" id="error-summary-title">
              There is a problem
            </h2>
            <div className="govuk-error-summary__body">
              <ul className="govuk-list govuk-error-summary__list">
                {errors.map((err) => (
                  <li key={err.field}>
                    <a href={`#${err.field}`}>{err.message}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <h1 className="govuk-heading-l">Cost items</h1>
        <p className="govuk-body">
          Add the details of each disability-related cost you are claiming for.
          You can add up to {MAX_COST_ITEMS} cost items.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          {items.map((item, index) => {
            const descError = getErrorForField(`description-${item.id}`);
            const amountError = getErrorForField(`amount-${item.id}`);
            const supplierError = getErrorForField(`supplier-${item.id}`);

            return (
              <fieldset key={item.id} className="govuk-fieldset govuk-!-margin-bottom-6">
                <legend className="govuk-fieldset__legend govuk-fieldset__legend--m">
                  Cost item {index + 1}
                </legend>

                {/* Description */}
                <div className={`govuk-form-group${descError ? " govuk-form-group--error" : ""}`}>
                  <label className="govuk-label" htmlFor={`description-${item.id}`}>
                    Description of cost
                  </label>
                  {descError && (
                    <p id={`description-${item.id}-error`} className="govuk-error-message">
                      <span className="govuk-visually-hidden">Error:</span> {descError}
                    </p>
                  )}
                  <input
                    className={`govuk-input${descError ? " govuk-input--error" : ""}`}
                    id={`description-${item.id}`}
                    name={`description-${item.id}`}
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, "description", e.target.value)}
                    aria-describedby={descError ? `description-${item.id}-error` : undefined}
                  />
                </div>

                {/* Amount */}
                <div className={`govuk-form-group${amountError ? " govuk-form-group--error" : ""}`}>
                  <label className="govuk-label" htmlFor={`amount-${item.id}`}>
                    Amount in pounds (£)
                  </label>
                  {amountError && (
                    <p id={`amount-${item.id}-error`} className="govuk-error-message">
                      <span className="govuk-visually-hidden">Error:</span> {amountError}
                    </p>
                  )}
                  <div className="govuk-input__wrapper">
                    <div className="govuk-input__prefix" aria-hidden="true">£</div>
                    <input
                      className={`govuk-input govuk-input--width-10${amountError ? " govuk-input--error" : ""}`}
                      id={`amount-${item.id}`}
                      name={`amount-${item.id}`}
                      type="text"
                      inputMode="decimal"
                      value={item.amount}
                      onChange={(e) => updateItem(item.id, "amount", e.target.value)}
                      aria-describedby={amountError ? `amount-${item.id}-error` : undefined}
                    />
                  </div>
                </div>

                {/* Supplier */}
                <div className={`govuk-form-group${supplierError ? " govuk-form-group--error" : ""}`}>
                  <label className="govuk-label" htmlFor={`supplier-${item.id}`}>
                    Supplier name
                  </label>
                  {supplierError && (
                    <p id={`supplier-${item.id}-error`} className="govuk-error-message">
                      <span className="govuk-visually-hidden">Error:</span> {supplierError}
                    </p>
                  )}
                  <input
                    className={`govuk-input${supplierError ? " govuk-input--error" : ""}`}
                    id={`supplier-${item.id}`}
                    name={`supplier-${item.id}`}
                    type="text"
                    value={item.supplier}
                    onChange={(e) => updateItem(item.id, "supplier", e.target.value)}
                    aria-describedby={supplierError ? `supplier-${item.id}-error` : undefined}
                  />
                </div>

                {/* Remove button — only show if more than one item */}
                {items.length > 1 && (
                  <button
                    type="button"
                    className="govuk-button govuk-button--secondary"
                    onClick={() => removeItem(item.id)}
                  >
                    Remove cost item {index + 1}
                  </button>
                )}
              </fieldset>
            );
          })}

          {/* Running total */}
          <div className="govuk-inset-text" id="costs">
            <p className="govuk-body govuk-!-font-weight-bold">
              Total: £{calculateTotal()}
            </p>
          </div>

          {/* Add another button */}
          <div className="govuk-!-margin-bottom-6">
            <button
              type="button"
              className="govuk-button govuk-button--secondary"
              onClick={addItem}
              disabled={items.length >= MAX_COST_ITEMS}
            >
              Add another cost item
            </button>
          </div>

          <button type="submit" className="govuk-button" data-module="govuk-button">
            Continue
          </button>
        </form>
      </main>
    </div>
  );
}
