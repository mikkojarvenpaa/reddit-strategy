import { useState } from 'react';
import { useAppStore } from '../store';
import { redditAPI, aiAPI } from '../services/api';
import SubredditCard from '../components/SubredditCard';
import PostCard from '../components/PostCard';
import CommentInsights from '../components/CommentInsights';
import './SearchPage.css';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedSubreddit, setSelectedSubreddit] = useState('');
  const [subredditAnalysis, setSubredditAnalysis] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const {
    isLoading,
    setIsLoading,
    error,
    setError,
    setGeneratedIdeas,
    setIdeaContext,
    commentInsights,
    setCommentInsights,
  } = useAppStore();

  const fetchCommentInsights = async (subredditName: string) => {
    if (!subredditName) {
      setCommentInsights(null);
      return;
    }

    try {
      setInsightsLoading(true);
      setInsightsError(null);
      const response = await aiAPI.getCommentInsights(subredditName);
      setCommentInsights(response.data.insights);
    } catch (err: any) {
      setInsightsError(err.response?.data?.error || 'Failed to fetch community insights');
      setCommentInsights(null);
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSubreddit && !searchQuery) {
      setError('Please enter a subreddit name or search query');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      setGeneratedIdeas([]);
      setIdeaContext(null);
      setCommentInsights(null);
      setInsightsError(null);

      const normalizedSubreddit = selectedSubreddit?.trim();

      if (searchQuery) {
        const response = await redditAPI.searchSubreddit(
          normalizedSubreddit || searchQuery.split('/')[0],
          searchQuery
        );
        setSearchResults(response.data.results);
        if (normalizedSubreddit) {
          await fetchCommentInsights(normalizedSubreddit);
        }
      } else {
        if (!normalizedSubreddit) {
          setError('Subreddit name is required to fetch latest posts');
          return;
        }
        const response = await redditAPI.getSubredditAnalysis(normalizedSubreddit);
        setSubredditAnalysis(response.data);
        setSearchResults(response.data.recentPosts);
        await fetchCommentInsights(normalizedSubreddit);
      }

      setShowResults(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch subreddit data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubredditSelect = async (subreddit: string) => {
    setSelectedSubreddit(subreddit);
    try {
      setIsLoading(true);
      setError(null);
      setGeneratedIdeas([]);
      setIdeaContext(null);
      setCommentInsights(null);
      setInsightsError(null);
      const response = await redditAPI.getSubredditAnalysis(subreddit);
      setSubredditAnalysis(response.data);
      setSearchResults(response.data.recentPosts);
      setShowResults(true);
      await fetchCommentInsights(subreddit);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch subreddit data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="search-page">
      <div className="search-container">
        <h2>Search Subreddits</h2>

        <form onSubmit={handleSearch} className="search-form">
          <div className="form-group">
            <label htmlFor="subreddit">Subreddit Name</label>
            <input
              id="subreddit"
              type="text"
              placeholder="e.g., AskReddit, funny, learnprogramming"
              value={selectedSubreddit}
              onChange={(e) => setSelectedSubreddit(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="search">Search Query (optional)</label>
            <input
              id="search"
              type="text"
              placeholder="Search within the subreddit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary">
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {error && <div className="error-message">{error}</div>}
      </div>

      {subredditAnalysis && (
        <>
          <div className="analysis-section">
            <SubredditCard analysis={subredditAnalysis} />
          </div>
          <CommentInsights
            insights={commentInsights}
            subreddit={subredditAnalysis.subreddit}
            isLoading={insightsLoading}
            error={insightsError}
          />
        </>
      )}

      {showResults && searchResults.length > 0 && (
        <div className="results-section">
          <h3>Newest Posts</h3>
          <ul className="posts-list">
            {searchResults.map((post: any) => (
              <PostCard
                key={post.id}
                post={post}
                subreddit={selectedSubreddit || post.subreddit}
              />
            ))}
          </ul>

        </div>
      )}

      {showResults && searchResults.length === 0 && !isLoading && (
        <div className="no-results">
          <p>No results found. Try a different search query.</p>
        </div>
      )}

    </div>
  );
}
