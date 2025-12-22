import { getAzureConfig } from './config';
import { getAzureOpenAI } from './openai-client';
import { getGeminiClient } from '../ai/gemini-client';

interface SearchDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  source: string;
  url?: string;
  lastUpdated?: string;
  embedding?: number[];
}

interface SearchResult {
  document: SearchDocument;
  score: number;
  highlights?: string[];
}

interface RAGResult {
  answer: string;
  sources: Array<{
    title: string;
    source: string;
    url?: string;
    relevance: number;
  }>;
  confidence: number;
}

// Index schema for medical guidelines
export const MEDICAL_GUIDELINES_INDEX_SCHEMA = {
  name: 'medical-guidelines',
  fields: [
    { name: 'id', type: 'Edm.String', key: true, filterable: true },
    { name: 'title', type: 'Edm.String', searchable: true, filterable: true },
    { name: 'content', type: 'Edm.String', searchable: true },
    { name: 'category', type: 'Edm.String', filterable: true, facetable: true },
    { name: 'source', type: 'Edm.String', filterable: true },
    { name: 'url', type: 'Edm.String' },
    { name: 'lastUpdated', type: 'Edm.DateTimeOffset', filterable: true, sortable: true },
    { name: 'embedding', type: 'Collection(Edm.Single)', searchable: true, dimensions: 768, vectorSearchProfile: 'vectorConfig' }, // Gemini uses 768 dims, OpenAI 1536. We need to be careful here.
  ],
  vectorSearch: {
    algorithms: [
      { name: 'hnsw', kind: 'hnsw', hnswParameters: { m: 4, efConstruction: 400, efSearch: 500, metric: 'cosine' } }
    ],
    profiles: [
      { name: 'vectorConfig', algorithm: 'hnsw' }
    ]
  },

};

export class AzureCognitiveSearchClient {
  private endpoint: string;
  private apiKey: string;
  private indexName: string;
  private apiVersion = '2023-11-01';

  constructor() {
    const config = getAzureConfig();
    this.endpoint = config.search.endpoint.replace(/\/$/, '');
    this.apiKey = config.search.key;
    this.indexName = config.search.indexName;
  }

  // Helper to get embeddings from the active provider
  private async getEmbedding(text: string): Promise<number[]> {
    if (process.env.AI_PROVIDER === 'gemini') {
      return getGeminiClient().createEmbedding(text);
    } else {
      const result = await getAzureOpenAI().createEmbedding(text);
      return result.embedding;
    }
  }

  // ==========================================
  // Index Management
  // ==========================================

