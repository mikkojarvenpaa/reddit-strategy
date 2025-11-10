import { useState } from 'react';
import { useAppStore } from '../store';
import { aiAPI } from '../services/api';
import IdeaCard from '../components/IdeaCard';
import './GeneratorPage.css';

export default function GeneratorPage() {
  const [subreddit, setSubreddit] = useState('');
  const [type, setType] = useState<'post' | 'comment'>('post');
  const [context, setContext] = useState('');
  const [tone, setTone] = useState('professional');
  const [postId, setPostId] = useState('');

  const { isLoading, setIsLoading, error, setError, generatedIdeas, setGeneratedIdeas } = useAppStore();

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subreddit) {
      setError('Subreddit is required');
      return;
    }

    if (type === 'comment' && !postId) {
      setError('Post ID is required for comment generation');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = {
        subreddit,
        context: context || undefined,
        tone: tone || undefined,
        ...(type === 'comment' && { postId }),
      };

      const response =
        type === 'post' ? await aiAPI.generatePostIdeas(data) : await aiAPI.generateCommentIdeas(data as any);

      setGeneratedIdeas(response.data.ideas);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate ideas');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="generator-page">
      <div className="generator-container">
        <h2>AI Idea Generator</h2>

        <form onSubmit={handleGenerate} className="generator-form">
          <div className="form-group">
            <label htmlFor="subreddit">Subreddit</label>
            <input
              id="subreddit"
              type="text"
              placeholder="e.g., AskReddit"
              value={subreddit}
              onChange={(e) => setSubreddit(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="type">Content Type</label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as 'post' | 'comment')}
            >
              <option value="post">Post</option>
              <option value="comment">Comment</option>
            </select>
          </div>

          {type === 'comment' && (
            <div className="form-group">
              <label htmlFor="postId">Post ID</label>
              <input
                id="postId"
                type="text"
                placeholder="Reddit post ID"
                value={postId}
                onChange={(e) => setPostId(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="tone">Tone</label>
            <select value={tone} onChange={(e) => setTone(e.target.value)}>
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="humorous">Humorous</option>
              <option value="informative">Informative</option>
              <option value="controversial">Controversial</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="context">Additional Context (optional)</label>
            <textarea
              id="context"
              placeholder="Any additional context or specific direction for idea generation..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={4}
            />
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary">
            {isLoading ? 'Generating...' : 'Generate Ideas'}
          </button>
        </form>

        {error && <div className="error-message">{error}</div>}
      </div>

      {generatedIdeas.length > 0 && (
        <div className="ideas-section">
          <h3>Generated Ideas</h3>
          <div className="ideas-grid">
            {generatedIdeas.map((idea, index) => (
              <IdeaCard key={index} idea={idea} index={index} type={type} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
