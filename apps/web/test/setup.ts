import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock next/navigation
const mockPathname = vi.fn(() => "/");
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Export for tests to control
export { mockPathname };

// Type for realtime callback handlers
type RealtimeCallback = (payload: unknown) => void;
type SubscribeCallback = (status: string) => void;

// Store callbacks for triggering in tests
export const realtimeCallbacks: Map<string, RealtimeCallback[]> = new Map();
export const subscribeCallbacks: Map<string, SubscribeCallback> = new Map();

// Helper to simulate realtime events in tests
export function simulateRealtimeEvent(
  channelName: string,
  event: "INSERT" | "UPDATE" | "DELETE",
  table: string,
  payload: Record<string, unknown>
) {
  const key = `${channelName}:${event}:${table}`;
  const callbacks = realtimeCallbacks.get(key) || [];
  callbacks.forEach((cb) => cb({ new: payload, old: null, eventType: event }));
}

// Helper to simulate subscription status
export function simulateSubscriptionStatus(
  channelName: string,
  status: string
) {
  const callback = subscribeCallbacks.get(channelName);
  if (callback) callback(status);
}

// Reset helpers between tests
export function resetRealtimeMocks() {
  realtimeCallbacks.clear();
  subscribeCallbacks.clear();
  mockPathname.mockReturnValue("/");
}

// Create mock channel factory
function createMockChannel(channelName: string) {
  return {
    on: vi.fn(
      (
        type: string,
        config: { event: string; schema: string; table: string },
        callback: RealtimeCallback
      ) => {
        const key = `${channelName}:${config.event}:${config.table}`;
        const existing = realtimeCallbacks.get(key) || [];
        realtimeCallbacks.set(key, [...existing, callback]);
        // Return self for chaining
        return createMockChannel(channelName);
      }
    ),
    subscribe: vi.fn((callback?: SubscribeCallback) => {
      if (callback) {
        subscribeCallbacks.set(channelName, callback);
        // Auto-trigger SUBSCRIBED status
        setTimeout(() => callback("SUBSCRIBED"), 0);
      }
      return createMockChannel(channelName);
    }),
    unsubscribe: vi.fn(),
  };
}

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
        })),
      })),
    })),
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: { id: "test-user-id", email: "test@example.com" } },
          error: null,
        })
      ),
    },
    channel: vi.fn((name: string) => createMockChannel(name)),
    removeChannel: vi.fn(),
  }),
}));
