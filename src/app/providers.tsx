"use client";

import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/ui/ToastProvider";
import OnboardingTour from "@/components/features/OnboardingTour";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <OnboardingTour />
        {children}
      </ToastProvider>
    </SessionProvider>
  );
}
