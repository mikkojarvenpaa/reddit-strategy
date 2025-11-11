import './Card.css';

interface SubredditCardProps {
  analysis: {
    subreddit: string;
    recentPosts: any[];
    commonTopics: string[];
    engagementPatterns: {
      avgUpvotes: number;
      avgComments: number;
      peakHours: string[];
    };
  };
}

export default function SubredditCard({ analysis }: SubredditCardProps) {
  return (
    <div className="card subreddit-card">
      <h3>r/{analysis.subreddit}</h3>

      <div className="card-section">
        <h4>Engagement Metrics</h4>
        <div className="metrics">
          <div className="metric">
            <span className="metric-label">Avg Upvotes</span>
            <span className="metric-value">{analysis.engagementPatterns.avgUpvotes}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Avg Comments</span>
            <span className="metric-value">{analysis.engagementPatterns.avgComments}</span>
          </div>
        </div>
      </div>

      <div className="card-section">
        <h4>Common Topics</h4>
        <div className="topics">
          {analysis.commonTopics.slice(0, 10).map((topic: string, index: number) => (
            <span key={index} className="topic-tag">
              {topic}
            </span>
          ))}
        </div>
      </div>

      <div className="card-section">
        <h4>Recent Posts Loaded</h4>
        <p>{analysis.recentPosts.length} posts analyzed</p>
      </div>
    </div>
  );
}
