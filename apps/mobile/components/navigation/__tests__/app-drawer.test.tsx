import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useState, useCallback } from "react";

// Test the drawer navigation logic without React Native dependencies
// This tests the core business logic that can be extracted from AppDrawerContent

interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface UseDrawerNavigationOptions {
  pathname: string;
  notifiedConversationIds: Set<string>;
  onNavigate: (path: string) => void;
  onClearNotification: (id: string) => void;
}

function useDrawerNavigation(options: UseDrawerNavigationOptions) {
  const { pathname, notifiedConversationIds, onNavigate, onClearNotification } = options;

  const navigateToConversation = useCallback(
    (id: string) => {
      onClearNotification(id);
      onNavigate(`/(app)/c/${id}`);
    },
    [onClearNotification, onNavigate]
  );

  const navigateToNewChat = useCallback(() => {
    onNavigate("/(app)");
  }, [onNavigate]);

  const isConversationActive = useCallback(
    (conversationId: string) => {
      return pathname === `/c/${conversationId}`;
    },
    [pathname]
  );

  const hasNotification = useCallback(
    (conversationId: string) => {
      return notifiedConversationIds.has(conversationId);
    },
    [notifiedConversationIds]
  );

  const getConversationTitle = useCallback((conversation: Conversation) => {
    return conversation.title || "New Conversation";
  }, []);

  const getUserInitials = useCallback((email: string | null | undefined) => {
    return email ? email[0].toUpperCase() : "U";
  }, []);

  return {
    navigateToConversation,
    navigateToNewChat,
    isConversationActive,
    hasNotification,
    getConversationTitle,
    getUserInitials,
  };
}

describe("AppDrawer Navigation Logic", () => {
  const mockOnNavigate = vi.fn();
  const mockOnClearNotification = vi.fn();

  const defaultOptions: UseDrawerNavigationOptions = {
    pathname: "/",
    notifiedConversationIds: new Set<string>(),
    onNavigate: mockOnNavigate,
    onClearNotification: mockOnClearNotification,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Navigation", () => {
    it("navigates to new chat", () => {
      const { result } = renderHook(() => useDrawerNavigation(defaultOptions));

      act(() => {
        result.current.navigateToNewChat();
      });

      expect(mockOnNavigate).toHaveBeenCalledWith("/(app)");
    });

    it("navigates to conversation and clears notification", () => {
      const { result } = renderHook(() => useDrawerNavigation(defaultOptions));

      act(() => {
        result.current.navigateToConversation("conv-123");
      });

      expect(mockOnClearNotification).toHaveBeenCalledWith("conv-123");
      expect(mockOnNavigate).toHaveBeenCalledWith("/(app)/c/conv-123");
    });
  });

  describe("Active State", () => {
    it("returns true for active conversation", () => {
      const { result } = renderHook(() =>
        useDrawerNavigation({
          ...defaultOptions,
          pathname: "/c/conv-123",
        })
      );

      expect(result.current.isConversationActive("conv-123")).toBe(true);
    });

    it("returns false for inactive conversation", () => {
      const { result } = renderHook(() =>
        useDrawerNavigation({
          ...defaultOptions,
          pathname: "/c/conv-456",
        })
      );

      expect(result.current.isConversationActive("conv-123")).toBe(false);
    });

    it("returns false when on home page", () => {
      const { result } = renderHook(() =>
        useDrawerNavigation({
          ...defaultOptions,
          pathname: "/",
        })
      );

      expect(result.current.isConversationActive("conv-123")).toBe(false);
    });
  });

  describe("Notifications", () => {
    it("returns true for conversation with notification", () => {
      const { result } = renderHook(() =>
        useDrawerNavigation({
          ...defaultOptions,
          notifiedConversationIds: new Set(["conv-123"]),
        })
      );

      expect(result.current.hasNotification("conv-123")).toBe(true);
    });

    it("returns false for conversation without notification", () => {
      const { result } = renderHook(() =>
        useDrawerNavigation({
          ...defaultOptions,
          notifiedConversationIds: new Set(["conv-456"]),
        })
      );

      expect(result.current.hasNotification("conv-123")).toBe(false);
    });

    it("returns false when no notifications exist", () => {
      const { result } = renderHook(() =>
        useDrawerNavigation({
          ...defaultOptions,
          notifiedConversationIds: new Set(),
        })
      );

      expect(result.current.hasNotification("conv-123")).toBe(false);
    });
  });

  describe("Title Formatting", () => {
    it("returns conversation title when present", () => {
      const { result } = renderHook(() => useDrawerNavigation(defaultOptions));

      const conversation: Conversation = {
        id: "conv-1",
        title: "My Conversation",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: "user-1",
      };

      expect(result.current.getConversationTitle(conversation)).toBe("My Conversation");
    });

    it("returns fallback when title is null", () => {
      const { result } = renderHook(() => useDrawerNavigation(defaultOptions));

      const conversation: Conversation = {
        id: "conv-1",
        title: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: "user-1",
      };

      expect(result.current.getConversationTitle(conversation)).toBe("New Conversation");
    });

    it("returns fallback when title is empty string", () => {
      const { result } = renderHook(() => useDrawerNavigation(defaultOptions));

      const conversation: Conversation = {
        id: "conv-1",
        title: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: "user-1",
      };

      expect(result.current.getConversationTitle(conversation)).toBe("New Conversation");
    });
  });

  describe("User Initials", () => {
    it("returns first letter uppercase for email", () => {
      const { result } = renderHook(() => useDrawerNavigation(defaultOptions));

      expect(result.current.getUserInitials("test@example.com")).toBe("T");
    });

    it("returns first letter uppercase for different email", () => {
      const { result } = renderHook(() => useDrawerNavigation(defaultOptions));

      expect(result.current.getUserInitials("alice@example.com")).toBe("A");
    });

    it("returns U for null email", () => {
      const { result } = renderHook(() => useDrawerNavigation(defaultOptions));

      expect(result.current.getUserInitials(null)).toBe("U");
    });

    it("returns U for undefined email", () => {
      const { result } = renderHook(() => useDrawerNavigation(defaultOptions));

      expect(result.current.getUserInitials(undefined)).toBe("U");
    });
  });
});
