"use client";

import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";

interface MainContentProps {
  children: React.ReactNode;
}

export function MainContent({ children }: MainContentProps) {
  const { state } = useSidebar();

  return (
    <main
      className={cn(
        "transition-all duration-300 ease-in-out",
        // On mobile (below md), no padding since sidebar overlays
        // On md+, dynamic padding based on sidebar state
        state === "expanded" ? "md:pl-72" : "md:pl-16"
      )}
    >
      {children}
    </main>
  );
}
