/**
 * Toast Notifications
 *
 * Native toast notifications using burnt.
 * Provides a consistent API similar to sonner on web.
 */

import * as Burnt from "burnt";

export const toast = {
  /**
   * Show a success toast
   */
  success: (message: string) => {
    Burnt.toast({
      title: message,
      preset: "done",
      haptic: "success",
    });
  },

  /**
   * Show an error toast
   */
  error: (message: string) => {
    Burnt.toast({
      title: message,
      preset: "error",
      haptic: "error",
    });
  },

  /**
   * Show an info/default toast
   */
  info: (message: string) => {
    Burnt.toast({
      title: message,
      preset: "none",
      haptic: "warning",
    });
  },

  /**
   * Show a custom toast with title and message
   */
  message: (title: string, options?: { description?: string }) => {
    Burnt.toast({
      title,
      message: options?.description,
      preset: "none",
    });
  },
};
