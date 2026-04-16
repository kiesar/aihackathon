"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

// ── Form Data Shape ─────────────────────────────────────────

export interface PersonalDetails {
  customerReference: string;
  forenames: string;
  surname: string;
  sex: string;
  dobDay: string;
  dobMonth: string;
  dobYear: string;
}

export interface AddressDetails {
  line1: string;
  line2: string;
  line3: string;
  postcode: string;
}

export interface UniversityDetails {
  universityName: string;
  courseName: string;
}

export interface ContactDetails {
  notificationChannel: string;
  email: string;
  phone: string;
}

export interface CostItemEntry {
  id: string;
  description: string;
  amount: string;
  supplier: string;
}

export interface FormData {
  personalDetails: PersonalDetails;
  address: AddressDetails;
  university: UniversityDetails;
  contact: ContactDetails;
  costs: CostItemEntry[];
}

export const initialFormData: FormData = {
  personalDetails: {
    customerReference: "",
    forenames: "",
    surname: "",
    sex: "",
    dobDay: "",
    dobMonth: "",
    dobYear: "",
  },
  address: {
    line1: "",
    line2: "",
    line3: "",
    postcode: "",
  },
  university: {
    universityName: "",
    courseName: "",
  },
  contact: {
    notificationChannel: "",
    email: "",
    phone: "",
  },
  costs: [],
};

// ── Context ─────────────────────────────────────────────────

export interface FormContextValue {
  formData: FormData;
  updatePersonalDetails: (data: Partial<PersonalDetails>) => void;
  updateAddress: (data: Partial<AddressDetails>) => void;
  updateUniversity: (data: Partial<UniversityDetails>) => void;
  updateContact: (data: Partial<ContactDetails>) => void;
  setCosts: (costs: CostItemEntry[]) => void;
  resetForm: () => void;
}

const FormContext = createContext<FormContextValue | undefined>(undefined);

// ── Provider ────────────────────────────────────────────────

export function FormProvider({ children }: { children: React.ReactNode }) {
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const updatePersonalDetails = useCallback(
    (data: Partial<PersonalDetails>) => {
      setFormData((prev) => ({
        ...prev,
        personalDetails: { ...prev.personalDetails, ...data },
      }));
    },
    []
  );

  const updateAddress = useCallback((data: Partial<AddressDetails>) => {
    setFormData((prev) => ({
      ...prev,
      address: { ...prev.address, ...data },
    }));
  }, []);

  const updateUniversity = useCallback((data: Partial<UniversityDetails>) => {
    setFormData((prev) => ({
      ...prev,
      university: { ...prev.university, ...data },
    }));
  }, []);

  const updateContact = useCallback((data: Partial<ContactDetails>) => {
    setFormData((prev) => ({
      ...prev,
      contact: { ...prev.contact, ...data },
    }));
  }, []);

  const setCosts = useCallback((costs: CostItemEntry[]) => {
    setFormData((prev) => ({ ...prev, costs }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
  }, []);

  const value: FormContextValue = {
    formData,
    updatePersonalDetails,
    updateAddress,
    updateUniversity,
    updateContact,
    setCosts,
    resetForm,
  };

  return React.createElement(FormContext.Provider, { value }, children);
}

// ── Hook ────────────────────────────────────────────────────

export function useFormContext(): FormContextValue {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error("useFormContext must be used within a FormProvider");
  }
  return context;
}
