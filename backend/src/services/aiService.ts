import OpenAI from 'openai';
import redditService from './redditService.js';
import insightsCache from './commentInsightsCache.js';
import postGuidelinesCache from './postGuidelinesCache.js';
import noveltyCache from './noveltyCache.js';
import { withRetry } from '../utils/retry.js';
import {
  AIPromptRequest,
  AIGenerationResponse,
  RedditPost,
  CommentInsights,
  PostGuidelines,
  PostIdeaExpansionRequest,
} from '../types/index.js';

interface GenerationOptions {
  temperature?: number;
  systemPrompt?: string;
  presencePenalty?: number;
  frequencyPenalty?: number;
}

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

  private async generateJsonResponse(prompt: string, maxTokens: number, options: GenerationOptions = {}) {
    const client = this.getClient();
    const temperature = this.resolveTemperature(options.temperature);
    const presencePenalty =
      options.presencePenalty ?? (temperature >= 0.85 ? 0.6 : 0.1);
    const frequencyPenalty =
      options.frequencyPenalty ?? (temperature >= 0.85 ? 0.4 : 0);
    const systemPrompt =
      options.systemPrompt ||
      'You are an AI assistant for Reddit strategists. Always respond with valid JSON that exactly matches the schema requested by the user. Do not include Markdown code fences or extra commentary outside of the JSON object.';

    // Response-format plus retries keep us compliant with OpenAI JSON mode
    // while automatically backing off on transient 429s/500s.
    const completion = await withRetry(() =>
      client.chat.completions.create({
        model: this.model,
        temperature,
        max_tokens: maxTokens,
        presence_penalty: presencePenalty,
        frequency_penalty: frequencyPenalty,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      })
    );

    const content = completion.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('Failed to parse AI response');
    }

    return JSON.parse(content);
  }

  async generatePostIdeas(
    request: AIPromptRequest,
    guidelines: PostGuidelines
  ): Promise<AIGenerationResponse> {
    const referenceHighlights = this.buildReferenceSummaries(guidelines.sourcePosts, 4);
    const extraContext = request.context?.trim();
    const explorationSeeds = await this.generateExplorationSeeds(request.subreddit, guidelines, extraContext);
    const baseTemperature = request.temperature
      ? this.resolveTemperature(request.temperature)
      : 0.78;

    const attemptGeneration = async (forceBold: boolean) => {
      const prompt = this.composePostIdeaPrompt({
        request,
        guidelines,
        referenceHighlights,
        explorationSeeds,
        extraContext,
        forceBold,
      });

      const parsedResponse = await this.generateJsonResponse(prompt, 2048, {
        temperature: forceBold ? Math.min(1.05, baseTemperature + 0.2) : baseTemperature,
      });

      return {
        ideas: parsedResponse.ideas.map((idea: any) => ({
          title: idea.title,
          bullets: idea.bullets || [],
          inspiration: idea.inspiration || idea.reasoning || '',
          format: idea.format || idea.structure || '',
          noveltySignal: idea.noveltySignal || idea.novelty || '',
        })),
        engagementScore: parsedResponse.engagementScore || 7.5,
        relevance: parsedResponse.relevance || 8.0,
      };
    };

    let lastResult: AIGenerationResponse | null = null;
    let lastAssessment: { averageScore: number } | null = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const forceBold = attempt === 1;
      const generation = await attemptGeneration(forceBold);
      lastResult = generation;

      const { novelIdeas, duplicates } = noveltyCache.filterNovelIdeas(request.subreddit, generation.ideas);
      if (duplicates.length) {
        console.warn(`Filtered ${duplicates.length} repetitive idea(s) for r/${request.subreddit}`);
      }

      const ideasForEvaluation = novelIdeas.length ? novelIdeas : generation.ideas;
      const assessment = await this.assessNovelty(request.subreddit, ideasForEvaluation);
      lastAssessment = assessment;

      if (assessment.averageScore < 7 && !forceBold) {
        continue; // run bold attempt
      }

      noveltyCache.rememberIdeas(request.subreddit, ideasForEvaluation);

      return {
        ideas: ideasForEvaluation,
        engagementScore: generation.engagementScore,
        relevance: generation.relevance,
        noveltyScore: assessment.averageScore,
      };
    }

    if (lastResult) {
      noveltyCache.rememberIdeas(request.subreddit, lastResult.ideas);
      return {
        ...lastResult,
        noveltyScore: lastAssessment?.averageScore,
      };
    }

    throw new Error('Failed to generate post ideas');
  }

  private async generateGapAnalysis(subreddit: string, dataset: string) {
    const prompt = `You already studied the top-performing posts in r/${subreddit}.

Dataset:
${dataset}

Identify what feels missing. Surface angles that the community has NOT seen enough of, or tension points that rarely get resolved.

Return JSON:
{
  "underrepresentedAngles": ["..."],
  "tensionHooks": ["..."]
}`;

    try {
      return await this.generateJsonResponse(prompt, 600, { temperature: 0.65 });
    } catch (error) {
      console.error('Failed to generate gap analysis:', error);
      return { underrepresentedAngles: [], tensionHooks: [] };
    }
  }

  async generatePostGuidelines(subreddit: string): Promise<PostGuidelines> {
    const cached = postGuidelinesCache.get(subreddit);
    if (cached) {
      return cached;
    }

    const posts = await redditService.getTopPostsLast14Days(subreddit, 20);

    if (!posts.length) {
      throw new Error('Not enough data to build posting guidelines');
    }

    const dataset = posts
      .map((post, index) => {
        const excerpt = this.truncateText(post.content, 400);
        const flair = post as any;
        const flairInfo = flair?.link_flair_text ? `\n  Flair: ${flair.link_flair_text}` : '';
        return `Post ${index + 1}: ${post.title}\n  Upvotes: ${post.upvotes}, Comments: ${post.comments}${flairInfo}\n  Excerpt: ${excerpt || 'N/A'}`;
      })
      .join('\n\n');

    const prompt = `You are analyzing the highest-performing posts on r/${subreddit} from the last 14 days.

Given the following posts:
${dataset}

Extract SPECIFIC posting guidelines that are clearly grounded in these examples. For every bullet you produce, reference a concrete pattern you observed (topic, format, tone, flair, time of day, etc.) so nothing is generic.

Return JSON matching:
{
  "recommendations": ["..."],
  "idealStructures": ["..."],
  "toneTips": ["..."],
  "postingTimes": ["..."]
}

Recommendations must cite observed themes ("Posts about X performed well because Y"). Ideal structures describe the observed layout (hook -> breakdown -> poll, etc.). Tone tips should mention the voice used (e.g., "DMs praised self-deprecating humor"). Posting times should reference patterns ("Most high scorers were posted weekday mornings").`;

    try {
      const parsed = await this.generateJsonResponse(prompt, 1200, { temperature: 0.55 });
      const gaps = await this.generateGapAnalysis(subreddit, dataset);

      const guidelines: PostGuidelines = {
        subreddit,
        sourcePosts: posts,
        recommendations: parsed.recommendations || [],
        idealStructures: parsed.idealStructures || [],
        toneTips: parsed.toneTips || [],
        postingTimes: parsed.postingTimes || [],
        generatedAt: new Date().toISOString(),
        underrepresentedAngles: gaps.underrepresentedAngles || [],
        tensionHooks: gaps.tensionHooks || [],
      };

      postGuidelinesCache.set(subreddit, guidelines);

      return guidelines;
    } catch (error) {
      console.error('Failed to generate post guidelines:', error);
      throw new Error('Failed to generate post guidelines');
    }
  }

  async generateFullPost(request: PostIdeaExpansionRequest): Promise<{ title: string; content: string; wordCount: number }> {
    const guidelines = await this.generatePostGuidelines(request.subreddit);

    const instructionsBlock = request.instructions
      ? `Custom Instructions (override guidelines if needed):\n${request.instructions}`
      : 'No additional instructions provided.';
    const contextBlock = request.context
      ? `Additional Context from user (must be woven into the narrative):\n${request.context}`
      : 'No extra context provided.';

    const prompt = `You are writing a Reddit post for r/${request.subreddit} based on the following idea summary:

Title: ${request.idea.title}
Bullets:
- ${request.idea.bullets.join('\n- ')}

Inspiration Notes: ${request.idea.inspiration || 'N/A'}

${contextBlock}

Posting Guidelines:
${this.formatGuidelineSection('Recommendations', guidelines.recommendations, 4)}

${this.formatGuidelineSection('Ideal Structures', guidelines.idealStructures, 4)}

${this.formatGuidelineSection('Tone Tips', guidelines.toneTips, 4)}

${this.formatGuidelineSection('Posting Times', guidelines.postingTimes, 4)}

${instructionsBlock}

Write a full Reddit post (100-500 words). If the idea is primarily a question/conversation starter, aim for 100-200 words. If it shares experience, advice, or story, aim for 250-500 words. Always stay true to the subreddit culture and the requested tone (${request.tone || 'default community tone'}) unless the custom instructions contradict it.

Return JSON:
{
  "title": "...",
  "content": "...",
  "wordCount": 240
}`;

    try {
      const parsed = await this.generateJsonResponse(prompt, 1200);
      return {
        title: parsed.title || request.idea.title,
        content: parsed.content,
        wordCount: parsed.wordCount || parsed.content?.split(/\s+/).length || 0,
      };
    } catch (error) {
      console.error('Failed to generate full post:', error);
      throw new Error('Failed to generate full post');
    }
  }

  async generateCommentIdeas(
    request: AIPromptRequest,
    post: RedditPost,
    topComments: string[]
  ): Promise<AIGenerationResponse> {
    // Trim Reddit comment samples so prompts stay short but still grounded.
    const referenceComments = topComments
      .slice(0, 3)
      .map((comment, index) => `Comment #${index + 1}: ${this.truncateText(comment, 220)}`)
      .join('\n\n');

    const prompt = `You are an expert Redditor who knows how to write engaging, upvoted comments.

Post Title: "${post.title}"
Post Content: ${post.content || 'N/A'}
Current Score: ${post.score} upvotes
Number of Comments: ${post.comments}

Top Comments (for reference):
${referenceComments}

${request.context ? `Additional Context: ${request.context}` : ''} 

Generate 3 thoughtful, engaging comment ideas that would likely get upvoted in this thread. Focus on:
- Delivering at least one surprising insight, question, or datapoint per comment
- Referencing something specific from the OP or top comments so it feels rooted in the discussion
- Using vivid language (mini-anecdotes, rhetorical questions, or dry humor) when natural
- Staying respectful of subreddit norms while nudging the conversation somewhere new
- ${request.tone ? `Matching this tone: ${request.tone}` : 'Matching the subreddit tone organically'}

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
      const parsedResponse = await this.generateJsonResponse(prompt, 1500, {
        temperature: this.resolveTemperature(request.temperature ?? 0.72),
      });

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

  private async assessNovelty(
    subreddit: string,
    ideas: { title?: string; bullets?: string[]; inspiration?: string; content?: string }[]
  ): Promise<{ averageScore: number; perIdea: { title: string; score: number; notes: string }[]; feedback?: string }> {
    const ideaBlock = ideas
      .map((idea, index) => {
        const bullets = (idea.bullets ?? []).join(' | ');
        const inspiration = idea.inspiration ? ` [Inspiration: ${idea.inspiration}]` : '';
        return `${index + 1}. ${idea.title ?? 'Untitled'} — ${bullets || idea.content || ''}${inspiration}`;
      })
      .join('\n');

    const prompt = `You are a long-time moderator of r/${subreddit}. Rate how surprising each pitch would feel to veterans.

Ideas:
${ideaBlock}

Return JSON:
{
  "averageScore": 7.5,
  "perIdea": [
    {"title": "...", "score": 8.5, "notes": "..."}
  ],
  "feedback": "High-level tips if everything feels safe"
}

Scores are from 1 (generic) to 10 (mind-blowing). Reward ideas that make bold yet community-friendly moves.`;

    try {
      return await this.generateJsonResponse(prompt, 600, { temperature: 0.5 });
    } catch (error) {
      console.error('Failed to assess novelty:', error);
      return { averageScore: 7, perIdea: [], feedback: 'Heuristic fallback' };
    }
  }

  /**
   * Limits long guideline arrays so prompts stay compact and easier for the
   * model to anchor on specific, labeled recommendations.
   */
  private formatGuidelineSection(title: string, items: string[], maxItems = 3): string {
    if (!items.length) {
      return `${title}: none captured.`;
    }

    const trimmed = items.slice(0, maxItems);
    return `${title}:\n${trimmed.map((item, index) => `${index + 1}. ${item}`).join('\n')}`;
  }

  /**
   * Generates short reference blurbs instead of streaming entire post bodies,
   * which keeps prompts under token limits but still grounds the AI output.
   */
  private buildReferenceSummaries(posts: RedditPost[], maxItems = 3): string[] {
    return posts.slice(0, maxItems).map((post, index) => {
      const excerpt = this.truncateText(post.content, 160) || 'No selftext provided.';
      return `Example ${index + 1}: "${post.title}" (${post.upvotes}↑ / ${post.comments} comments) — ${excerpt}`;
    });
  }

  private async generateExplorationSeeds(
    subreddit: string,
    guidelines: PostGuidelines,
    extraContext?: string
  ): Promise<{ tensions: string[]; whatIfs: string[] }> {
    const prompt = `You are a creative researcher for r/${subreddit}.

Known guidance:
- Underrepresented Angles: ${(guidelines.underrepresentedAngles || []).join('; ') || 'n/a'}
- Tension Hooks: ${(guidelines.tensionHooks || []).join('; ') || 'n/a'}
${extraContext ? `- User Context: ${extraContext}` : ''}

Brainstorm unexpected jumping-off points before we write posts. Return JSON with two arrays:
{
  "tensions": ["short description of unresolved debate"],
  "whatIfs": ["intriguing what-if or surprising reframing"]
}

Each entry should be original, opinionated, and reference real community quirks.`;

    try {
      return await this.generateJsonResponse(prompt, 400, { temperature: 0.95, presencePenalty: 0.6, frequencyPenalty: 0.5 });
    } catch (error) {
      console.error('Failed to generate exploration seeds:', error);
      return { tensions: [], whatIfs: [] };
    }
  }

  private composePostIdeaPrompt({
    request,
    guidelines,
    referenceHighlights,
    explorationSeeds,
    extraContext,
    forceBold,
  }: {
    request: AIPromptRequest;
    guidelines: PostGuidelines;
    referenceHighlights: string[];
    explorationSeeds: { tensions: string[]; whatIfs: string[] };
    extraContext?: string;
    forceBold: boolean;
  }): string {
    const guidelineSections = [
      this.formatGuidelineSection('Recommendations', guidelines.recommendations),
      this.formatGuidelineSection('Ideal Structures', guidelines.idealStructures),
      this.formatGuidelineSection('Tone Tips', guidelines.toneTips),
      this.formatGuidelineSection('Posting Times', guidelines.postingTimes),
    ].join('\n\n');

    const underrepresented = this.formatGuidelineSection(
      'Underrepresented Angles',
      guidelines.underrepresentedAngles ?? [],
      4
    );
    const tensions = this.formatGuidelineSection('Tension Hooks', guidelines.tensionHooks ?? [], 4);
    const sparksBlock = [
      'Fresh Sparks:',
      `- Tensions: ${explorationSeeds.tensions.join('; ') || 'none harvested'}`,
      `- What-ifs: ${explorationSeeds.whatIfs.join('; ') || 'none harvested'}`,
    ].join('\n');

    const toneDirective = request.tone ? `Honor this requested tone/style: ${request.tone}` : 'Match the subreddit voice naturally.';
    const boldDirective = forceBold
      ? 'Your previous drafts were too safe. Pitch boundary-pushing, contrarian, or deeply personal ideas that remain respectful.'
      : 'Blend evidence from references with imaginative twists. Surprise loyal readers without violating subreddit rules.';

    return `You are an elite Reddit strategist generating conversation-starting posts for r/${request.subreddit}.

Grounding data (last 14 days):
${guidelineSections}

Reference Patterns:
${referenceHighlights.join('\n')}

${underrepresented}

${tensions}

${sparksBlock}

${extraContext ? `Additional context to weave in: ${extraContext}` : ''}

${boldDirective}

Produce FOUR high-variance post pitches. Requirements:
- Cover at least three different formats (story, rant, AMA, poll, experiment, teardown, etc.)
- At least one idea must flip a common belief observed in the references.
- At least one idea must feel intimate (first-person confession or hard-earned lesson).
- Explicitly cite which reference trend or spark inspired each idea, and explain what makes it novel.

For every idea include EXACTLY three bullets (hook, core payoff, call-to-action) plus:
- "format": the narrative or structural format used.
- "noveltySignal": 1-2 sentences that highlight the fresh angle or twist.

${toneDirective}

Return JSON:
{
  "ideas": [
    {
      "title": "...",
      "format": "story/poll/etc.",
      "bullets": ["hook", "body", "cta"],
      "inspiration": "Reference post or spark that informed it",
      "noveltySignal": "Why this stands out from prior hits"
    }
  ],
  "engagementScore": 8.5,
  "relevance": 9.0
}`;
  }

  private truncateText(text: string, maxLength = 400): string {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (clean.length <= maxLength) {
      return clean;
    }
    return `${clean.slice(0, maxLength)}...`;
  }

  private resolveTemperature(input?: number) {
    if (typeof input !== 'number' || Number.isNaN(input)) {
      return 0.7;
    }

    return Math.min(1.1, Math.max(0.3, input));
  }
}

export default new AIService();
