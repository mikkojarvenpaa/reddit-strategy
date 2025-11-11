import { CommentInsights } from '../types/index.js';

const TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

interface CacheEntry {
  insights: CommentInsights;
  storedAt: number;
}

class CommentInsightsCache {
  private cache = new Map<string, CacheEntry>();

  get(subreddit: string): CommentInsights | null {
    const key = subreddit.toLowerCase();
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const isExpired = Date.now() - entry.storedAt > TTL_MS;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.insights;
  }

  set(subreddit: string, insights: CommentInsights) {
    const key = subreddit.toLowerCase();
    this.cache.set(key, {
      insights,
      storedAt: Date.now(),
    });
  }
}

export default new CommentInsightsCache();
