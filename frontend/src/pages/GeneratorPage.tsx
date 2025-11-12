import { useState } from 'react';
import { useAppStore } from '../store';
import { aiAPI } from '../services/api';
import PostGuidelines from '../components/PostGuidelines';
import './GeneratorPage.css';

interface PostIdeaSummary {
  title: string;
  bullets: string[];
  inspiration?: string;
}

export default function GeneratorPage() {
  const [subreddit, setSubreddit] = useState('');
  const [context, setContext] = useState('');
  const [tone, setTone] = useState('professional');
  const [postIdeas, setPostIdeas] = useState<PostIdeaSummary[]>([]);
  const [instructionsMap, setInstructionsMap] = useState<Record<number, string>>({});
  const [fullPosts, setFullPosts] = useState<Record<number, { title: string; content: string; wordCount: number; loading: boolean; error?: string }>>({});

  const {
    isLoading,
    setIsLoading,
    error,
    setError,
    generatedIdeas,
    setGeneratedIdeas,
    setIdeaContext,
    postGuidelines,
    setPostGuidelines,
  } = useAppStore();
  const [guidelinesLoading, setGuidelinesLoading] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subreddit) {
      setError('Subreddit is required');
      return;
    }

    const normalizedSubreddit = subreddit.trim();
    let shouldResetGuidelines = false;

    try {
      setIsLoading(true);
      setError(null);

      shouldResetGuidelines =
        !postGuidelines ||
        postGuidelines.subreddit?.toLowerCase() !== normalizedSubreddit.toLowerCase();

      setGuidelinesLoading(shouldResetGuidelines);

      if (shouldResetGuidelines) {
        setPostGuidelines(null);
      }
      setPostIdeas([]);
      setInstructionsMap({});
      setFullPosts({});

      const data = {
        subreddit: normalizedSubreddit,
        context: context || undefined,
        tone: tone || undefined,
      };

      const response = await aiAPI.generatePostIdeas(data);

      setGeneratedIdeas(response.data.ideas);
      setIdeaContext({ type: 'post', subreddit: normalizedSubreddit });
      setPostGuidelines(response.data.guidelines || null);
      setPostIdeas(response.data.ideas || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate ideas');
      if (shouldResetGuidelines) {
        setPostGuidelines(null);
      }
      setPostIdeas([]);
    } finally {
      setIsLoading(false);
      setGuidelinesLoading(false);
    }
  };

  const handleInstructionChange = (index: number, value: string) => {
    setInstructionsMap((prev) => ({
      ...prev,
      [index]: value,
    }));
  };

  const handleGenerateFullPost = async (index: number) => {
    const idea = postIdeas[index];
    if (!idea) return;

    setFullPosts((prev) => ({
      ...prev,
      [index]: { ...prev[index], loading: true, error: undefined },
    }));

    try {
      const response = await aiAPI.generateFullPost({
        subreddit,
        tone,
        idea: {
          title: idea.title,
          bullets: idea.bullets || [],
          inspiration: idea.inspiration,
        },
        instructions: instructionsMap[index]?.trim() || undefined,
        context: context || undefined,
      });

      setFullPosts((prev) => ({
        ...prev,
        [index]: {
          title: response.data.title,
          content: response.data.content,
          wordCount: response.data.wordCount,
          loading: false,
        },
      }));
    } catch (err: any) {
      setFullPosts((prev) => ({
        ...prev,
        [index]: {
          title: idea.title,
          content: prev[index]?.content || '',
          wordCount: prev[index]?.wordCount || 0,
          loading: false,
          error: err.response?.data?.error || 'Failed to generate full post',
        },
      }));
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
        <PostGuidelines guidelines={postGuidelines} isLoading={guidelinesLoading} />
      </div>

      {postIdeas.length > 0 && (
        <div className="ideas-section">
          <h3>Post Idea Starters</h3>
          <div className="idea-summary-grid">
            {postIdeas.map((idea, index) => (
              <div key={index} className="idea-summary-card">
                <div className="idea-summary-header">
                  <span className="badge">Idea {index + 1}</span>
                  <h4>{idea.title}</h4>
                </div>
                <ul>
                  {(idea.bullets || []).map((bullet: string, bulletIndex: number) => (
                    <li key={bulletIndex}>{bullet}</li>
                  ))}
                </ul>
                {idea.inspiration && <p className="muted">Inspired by: {idea.inspiration}</p>}

                <label className="instructions-label" htmlFor={`instructions-${index}`}>
                  Custom instructions (optional)
                </label>
                <textarea
                  id={`instructions-${index}`}
                  value={instructionsMap[index] || ''}
                  onChange={(e) => handleInstructionChange(index, e.target.value)}
                  placeholder="Add extra context, POV, or formatting needs..."
                />

                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => handleGenerateFullPost(index)}
                  disabled={fullPosts[index]?.loading}
                >
                  {fullPosts[index]?.loading ? 'Generating...' : 'Generate Full Post'}
                </button>

                {fullPosts[index]?.error && <div className="error-message inline">{fullPosts[index]?.error}</div>}

                {fullPosts[index]?.content && !fullPosts[index]?.loading && (
                  <div className="full-post">
                    <div className="full-post-header">
                      <span>{fullPosts[index]?.title}</span>
                      <span className="muted">{fullPosts[index]?.wordCount} words</span>
                    </div>
                    <p>{fullPosts[index]?.content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
