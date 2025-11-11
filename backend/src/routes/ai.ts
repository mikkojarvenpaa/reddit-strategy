import { Router, Request, Response } from 'express';
import aiService from '../services/aiService.js';
import redditService from '../services/redditService.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { AIPromptRequest } from '../types/index.js';

const router = Router();

router.post(
  '/generate-post-ideas',
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as AIPromptRequest;

    if (!body.subreddit) {
      throw new AppError(400, 'Subreddit is required');
    }

    // Fetch current subreddit data
    const analysis = await redditService.getSubredditData(body.subreddit);

    // Generate ideas using OpenAI
    const ideas = await aiService.generatePostIdeas(
      body,
      analysis.recentPosts,
      analysis.commonTopics
    );

    res.json({
      subreddit: body.subreddit,
      type: 'post',
      ...ideas,
    });
  })
);

router.post(
  '/generate-comment-ideas',
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as AIPromptRequest & { postId?: string };

    if (!body.subreddit || !body.postId) {
      throw new AppError(400, 'Subreddit and postId are required');
    }

    // Fetch the specific post and its comments from Reddit
    const { post, comments } = await redditService.getPostComments(body.subreddit, body.postId);

    if (!post) {
      throw new AppError(404, 'Post not found');
    }

    const topCommentBodies = comments.map((c) => c.body);

    // Generate comment ideas using OpenAI
    const ideas = await aiService.generateCommentIdeas(body, post, topCommentBodies);

    res.json({
      subreddit: body.subreddit,
      postId: body.postId,
      type: 'comment',
      ...ideas,
    });
  })
);

router.get(
  '/comment-insights/:subreddit',
  asyncHandler(async (req: Request, res: Response) => {
    const { subreddit } = req.params;

    if (!subreddit) {
      throw new AppError(400, 'Subreddit is required');
    }

    const insights = await aiService.generateCommentInsights(subreddit);

    res.json({
      subreddit,
      insights,
    });
  })
);

export default router;
