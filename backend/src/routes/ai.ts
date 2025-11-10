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

    // Generate ideas using Claude
    const ideas = await aiService.generatePostIdeas(
      body,
      analysis.topPosts,
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

    // Fetch the post and its comments
    const analysis = await redditService.getSubredditData(body.subreddit);
    const post = analysis.topPosts[0]; // In real app, fetch specific post

    if (!post) {
      throw new AppError(404, 'Post not found');
    }

    const comments = await redditService.getPostComments(body.subreddit, body.postId);
    const topCommentBodies = comments.map((c) => c.body);

    // Generate comment ideas using Claude
    const ideas = await aiService.generateCommentIdeas(body, post, topCommentBodies);

    res.json({
      subreddit: body.subreddit,
      postId: body.postId,
      type: 'comment',
      ...ideas,
    });
  })
);

export default router;
