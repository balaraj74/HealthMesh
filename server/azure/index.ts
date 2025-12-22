/**
 * HealthMesh - Azure Services Index
 * Central export for all Azure service clients
 */

// Configuration
export { getAzureConfig, loadAzureConfig, validateAzureConfig } from './config';
export type { AzureConfig } from './config';

// Azure OpenAI
export { getAzureOpenAI, AzureOpenAIClient } from './openai-client';

// Azure Health Data Services (FHIR)
export { getAzureFHIR, AzureFHIRClient } from './fhir-client';
export type { FHIRPatient, FHIRCondition, FHIRMedicationRequest, FHIRAllergyIntolerance } from './fhir-client';

// Azure Document Intelligence
export { getDocumentIntelligence, AzureDocumentIntelligenceClient } from './document-intelligence';

// Azure Cognitive Search
export { getCognitiveSearch, AzureCognitiveSearchClient, MEDICAL_GUIDELINES_INDEX_SCHEMA } from './cognitive-search';

// Azure SQL Database
export { getSQLDB, AzureSQLClient } from './sql-db';

// Monitoring & Logging
export { AzureMonitor, getMonitor, trackAgentExecution, trackClinicalDecision } from './monitoring';

/**
 * Initialize all Azure services
 * Call this at application startup to validate configuration
 */
export async function initializeAzureServices(): Promise<{
  success: boolean;
  services: Record<string, boolean>;
  errors: string[];
}> {
  const { getAzureConfig, validateAzureConfig } = await import('./config');
  const config = getAzureConfig();
  const validation = validateAzureConfig(config);

  const services: Record<string, boolean> = {};
  const errors: string[] = [];

  // Check Azure OpenAI
  if (config.openai.endpoint && config.openai.apiKey) {
    try {
      const { getAzureOpenAI } = await import('./openai-client');
      const client = getAzureOpenAI();
      // Quick health check
      services['azureOpenAI'] = true;
    } catch (e) {
      services['azureOpenAI'] = false;
      errors.push(`Azure OpenAI: ${e}`);
    }
  } else {
    services['azureOpenAI'] = false;
    errors.push('Azure OpenAI not configured');
  }

  // Check Document Intelligence
  if (config.documentIntelligence.endpoint && config.documentIntelligence.key) {
    services['documentIntelligence'] = true;
  } else {
    services['documentIntelligence'] = false;
  }

  // Check Cognitive Search
  if (config.search.endpoint && config.search.key) {
    services['cognitiveSearch'] = true;
  } else {
    services['cognitiveSearch'] = false;
  }

  // Check Azure SQL
  if (config.sql.server && config.sql.user) {
    services['sqlDB'] = true;
  } else {
    services['sqlDB'] = false;
  }

  // Check FHIR
  if (config.fhir.endpoint) {
    services['fhir'] = true;
  } else {
    services['fhir'] = false;
  }

  return {
    success: validation.valid,
    services,
    errors: [...validation.missing, ...errors],
  };
}
