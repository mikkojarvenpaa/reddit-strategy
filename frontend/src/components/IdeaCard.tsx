import { useState } from 'react';
import './Card.css';

interface IdeaCardProps {
  idea: {
    content?: string;
    reasoning?: string;
  };
  index: number;
  type: 'post' | 'comment';
}

export default function IdeaCard({ idea, index, type }: IdeaCardProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(idea.content || '');
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="card idea-card">
      <div className="idea-header">
        <h4>Idea #{index + 1}</h4>
        <span className="idea-type">{type}</span>
      </div>

      <div className="idea-content">
        <p>{idea.content}</p>
      </div>

      <div className="idea-reasoning">
        <h5>Why this works:</h5>
        <p>{idea.reasoning}</p>
      </div>

      <div className="card-actions">
        <button onClick={handleCopy} className="btn-secondary">
          {isCopied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
