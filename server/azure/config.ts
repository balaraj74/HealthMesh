/**
 * HealthMesh - Azure Configuration
 * Centralized configuration for all Azure services
 */

export interface AzureConfig {
  // Azure OpenAI
  openai: {
    endpoint: string;
    apiKey: string;
    apiVersion: string;
    deploymentName: string;
    embeddingDeployment: string;
  };

  // Azure Health Data Services (FHIR)
  fhir: {
    endpoint: string;
    audience: string;
  };

  // Azure Document Intelligence
  documentIntelligence: {
    endpoint: string;
    key: string;
  };

  // Azure Cognitive Search
  search: {
    endpoint: string;
    key: string;
    indexName: string;
  };

  // Azure Cosmos DB
  cosmos: {
    endpoint: string;
    key: string;
    database: string;
    containers: {
      patients: string;
      cases: string;
      audit: string;
    };
  };

  // Azure AI Vision
  vision: {
    endpoint: string;
    key: string;
  };

  // Azure Blob Storage
  storage: {
    connectionString: string;
    container: string;
  };

  // Azure Application Insights
  appInsights: {
    connectionString: string;
  };

  // Managed Identity
  useManagedIdentity: boolean;
  clientId?: string;
  tenantId?: string;
}

function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvOrDefault(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export function loadAzureConfig(): AzureConfig {
  return {
    openai: {
      endpoint: getEnvOrDefault('AZURE_OPENAI_ENDPOINT', ''),
      apiKey: getEnvOrDefault('AZURE_OPENAI_API_KEY', ''),
      apiVersion: getEnvOrDefault('AZURE_OPENAI_API_VERSION', '2024-08-01-preview'),
      deploymentName: getEnvOrDefault('AZURE_OPENAI_DEPLOYMENT_NAME', 'gpt-4o'),
      embeddingDeployment: getEnvOrDefault('AZURE_OPENAI_EMBEDDING_DEPLOYMENT', 'text-embedding-ada-002'),
    },
    fhir: {
      endpoint: getEnvOrDefault('AZURE_FHIR_ENDPOINT', ''),
      audience: getEnvOrDefault('AZURE_FHIR_AUDIENCE', ''),
    },
    documentIntelligence: {
      endpoint: getEnvOrDefault('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT', ''),
      key: getEnvOrDefault('AZURE_DOCUMENT_INTELLIGENCE_KEY', ''),
    },
    search: {
      endpoint: getEnvOrDefault('AZURE_SEARCH_ENDPOINT', ''),
      key: getEnvOrDefault('AZURE_SEARCH_KEY', ''),
      indexName: getEnvOrDefault('AZURE_SEARCH_INDEX_NAME', 'medical-guidelines'),
    },
    cosmos: {
      endpoint: getEnvOrDefault('AZURE_COSMOS_ENDPOINT', ''),
      key: getEnvOrDefault('AZURE_COSMOS_KEY', ''),
      database: getEnvOrDefault('AZURE_COSMOS_DATABASE', 'healthmesh'),
      containers: {
        patients: getEnvOrDefault('AZURE_COSMOS_CONTAINER_PATIENTS', 'patients'),
        cases: getEnvOrDefault('AZURE_COSMOS_CONTAINER_CASES', 'cases'),
        audit: getEnvOrDefault('AZURE_COSMOS_CONTAINER_AUDIT', 'auditlogs'),
      },
    },
    vision: {
      endpoint: getEnvOrDefault('AZURE_VISION_ENDPOINT', ''),
      key: getEnvOrDefault('AZURE_VISION_KEY', ''),
    },
    storage: {
      connectionString: getEnvOrDefault('AZURE_STORAGE_CONNECTION_STRING', ''),
      container: getEnvOrDefault('AZURE_STORAGE_CONTAINER', 'lab-reports'),
    },
    appInsights: {
      connectionString: getEnvOrDefault('APPLICATIONINSIGHTS_CONNECTION_STRING', ''),
    },
    useManagedIdentity: getEnvOrDefault('USE_MANAGED_IDENTITY', 'false') === 'true',
    clientId: process.env.AZURE_CLIENT_ID,
    tenantId: process.env.AZURE_TENANT_ID,
  };
}

// Validate that required services are configured
export function validateAzureConfig(config: AzureConfig): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  // Azure OpenAI is required
  if (!config.openai.endpoint || !config.openai.apiKey) {
    missing.push('Azure OpenAI (AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY)');
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

// Export singleton config
let _config: AzureConfig | null = null;

export function getAzureConfig(): AzureConfig {
  if (!_config) {
    _config = loadAzureConfig();
  }
  return _config;
}
