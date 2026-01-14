/**
 * Extract conversation ID from a pathname like "/c/abc123"
 */
export function getConversationIdFromPath(path: string): string | null {
  const match = path.match(/^\/c\/([^/]+)/);
  return match ? match[1] : null;
}
