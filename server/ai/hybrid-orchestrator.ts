/**
 * HealthMesh - Hybrid AI Orchestrator
 * Intelligently routes AI requests between Azure OpenAI and Google Gemini
 * Provides redundancy, load balancing, and optimal model selection
 */

import { getAzureOpenAI, AzureOpenAIClient } from '../azure/openai-client';
import { getGeminiClient, GeminiClient } from './gemini-client';

export type AIProvider = 'azure-openai' | 'gemini' | 'auto';

interface HybridAIConfig {
    // Primary provider for clinical agents (healthcare-critical)
    clinicalProvider: AIProvider;
    // Provider for general chat/conversation
    chatProvider: AIProvider;
    // Provider for embeddings
    embeddingProvider: AIProvider;
    // Enable fallback to secondary provider on failure
    enableFallback: boolean;
}

interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface ChatCompletionOptions {
    messages: ChatMessage[];
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
    agentName?: string;
}

interface ChatCompletionResult {
    content: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    provider: string;
    model?: string;
    agentName?: string;
}

// Agent-to-provider mapping for optimal performance
const AGENT_PROVIDER_PREFERENCE: Record<string, AIProvider> = {
    // Clinical agents prefer Azure OpenAI for HIPAA compliance
    'triage': 'azure-openai',
    'diagnostic': 'azure-openai',
    'guideline': 'azure-openai',
    'medication-safety': 'azure-openai',
    'evidence': 'azure-openai',
    'synthesis': 'azure-openai',
    // General purpose can use either (faster response with Gemini 2.5)
    'chat': 'auto',
    'search': 'auto',
    'default': 'auto',
};

export class HybridAIOrchestrator {
    private azureClient: AzureOpenAIClient;
    private geminiClient: GeminiClient;
    private config: HybridAIConfig;

    constructor() {
        this.azureClient = getAzureOpenAI();
        this.geminiClient = getGeminiClient();

        // Load configuration from environment
        this.config = {
            clinicalProvider: (process.env.CLINICAL_AI_PROVIDER as AIProvider) || 'azure-openai',
            chatProvider: (process.env.CHAT_AI_PROVIDER as AIProvider) || 'auto',
            embeddingProvider: (process.env.EMBEDDING_AI_PROVIDER as AIProvider) || 'azure-openai',
            enableFallback: process.env.AI_FALLBACK_ENABLED !== 'false',
        };

        console.log('🔀 Hybrid AI Orchestrator initialized');
        console.log(`   Clinical Provider: ${this.config.clinicalProvider}`);
        console.log(`   Chat Provider: ${this.config.chatProvider}`);
        console.log(`   Embedding Provider: ${this.config.embeddingProvider}`);
        console.log(`   Fallback Enabled: ${this.config.enableFallback}`);
    }

    /**
     * Determine the best provider for a given task
     */
    private selectProvider(agentName?: string, forceProvider?: AIProvider): AIProvider {
        // If forced, use that provider
        if (forceProvider && forceProvider !== 'auto') {
            return forceProvider;
        }

        // Check agent-specific preference
        if (agentName) {
            const normalizedName = agentName.toLowerCase().replace(/\s+/g, '-');
            for (const [key, provider] of Object.entries(AGENT_PROVIDER_PREFERENCE)) {
                if (normalizedName.includes(key) && provider !== 'auto') {
                    return provider;
                }
            }
        }

        // Auto-select based on availability and performance
        const azureStatus = this.azureClient.getStatus();
        const geminiConfigured = this.geminiClient.isConfigured();

        // Prefer Azure for clinical tasks, Gemini for speed
        if (azureStatus.initialized && !azureStatus.demoMode) {
            return 'azure-openai';
        } else if (geminiConfigured) {
            return 'gemini';
        } else if (azureStatus.initialized) {
            return 'azure-openai'; // Demo mode as last resort
        }

        return 'azure-openai'; // Default fallback
    }

    /**
     * Main chat completion with automatic provider selection and fallback
     */
    async chatCompletion(
        options: ChatCompletionOptions,
        forceProvider?: AIProvider
    ): Promise<ChatCompletionResult> {
        const provider = this.selectProvider(options.agentName, forceProvider);

        try {
            if (provider === 'gemini') {
                return await this.geminiCompletion(options);
            } else {
                return await this.azureCompletion(options);
            }
        } catch (error) {
            // Fallback to other provider if enabled
            if (this.config.enableFallback) {
                console.warn(`⚠️ ${provider} failed, attempting fallback...`);

                try {
                    if (provider === 'gemini') {
                        return await this.azureCompletion(options);
                    } else {
                        return await this.geminiCompletion(options);
                    }
                } catch (fallbackError) {
                    console.error('❌ Both AI providers failed');
                    throw fallbackError;
                }
            }
            throw error;
        }
    }

