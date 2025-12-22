/**
 * HealthMesh - Azure OpenAI Client
 * Handles all Azure OpenAI interactions with proper error handling and logging
 * Falls back to demo mode when Azure OpenAI is unavailable
 */

import { getAzureConfig } from './config';
import { demoAI } from './demo-ai-client';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

interface ChatCompletionResult {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface EmbeddingResult {
  embedding: number[];
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

export class AzureOpenAIClient {
  private endpoint: string;
  private apiKey: string;
  private apiVersion: string;
  private deploymentName: string;
  private embeddingDeployment: string;
  private useDemoMode: boolean;

  constructor() {
    const config = getAzureConfig();
    this.endpoint = config.openai.endpoint;
    this.apiKey = config.openai.apiKey;
    this.apiVersion = config.openai.apiVersion;
    this.deploymentName = config.openai.deploymentName;
    this.embeddingDeployment = config.openai.embeddingDeployment;
    this.useDemoMode = process.env.USE_DEMO_MODE === 'true';
    
    if (this.useDemoMode) {
      console.log('🎭 Demo Mode: Using intelligent mock AI responses');
    }
  }

  private buildUrl(deployment: string, path: string): string {
    const baseUrl = this.endpoint.replace(/\/$/, '');
    return `${baseUrl}/openai/deployments/${deployment}${path}?api-version=${this.apiVersion}`;
  }

  async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
    // Use demo mode if enabled or if API call fails
    if (this.useDemoMode) {
      return demoAI.chatCompletion(options);
    }

    try {
      const url = this.buildUrl(this.deploymentName, '/chat/completions');

      const body: any = {
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
      };

      if (options.jsonMode) {
        body.response_format = { type: 'json_object' };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Azure OpenAI unavailable, using demo mode: ${errorText}`);
        return demoAI.chatCompletion(options);
      }

      const data = await response.json();

      return {
        content: data.choices[0]?.message?.content || '',
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      console.warn('Azure OpenAI error, falling back to demo mode:', error);
      return demoAI.chatCompletion(options);
    }
  }

  async createEmbedding(text: string): Promise<EmbeddingResult> {
    if (this.useDemoMode) {
      const embedding = await demoAI.createEmbedding(text);
      return {
        embedding,
        usage: {
          promptTokens: Math.floor(text.length / 4),
          totalTokens: Math.floor(text.length / 4)
        }
      };
    }

    try {
      const url = this.buildUrl(this.embeddingDeployment, '/embeddings');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify({
          input: text,
        }),
      });

      if (!response.ok) {
        console.warn('Azure OpenAI Embedding unavailable, using demo mode');
        const embedding = await demoAI.createEmbedding(text);
        return {
          embedding,
          usage: {
            promptTokens: Math.floor(text.length / 4),
            totalTokens: Math.floor(text.length / 4)
          }
        };
      }

      const data = await response.json();

      return {
        embedding: data.data[0]?.embedding || [],
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      console.warn('Azure OpenAI Embedding error, using demo mode:', error);
      const embedding = await demoAI.createEmbedding(text);
      return {
        embedding,
        usage: {
          promptTokens: Math.floor(text.length / 4),
          totalTokens: Math.floor(text.length / 4)
        }
      };
    }
  }

  async createEmbeddings(texts: string[]): Promise<number[][]> {
    const url = this.buildUrl(this.embeddingDeployment, '/embeddings');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      },
      body: JSON.stringify({
        input: texts,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure OpenAI Embedding API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.data.map((item: any) => item.embedding);
  }

  // Helper for clinical agent prompts with JSON response
  async clinicalCompletion(systemPrompt: string, userPrompt: string): Promise<any> {
    const result = await this.chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      jsonMode: true,
      temperature: 0.3, // Lower temperature for clinical accuracy
    });

    try {
      return JSON.parse(result.content);
    } catch {
      return { error: 'Failed to parse JSON response', raw: result.content };
    }
  }
}

// Singleton instance
let _client: AzureOpenAIClient | null = null;

export function getAzureOpenAI(): AzureOpenAIClient {
  if (!_client) {
    _client = new AzureOpenAIClient();
  }
  return _client;
}
