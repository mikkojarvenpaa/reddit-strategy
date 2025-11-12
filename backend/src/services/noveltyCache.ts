interface IdeaLike {
  title?: string;
  bullets?: string[];
  content?: string;
}

const signatureForIdea = (idea: IdeaLike) => {
  const base = `${idea.title ?? ''}|${(idea.bullets ?? []).join('|')}|${idea.content ?? ''}`;
  return base.toLowerCase().replace(/[^a-z0-9|]+/g, ' ').trim();
};

class NoveltyCache {
  private cache = new Map<string, Set<string>>();

  filterNovelIdeas<T extends IdeaLike>(subreddit: string, ideas: T[]): { novelIdeas: T[]; duplicates: T[] } {
    const normalizedSub = subreddit.toLowerCase();
    const existing = this.cache.get(normalizedSub) ?? new Set<string>();
    const fresh: T[] = [];
    const dupes: T[] = [];

    ideas.forEach((idea) => {
      const signature = signatureForIdea(idea);
      if (!signature.length) {
        fresh.push(idea);
        return;
      }

      if (existing.has(signature) || fresh.some((candidate) => signatureForIdea(candidate) === signature)) {
        dupes.push(idea);
        return;
      }

      fresh.push(idea);
    });

    return { novelIdeas: fresh, duplicates: dupes };
  }

  rememberIdeas(subreddit: string, ideas: IdeaLike[]) {
    const normalizedSub = subreddit.toLowerCase();
    const existing = this.cache.get(normalizedSub) ?? new Set<string>();

    ideas.forEach((idea) => {
      const signature = signatureForIdea(idea);
      if (signature.length) {
        existing.add(signature);
      }
    });

    this.cache.set(normalizedSub, existing);
  }
}

export default new NoveltyCache();
