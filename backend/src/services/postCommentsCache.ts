import { RedditComment, RedditPost } from '../types/index.js';

const TTL_MS = 15 * 60 * 1000; // 15 minutes keeps Reddit pressure low without stale data

interface CacheEntry {
  payload: { post: RedditPost | null; comments: RedditComment[] };
  storedAt: number;
}

/**
 * Short-lived cache for post + top comments to avoid hammering Reddit when the
 * UI repeatedly expands the same thread for idea generation.
 */
class PostCommentsCache {
  private cache = new Map<string, CacheEntry>();

  get(key: string): { post: RedditPost | null; comments: RedditComment[] } | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() - entry.storedAt > TTL_MS) {
      this.cache.delete(key);
      return null;
    }

    const { post, comments } = entry.payload;
    return {
      post: post ? { ...post } : null,
      comments: comments.map((comment) => ({ ...comment })),
    };
  }

  set(key: string, payload: { post: RedditPost | null; comments: RedditComment[] }) {
    this.cache.set(key, {
      payload,
      storedAt: Date.now(),
    });
  }
}

export default new PostCommentsCache();
