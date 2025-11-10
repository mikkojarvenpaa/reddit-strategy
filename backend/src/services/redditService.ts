import axios from 'axios';
import { RedditPost, RedditComment, SubredditAnalysis, RedditAuthToken } from '../types/index.js';

const REDDIT_API_BASE = 'https://oauth.reddit.com';
const REDDIT_AUTH_URL = 'https://www.reddit.com/api/v1/access_token';

class RedditService {
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && this.tokenExpiresAt > now) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        REDDIT_AUTH_URL,
        new URLSearchParams({
          grant_type: 'client_credentials',
        }),
        {
          auth: {
            username: process.env.REDDIT_CLIENT_ID!,
            password: process.env.REDDIT_CLIENT_SECRET!,
          },
          headers: {
            'User-Agent': 'RedditAIStrategy/1.0',
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiresAt = now + response.data.expires_in * 1000;
      return this.accessToken;
    } catch (error) {
      console.error('Failed to get Reddit access token:', error);
      throw new Error('Failed to authenticate with Reddit API');
    }
  }

  async getSubredditData(subreddit: string): Promise<SubredditAnalysis> {
    const token = await this.getAccessToken();

    try {
      // Fetch top posts
      const postsResponse = await axios.get(
        `${REDDIT_API_BASE}/r/${subreddit}/top`,
        {
          params: {
            t: 'week',
            limit: 50,
          },
          headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'RedditAIStrategy/1.0',
          },
        }
      );

      const posts = postsResponse.data.data.children.map((child: any) => ({
        id: child.data.id,
        title: child.data.title,
        content: child.data.selftext,
        author: child.data.author,
        subreddit: child.data.subreddit,
        upvotes: child.data.ups,
        downvotes: child.data.downs,
        comments: child.data.num_comments,
        createdAt: new Date(child.data.created_utc * 1000),
        url: child.data.url,
        score: child.data.score,
      })) as RedditPost[];

      // Extract common topics from titles
      const topics = this.extractTopics(posts);

      // Calculate engagement patterns
      const engagementPatterns = this.analyzeEngagement(posts);

      return {
        subreddit,
        topPosts: posts.slice(0, 10),
        commonTopics: topics,
        engagementPatterns,
        recentAnalyzedAt: new Date(),
      };
    } catch (error) {
      console.error(`Failed to fetch subreddit data for ${subreddit}:`, error);
      throw new Error(`Failed to fetch data from r/${subreddit}`);
    }
  }

  async searchSubreddit(subreddit: string, query: string): Promise<RedditPost[]> {
    const token = await this.getAccessToken();

    try {
      const response = await axios.get(
        `${REDDIT_API_BASE}/r/${subreddit}/search`,
        {
          params: {
            q: query,
            sort: 'relevance',
            limit: 25,
          },
          headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'RedditAIStrategy/1.0',
          },
        }
      );

      return response.data.data.children.map((child: any) => ({
        id: child.data.id,
        title: child.data.title,
        content: child.data.selftext,
        author: child.data.author,
        subreddit: child.data.subreddit,
        upvotes: child.data.ups,
        downvotes: child.data.downs,
        comments: child.data.num_comments,
        createdAt: new Date(child.data.created_utc * 1000),
        url: child.data.url,
        score: child.data.score,
      })) as RedditPost[];
    } catch (error) {
      console.error(`Search failed for ${subreddit}:`, error);
      throw new Error(`Failed to search r/${subreddit}`);
    }
  }

  async getPostComments(subreddit: string, postId: string): Promise<RedditComment[]> {
    const token = await this.getAccessToken();

    try {
      const response = await axios.get(
        `${REDDIT_API_BASE}/r/${subreddit}/comments/${postId}`,
        {
          params: {
            limit: 50,
            sort: 'top',
          },
          headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'RedditAIStrategy/1.0',
          },
        }
      );

      const commentsData = response.data[1]?.data?.children || [];

      return commentsData
        .filter((child: any) => child.kind === 't1') // Only comment objects
        .map((child: any) => ({
          id: child.data.id,
          body: child.data.body,
          author: child.data.author,
          postId,
          upvotes: child.data.ups,
          downvotes: child.data.downs,
          createdAt: new Date(child.data.created_utc * 1000),
          score: child.data.score,
        })) as RedditComment[];
    } catch (error) {
      console.error(`Failed to fetch comments for post ${postId}:`, error);
      throw new Error('Failed to fetch comments');
    }
  }

  private extractTopics(posts: RedditPost[]): string[] {
    const words = new Set<string>();
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'is', 'was', 'are', 'be', 'been', 'being', 'have', 'has', 'had',
    ]);

    posts.forEach((post) => {
      const titleWords = post.title
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 3 && !stopWords.has(word));

      titleWords.forEach((word) => words.add(word));
    });

    return Array.from(words).slice(0, 20);
  }

  private analyzeEngagement(posts: RedditPost[]) {
    const avgUpvotes = posts.reduce((sum, p) => sum + p.upvotes, 0) / posts.length;
    const avgComments = posts.reduce((sum, p) => sum + p.comments, 0) / posts.length;

    return {
      avgUpvotes: Math.round(avgUpvotes),
      avgComments: Math.round(avgComments),
      peakHours: [], // Can be expanded with timestamp analysis
    };
  }
}

export default new RedditService();
