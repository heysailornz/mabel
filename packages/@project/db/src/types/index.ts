// Re-export all generated types
export * from "./supabase";

// Simplified helper types for common usage
import type { Database } from "./supabase";

export type PublicTables = Database["public"]["Tables"];

// Simple table row helper
export type TableRow<T extends keyof PublicTables> = PublicTables[T]["Row"];

// Simple table insert helper
export type TableInsert<T extends keyof PublicTables> = PublicTables[T]["Insert"];

// Simple table update helper
export type TableUpdate<T extends keyof PublicTables> = PublicTables[T]["Update"];
