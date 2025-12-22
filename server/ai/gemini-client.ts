/**
 * HealthMesh - Google Gemini AI Client
 * Provides AI capabilities using Google's Gemini API
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

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
}

interface ChatResult {
    content: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export class GeminiClient {
    private apiKey: string;
    private model: string;

    constructor() {
        this.apiKey = GEMINI_API_KEY;
        // Use the stable Gemini model
        this.model = "gemini-2.0-flash";

        if (!this.apiKey) {
            console.warn("⚠️ GEMINI_API_KEY not set - AI features will not work");
        } else {
            console.log(`🤖 Gemini AI Client initialized (${this.model})`);
        }
    }

    async chat(options: ChatOptions): Promise<ChatResult> {
        if (!this.apiKey) {
            throw new Error("Gemini API key not configured");
        }

        // Convert messages to Gemini format
        const contents: GeminiMessage[] = options.messages.map(msg => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }]
        }));

        const requestBody: GeminiRequest = {
            contents,
            generationConfig: {
                temperature: options.temperature ?? 0.7,
                maxOutputTokens: options.maxTokens ?? 2048,
                topP: 0.95,
                topK: 40,
            },
        };

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
                throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();

            const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const usage = {
                promptTokens: data.usageMetadata?.promptTokenCount || 0,
                completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
                totalTokens: data.usageMetadata?.totalTokenCount || 0,
            };

            console.log(`✅ Gemini response received (${usage.totalTokens} tokens)`);
            return { content, usage };
        } catch (error: any) {
            console.error("❌ Gemini API request failed:", error.message);
            throw error;
        }
    }

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

    // Compatibility method for existing code
    async chatCompletion(options: {
        messages: { role: "system" | "user" | "assistant"; content: string }[];
        temperature?: number;
        maxTokens?: number;
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
        });
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
