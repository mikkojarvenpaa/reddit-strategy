export interface RedditPost {
  id: string;
  title: string;
  content: string;
  author: string;
  subreddit: string;
  upvotes: number;
  downvotes: number;
  comments: number;
  createdAt: Date;
  url: string;
  score: number;
}

export interface RedditComment {
  id: string;
  body: string;
  author: string;
  postId: string;
  upvotes: number;
  downvotes: number;
  createdAt: Date;
  score: number;
}

export interface SubredditAnalysis {
  subreddit: string;
  recentPosts: RedditPost[];
  commonTopics: string[];
  engagementPatterns: {
    avgUpvotes: number;
    avgComments: number;
    peakHours: string[];
  };
  recentAnalyzedAt: Date;
}

export interface PostGuidelines {
  subreddit: string;
  sourcePosts: RedditPost[];
  recommendations: string[];
  idealStructures: string[];
  toneTips: string[];
  postingTimes: string[];
  generatedAt: string;
  underrepresentedAngles: string[];
  tensionHooks: string[];
}

export interface PostIdeaSummary {
  title: string;
  bullets: string[];
  inspiration: string;
}

export interface CommentInsights {
  subreddit: string;
  instructions: string[];
  respectedQualities: string[];
  pitfalls: string[];
  exampleCommentStyles: string[];
  analyzedPosts: number;
  generatedAt: string;
}

export interface GeneratedIdea {
  id: string;
  type: 'post' | 'comment';
  title?: string;
  content?: string;
  reasoning?: string;
  bullets?: string[];
  inspiration?: string;
  subreddit: string;
  basedOnPostId?: string;
  createdAt: Date;
}

export interface RedditAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType: string;
}

export interface AIPromptRequest {
  subreddit: string;
  type: 'post' | 'comment';
  context?: string;
  relatedPostId?: string;
  tone?: string;
  temperature?: number;
}

export interface AIGenerationResponse {
  ideas: {
    title?: string;
    content?: string;
    reasoning?: string;
    bullets?: string[];
    inspiration?: string;
    format?: string;
    noveltySignal?: string;
  }[];
  engagementScore: number;
  relevance: number;
  noveltyScore?: number;
}

export interface PostIdeaExpansionRequest {
  subreddit: string;
  tone?: string;
  idea: {
    title: string;
    bullets: string[];
    inspiration?: string;
  };
  instructions?: string;
  context?: string;
}