  async createIndex(schema: typeof MEDICAL_GUIDELINES_INDEX_SCHEMA): Promise<void> {
    // Adjust dimensions based on provider if needed, but schema is static here.
    // If using Gemini, dimensions should be 768. If OpenAI, 1536.
    // We should check the provider and update the schema dimensions dynamically before sending.

    const schemaToSend = JSON.parse(JSON.stringify(schema));
    if (process.env.AI_PROVIDER === 'gemini') {
      schemaToSend.fields.find((f: any) => f.name === 'embedding').dimensions = 768;
    } else {
      schemaToSend.fields.find((f: any) => f.name === 'embedding').dimensions = 1536;
    }

    const url = `${this.endpoint}/indexes?api-version=${this.apiVersion}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      },
      body: JSON.stringify(schemaToSend),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create index: ${errorText}`);
    }
  }

  async deleteIndex(): Promise<void> {
    const url = `${this.endpoint}/indexes/${this.indexName}?api-version=${this.apiVersion}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'api-key': this.apiKey,
      },
    });

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      throw new Error(`Failed to delete index: ${errorText}`);
    }
  }

  // ==========================================
  // Document Operations
  // ==========================================

  async indexDocuments(documents: SearchDocument[]): Promise<void> {
    // Generate embeddings for documents without them
    const docsWithEmbeddings = await Promise.all(
      documents.map(async (doc) => {
        if (!doc.embedding) {
          const embedding = await this.getEmbedding(doc.content);
          return { ...doc, embedding };
        }
        return doc;
      })
    );

    const url = `${this.endpoint}/indexes/${this.indexName}/docs/index?api-version=${this.apiVersion}`;

    const batch = {
      value: docsWithEmbeddings.map(doc => ({
        '@search.action': 'mergeOrUpload',
        ...doc,
      })),
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      },
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to index documents: ${errorText}`);
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    const url = `${this.endpoint}/indexes/${this.indexName}/docs/index?api-version=${this.apiVersion}`;

    const batch = {
      value: [
        {
          '@search.action': 'delete',
          id: documentId,
        },
      ],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      },
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete document: ${errorText}`);
    }
  }

  // ==========================================
  // Search Operations
  // ==========================================

  async search(query: string, options?: {
    top?: number;
    filter?: string;
    semanticSearch?: boolean;
  }): Promise<SearchResult[]> {
    const url = `${this.endpoint}/indexes/${this.indexName}/docs/search?api-version=${this.apiVersion}`;

    const searchBody: any = {
      search: query,
      top: options?.top || 10,
      select: 'id,title,content,category,source,url,lastUpdated',
      highlight: 'content',
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>',
    };

    if (options?.filter) {
      searchBody.filter = options.filter;
    }

    if (options?.semanticSearch) {
      searchBody.queryType = 'semantic';
      searchBody.semanticConfiguration = 'semantic-config';
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      },
      body: JSON.stringify(searchBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Search failed: ${errorText}`);
    }

    const data = await response.json();

    return data.value.map((result: any) => ({
      document: {
        id: result.id,
        title: result.title,
        content: result.content,
        category: result.category,
        source: result.source,
        url: result.url,
        lastUpdated: result.lastUpdated,
      },
      score: result['@search.score'],
      highlights: result['@search.highlights']?.content,
    }));
  }

  async vectorSearch(query: string, options?: {
    top?: number;
    filter?: string;
  }): Promise<SearchResult[]> {
    const embedding = await this.getEmbedding(query);

    const url = `${this.endpoint}/indexes/${this.indexName}/docs/search?api-version=${this.apiVersion}`;

    const searchBody: any = {
      vectorQueries: [
        {
          kind: 'vector',
          vector: embedding,
          fields: 'embedding',
          k: options?.top || 10,
        },
      ],
      select: 'id,title,content,category,source,url,lastUpdated',
    };

    if (options?.filter) {
      searchBody.filter = options.filter;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      },
      body: JSON.stringify(searchBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vector search failed: ${errorText}`);
    }

    const data = await response.json();

    return data.value.map((result: any) => ({
      document: {
        id: result.id,
        title: result.title,
        content: result.content,
        category: result.category,
        source: result.source,
        url: result.url,
        lastUpdated: result.lastUpdated,
      },
      score: result['@search.score'],
    }));
  }

  async hybridSearch(query: string, options?: {
    top?: number;
    filter?: string;
  }): Promise<SearchResult[]> {
    const embedding = await this.getEmbedding(query);

    const url = `${this.endpoint}/indexes/${this.indexName}/docs/search?api-version=${this.apiVersion}`;

    const searchBody: any = {
      search: query,
      vectorQueries: [
        {
          kind: 'vector',
          vector: embedding,
          fields: 'embedding',
          k: options?.top || 10,
        },
      ],
      top: options?.top || 10,
      select: 'id,title,content,category,source,url,lastUpdated',

    };

    if (options?.filter) {
      searchBody.filter = options.filter;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      },
      body: JSON.stringify(searchBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hybrid search failed: ${errorText}`);
    }

    const data = await response.json();

    return data.value.map((result: any) => ({
      document: {
        id: result.id,
        title: result.title,
        content: result.content,
        category: result.category,
        source: result.source,
        url: result.url,
        lastUpdated: result.lastUpdated,
      },
      score: result['@search.score'],
    }));
  }

  // ==========================================
  // RAG (Retrieval Augmented Generation)
  // ==========================================

  async ragQuery(query: string, options?: {
    patientContext?: string;
    clinicalQuestion?: string;
    maxSources?: number;
  }): Promise<RAGResult> {
    // Step 1: Retrieve relevant documents using hybrid search
    const searchResults = await this.hybridSearch(query, {
      top: options?.maxSources || 5,
    });

    if (searchResults.length === 0) {
      return {
        answer: 'No relevant medical guidelines found for this query.',
        sources: [],
        confidence: 0,
      };
    }

    // Step 2: Build context from retrieved documents
    const context = searchResults
      .map((r, i) => `[Source ${i + 1}: ${r.document.title}]\n${r.document.content}`)
      .join('\n\n---\n\n');

    // Step 3: Generate answer using AI Provider
    const systemPrompt = `You are a clinical decision support assistant. Your role is to provide evidence-based answers using the provided medical guidelines and research.

IMPORTANT RULES:
1. Only use information from the provided sources
2. Cite sources using [Source N] format
3. If the sources don't contain relevant information, say so
4. Never provide diagnostic conclusions - only support information
5. Always recommend consulting with appropriate specialists
6. Be precise about evidence levels when mentioned in sources`;

    const userPrompt = `${options?.patientContext ? `Patient Context:\n${options.patientContext}\n\n` : ''}${options?.clinicalQuestion ? `Clinical Question:\n${options.clinicalQuestion}\n\n` : ''}Query: ${query}

Retrieved Guidelines and Evidence:
${context}

Please provide an evidence-based response with source citations.`;

    let answer = '';

    if (process.env.AI_PROVIDER === 'gemini') {
      const gemini = getGeminiClient();
      const result = await gemini.chatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      });
      answer = result.content;
    } else {
      const openai = getAzureOpenAI();
      const response = await openai.clinicalCompletion(systemPrompt, userPrompt);
      answer = response.answer || response.response || JSON.stringify(response);
    }

    return {
      answer: answer,
      sources: searchResults.map(r => ({
        title: r.document.title,
        source: r.document.source,
        url: r.document.url,
        relevance: Math.round(r.score * 100),
      })),
      confidence: Math.round(searchResults[0]?.score * 100) || 0,
    };
  }

  // ==========================================
  // Sample Data for Initial Population
  // ==========================================

  getSampleGuidelines(): SearchDocument[] {
    return [
      {
        id: 'nccn-breast-2024',
        title: 'NCCN Breast Cancer Treatment Guidelines 2024',
        content: `For hormone receptor-positive (HR+), HER2-negative breast cancer:
Stage I-II: Consider breast-conserving surgery with whole breast radiation, or mastectomy.
Adjuvant endocrine therapy (tamoxifen or aromatase inhibitor) for 5-10 years.
Consider adjuvant chemotherapy based on Oncotype DX score (if RS >= 26).
Stage III: Neoadjuvant chemotherapy followed by surgery and radiation.
For HER2+ disease: Add trastuzumab-based therapy.
Regular monitoring: Physical exam every 3-6 months for 5 years, then annually.
Annual mammography of preserved breast.`,
        category: 'Oncology',
        source: 'National Comprehensive Cancer Network',
        url: 'https://www.nccn.org/guidelines/breast-cancer',
        lastUpdated: '2024-01-15',
      },
      {
        id: 'ada-diabetes-2024',
        title: 'ADA Standards of Care in Diabetes 2024',
        content: `Type 2 Diabetes Management:
Target HbA1c: <7% for most adults, individualize based on patient factors.
First-line therapy: Metformin plus lifestyle modification.
If HbA1c remains above target after 3 months, consider:
- SGLT2 inhibitors (if cardiovascular disease or heart failure)
- GLP-1 receptor agonists (if weight management priority)
- DPP-4 inhibitors, sulfonylureas, or insulin as alternatives.
Cardiovascular risk: SGLT2i or GLP-1 RA with proven CV benefit.
Blood pressure target: <130/80 mmHg for most patients.
Statin therapy: Moderate-intensity for ages 40-75 without ASCVD.`,
        category: 'Endocrinology',
        source: 'American Diabetes Association',
        url: 'https://diabetesjournals.org/care',
        lastUpdated: '2024-01-01',
      },
      {
        id: 'acc-aha-hypertension',
        title: 'ACC/AHA Hypertension Guidelines',
        content: `Blood Pressure Categories:
Normal: <120/<80 mmHg
Elevated: 120-129/<80 mmHg
Stage 1 HTN: 130-139 or 80-89 mmHg
Stage 2 HTN: ≥140 or ≥90 mmHg

Treatment:
Stage 1 with 10-year ASCVD risk <10%: Lifestyle modifications first.
Stage 1 with risk ≥10% or Stage 2: Pharmacotherapy + lifestyle.
First-line medications: ACE inhibitors, ARBs, CCBs, or thiazide diuretics.
For Black patients without CKD: CCB or thiazide preferred initial therapy.
Target: <130/80 mmHg for most adults with hypertension.`,
        category: 'Cardiology',
        source: 'American College of Cardiology / American Heart Association',
        url: 'https://www.heart.org/en/health-topics/high-blood-pressure',
        lastUpdated: '2023-11-01',
      },
      {
        id: 'asco-antiemetic-2024',
        title: 'ASCO Antiemetic Guidelines for Chemotherapy',
        content: `For high emetic risk chemotherapy (e.g., cisplatin, AC regimen):
Day 1: NK1 antagonist + 5-HT3 antagonist + dexamethasone ± olanzapine
Days 2-4: Dexamethasone + olanzapine

For moderate emetic risk:
Day 1: 5-HT3 antagonist + dexamethasone
Days 2-3: Dexamethasone or 5-HT3 antagonist

For low emetic risk:
Single dose of dexamethasone or 5-HT3 antagonist or dopamine antagonist.

Breakthrough nausea: Use agent from different drug class than prophylaxis.
Consider lorazepam for anticipatory nausea/vomiting.`,
        category: 'Oncology - Supportive Care',
        source: 'American Society of Clinical Oncology',
        url: 'https://www.asco.org/antiemetics',
        lastUpdated: '2024-02-01',
      },
      {
        id: 'drug-interaction-warfarin',
        title: 'Warfarin Drug Interactions Reference',
        content: `Major interactions increasing INR (bleeding risk):
- Antibiotics: Metronidazole, TMP-SMX, fluconazole, ciprofloxacin
- Amiodarone: Reduce warfarin dose by 30-50%
- NSAIDs: Increased bleeding risk, avoid if possible
- Acetaminophen >2g/day: Monitor INR closely

Major interactions decreasing INR:
- Rifampin: May need 2-3x warfarin dose
- Carbamazepine, phenytoin
- Vitamin K-rich foods (consistent intake recommended)

Management:
- Check INR within 3-5 days of adding interacting drug
- Consider direct oral anticoagulants as alternative
- Educate on dietary consistency with vitamin K intake`,
        category: 'Drug Safety',
        source: 'Clinical Pharmacology Database',
        lastUpdated: '2024-03-01',
      },
    ];
  }
}

// Singleton instance
let _client: AzureCognitiveSearchClient | null = null;

export function getCognitiveSearch(): AzureCognitiveSearchClient {
  if (!_client) {
    _client = new AzureCognitiveSearchClient();
  }
  return _client;
}
