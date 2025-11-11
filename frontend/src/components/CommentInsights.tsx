import './CommentInsights.css';

interface CommentInsightsProps {
  insights: {
    instructions: string[];
    respectedQualities: string[];
    pitfalls: string[];
    exampleCommentStyles: string[];
    analyzedPosts: number;
    generatedAt: string;
  } | null;
  subreddit: string;
  isLoading: boolean;
  error: string | null;
}

export default function CommentInsights({ insights, subreddit, isLoading, error }: CommentInsightsProps) {
  return (
    <div className="card comment-insights">
      <div className="comment-insights-header">
        <h3>Comment Insights</h3>
        <div className="comment-insights-meta">
          <span>r/{subreddit}</span>
          {insights?.analyzedPosts ? <span>{insights.analyzedPosts} posts analyzed</span> : null}
        </div>
      </div>

      {isLoading && <p className="muted">Analyzing recent conversations…</p>}
      {error && <p className="error-message inline">{error}</p>}

      {!isLoading && !error && insights && (
        <div className="comment-insights-grid">
          <section>
            <h4>Instruction Set</h4>
            <ul>
              {insights.instructions.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h4>What the Community Respects</h4>
            <ul>
              {insights.respectedQualities.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h4>Pitfalls to Avoid</h4>
            <ul>
              {insights.pitfalls.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h4>Example Comment Styles</h4>
            <ul>
              {insights.exampleCommentStyles.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
