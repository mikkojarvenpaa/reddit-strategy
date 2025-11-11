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
  content: string;
  subreddit: string;
  basedOnPostId?: string;
  createdAt: Date;
  reasoning: string;
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
}

export interface AIGenerationResponse {
  ideas: {
    content: string;
    reasoning: string;
  }[];
  engagementScore: number;
  relevance: number;
}
