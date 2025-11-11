# Reddit AI Strategy

A full-stack web application that helps content creators and strategists research Reddit communities and generate AI-powered post and comment ideas based on what performs well in specific subreddits.

## Features

- **Subreddit Analysis**: Search and analyze subreddits to understand engagement patterns and common topics
- **Post Discovery**: Browse top-performing posts to understand what resonates with communities
- **AI-Powered Idea Generation**: Use OpenAI to generate post and comment ideas tailored to specific subreddits
- **Tone Customization**: Generate ideas with different tones (professional, casual, humorous, informative, controversial)
- **Easy Copy**: One-click copy functionality for generated content ideas

## Tech Stack

### Backend
- **Node.js** with Express.js framework
- **TypeScript** for type safety
- **Reddit API** for subreddit data
- **OpenAI API** for content generation
- **Axios** for HTTP requests

### Frontend
- **React 18** for UI
- **TypeScript** for type safety
- **Zustand** for state management
- **React Router** for navigation
- **Vite** for bundling and development
- **CSS** with responsive design

## Project Structure

```
reddit-strategy/
├── backend/
│   ├── src/
│   │   ├── server.ts           # Main server entry point
│   │   ├── types/              # TypeScript interfaces
│   │   ├── routes/             # API route handlers
│   │   │   ├── reddit.ts
│   │   │   ├── ai.ts
│   │   │   └── auth.ts
│   │   ├── services/           # Business logic
│   │   │   ├── redditService.ts
│   │   │   └── aiService.ts
│   │   └── middleware/         # Express middleware
│   │       └── errorHandler.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── main.tsx            # React entry point
│   │   ├── App.tsx             # Root component
│   │   ├── pages/              # Page components
│   │   │   ├── SearchPage.tsx
│   │   │   └── GeneratorPage.tsx
│   │   ├── components/         # Reusable components
│   │   │   ├── SubredditCard.tsx
│   │   │   ├── PostCard.tsx
│   │   │   └── IdeaCard.tsx
│   │   ├── services/           # API client
│   │   │   └── api.ts
│   │   ├── store/              # State management
│   │   │   └── index.ts
│   │   └── styles/             # CSS files
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── package.json
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Reddit API credentials
- OpenAI API key

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd reddit-strategy
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd backend && npm install && cd ..
   cd frontend && npm install && cd ..
   ```

3. **Configure environment variables**
   - Copy `.env.example` to `.env` in the backend directory
   - Add your credentials:
     ```
     REDDIT_CLIENT_ID=your_reddit_app_id
     REDDIT_CLIENT_SECRET=your_reddit_app_secret
     OPENAI_API_KEY=your_openai_api_key
     # Optional: override the default model
     # OPENAI_MODEL=gpt-4o-mini
     ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

   This will start both the backend (port 3001) and frontend (port 3000).

### Individual Commands

- **Backend only**: `npm run dev:backend`
- **Frontend only**: `npm run dev:frontend`
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Type check**: `npm run type-check`

## API Endpoints

### Reddit Routes
- `GET /api/reddit/subreddit/:name/analysis` - Get subreddit analysis and top posts
- `GET /api/reddit/subreddit/:name/search?q=query` - Search within a subreddit
- `GET /api/reddit/subreddit/:name/post/:postId/comments` - Get comments for a post

### AI Routes
- `POST /api/ai/generate-post-ideas` - Generate post ideas
  ```json
  {
    "subreddit": "string",
    "context": "string (optional)",
    "tone": "string (optional)"
  }
  ```

- `POST /api/ai/generate-comment-ideas` - Generate comment ideas
  ```json
  {
    "subreddit": "string",
    "postId": "string",
    "context": "string (optional)",
    "tone": "string (optional)"
  }
  ```

## Getting Reddit API Credentials

1. Go to https://www.reddit.com/prefs/apps
2. Create a new application (choose "script")
3. Get your Client ID and Client Secret
4. Set redirect URI to `http://localhost:3001/auth/reddit/callback`

## Getting OpenAI API Key

1. Visit https://platform.openai.com/account/api-keys
2. Create a new secret key (or reuse an existing one)
3. Add it to your backend `.env` file as `OPENAI_API_KEY`

## Usage

### Search Mode
1. Navigate to the **Search** tab
2. Enter a subreddit name (e.g., "AskReddit", "funny")
3. Optionally enter a search query
4. View the subreddit analysis and top posts
5. Click "Generate Comments" on any post to create comment ideas

### Generator Mode
1. Navigate to the **Generator** tab
2. Select content type (Post or Comment)
3. Enter the subreddit name
4. Choose a tone for the content
5. Add optional context
6. Click "Generate Ideas" to get AI-powered suggestions
7. Copy ideas directly to clipboard

## Key Features

### Subreddit Analysis
- Top posts from the past week
- Average engagement metrics (upvotes, comments)
- Common topics and keywords
- Community trends

### AI Idea Generation
- Multiple tone options (professional, casual, humorous, informative, controversial)
- Context-aware suggestions
- Explanations for why ideas work
- Post and comment specific generation

## Error Handling

The application includes comprehensive error handling:
- API request validation
- Reddit API rate limiting awareness
- User-friendly error messages
- Graceful fallbacks

## Development

### Code Style
- TypeScript with strict mode enabled
- ESLint for code quality
- Consistent formatting

### Building for Production
```bash
npm run build
npm start  # runs backend server with built frontend
```

## Deployment

To deploy this application:

1. Build both frontend and backend
2. Set up environment variables on your server
3. Use a process manager (PM2, systemd, etc.) for the backend
4. Serve the frontend static files through a web server or CDN

## Future Enhancements

- [ ] User authentication and saved ideas
- [ ] Database storage for ideas and analysis
- [ ] Advanced filtering and sorting
- [ ] Trending topics across subreddits
- [ ] Post scheduling integration
- [ ] Analytics dashboard
- [ ] Multi-language support
- [ ] Browser extension

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

MIT

## Support

For issues, questions, or suggestions, please open an issue on GitHub.

## Disclaimer

This tool is for educational and personal use only. Always follow Reddit's terms of service and API guidelines. Don't use this for spam, harassment, or any illegal activities.
