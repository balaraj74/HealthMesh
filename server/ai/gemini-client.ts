/**
 * HealthMesh - Google Gemini AI Client
 * Provides AI capabilities using Google's Gemini API
 * Updated to support the latest Gemini 2.5 Flash model
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// Available Gemini models (latest first)
export const GEMINI_MODELS = {
    // Latest and fastest - recommended for most use cases
    'gemini-2.5-flash': 'gemini-2.5-flash-preview-05-20',
    // Stable production model
    'gemini-2.0-flash': 'gemini-2.0-flash',
    // Previous generation
    'gemini-1.5-flash': 'gemini-1.5-flash',
    'gemini-1.5-pro': 'gemini-1.5-pro',
} as const;

interface GeminiMessage {
    role: "user" | "model";
    parts: { text: string }[];
}

interface GeminiRequest {
    contents: GeminiMessage[];
    generationConfig?: {
        temperature?: number;
        maxOutputTokens?: number;
        topP?: number;
        topK?: number;
        responseMimeType?: string;
    };
    systemInstruction?: {
        parts: { text: string }[];
    };
}

interface ChatOptions {
    systemPrompt?: string;
    messages: { role: "user" | "assistant"; content: string }[];
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
    agentName?: string;
}

interface ChatResult {
    content: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    model?: string;
    agentName?: string;
}

export class GeminiClient {
    private apiKey: string;
    private model: string;
    private isInitialized: boolean = false;

    constructor() {
        this.apiKey = GEMINI_API_KEY;
        // Use the latest Gemini 2.5 Flash model for best performance
        // Falls back to 2.0-flash if 2.5 is not available
        this.model = process.env.GEMINI_MODEL || GEMINI_MODELS['gemini-2.5-flash'];

        if (!this.apiKey) {
            console.warn("⚠️ GEMINI_API_KEY not set - Gemini AI features will use Azure OpenAI fallback");
        } else {
            this.isInitialized = true;
            console.log(`✅ Gemini AI Client initialized`);
            console.log(`   Model: ${this.model}`);
            console.log(`   API: Google Generative AI`);
        }
    }

    /**
     * Check if Gemini is properly configured
     */
    isConfigured(): boolean {
        return this.isInitialized && !!this.apiKey;
    }

    /**
     * Get current model info
     */
    getModelInfo(): { model: string; configured: boolean } {
        return {
            model: this.model,
            configured: this.isConfigured()
        };
    }

    /**
     * Main chat method with support for JSON mode and agent tracking
     */
    async chat(options: ChatOptions): Promise<ChatResult> {
        if (!this.apiKey) {
            throw new Error("Gemini API key not configured");
        }

        const startTime = Date.now();

        // Convert messages to Gemini format
        const contents: GeminiMessage[] = options.messages.map(msg => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }]
        }));

        const requestBody: GeminiRequest = {
            contents,
            generationConfig: {
                temperature: options.temperature ?? 0.7,
                maxOutputTokens: options.maxTokens ?? 4096,
                topP: 0.95,
                topK: 40,
            },
        };

        // Enable JSON mode if requested
        if (options.jsonMode) {
            requestBody.generationConfig!.responseMimeType = "application/json";
        }

        // Add system instruction if provided
        if (options.systemPrompt) {
            requestBody.systemInstruction = {
                parts: [{ text: options.systemPrompt }]
            };
        }

        const url = `${GEMINI_API_URL}/${this.model}:generateContent?key=${this.apiKey}`;

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("❌ Gemini API error:", response.status, errorText);

                // If model not available, try fallback
                if (response.status === 404 && this.model.includes('2.5')) {
                    console.log("⚠️ Gemini 2.5 not available, falling back to 2.0-flash");
                    this.model = GEMINI_MODELS['gemini-2.0-flash'];
                    return this.chat(options); // Retry with fallback model
                }

                throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();

            const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const usage = {
                promptTokens: data.usageMetadata?.promptTokenCount || 0,
                completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
                totalTokens: data.usageMetadata?.totalTokenCount || 0,
            };

            const latency = Date.now() - startTime;
            console.log(`✅ Gemini ${options.agentName || 'AI'} completed in ${latency}ms | Tokens: ${usage.totalTokens}`);

            return {
                content,
                usage,
                model: this.model,
                agentName: options.agentName
            };
        } catch (error: any) {
            console.error("❌ Gemini API request failed:", error.message);
            throw error;
        }
    }

    /**
     * Create text embeddings using Gemini's embedding model
     */
    async createEmbedding(text: string): Promise<number[]> {
        if (!this.apiKey) {
            throw new Error("Gemini API key not configured");
        }

        const model = "text-embedding-004";
        const url = `${GEMINI_API_URL}/${model}:embedContent?key=${this.apiKey}`;

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    content: {
                        parts: [{ text }]
                    }
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("❌ Gemini Embedding API error:", response.status, errorText);
                throw new Error(`Gemini Embedding API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            const embedding = data.embedding?.values;

            if (!embedding) {
                throw new Error("No embedding returned from Gemini API");
            }

            return embedding;
        } catch (error: any) {
            console.error("❌ Gemini Embedding request failed:", error.message);
            throw error;
        }
    }

    /**
     * Clinical completion with JSON response - compatible with Azure OpenAI interface
     */
    async clinicalCompletion(systemPrompt: string, userPrompt: string, agentName?: string): Promise<any> {
        const result = await this.chat({
            systemPrompt,
            messages: [{ role: "user", content: userPrompt }],
            temperature: 0.3,
            maxTokens: 4096,
            jsonMode: true,
            agentName,
        });

        try {
            return JSON.parse(result.content);
        } catch {
            console.warn(`⚠️ Failed to parse JSON response from Gemini ${agentName || 'AI'}`);
            return { error: 'Failed to parse JSON response', raw: result.content };
        }
    }

    /**
     * Compatibility method for existing code - matches Azure OpenAI interface
     */
    async chatCompletion(options: {
        messages: { role: "system" | "user" | "assistant"; content: string }[];
        temperature?: number;
        maxTokens?: number;
        jsonMode?: boolean;
        agentName?: string;
    }): Promise<ChatResult> {
        // Extract system message if present
        let systemPrompt: string | undefined;
        const messages: { role: "user" | "assistant"; content: string }[] = [];

        for (const msg of options.messages) {
            if (msg.role === "system") {
                systemPrompt = msg.content;
            } else {
                messages.push({
                    role: msg.role as "user" | "assistant",
                    content: msg.content
                });
            }
        }

        return this.chat({
            systemPrompt,
            messages,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
            jsonMode: options.jsonMode,
            agentName: options.agentName,
        });
    }

    /**
     * Health check for Gemini connection
     */
    async healthCheck(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        model: string;
        latencyMs?: number;
        error?: string;
    }> {
        if (!this.isConfigured()) {
            return {
                status: 'unhealthy',
                model: this.model,
                error: 'Gemini API key not configured'
            };
        }

        const startTime = Date.now();
        try {
            await this.chat({
                messages: [{ role: 'user', content: 'Health check: respond with "OK"' }],
                maxTokens: 10,
                temperature: 0,
            });

            return {
                status: 'healthy',
                model: this.model,
                latencyMs: Date.now() - startTime
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                model: this.model,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}

// Singleton instance
let _geminiClient: GeminiClient | null = null;

export function getGeminiClient(): GeminiClient {
    if (!_geminiClient) {
        _geminiClient = new GeminiClient();
    }
    return _geminiClient;
}

// Reset client (useful for testing or reconfiguration)
export function resetGeminiClient(): void {
    _geminiClient = null;
}
