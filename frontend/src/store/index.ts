import { create } from 'zustand';

interface SubredditData {
  name: string;
  topPosts: any[];
  commonTopics: string[];
  engagementPatterns: any;
}

interface GeneratedIdea {
  content: string;
  reasoning: string;
}

interface AppState {
  currentSubreddit: SubredditData | null;
  setCurrentSubreddit: (subreddit: SubredditData) => void;

  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  error: string | null;
  setError: (error: string | null) => void;

  generatedIdeas: GeneratedIdea[];
  setGeneratedIdeas: (ideas: GeneratedIdea[]) => void;

  selectedIdea: GeneratedIdea | null;
  setSelectedIdea: (idea: GeneratedIdea | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentSubreddit: null,
  setCurrentSubreddit: (subreddit) => set({ currentSubreddit: subreddit }),

  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),

  error: null,
  setError: (error) => set({ error }),

  generatedIdeas: [],
  setGeneratedIdeas: (ideas) => set({ generatedIdeas: ideas }),

  selectedIdea: null,
  setSelectedIdea: (idea) => set({ selectedIdea: idea }),
}));
