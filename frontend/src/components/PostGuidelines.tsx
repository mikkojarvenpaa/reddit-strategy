import './PostGuidelines.css';

interface PostGuidelinesProps {
  guidelines: {
    recommendations: string[];
    idealStructures: string[];
    toneTips: string[];
    postingTimes: string[];
    generatedAt: string;
    subreddit?: string;
  } | null;
  isLoading: boolean;
}

export default function PostGuidelines({ guidelines, isLoading }: PostGuidelinesProps) {
  if (isLoading && !guidelines) {
    return (
      <div className="card post-guidelines">
        <p className="muted">Analyzing top posts to update guidelines…</p>
      </div>
    );
  }

  if (!guidelines) {
    return null;
  }

  const sections = [
    { title: 'Key Recommendations', items: guidelines.recommendations },
    { title: 'Ideal Post Structures', items: guidelines.idealStructures },
    { title: 'Tone & Voice Tips', items: guidelines.toneTips },
    { title: 'Best Posting Times', items: guidelines.postingTimes },
  ];

  return (
    <div className="card post-guidelines">
      <div className="post-guidelines-header">
        <h3>Posting Guidelines</h3>
        <span className="muted">
          Last updated {new Date(guidelines.generatedAt).toLocaleString()} for r/
          {guidelines.subreddit ?? 'subreddit'}
        </span>
      </div>
      <div className="post-guidelines-grid">
        {sections.map((section) => (
          <section key={section.title}>
            <h4>{section.title}</h4>
            {section.items?.length ? (
              <ul>
                {section.items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">No data yet</p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
