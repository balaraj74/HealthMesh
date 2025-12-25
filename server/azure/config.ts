/**
 * HealthMesh - Azure Configuration
 * Centralized configuration for all Azure services
 */

export interface AzureConfig {
  // Azure OpenAI / Azure AI Foundry
  openai: {
    endpoint: string;
    apiKey: string;
    apiVersion: string;
    deploymentName: string;
    embeddingDeployment: string;
    // Azure AI Foundry project settings
    resourceName?: string;
    projectName?: string;
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

  // Azure SQL Database
  sql: {
    server: string;
    database: string;
    user: string;
    password: string;
    options: {
      encrypt: boolean;
      trustServerCertificate: boolean;
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
      // Azure AI Foundry project settings
      resourceName: process.env.AZURE_AI_FOUNDRY_RESOURCE,
      projectName: process.env.AZURE_AI_FOUNDRY_PROJECT,
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
    sql: {
      server: getEnvOrDefault('AZURE_SQL_SERVER', ''),
      database: getEnvOrDefault('AZURE_SQL_DATABASE', 'healthmesh'),
      user: getEnvOrDefault('AZURE_SQL_USER', ''),
      password: getEnvOrDefault('AZURE_SQL_PASSWORD', ''),
      options: {
        encrypt: getEnvOrDefault('AZURE_SQL_ENCRYPT', 'true') === 'true',
        trustServerCertificate: getEnvOrDefault('AZURE_SQL_TRUST_CERT', 'false') === 'true',
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
