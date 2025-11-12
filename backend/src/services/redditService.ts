import axios from 'axios';
import { URL } from 'url';
import postCommentsCache from './postCommentsCache.js';
import { withRetry, sleep } from '../utils/retry.js';
import { RedditPost, RedditComment, SubredditAnalysis } from '../types/index.js';

const REDDIT_API_BASE = 'https://oauth.reddit.com';
const REDDIT_AUTH_URL = 'https://www.reddit.com/api/v1/access_token';
const REQUEST_WINDOW_MS = 60 * 1000;
const TOKEN_EXPIRY_SKEW_MS = 60 * 1000;

class RedditService {
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private requestTimestamps: number[] = [];
  private maxRequestsPerMinute = Number(process.env.REDDIT_MAX_REQ_PER_MINUTE ?? 45);

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && this.tokenExpiresAt - TOKEN_EXPIRY_SKEW_MS > now) {
      return this.accessToken;
    }

    try {
      const response = await this.executeWithRateLimit(() =>
        axios.post(
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
        )
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiresAt = Date.now() + response.data.expires_in * 1000;
      return this.accessToken;
    } catch (error) {
      console.error('Failed to get Reddit access token:', error);
      throw new Error('Failed to authenticate with Reddit API');
    }
  }

  async getSubredditData(subreddit: string): Promise<SubredditAnalysis> {
    const token = await this.getAccessToken();

    try {
      // Fetch newest posts
      const postsResponse = await this.executeWithRateLimit(() =>
        axios.get(`${REDDIT_API_BASE}/r/${subreddit}/new`, {
          params: {
            limit: 20,
          },
          headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'RedditAIStrategy/1.0',
          },
        })
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
        recentPosts: posts,
        commonTopics: topics,
        engagementPatterns,
        recentAnalyzedAt: new Date(),
      };
    } catch (error) {
      console.error(`Failed to fetch subreddit data for ${subreddit}:`, error);
      throw new Error(`Failed to fetch data from r/${subreddit}`);
    }
  }

  async getTopPosts(subreddit: string, limit = 10): Promise<RedditPost[]> {
    const token = await this.getAccessToken();

    try {
      const response = await this.executeWithRateLimit(() =>
        axios.get(`${REDDIT_API_BASE}/r/${subreddit}/top`, {
          params: {
            t: 'week',
            limit,
          },
          headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'RedditAIStrategy/1.0',
          },
        })
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
      console.error(`Failed to fetch top posts for ${subreddit}:`, error);
      throw new Error(`Failed to fetch top posts from r/${subreddit}`);
    }
  }

  async getTopPostsLast14Days(subreddit: string, limit = 20): Promise<RedditPost[]> {
    const token = await this.getAccessToken();

    try {
      const response = await this.executeWithRateLimit(() =>
        axios.get(`${REDDIT_API_BASE}/r/${subreddit}/top`, {
          params: {
            t: 'month',
            limit: limit * 2,
          },
          headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'RedditAIStrategy/1.0',
          },
        })
      );

      const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

      return response.data.data.children
        .map((child: any) => ({
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
        }))
        .filter((post: RedditPost) => post.createdAt.getTime() >= fourteenDaysAgo)
        .slice(0, limit);
    } catch (error) {
      console.error(`Failed to fetch top posts (14d) for ${subreddit}:`, error);
      throw new Error(`Failed to fetch top posts from r/${subreddit}`);
    }
  }

  async searchSubreddit(subreddit: string, query: string): Promise<RedditPost[]> {
    const token = await this.getAccessToken();

    try {
      const response = await this.executeWithRateLimit(() =>
        axios.get(`${REDDIT_API_BASE}/r/${subreddit}/search`, {
          params: {
            q: query,
            sort: 'relevance',
            limit: 25,
          },
          headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'RedditAIStrategy/1.0',
          },
        })
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

  // Return both the parent post and its top comments. The Reddit comments endpoint
  // returns an array where index 0 contains the post listing and index 1 contains comments.
  async getPostComments(subreddit: string, postId: string): Promise<{ post: RedditPost | null; comments: RedditComment[] }> {
    const token = await this.getAccessToken();
    const normalizedPostId = this.extractPostId(postId);

    if (!normalizedPostId) {
      throw new Error('Invalid Reddit post ID');
    }

    const cacheKey = `${subreddit.toLowerCase()}:${normalizedPostId}`;
    const cached = postCommentsCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.executeWithRateLimit(() =>
        axios.get(`${REDDIT_API_BASE}/r/${subreddit}/comments/${normalizedPostId}`, {
          params: {
            limit: 50,
            sort: 'top',
          },
          headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'RedditAIStrategy/1.0',
          },
        })
      );

      // Extract post info from response.data[0]
      const postData = response.data[0]?.data?.children?.[0]?.data;

      const post: RedditPost | null = postData
        ? {
            id: postData.id,
            title: postData.title,
            content: postData.selftext,
            author: postData.author,
            subreddit: postData.subreddit,
            upvotes: postData.ups,
            downvotes: postData.downs,
            comments: postData.num_comments,
            createdAt: new Date(postData.created_utc * 1000),
            url: postData.url,
            score: postData.score,
          }
        : null;

      const commentsData = response.data[1]?.data?.children || [];

      const comments = commentsData
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

      const payload = { post, comments };
      postCommentsCache.set(cacheKey, payload);
      return payload;
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

  /**
   * Central gate for Reddit API calls so we serialize bursts and retry
   * automatically when Reddit signals rate or transient failures.
   */
  private async executeWithRateLimit<T>(operation: () => Promise<T>): Promise<T> {
    await this.enforceRateLimit();
    return withRetry(operation);
  }

  private async enforceRateLimit() {
    while (true) {
      const now = Date.now();
      this.requestTimestamps = this.requestTimestamps.filter((timestamp) => now - timestamp < REQUEST_WINDOW_MS);

      if (this.requestTimestamps.length < this.maxRequestsPerMinute) {
        this.requestTimestamps.push(now);
        return;
      }

      const waitMs =
        REQUEST_WINDOW_MS - (now - this.requestTimestamps[0]) + Math.floor(Math.random() * 120);
      await sleep(waitMs);
    }
  }

  private extractPostId(postId: string): string {
    if (!postId) {
      return '';
    }

    const trimmed = postId.trim();

    try {
      const url = new URL(trimmed);
      const host = url.hostname.toLowerCase();

      if (host === 'redd.it') {
        const shortId = url.pathname.replace(/^\//, '').split('/')[0];
        if (shortId) {
          return shortId;
        }
      }

      if (host.endsWith('reddit.com')) {
        const segments = url.pathname.split('/').filter(Boolean);
        const commentsIndex = segments.findIndex((segment) => segment === 'comments');

        if (commentsIndex !== -1 && segments[commentsIndex + 1]) {
          return segments[commentsIndex + 1];
        }
      }
    } catch {
      // Not a URL; continue with regex fallbacks
    }

    const fullNameMatch = trimmed.match(/^t3_([a-z0-9]+)/i);
    if (fullNameMatch?.[1]) {
      return fullNameMatch[1];
    }

    const permalinkMatch = trimmed.match(/comments\/([a-z0-9]+)/i);
    if (permalinkMatch?.[1]) {
      return permalinkMatch[1];
    }

    return trimmed;
  }
}

export default new RedditService();
