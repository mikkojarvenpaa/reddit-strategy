import { useState } from 'react';
import { useAppStore } from '../store';
import { redditAPI } from '../services/api';
import SubredditCard from '../components/SubredditCard';
import PostCard from '../components/PostCard';
import './SearchPage.css';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedSubreddit, setSelectedSubreddit] = useState('');
  const [subredditAnalysis, setSubredditAnalysis] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);

  const { isLoading, setIsLoading, error, setError } = useAppStore();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSubreddit && !searchQuery) {
      setError('Please enter a subreddit name or search query');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (searchQuery) {
        const response = await redditAPI.searchSubreddit(
          selectedSubreddit || searchQuery.split('/')[0],
          searchQuery
        );
        setSearchResults(response.data.results);
      } else {
        const response = await redditAPI.getSubredditAnalysis(selectedSubreddit);
        setSubredditAnalysis(response.data);
        setSearchResults(response.data.topPosts);
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
      const response = await redditAPI.getSubredditAnalysis(subreddit);
      setSubredditAnalysis(response.data);
      setSearchResults(response.data.topPosts);
      setShowResults(true);
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
        <div className="analysis-section">
          <SubredditCard analysis={subredditAnalysis} />
        </div>
      )}

      {showResults && searchResults.length > 0 && (
        <div className="results-section">
          <h3>Top Posts</h3>
          <div className="posts-grid">
            {searchResults.map((post: any) => (
              <PostCard
                key={post.id}
                post={post}
                subreddit={selectedSubreddit}
              />
            ))}
          </div>
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
