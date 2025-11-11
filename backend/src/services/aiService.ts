import OpenAI from 'openai';
import redditService from './redditService.js';
import insightsCache from './commentInsightsCache.js';
import { AIPromptRequest, AIGenerationResponse, RedditPost, CommentInsights } from '../types/index.js';

class AIService {
  private client: OpenAI | null = null;
  private model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  private getClient(): OpenAI {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    if (!this.client) {
      this.client = new OpenAI({ apiKey });
    }

    return this.client;
  }

  private async generateJsonResponse(prompt: string, maxTokens: number) {
    const client = this.getClient();

    const completion = await client.chat.completions.create({
      model: this.model,
      temperature: 0.7,
      max_tokens: maxTokens,
      messages: [
        {
          role: 'system',
          content:
            'You are an AI assistant for Reddit strategists. Always respond with valid JSON that exactly matches the schema requested by the user. Do not include Markdown code fences or extra commentary outside of the JSON object.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content?.trim() ?? '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    return JSON.parse(jsonMatch[0]);
  }

  async generatePostIdeas(
    request: AIPromptRequest,
    recentPosts: RedditPost[],
    commonTopics: string[]
  ): Promise<AIGenerationResponse> {
    const context = this.buildContext(request, recentPosts, commonTopics);

    const prompt = `You are an expert Reddit strategist who understands what content performs well on different subreddits.

Given the following context about r/${request.subreddit}:

${context}

Generate 3 original post ideas that would perform well in this subreddit. For each idea:
1. Provide a compelling post title
2. Provide the post content/body
3. Explain why this would resonate with the community

${request.tone ? `Tone/style: ${request.tone}` : ''}

Format your response as a JSON object with the following structure:
{
  "ideas": [
    {
      "title": "...",
      "content": "...",
      "reasoning": "..."
    }
  ],
  "engagementScore": 8.5,
  "relevance": 9.0
}`;

    try {
      const parsedResponse = await this.generateJsonResponse(prompt, 2048);

      return {
        ideas: parsedResponse.ideas.map((idea: any) => ({
          content: `Title: ${idea.title}\n\n${idea.content}`,
          reasoning: idea.reasoning,
        })),
        engagementScore: parsedResponse.engagementScore || 7.5,
        relevance: parsedResponse.relevance || 8.0,
      };
    } catch (error) {
      console.error('Failed to generate post ideas:', error);
      throw new Error('Failed to generate post ideas');
    }
  }

  async generateCommentIdeas(
    request: AIPromptRequest,
    post: RedditPost,
    topComments: string[]
  ): Promise<AIGenerationResponse> {
    const prompt = `You are an expert Redditor who knows how to write engaging, upvoted comments.

Post Title: "${post.title}"
Post Content: ${post.content || 'N/A'}
Current Score: ${post.score} upvotes
Number of Comments: ${post.comments}

Top Comments (for reference):
${topComments.slice(0, 3).join('\n\n')}

${request.context ? `Additional Context: ${request.context}` : ''} 

Generate 3 thoughtful, engaging comment ideas that would likely get upvoted in this thread. Consider:
- Writing at least 100 words of good grammar without excessive punctuation
- Adding genuine, non-obvious value and insight
- Being respectful and following subreddit rules
- Being innovative and original while mostly sticking to the rules known by the community at r/${request.subreddit}
- Making sure to avoid bullet points, m-dashes, bold and italics, and the "it's not just Y, it's X" rhetoric device
- ${request.tone ? `Matching this tone: ${request.tone}` : ''}

Format your response as a JSON object:
{
  "ideas": [
    {
      "content": "...",
      "reasoning": "..."
    }
  ],
  "engagementScore": 8.5,
  "relevance": 9.0
}`;

    try {
      const parsedResponse = await this.generateJsonResponse(prompt, 1500);

      return {
        ideas: parsedResponse.ideas,
        engagementScore: parsedResponse.engagementScore || 7.5,
        relevance: parsedResponse.relevance || 8.0,
      };
    } catch (error) {
      console.error('Failed to generate comment ideas:', error);
      throw new Error('Failed to generate comment ideas');
    }
  }

  async generateCommentInsights(subreddit: string): Promise<CommentInsights> {
    const cached = insightsCache.get(subreddit);
    if (cached) {
      return cached;
    }

    const topPosts = await redditService.getTopPosts(subreddit, 10);

    const summaries: {
      title: string;
      score: number;
      comments: number;
      topComments: { body: string; upvotes: number }[];
    }[] = [];

    for (const post of topPosts) {
      try {
        const { comments } = await redditService.getPostComments(subreddit, post.id);
        const topComments = comments
          .sort((a, b) => (b.upvotes ?? b.score) - (a.upvotes ?? a.score))
          .slice(0, 3)
          .map((comment) => ({
            body: this.truncateText(comment.body ?? ''),
            upvotes: comment.upvotes,
          }))
          .filter((comment) => comment.body.length > 0);

        if (topComments.length === 0) {
          continue;
        }

        summaries.push({
          title: post.title,
          score: post.score,
          comments: post.comments,
          topComments,
        });
      } catch (error) {
        console.error(`Failed to collect comments for post ${post.id} in r/${subreddit}:`, error);
      }
    }

    if (summaries.length === 0) {
      throw new Error('Not enough comment data to build insights');
    }

    // Build a compact textual dataset summarizing each post and its best comments so the
    // model can infer community preferences from a single prompt.
    const dataset = summaries
      .map((summary, index) => {
        const commentLines = summary.topComments
          .map((comment, idx) => `      ${idx + 1}. (${comment.upvotes} upvotes) ${comment.body}`)
          .join('\n');

        return `Post ${index + 1}: ${summary.title}\n    Score: ${summary.score}, Comments: ${summary.comments}\n    Top Comments:\n${commentLines}`;
      })
      .join('\n\n');

    const prompt = `You are analyzing the commenting culture of r/${subreddit}.

Given the following top posts and their highest-upvoted comments:
${dataset}

Identify what this community respects most in comments and what tends to earn upvotes.
Return actionable guidance as a JSON object with this exact structure:
{
  "instructions": ["..."],
  "respectedQualities": ["..."],
  "pitfalls": ["..."],
  "exampleCommentStyles": ["..."]
}

Do not overindex on the humor. Keep entries concise (max 2 sentences each) and specific to r/${subreddit}.`;

    try {
      const parsedResponse = await this.generateJsonResponse(prompt, 900);

      const insights: CommentInsights = {
        subreddit,
        instructions: parsedResponse.instructions || [],
        respectedQualities: parsedResponse.respectedQualities || [],
        pitfalls: parsedResponse.pitfalls || [],
        exampleCommentStyles: parsedResponse.exampleCommentStyles || [],
        analyzedPosts: summaries.length,
        generatedAt: new Date().toISOString(),
      };

      insightsCache.set(subreddit, insights);

      return insights;
    } catch (error) {
      console.error('Failed to generate comment insights:', error);
      throw new Error('Failed to generate comment insights');
    }
  }

  private buildContext(
    request: AIPromptRequest,
    recentPosts: RedditPost[],
    commonTopics: string[]
  ): string {
    let context = `Subreddit: r/${request.subreddit}\n\n`;

    context += `Common Topics:\n${commonTopics.slice(0, 10).join(', ')}\n\n`;

    context += 'Recent Posts:\n';
    recentPosts.slice(0, 5).forEach((post, index) => {
      context += `${index + 1}. "${post.title}" - ${post.upvotes} upvotes, ${post.comments} comments\n`;
    });

    if (request.relatedPostId) {
      context += `\nGenerating ideas related to post: ${request.relatedPostId}`;
    }

    return context;
  }

  private truncateText(text: string, maxLength = 400): string {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (clean.length <= maxLength) {
      return clean;
    }
    return `${clean.slice(0, maxLength)}...`;
  }
}

export default new AIService();
