import { Router, Request, Response } from 'express';
import redditService from '../services/redditService.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = Router();

router.get(
  '/subreddit/:name/analysis',
  asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.params;

    if (!name) {
      throw new AppError(400, 'Subreddit name is required');
    }

    const analysis = await redditService.getSubredditData(name);
    res.json(analysis);
  })
);

router.get(
  '/subreddit/:name/search',
  asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.params;
    const { q } = req.query;

    if (!name || !q) {
      throw new AppError(400, 'Subreddit name and query are required');
    }

    const results = await redditService.searchSubreddit(name, q as string);
    res.json({ results });
  })
);

router.get(
  '/subreddit/:name/post/:postId/comments',
  asyncHandler(async (req: Request, res: Response) => {
    const { name, postId } = req.params;

    if (!name || !postId) {
      throw new AppError(400, 'Subreddit name and post ID are required');
    }

    const { post, comments } = await redditService.getPostComments(name, postId);
    res.json({ post, comments });
  })
);

export default router;
