import { useState } from 'react';
import { aiAPI } from '../services/api';
import { useAppStore } from '../store';
import './Card.css';

interface PostCardProps {
  post: {
    id: string;
    title: string;
    content: string;
    author: string;
    score: number;
    comments: number;
    createdAt: string;
    url: string;
  };
  subreddit: string;
}

export default function PostCard({ post, subreddit }: PostCardProps) {
  const [isGeneratingComments, setIsGeneratingComments] = useState(false);
  const { setGeneratedIdeas, setIsLoading, setError } = useAppStore();

  const handleGenerateComments = async () => {
    try {
      setIsLoading(true);
      setIsGeneratingComments(true);
      setError(null);

      const response = await aiAPI.generateCommentIdeas({
        subreddit,
        postId: post.id,
      });

      setGeneratedIdeas(response.data.ideas);
      // Navigate to generator page with ideas
      window.location.href = '/generator';
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate comment ideas');
    } finally {
      setIsLoading(false);
      setIsGeneratingComments(false);
    }
  };

  const excerpt =
    post.content && post.content.length > 150
      ? post.content.substring(0, 150) + '...'
      : post.content;

  return (
    <div className="card post-card">
      <div className="post-header">
        <h4>{post.title}</h4>
        <span className="post-author">by u/{post.author}</span>
      </div>

      {excerpt && <p className="post-excerpt">{excerpt}</p>}

      <div className="post-stats">
        <div className="stat">
          <span className="stat-label">Upvotes</span>
          <span className="stat-value">{post.score}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Comments</span>
          <span className="stat-value">{post.comments}</span>
        </div>
      </div>

      <div className="card-actions">
        <a href={post.url} target="_blank" rel="noopener noreferrer" className="btn-secondary">
          View on Reddit
        </a>
        <button
          onClick={handleGenerateComments}
          disabled={isGeneratingComments}
          className="btn-secondary"
        >
          {isGeneratingComments ? 'Generating...' : 'Generate Comments'}
        </button>
      </div>
    </div>
  );
}
