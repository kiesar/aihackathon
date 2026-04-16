"use client";

import { FormProvider } from "@/lib/form-context";

export default function ApplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <FormProvider>{children}</FormProvider>;
}
