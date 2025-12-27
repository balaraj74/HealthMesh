/**
 * HealthMesh - Azure OpenAI Client
 * Production-grade Azure OpenAI integration using the official SDK
 * Supports Azure AI Foundry projects and multi-agent orchestration
 * Falls back to demo mode when Azure OpenAI is unavailable
 */

import { AzureOpenAI } from 'openai';
import { getAzureConfig } from './config';
import { demoAI } from './demo-ai-client';
import { getGeminiClient } from '../ai/gemini-client';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  agentName?: string; // For tracking which agent is making the call
}

interface ChatCompletionResult {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  agentName?: string;
}

interface EmbeddingResult {
  embedding: number[];
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

interface AgentConfig {
  name: string;
  temperature: number;
  maxTokens: number;
  systemPromptPrefix?: string;
}

// Pre-configured agent settings for different clinical agents
const AGENT_CONFIGS: Record<string, AgentConfig> = {
  'triage': {
    name: 'Triage Agent',
    temperature: 0.3,
    maxTokens: 2048,
    systemPromptPrefix: '[TRIAGE]'
  },
  'diagnostic': {
    name: 'Diagnostic Agent',
    temperature: 0.4,
    maxTokens: 4096,
    systemPromptPrefix: '[DIAGNOSTIC]'
  },
  'guideline': {
    name: 'Guideline Agent',
    temperature: 0.2,
    maxTokens: 3072,
    systemPromptPrefix: '[GUIDELINE]'
  },
  'medication-safety': {
    name: 'Medication Safety Agent',
    temperature: 0.2,
    maxTokens: 3072,
    systemPromptPrefix: '[MEDICATION-SAFETY]'
  },
  'evidence': {
    name: 'Evidence Agent',
    temperature: 0.3,
    maxTokens: 4096,
    systemPromptPrefix: '[EVIDENCE]'
  },
  'synthesis': {
    name: 'Synthesis Orchestrator',
    temperature: 0.4,
    maxTokens: 6144,
    systemPromptPrefix: '[SYNTHESIS]'
  },
  'default': {
    name: 'Clinical AI',
    temperature: 0.3,
    maxTokens: 4096,
  }
};

export class AzureOpenAIClient {
  private client: AzureOpenAI | null = null;
  private endpoint: string;
  private apiKey: string;
  private apiVersion: string;
  private deploymentName: string;
  private embeddingDeployment: string;
  private useDemoMode: boolean;
  private isInitialized: boolean = false;
  private initError: string | null = null;
  private geminiEnabled: boolean = false;

  constructor() {
    const config = getAzureConfig();
    this.endpoint = config.openai.endpoint;
    this.apiKey = config.openai.apiKey;
    this.apiVersion = config.openai.apiVersion || '2024-08-01-preview';
    this.deploymentName = config.openai.deploymentName || 'gpt-4o';
    this.embeddingDeployment = config.openai.embeddingDeployment || 'text-embedding-ada-002';
    this.useDemoMode = process.env.USE_DEMO_MODE === 'true';

    // Check if Gemini is available
    const gemini = getGeminiClient();
    this.geminiEnabled = gemini.isConfigured();

    // Log AI configuration
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║ 🤖 AI Engine Configuration                                 ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    if (this.geminiEnabled) {
      console.log('║ ✨ PRIMARY: Google Gemini (gemini-2.0-flash)               ║');
    }
    if (this.endpoint && this.apiKey) {
      console.log('║ 🔵 FALLBACK: Azure OpenAI (gpt-4o)                         ║');
    }
    console.log('║ 🎭 FINAL: Demo Mode (Intelligent Mocks)                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    if (this.useDemoMode) {
      console.log('🎭 Demo Mode: Using intelligent mock AI responses');
      return;
    }

    this.initializeClient();
  }

  private initializeClient(): void {
    try {
      if (!this.endpoint || !this.apiKey) {
        console.warn('⚠️ Azure OpenAI credentials not configured.');
        if (this.geminiEnabled) {
          console.log('✨ Using Google Gemini as primary AI engine');
        } else {
          console.warn('⚠️ No AI provider available. Using demo mode.');
          this.useDemoMode = true;
        }
        this.initError = 'Missing Azure OpenAI endpoint or API key';
        return;
      }

      // Clean up endpoint URL
      const cleanEndpoint = this.endpoint.replace(/\/$/, '');

      // Initialize the Azure OpenAI client using the openai package
      // This is the recommended approach for Azure OpenAI with the latest SDK
      this.client = new AzureOpenAI({
        endpoint: cleanEndpoint,
        apiKey: this.apiKey,
        apiVersion: this.apiVersion,
        deployment: this.deploymentName,
      });

      this.isInitialized = true;
      console.log(`✅ Azure OpenAI Client initialized successfully`);
      console.log(`   Endpoint: ${cleanEndpoint}`);
      console.log(`   Deployment: ${this.deploymentName}`);
      console.log(`   API Version: ${this.apiVersion}`);
    } catch (error) {
      console.error('❌ Failed to initialize Azure OpenAI client:', error);
      this.initError = error instanceof Error ? error.message : 'Unknown initialization error';
      if (!this.geminiEnabled) {
        this.useDemoMode = true;
      }
    }
  }

