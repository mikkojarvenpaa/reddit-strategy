import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

export const redditAPI = {
  getSubredditAnalysis: (subreddit: string) =>
    api.get(`/reddit/subreddit/${subreddit}/analysis`),

  searchSubreddit: (subreddit: string, query: string) =>
    api.get(`/reddit/subreddit/${subreddit}/search`, { params: { q: query } }),

  getPostComments: (subreddit: string, postId: string) =>
    api.get(`/reddit/subreddit/${subreddit}/post/${postId}/comments`),
};

export const aiAPI = {
  generatePostIdeas: (data: {
    subreddit: string;
    context?: string;
    tone?: string;
  }) => api.post('/ai/generate-post-ideas', data),

  generateCommentIdeas: (data: {
    subreddit: string;
    postId: string;
    context?: string;
    tone?: string;
  }) => api.post('/ai/generate-comment-ideas', data),
};

export default api;
