# Setup Guide

Detailed setup instructions for the Reddit AI Strategy application.

## Prerequisites

Before you start, make sure you have:
- Node.js v18.0.0 or higher
- npm 9+ or yarn
- A Reddit account
- An OpenAI account

## Step 1: Get Reddit API Credentials

1. **Go to Reddit App Preferences**
   - Visit https://www.reddit.com/prefs/apps
   - Log in with your Reddit account

2. **Create a New Application**
   - Scroll down to "Developed Applications"
   - Click "Create Another App"
   - Fill in the form:
     - **Name**: Reddit AI Strategy (or your choice)
     - **App type**: Select "script"
     - **Description**: Optional
     - **Redirect URI**: `http://localhost:3001/auth/reddit/callback`
   - Click "Create app"

3. **Get Your Credentials**
   - Under "Personal use script", you'll see:
     - **Client ID**: First long string (under app name)
     - **Client Secret**: The "secret" field below

## Step 2: Get OpenAI API Key

1. **Visit OpenAI Console**
   - Go to https://platform.openai.com/account/api-keys

2. **Create API Key**
   - Click "Create new secret key"
   - Copy the key (you won't see it again)
   - Optionally create a dedicated key for this project

## Step 3: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd reddit-strategy

# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

## Step 4: Configure Environment Variables

### Backend Configuration

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create .env file**
   ```bash
   cp .env.example .env
   ```

3. **Edit .env and add your credentials**
   ```
   PORT=3001
   NODE_ENV=development

   REDDIT_CLIENT_ID=your_client_id_here
   REDDIT_CLIENT_SECRET=your_client_secret_here
   REDDIT_REDIRECT_URI=http://localhost:3001/auth/reddit/callback

   OPENAI_API_KEY=your_openai_api_key_here
   # Optional: override the default model (gpt-4o-mini)
   # OPENAI_MODEL=gpt-4o-mini

   DATABASE_URL=postgresql://user:password@localhost:5432/reddit_strategy
   ```

   Replace the placeholder values with your actual credentials.

4. **Save the file**

## Step 5: Verify Setup

### Check Node and npm versions
```bash
node --version  # Should be v18.0.0 or higher
npm --version   # Should be 9+
```

### Verify dependencies are installed
```bash
cd backend && npm list | head -20
cd ../frontend && npm list | head -20
```

## Step 6: Start Development Server

From the root directory:

```bash
npm run dev
```

This will start:
- **Backend server**: http://localhost:3001
- **Frontend app**: http://localhost:3000

You should see output like:
```
Server running on http://localhost:3001
vite v5.0.8 building for development...
```

## Step 7: Test the Application

1. **Open Browser**
   - Navigate to http://localhost:3000

2. **Test Backend Connectivity**
   - Check: http://localhost:3001/health
   - Should return `{"status":"ok"}`

3. **Test Search Functionality**
   - Go to the Search tab
   - Try searching for "AskReddit"
   - You should see the top posts load

4. **Test Generator**
   - Go to the Generator tab
   - Enter a subreddit name
   - Click "Generate Ideas"
   - You should see AI-generated content ideas

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
npx kill-port 3000

# Kill process on port 3001
npx kill-port 3001
```

### Redux/Dependencies Not Found
```bash
# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Do the same for backend and frontend
cd backend && rm -rf node_modules package-lock.json && npm install
cd ../frontend && rm -rf node_modules package-lock.json && npm install
```

### API Requests Failing

1. **Check environment variables**
   - Verify all variables in `.env` are set correctly
   - Restart the backend server after changing `.env`

2. **Check API credentials**
   - Make sure Reddit Client ID and Secret are correct
   - Make sure OpenAI API key is valid

3. **Check network**
   - Ensure you have internet connection
   - Check if Reddit API is accessible: `curl https://oauth.reddit.com`
   - Check if OpenAI API is accessible: `curl https://api.openai.com/v1/models`

### CORS Errors

If you see CORS errors in the browser console:
1. Restart both servers
2. Make sure the backend is running on port 3001
3. Check that vite proxy is configured correctly in `frontend/vite.config.ts`

### TypeScript Errors

```bash
# Run type check
npm run type-check

# Or individually
cd backend && npm run type-check
cd ../frontend && npm run type-check
```

## Development Commands

### Root Directory
```bash
npm run dev              # Start both servers
npm run build            # Build both
npm run lint             # Lint both
npm run type-check       # Type check both
npm run test             # Test both
```

### Backend Only
```bash
cd backend
npm run dev              # Start dev server with hot reload
npm run build            # Build TypeScript
npm run start            # Run built server
npm run lint             # Lint code
npm run type-check       # Check types
npm run test             # Run tests
```

### Frontend Only
```bash
cd frontend
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Lint code
npm run type-check       # Check types
```

## Environment Variables Explained

| Variable | Purpose | Example |
|----------|---------|---------|
| `PORT` | Backend server port | 3001 |
| `NODE_ENV` | Environment mode | development |
| `REDDIT_CLIENT_ID` | Reddit app ID | abc123xyz |
| `REDDIT_CLIENT_SECRET` | Reddit app secret | secret456 |
| `REDDIT_REDIRECT_URI` | OAuth callback URL | http://localhost:3001/auth/reddit/callback |
| `OPENAI_API_KEY` | OpenAI API key | sk-proj-... |
| `OPENAI_MODEL` | (Optional) Override default model | gpt-4o-mini |
| `DATABASE_URL` | PostgreSQL connection | postgresql://... |

## Next Steps

1. **Explore the codebase** - Check out the source files to understand the structure
2. **Try different subreddits** - Experiment with various communities
3. **Experiment with tones** - See how different tones affect idea generation
4. **Customize colors** - Edit `src/App.css` and `src/index.css` to match your branding
5. **Add database** - Set up PostgreSQL to store ideas and history

## Getting Help

If you encounter issues:
1. Check this setup guide again
2. Review error messages in console (browser and terminal)
3. Verify all credentials are correct
4. Restart both servers
5. Clear browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)

## Security Notes

⚠️ **Never commit your `.env` file** to version control!
- It contains sensitive credentials
- `.gitignore` is configured to exclude it automatically
- Share credentials only through secure channels

## Production Deployment

For deploying to production:

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Set production environment variables** on your server

3. **Start with process manager**
   ```bash
   # Using PM2
   pm2 start backend/dist/server.js --name "reddit-ai"
   ```

4. **Serve frontend files** with a web server (Nginx, Apache) or CDN

5. **Use a reverse proxy** to route requests to the backend API

See `DEPLOYMENT.md` for detailed deployment instructions.
