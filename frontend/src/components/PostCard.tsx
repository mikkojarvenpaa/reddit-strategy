import { useState, useMemo } from 'react';
import { aiAPI } from '../services/api';
import { useAppStore } from '../store';
import IdeaCard from './IdeaCard';
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

function getTimeAgo(createdAt: string) {
  if (!createdAt) return 'just now';

  const created = new Date(createdAt);
  const now = Date.now();
  const diffMs = Math.max(0, now - created.getTime());
  const diffSeconds = Math.floor(diffMs / 1000);

  const minutes = Math.floor(diffSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (diffSeconds < 60) return `${diffSeconds || 1}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

export default function PostCard({ post, subreddit }: PostCardProps) {
  const [isGeneratingComments, setIsGeneratingComments] = useState(false);
  const {
    setGeneratedIdeas,
    setIsLoading,
    setError,
    setIdeaContext,
    commentInsights,
    generatedIdeas,
    ideaContext,
  } = useAppStore();
  const timeAgo = useMemo(() => getTimeAgo(post.createdAt), [post.createdAt]);

  const handleGenerateComments = async () => {
    try {
      setIsLoading(true);
      setIsGeneratingComments(true);
      setError(null);

      const normalizedSubreddit = subreddit?.toLowerCase();
      let insightContext = '';
      if (commentInsights && commentInsights.subreddit?.toLowerCase() === normalizedSubreddit) {
        const parts: string[] = [];
        if (commentInsights.instructions?.length) {
          parts.push(`Follow these community instructions:\n- ${commentInsights.instructions.join('\n- ')}`);
        }
        if (commentInsights.respectedQualities?.length) {
          parts.push(
            `Traits the community upvotes:\n- ${commentInsights.respectedQualities.join('\n- ')}`
          );
        }
        if (commentInsights.pitfalls?.length) {
          parts.push(`Pitfalls to avoid:\n- ${commentInsights.pitfalls.join('\n- ')}`);
        }
        insightContext = parts.join('\n\n');
      }

      const response = await aiAPI.generateCommentIdeas({
        subreddit,
        postId: post.id,
        context: insightContext || undefined,
      });

      setGeneratedIdeas(response.data.ideas);
      setIdeaContext({
        type: 'comment',
        subreddit,
        postId: post.id,
        postTitle: post.title,
      });
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
    <li className="post-item">
      <div className="post-item-body">
        <div className="post-item-header">
          <div>
            <h4>{post.title}</h4>
            <div className="post-meta">
              <span>u/{post.author || 'unknown'}</span>
              <span>• {timeAgo}</span>
              <span>• {post.score} upvotes</span>
              <span>• {post.comments} comments</span>
            </div>
          </div>
        </div>

        {excerpt && <p className="post-excerpt">{excerpt}</p>}
      </div>

      <div className="post-item-actions">
        <a href={post.url} target="_blank" rel="noopener noreferrer" className="btn-link">
          View on Reddit
        </a>
        <button onClick={handleGenerateComments} disabled={isGeneratingComments} className="btn-link">
          {isGeneratingComments ? 'Generating…' : 'Generate Comments'}
        </button>
      </div>

      {ideaContext?.type === 'comment' && ideaContext.postId === post.id && generatedIdeas.length > 0 && (
        <div className="inline-ideas">
          <h5>Suggested Comments</h5>
          <div className="ideas-grid">
            {generatedIdeas.map((idea, index) => (
              <IdeaCard key={index} idea={idea} index={index} type="comment" />
            ))}
          </div>
        </div>
      )}
    </li>
  );
}