  /**
   * Get agent-specific configuration
   */
  private getAgentConfig(agentName?: string): AgentConfig {
    if (!agentName) return AGENT_CONFIGS['default'];

    const normalizedName = agentName.toLowerCase().replace(/\s+/g, '-');
    for (const [key, config] of Object.entries(AGENT_CONFIGS)) {
      if (normalizedName.includes(key)) {
        return config;
      }
    }
    return AGENT_CONFIGS['default'];
  }

  /**
   * Main chat completion method - used by all agents
   * PRIORITY: Gemini > Azure OpenAI > Demo Mode
   */
  async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
    const gemini = getGeminiClient();
    const agentConfig = this.getAgentConfig(options.agentName);

    // Use demo mode if explicitly requested
    if (this.useDemoMode) {
      console.log(`🎭 Using demo mode for ${options.agentName || 'clinical AI'}`);
      return demoAI.chatCompletion(options);
    }

    // PRIORITY 1: Use Gemini as PRIMARY AI engine (more reliable)
    if (this.geminiEnabled) {
      try {
        console.log(`✨ Using Gemini for ${agentConfig.name}`);
        return await gemini.chatCompletion(options);
      } catch (geminiError: any) {
        console.error(`❌ Gemini error for ${agentConfig.name}:`, geminiError.message);
        // Fall through to Azure OpenAI
      }
    }

    // PRIORITY 2: Try Azure OpenAI if Gemini failed or unavailable
    if (this.client) {
      try {
        return await this.azureChatCompletion(options, agentConfig);
      } catch (azureError: any) {
        console.error(`❌ Azure OpenAI error for ${agentConfig.name}:`, azureError.message);
      }
    }

    // PRIORITY 3: Final fallback to demo mode
    console.log(`🎭 Falling back to demo mode for ${agentConfig.name}`);
    return demoAI.chatCompletion(options);
  }

  /**
   * Azure OpenAI specific chat completion
   */
  private async azureChatCompletion(options: ChatCompletionOptions, agentConfig: AgentConfig): Promise<ChatCompletionResult> {
    if (!this.client) throw new Error('Azure OpenAI client not initialized');

    const startTime = Date.now();

    try {
      const requestBody: any = {
        model: this.deploymentName,
        messages: options.messages,
        temperature: options.temperature ?? agentConfig.temperature,
        max_tokens: options.maxTokens ?? agentConfig.maxTokens,
      };

      // Enable JSON mode if requested
      if (options.jsonMode) {
        requestBody.response_format = { type: 'json_object' };
      }

      const response = await this.client.chat.completions.create(requestBody);

      const endTime = Date.now();
      const latency = endTime - startTime;

      // Log successful completion
      console.log(`✅ ${agentConfig.name} completed in ${latency}ms | Tokens: ${response.usage?.total_tokens || 'N/A'}`);

      return {
        content: response.choices[0]?.message?.content || '',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        agentName: agentConfig.name,
      };
    } catch (error: any) {
      console.error(`❌ Azure OpenAI error for ${agentConfig.name}:`, error.message || error);

      // Check for specific error types
      if (error.status === 429) {
        console.warn('⚠️ Rate limit exceeded.');
      } if (error.status === 404) {
        console.warn('⚠️ Azure OpenAI Model Not Found.');
      } else if (error.status === 401 || error.status === 403) {
        console.warn('⚠️ Authentication error. Check your API key.');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.warn('⚠️ Network error. Azure OpenAI endpoint unreachable.');
      }

      // Rethrow to let caller handle fallback
      throw error;
    }
  }

