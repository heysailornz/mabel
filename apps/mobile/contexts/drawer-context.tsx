import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useDrawerNotifications } from "@/hooks/use-drawer-notifications";

interface DrawerContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  notifiedConversationIds: Set<string>;
  clearNotification: (conversationId: string) => void;
}

const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const { notifiedConversationIds, clearNotification } = useDrawerNotifications();

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  const value = useMemo(
    () => ({
      isOpen,
      open,
      close,
      toggle,
      notifiedConversationIds,
      clearNotification,
    }),
    [isOpen, open, close, toggle, notifiedConversationIds, clearNotification]
  );

  return (
    <DrawerContext.Provider value={value}>
      {children}
    </DrawerContext.Provider>
  );
}

export function useDrawer() {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error("useDrawer must be used within a DrawerProvider");
  }
  return context;
}
