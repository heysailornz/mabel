"use client";

import * as React from "react";
import { useSidebarNotifications } from "@/hooks/use-sidebar-notifications";

type SidebarState = "expanded" | "collapsed";

interface SidebarContextValue {
  state: SidebarState;
  isOpen: boolean; // For mobile sheet
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
  expand: () => void;
  collapse: () => void;
  notifiedConversationIds: Set<string>;
  clearNotification: (conversationId: string) => void;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultState?: SidebarState;
}

export function SidebarProvider({
  children,
  defaultState = "collapsed",
}: SidebarProviderProps) {
  const [state, setState] = React.useState<SidebarState>(defaultState);
  const [isOpen, setIsOpen] = React.useState(false);
  const { notifiedConversationIds, clearNotification } = useSidebarNotifications();

  const toggle = React.useCallback(() => {
    setState((prev) => (prev === "expanded" ? "collapsed" : "expanded"));
  }, []);

  const expand = React.useCallback(() => setState("expanded"), []);
  const collapse = React.useCallback(() => setState("collapsed"), []);

  const value = React.useMemo(
    () => ({
      state,
      isOpen,
      setIsOpen,
      toggle,
      expand,
      collapse,
      notifiedConversationIds,
      clearNotification,
    }),
    [state, isOpen, toggle, expand, collapse, notifiedConversationIds, clearNotification]
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}