  /**
   * Create embeddings for text
   */
  async createEmbedding(text: string): Promise<EmbeddingResult> {
    const gemini = getGeminiClient();

    // Try Gemini if Azure is not available or falling back
    if (!this.client && this.geminiEnabled && !this.useDemoMode) {
      try {
        const embedding = await gemini.createEmbedding(text);
        return {
          embedding,
          usage: {
            promptTokens: Math.floor(text.length / 4),
            totalTokens: Math.floor(text.length / 4)
          }
        };
      } catch (error) {
        console.warn('⚠️ Gemini embedding failed, falling back to demo');
      }
    }

    if (this.useDemoMode || !this.client) {
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
      // Create a separate client for embeddings with the embedding deployment
      const embeddingClient = new AzureOpenAI({
        endpoint: this.endpoint.replace(/\/$/, ''),
        apiKey: this.apiKey,
        apiVersion: this.apiVersion,
        deployment: this.embeddingDeployment,
      });

      const response = await embeddingClient.embeddings.create({
        model: this.embeddingDeployment,
        input: text,
      });

      return {
        embedding: response.data[0]?.embedding || [],
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      console.warn('Azure OpenAI Embedding error:', error);

      const gemini = getGeminiClient();
      if (this.geminiEnabled) {
        try {
          const embedding = await gemini.createEmbedding(text);
          return {
            embedding,
            usage: {
              promptTokens: Math.floor(text.length / 4),
              totalTokens: Math.floor(text.length / 4)
            }
          };
        } catch (geminiError) {
          console.warn('Gemini embedding fallback failed:', geminiError);
        }
      }

      console.warn('Using demo mode for embedding');
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

  /**
   * Create embeddings for multiple texts (batch)
   */
  async createEmbeddings(texts: string[]): Promise<number[][]> {
    if (this.useDemoMode || !this.client) {
      const embeddings = await Promise.all(texts.map(text => demoAI.createEmbedding(text)));
      return embeddings;
    }

    try {
      const embeddingClient = new AzureOpenAI({
        endpoint: this.endpoint.replace(/\/$/, ''),
        apiKey: this.apiKey,
        apiVersion: this.apiVersion,
        deployment: this.embeddingDeployment,
      });

      const response = await embeddingClient.embeddings.create({
        model: this.embeddingDeployment,
        input: texts,
      });

      return response.data.map((item: any) => item.embedding);
    } catch (error) {
      console.error('Azure OpenAI Batch Embedding error:', error);
      throw error;
    }
  }

  /**
   * Clinical completion with JSON response - main method used by all clinical agents
   * Automatically selects appropriate settings based on agent type
   */
  async clinicalCompletion(systemPrompt: string, userPrompt: string, agentName?: string): Promise<any> {
    const agentConfig = this.getAgentConfig(agentName);

    const result = await this.chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      jsonMode: true,
      temperature: agentConfig.temperature,
      maxTokens: agentConfig.maxTokens,
      agentName: agentName || agentConfig.name,
    });

    try {
      return JSON.parse(result.content);
    } catch {
      console.warn(`⚠️ Failed to parse JSON response from ${agentConfig.name}`);
      return { error: 'Failed to parse JSON response', raw: result.content };
    }
  }

  /**
   * Multi-agent orchestration - run multiple agents in parallel/sequence
   */
  async runAgentPipeline(agents: Array<{
    name: string;
    systemPrompt: string;
    userPrompt: string;
    dependsOn?: string[];
  }>): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    const completed = new Set<string>();

    // Group agents by dependencies
    const canRun = (agent: typeof agents[0]) => {
      if (!agent.dependsOn || agent.dependsOn.length === 0) return true;
      return agent.dependsOn.every(dep => completed.has(dep));
    };

    // Process agents in waves
    let remaining = [...agents];
    while (remaining.length > 0) {
      const runnable = remaining.filter(canRun);

      if (runnable.length === 0 && remaining.length > 0) {
        console.error('❌ Circular dependency detected in agent pipeline');
        break;
      }

      // Run all runnable agents in parallel
      const wave = await Promise.all(
        runnable.map(async (agent) => {
          try {
            const result = await this.clinicalCompletion(
              agent.systemPrompt,
              agent.userPrompt,
              agent.name
            );
            return { name: agent.name, result, success: true };
          } catch (error) {
            return {
              name: agent.name,
              result: { error: error instanceof Error ? error.message : 'Unknown error' },
              success: false
            };
          }
        })
      );

      // Record results and mark as completed
      for (const { name, result } of wave) {
        results[name] = result;
        completed.add(name);
      }

      // Remove completed agents from remaining
      remaining = remaining.filter(a => !completed.has(a.name));
    }

    return results;
  }

  /**
   * Health check for Azure OpenAI connection
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    endpoint: string;
    deployment: string;
    latencyMs?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    if (this.useDemoMode) {
      return {
        status: 'degraded',
        endpoint: this.endpoint || 'not configured',
        deployment: this.deploymentName,
        error: this.initError || 'Running in demo mode'
      };
    }

    try {
      // Simple health check using a minimal completion
      await this.chatCompletion({
        messages: [{ role: 'user', content: 'Health check: respond with "OK"' }],
        maxTokens: 10,
        temperature: 0,
      });

      return {
        status: 'healthy',
        endpoint: this.endpoint,
        deployment: this.deploymentName,
        latencyMs: Date.now() - startTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        endpoint: this.endpoint,
        deployment: this.deploymentName,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get current configuration status
   */
  getStatus(): {
    initialized: boolean;
    demoMode: boolean;
    endpoint: string;
    deployment: string;
    error?: string;
  } {
    return {
      initialized: this.isInitialized,
      demoMode: this.useDemoMode,
      endpoint: this.endpoint || 'not configured',
      deployment: this.deploymentName,
      error: this.initError || undefined
    };
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

// Reset client (useful for testing or reconfiguration)
export function resetAzureOpenAIClient(): void {
  _client = null;
}
