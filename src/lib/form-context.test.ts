import { describe, it, expect } from "vitest";
import { initialFormData, type FormData, type CostItemEntry } from "./form-context";

describe("Form Context — Initial State", () => {
  it("initialFormData has empty personal details", () => {
    expect(initialFormData.personalDetails).toEqual({
      customerReference: "",
      forenames: "",
      surname: "",
      sex: "",
      dobDay: "",
      dobMonth: "",
      dobYear: "",
    });
  });

  it("initialFormData has empty address", () => {
    expect(initialFormData.address).toEqual({
      line1: "",
      line2: "",
      line3: "",
      postcode: "",
    });
  });

  it("initialFormData has empty university details", () => {
    expect(initialFormData.university).toEqual({
      universityName: "",
      courseName: "",
    });
  });

  it("initialFormData has empty contact details", () => {
    expect(initialFormData.contact).toEqual({
      notificationChannel: "",
      email: "",
      phone: "",
    });
  });

  it("initialFormData has empty costs array", () => {
    expect(initialFormData.costs).toEqual([]);
  });
});

describe("Form Context — Data Shape", () => {
  it("FormData sections are independent — updating one does not affect others", () => {
    const data: FormData = {
      ...initialFormData,
      personalDetails: {
        ...initialFormData.personalDetails,
        forenames: "Jane",
        surname: "Smith",
      },
    };

    // Personal details updated
    expect(data.personalDetails.forenames).toBe("Jane");
    expect(data.personalDetails.surname).toBe("Smith");

    // Other sections unchanged
    expect(data.address).toEqual(initialFormData.address);
    expect(data.university).toEqual(initialFormData.university);
    expect(data.contact).toEqual(initialFormData.contact);
    expect(data.costs).toEqual(initialFormData.costs);
  });

  it("partial updates to personal details preserve other fields", () => {
    const base = {
      ...initialFormData.personalDetails,
      forenames: "Alice",
      surname: "Brown",
      sex: "female",
    };

    const updated = { ...base, forenames: "Alicia" };

    expect(updated.forenames).toBe("Alicia");
    expect(updated.surname).toBe("Brown");
    expect(updated.sex).toBe("female");
  });

  it("costs array can hold multiple items", () => {
    const costs: CostItemEntry[] = [
      { id: "1", description: "Laptop", amount: "999.99", supplier: "Dell" },
      { id: "2", description: "Software", amount: "49.99", supplier: "Adobe" },
    ];

    const data: FormData = { ...initialFormData, costs };
    expect(data.costs).toHaveLength(2);
    expect(data.costs[0].description).toBe("Laptop");
    expect(data.costs[1].amount).toBe("49.99");
  });

  it("back-navigation scenario: updating earlier section preserves later sections", () => {
    // Simulate filling out multiple pages
    const filledData: FormData = {
      personalDetails: {
        customerReference: "CRN123",
        forenames: "John",
        surname: "Doe",
        sex: "male",
        dobDay: "15",
        dobMonth: "06",
        dobYear: "1990",
      },
      address: {
        line1: "10 Downing Street",
        line2: "",
        line3: "",
        postcode: "SW1A 2AA",
      },
      university: {
        universityName: "Oxford",
        courseName: "Computer Science",
      },
      contact: {
        notificationChannel: "email",
        email: "john@example.com",
        phone: "",
      },
      costs: [
        { id: "1", description: "Laptop", amount: "800.00", supplier: "Dell" },
      ],
    };

    // Simulate navigating back to personal details and changing forenames
    const afterBackNav: FormData = {
      ...filledData,
      personalDetails: {
        ...filledData.personalDetails,
        forenames: "Jonathan",
      },
    };

    // Personal details changed
    expect(afterBackNav.personalDetails.forenames).toBe("Jonathan");
    expect(afterBackNav.personalDetails.surname).toBe("Doe");

    // All subsequent page data preserved
    expect(afterBackNav.address.line1).toBe("10 Downing Street");
    expect(afterBackNav.address.postcode).toBe("SW1A 2AA");
    expect(afterBackNav.university.universityName).toBe("Oxford");
    expect(afterBackNav.contact.notificationChannel).toBe("email");
    expect(afterBackNav.contact.email).toBe("john@example.com");
    expect(afterBackNav.costs).toHaveLength(1);
    expect(afterBackNav.costs[0].description).toBe("Laptop");
  });
});