    /**
     * Azure OpenAI completion
     */
    private async azureCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
        const result = await this.azureClient.chatCompletion(options);
        return {
            ...result,
            provider: 'azure-openai',
        };
    }

    /**
     * Gemini completion
     */
    private async geminiCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
        const result = await this.geminiClient.chatCompletion(options);
        return {
            ...result,
            provider: 'gemini',
        };
    }

    /**
     * Clinical completion with automatic provider selection
     * Prefers Azure OpenAI for HIPAA-compliant healthcare data
     */
    async clinicalCompletion(
        systemPrompt: string,
        userPrompt: string,
        agentName?: string
    ): Promise<any> {
        const provider = this.selectProvider(agentName, this.config.clinicalProvider);

        try {
            if (provider === 'gemini' && this.geminiClient.isConfigured()) {
                const result = await this.geminiClient.clinicalCompletion(systemPrompt, userPrompt, agentName);
                console.log(`🔵 ${agentName || 'Clinical AI'} used Gemini`);
                return result;
            } else {
                const result = await this.azureClient.clinicalCompletion(systemPrompt, userPrompt, agentName);
                console.log(`🟢 ${agentName || 'Clinical AI'} used Azure OpenAI`);
                return result;
            }
        } catch (error) {
            if (this.config.enableFallback) {
                console.warn(`⚠️ Fallback triggered for ${agentName || 'Clinical AI'}`);

                try {
                    if (provider === 'gemini') {
                        return await this.azureClient.clinicalCompletion(systemPrompt, userPrompt, agentName);
                    } else if (this.geminiClient.isConfigured()) {
                        return await this.geminiClient.clinicalCompletion(systemPrompt, userPrompt, agentName);
                    }
                } catch (fallbackError) {
                    console.error('❌ Fallback also failed');
                }
            }
            throw error;
        }
    }

    /**
     * Create embeddings with provider selection
     */
    async createEmbedding(text: string): Promise<number[]> {
        const provider = this.selectProvider(undefined, this.config.embeddingProvider);

        if (provider === 'gemini' && this.geminiClient.isConfigured()) {
            return this.geminiClient.createEmbedding(text);
        } else {
            const result = await this.azureClient.createEmbedding(text);
            return result.embedding;
        }
    }

    /**
     * Health check for all providers
     */
    async healthCheck(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        providers: {
            azureOpenAI: {
                status: string;
                configured: boolean;
                demoMode: boolean;
            };
            gemini: {
                status: string;
                configured: boolean;
                model: string;
            };
        };
        activeProvider: string;
    }> {
        const azureStatus = this.azureClient.getStatus();
        const geminiInfo = this.geminiClient.getModelInfo();

        let azureHealth = 'unknown';
        let geminiHealth = 'unknown';

        // Check Azure
        if (azureStatus.initialized && !azureStatus.demoMode) {
            try {
                const check = await this.azureClient.healthCheck();
                azureHealth = check.status;
            } catch {
                azureHealth = 'unhealthy';
            }
        } else if (azureStatus.demoMode) {
            azureHealth = 'demo-mode';
        } else {
            azureHealth = 'not-configured';
        }

        // Check Gemini
        if (geminiInfo.configured) {
            try {
                const check = await this.geminiClient.healthCheck();
                geminiHealth = check.status;
            } catch {
                geminiHealth = 'unhealthy';
            }
        } else {
            geminiHealth = 'not-configured';
        }

        // Determine overall status
        let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'unhealthy';
        if (azureHealth === 'healthy' && geminiHealth === 'healthy') {
            overallStatus = 'healthy';
        } else if (azureHealth === 'healthy' || geminiHealth === 'healthy') {
            overallStatus = 'degraded';
        } else if (azureHealth === 'demo-mode') {
            overallStatus = 'degraded';
        }

        return {
            status: overallStatus,
            providers: {
                azureOpenAI: {
                    status: azureHealth,
                    configured: azureStatus.initialized,
                    demoMode: azureStatus.demoMode,
                },
                gemini: {
                    status: geminiHealth,
                    configured: geminiInfo.configured,
                    model: geminiInfo.model,
                },
            },
            activeProvider: this.selectProvider(),
        };
    }

    /**
     * Get configuration status
     */
    getConfig(): HybridAIConfig {
        return { ...this.config };
    }
}

// Singleton instance
let _orchestrator: HybridAIOrchestrator | null = null;

export function getHybridAI(): HybridAIOrchestrator {
    if (!_orchestrator) {
        _orchestrator = new HybridAIOrchestrator();
    }
    return _orchestrator;
}

// Reset orchestrator
export function resetHybridAI(): void {
    _orchestrator = null;
}
