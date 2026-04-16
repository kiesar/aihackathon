// Shared validation functions for the DSA Allowance Service
// Each validator returns a GOV.UK-style error object { field, message } or null (valid)

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validates that a required field is not empty.
 */
export function validateRequired(
  value: string | undefined | null,
  field: string,
  label: string
): ValidationError | null {
  if (value === undefined || value === null || value.trim() === "") {
    return { field, message: `Enter ${label}` };
  }
  return null;
}

/**
 * Validates a date of birth string in DD/MM/YYYY format.
 * Checks that it is a real calendar date and the applicant is at least 16 years old.
 */
export function validateDateOfBirth(
  value: string,
  field: string = "dateOfBirth"
): ValidationError | null {
  if (!value || value.trim() === "") {
    return { field, message: "Enter your date of birth" };
  }

  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return { field, message: "Enter a valid date of birth in DD/MM/YYYY format" };
  }

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  // Check month range
  if (month < 1 || month > 12) {
    return { field, message: "Enter a valid date of birth in DD/MM/YYYY format" };
  }

  // Check day range for the given month/year
  // Using Date constructor: month is 0-indexed, day 0 gives last day of previous month
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    return { field, message: "Enter a valid date of birth in DD/MM/YYYY format" };
  }

  // Check age >= 16
  const birthDate = new Date(year, month - 1, day);
  const today = new Date();
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  let age = todayDateOnly.getFullYear() - birthDate.getFullYear();
  const monthDiff = todayDateOnly.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && todayDateOnly.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age < 16) {
    return { field, message: "You must be at least 16 years old to apply" };
  }

  return null;
}

/**
 * Validates a UK postcode format.
 * Accepts formats like: A1 1AA, A11 1AA, A1A 1AA, AA1 1AA, AA11 1AA, AA1A 1AA
 * Case-insensitive, optional space between outward and inward codes.
 */
export function validatePostcode(
  value: string,
  field: string = "postcode"
): ValidationError | null {
  if (!value || value.trim() === "") {
    return { field, message: "Enter a postcode" };
  }

  // Standard UK postcode regex (case-insensitive, optional space)
  const postcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;

  if (!postcodeRegex.test(value.trim())) {
    return { field, message: "Enter a real UK postcode" };
  }

  return null;
}

/**
 * Validates a cost amount: must be a positive number with no more than 2 decimal places.
 */
export function validateCostAmount(
  value: string,
  field: string = "amount"
): ValidationError | null {
  if (!value || value.trim() === "") {
    return { field, message: "Enter an amount" };
  }

  // Must be a valid numeric format: digits, optional decimal point with up to 2 decimal places
  const amountRegex = /^\d+(\.\d{1,2})?$/;
  if (!amountRegex.test(value.trim())) {
    return {
      field,
      message: "Enter an amount in pounds and pence, for example 125.50",
    };
  }

  const num = parseFloat(value.trim());
  if (num <= 0) {
    return {
      field,
      message: "Enter an amount greater than zero",
    };
  }

  return null;
}

/**
 * Validates an email address format.
 */
export function validateEmail(
  value: string,
  field: string = "email"
): ValidationError | null {
  if (!value || value.trim() === "") {
    return { field, message: "Enter an email address" };
  }

  // Basic email regex: local@domain.tld
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value.trim())) {
    return { field, message: "Enter an email address in the correct format, like name@example.com" };
  }

  return null;
}

/**
 * Validates a UK phone number format.
 * Accepts UK mobile numbers starting with 07, +447, or 00447.
 * Must have 11 digits (for 07 format) after removing spaces and dashes.
 */
export function validateUkPhoneNumber(
  value: string,
  field: string = "phone"
): ValidationError | null {
  if (!value || value.trim() === "") {
    return { field, message: "Enter a UK mobile phone number" };
  }

  // Strip spaces, dashes, and parentheses
  const cleaned = value.trim().replace(/[\s\-()]/g, "");

  // Accept +447XXXXXXXXX (13 chars), 00447XXXXXXXXX (14 chars), or 07XXXXXXXXX (11 chars)
  const ukMobileRegex = /^(?:\+44|0044)7\d{9}$|^07\d{9}$/;
  if (!ukMobileRegex.test(cleaned)) {
    return {
      field,
      message: "Enter a UK mobile phone number, like 07700 900000",
    };
  }

  return null;
}
