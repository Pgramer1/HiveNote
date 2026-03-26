"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { ArrowRight, CheckCircle2, Compass, Heart, Upload, UserCircle2, X } from "lucide-react";

type TourStep = {
  title: string;
  description: string;
  href: string;
  cta: string;
  selector: string;
  targetName: string;
  icon: React.ComponentType<{ className?: string }>;
};

export default function OnboardingTour() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [stepIndex, setStepIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const userKey = session?.user?.email ? `hivenote:onboarding:v1:${session.user.email}` : null;

  const isUniversityUser = Boolean((session?.user as { isUniversityEmail?: boolean } | undefined)?.isUniversityEmail);

  const steps = useMemo<TourStep[]>(() => {
    if (isUniversityUser) {
      return [
        {
          title: "Use the My University tab",
          description: "This tab takes you straight to your department and semester structure.",
          href: "/university",
          cta: "Go to My University",
          selector: '[data-onboarding-target="nav-university"]',
          targetName: "My University tab",
          icon: Compass,
        },
        {
          title: "Use the Upload button",
          description: "Upload notes/PPT/links here and tag them with department, semester, and subject.",
          href: "/resources/upload",
          cta: "Open Upload",
          selector: '[data-onboarding-target="nav-upload"]',
          targetName: "Upload button",
          icon: Upload,
        },
        {
          title: "Use the Favorites tab",
          description: "Save useful resources and revisit them quickly during revision.",
          href: "/my-favorites",
          cta: "View Favorites",
          selector: '[data-onboarding-target="nav-favorites"]',
          targetName: "Favorites tab",
          icon: Heart,
        },
        {
          title: "Access your profile from avatar",
          description: "Open your profile to view your uploads and manage your account details.",
          href: "/me",
          cta: "Open Profile",
          selector: '[data-onboarding-target="nav-profile"]',
          targetName: "Profile avatar",
          icon: UserCircle2,
        },
      ];
    }

    return [
      {
        title: "Use the Upload button",
        description: "When your account has access, this button is where you submit resources.",
        href: "/resources/upload",
        cta: "Open Upload",
        selector: '[data-onboarding-target="nav-upload"]',
        targetName: "Upload button",
        icon: Upload,
      },
      {
        title: "Use the Favorites tab",
        description: "Bookmark useful resources and access them quickly from here.",
        href: "/my-favorites",
        cta: "Open Favorites",
        selector: '[data-onboarding-target="nav-favorites"]',
        targetName: "Favorites tab",
        icon: Heart,
      },
      {
        title: "Open your profile from avatar",
        description: "Your profile helps track activity, uploads, and account-level actions.",
        href: "/me",
        cta: "Open Profile",
        selector: '[data-onboarding-target="nav-profile"]',
        targetName: "Profile avatar",
        icon: UserCircle2,
      },
    ];
  }, [isUniversityUser]);

  const shouldShow = (() => {
    if (dismissed || status !== "authenticated" || !userKey) return false;
    if (typeof window === "undefined") return false;

    const hiddenRoutes = ["/auth", "/api/auth"];
    if (hiddenRoutes.some((route) => pathname.startsWith(route))) return false;

    return localStorage.getItem(userKey) !== "done";
  })();

  useEffect(() => {
    if (!shouldShow) return;
    const step = steps[stepIndex];
    const target = document.querySelector(step.selector) as HTMLElement | null;
    if (!target) return;

    target.classList.add("onboarding-target-highlight");
    target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

    return () => {
      target.classList.remove("onboarding-target-highlight");
    };
  }, [shouldShow, stepIndex, steps]);

  const completeOnboarding = () => {
    if (userKey) {
      localStorage.setItem(userKey, "done");
    }
    setDismissed(true);
  };

  if (!shouldShow) {
    return null;
  }

  const step = steps[stepIndex];
  const Icon = step.icon;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  return (
    <div className="fixed inset-0 z-80 flex items-end justify-center md:justify-end p-4 pointer-events-none">
      <div className="pointer-events-auto w-full md:w-120 rounded-2xl border bg-background/95 backdrop-blur shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold">First-time walkthrough</p>
            <h2 className="text-xl font-bold">Welcome to HiveNote</h2>
          </div>
          <button
            aria-label="Close onboarding"
            onClick={completeOnboarding}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Step {stepIndex + 1} of {steps.length}
          </div>

          <div className="rounded-lg border bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
            Highlighted target: <span className="font-semibold text-foreground">{step.targetName}</span>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold leading-tight">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href={step.href} className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
              {step.cta}
              <ArrowRight className="w-4 h-4" />
            </Link>

            {!isFirst && (
              <Button variant="outline" onClick={() => setStepIndex((value) => Math.max(0, value - 1))}>
                Back
              </Button>
            )}

            {!isLast ? (
              <Button variant="outline" onClick={() => setStepIndex((value) => Math.min(steps.length - 1, value + 1))}>
                Next
              </Button>
            ) : (
              <Button onClick={completeOnboarding}>
                Finish
              </Button>
            )}

            <Button variant="ghost" onClick={completeOnboarding}>
              Skip
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
