import { describe, it, expect, beforeEach, vi } from 'vitest';
import redditService from './redditService.js';
import axios from 'axios';

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

const mockedAxios = axios as unknown as {
  post: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
};

describe('redditService.getPostComments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redditService as any).accessToken = null;
    (redditService as any).tokenExpiresAt = 0;
    process.env.REDDIT_CLIENT_ID = 'id';
    process.env.REDDIT_CLIENT_SECRET = 'secret';
  });

  it('uses the provided postId directly', async () => {
    mockedAxios.post.mockResolvedValue({
      data: { access_token: 'token', expires_in: 3600 },
    });
    mockedAxios.get.mockResolvedValue({
      data: [
        {
          data: {
            children: [
              {
                data: {
                  id: 'abc123',
                  title: 'Example',
                  selftext: 'Body',
                  author: 'user',
                  subreddit: 'AskReddit',
                  ups: 100,
                  downs: 2,
                  num_comments: 20,
                  created_utc: 0,
                  url: 'https://reddit.com',
                  score: 100,
                },
              },
            ],
          },
        },
        { data: { children: [] } },
      ],
    });

    await redditService.getPostComments(
      'AskReddit',
      'https://www.reddit.com/r/AskReddit/comments/abc123/some-title/'
    );

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://oauth.reddit.com/r/AskReddit/comments/abc123',
      expect.any(Object)
    );
  });
});
