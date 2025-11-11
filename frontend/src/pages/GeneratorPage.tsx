import { useState } from 'react';
import { useAppStore } from '../store';
import { aiAPI } from '../services/api';
import IdeaCard from '../components/IdeaCard';
import './GeneratorPage.css';

export default function GeneratorPage() {
  const [subreddit, setSubreddit] = useState('');
  const [context, setContext] = useState('');
  const [tone, setTone] = useState('professional');

  const {
    isLoading,
    setIsLoading,
    error,
    setError,
    generatedIdeas,
    setGeneratedIdeas,
    setIdeaContext,
  } = useAppStore();

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subreddit) {
      setError('Subreddit is required');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = {
        subreddit,
        context: context || undefined,
        tone: tone || undefined,
      };

      const response = await aiAPI.generatePostIdeas(data);

      setGeneratedIdeas(response.data.ideas);
      setIdeaContext({ type: 'post', subreddit });
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
            {isLoading ? 'Generating...' : 'Generate Post Ideas'}
          </button>
        </form>

        {error && <div className="error-message">{error}</div>}
      </div>

      {generatedIdeas.length > 0 && (
        <div className="ideas-section">
          <h3>Generated Ideas</h3>
          <div className="ideas-grid">
            {generatedIdeas.map((idea, index) => (
              <IdeaCard key={index} idea={idea} index={index} type="post" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
