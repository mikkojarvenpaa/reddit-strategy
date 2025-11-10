import { Router, Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = Router();

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'auth service ok' });
});

// Placeholder for Reddit OAuth flow
router.get('/reddit', (req: Request, res: Response) => {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.REDDIT_REDIRECT_URI || '');
  const scope = encodeURIComponent('read submit vote');
  const state = Math.random().toString(36).substring(7);

  const authUrl = `https://www.reddit.com/api/v1/authorize?client_id=${clientId}&response_type=code&state=${state}&redirect_uri=${redirectUri}&scope=${scope}&duration=permanent`;

  res.json({ authUrl });
});

// Callback handler (placeholder)
router.get(
  '/reddit/callback',
  asyncHandler(async (req: Request, res: Response) => {
    const { code, state } = req.query;

    if (!code) {
      throw new AppError(400, 'Missing authorization code');
    }

    // In a real app, exchange code for token
    res.json({
      message: 'OAuth callback received',
      code,
    });
  })
);

export default router;
