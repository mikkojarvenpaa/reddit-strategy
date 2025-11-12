import { PostGuidelines } from '../types/index.js';

const TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

interface CacheEntry {
  guidelines: PostGuidelines;
  storedAt: number;
}

class PostGuidelinesCache {
  private cache = new Map<string, CacheEntry>();

  get(subreddit: string): PostGuidelines | null {
    const key = subreddit.toLowerCase();
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const expired = Date.now() - entry.storedAt > TTL_MS;
    if (expired) {
      this.cache.delete(key);
      return null;
    }

    return entry.guidelines;
  }

  set(subreddit: string, guidelines: PostGuidelines) {
    const key = subreddit.toLowerCase();
    this.cache.set(key, {
      guidelines,
      storedAt: Date.now(),
    });
  }
}

export default new PostGuidelinesCache();
