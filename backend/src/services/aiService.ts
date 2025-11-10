import Anthropic from '@anthropic-ai/sdk';
import { AIPromptRequest, AIGenerationResponse, RedditPost } from '../types/index.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

class AIService {
  async generatePostIdeas(
    request: AIPromptRequest,
    topPosts: RedditPost[],
    commonTopics: string[]
  ): Promise<AIGenerationResponse> {
    const context = this.buildContext(request, topPosts, commonTopics);

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
      const message = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const responseText =
        message.content[0].type === 'text' ? message.content[0].text : '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('Failed to parse AI response');
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);

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
    const prompt = `You are an expert Reddit commenter who knows how to write engaging, upvoted comments.

Post Title: "${post.title}"
Post Content: ${post.content || 'N/A'}
Current Score: ${post.score} upvotes
Number of Comments: ${post.comments}

Top Comments (for reference):
${topComments.slice(0, 3).join('\n\n')}

${request.context ? `Additional Context: ${request.context}` : ''}

Generate 3 thoughtful, engaging comment ideas that would likely get upvoted in this thread. Consider:
- Adding genuine value or insight
- Being respectful and following subreddit rules
- Using humor or relatability where appropriate
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
      const message = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const responseText =
        message.content[0].type === 'text' ? message.content[0].text : '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('Failed to parse AI response');
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);

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

  private buildContext(
    request: AIPromptRequest,
    topPosts: RedditPost[],
    commonTopics: string[]
  ): string {
    let context = `Subreddit: r/${request.subreddit}\n\n`;

    context += `Common Topics:\n${commonTopics.slice(0, 10).join(', ')}\n\n`;

    context += 'Top Performing Posts (last week):\n';
    topPosts.slice(0, 5).forEach((post, index) => {
      context += `${index + 1}. "${post.title}" - ${post.upvotes} upvotes, ${post.comments} comments\n`;
    });

    if (request.relatedPostId) {
      context += `\nGenerating ideas related to post: ${request.relatedPostId}`;
    }

    return context;
  }
}

export default new AIService();
