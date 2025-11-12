import { create } from 'zustand';

interface SubredditData {
  name: string;
  recentPosts: any[];
  commonTopics: string[];
  engagementPatterns: any;
}

interface GeneratedIdea {
  title?: string;
  content?: string;
  reasoning?: string;
  bullets?: string[];
  inspiration?: string;
}

interface IdeaContext {
  type: 'post' | 'comment';
  subreddit: string;
  postId?: string;
  postTitle?: string;
}

interface PostGuidelines {
  recommendations: string[];
  idealStructures: string[];
  toneTips: string[];
  postingTimes: string[];
  generatedAt: string;
  subreddit?: string;
}

interface CommentInsights {
  subreddit: string;
  instructions: string[];
  respectedQualities: string[];
  pitfalls: string[];
  exampleCommentStyles: string[];
  analyzedPosts: number;
  generatedAt: string;
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

  ideaContext: IdeaContext | null;
  setIdeaContext: (context: IdeaContext | null) => void;

  commentInsights: CommentInsights | null;
  setCommentInsights: (insights: CommentInsights | null) => void;

  postGuidelines: PostGuidelines | null;
  setPostGuidelines: (guidelines: PostGuidelines | null) => void;
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

  ideaContext: null,
  setIdeaContext: (context) => set({ ideaContext: context }),

  commentInsights: null,
  setCommentInsights: (insights) => set({ commentInsights: insights }),

  postGuidelines: null,
  setPostGuidelines: (guidelines) => set({ postGuidelines: guidelines }),
}));
