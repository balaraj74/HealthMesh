/**
 * HealthMesh - Azure Infrastructure as Code
 * Deploys all required Azure resources for production
 */

@description('The environment name (dev, staging, prod)')
param environment string = 'dev'

@description('The Azure region for deployment')
param location string = resourceGroup().location

@description('The name prefix for all resources')
param namePrefix string = 'healthmesh'

@description('The SKU for App Service Plan')
param appServicePlanSku string = 'B1'

@description('The OpenAI model deployment name')
param openaiModelName string = 'gpt-4o'

@description('The admin email for alerts')
param adminEmail string

// Generate unique suffix for globally unique names
var uniqueSuffix = uniqueString(resourceGroup().id)
var baseName = '${namePrefix}-${environment}'

// =============================================================================
// Azure OpenAI Service
// =============================================================================
resource openai 'Microsoft.CognitiveServices/accounts@2023-10-01-preview' = {
  name: '${baseName}-openai-${uniqueSuffix}'
  location: location
  kind: 'OpenAI'
  sku: {
    name: 'S0'
  }
  properties: {
    customSubDomainName: '${baseName}-openai-${uniqueSuffix}'
    publicNetworkAccess: 'Enabled'
  }
}

resource openaiDeployment 'Microsoft.CognitiveServices/accounts/deployments@2023-10-01-preview' = {
  parent: openai
  name: openaiModelName
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4o'
      version: '2024-05-13'
    }
  }
  sku: {
    name: 'Standard'
    capacity: 30
  }
}

resource embeddingDeployment 'Microsoft.CognitiveServices/accounts/deployments@2023-10-01-preview' = {
  parent: openai
  name: 'text-embedding-3-large'
  dependsOn: [openaiDeployment]
  properties: {
    model: {
      format: 'OpenAI'
      name: 'text-embedding-3-large'
      version: '1'
    }
  }
  sku: {
    name: 'Standard'
    capacity: 30
  }
}

// =============================================================================
// Azure Cosmos DB
// =============================================================================
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-11-15' = {
  name: '${baseName}-cosmos-${uniqueSuffix}'
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
  }
}

resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-11-15' = {
  parent: cosmosAccount
  name: 'healthmesh'
  properties: {
    resource: {
      id: 'healthmesh'
    }
  }
}

resource patientsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-11-15' = {
  parent: cosmosDatabase
  name: 'patients'
  properties: {
    resource: {
      id: 'patients'
      partitionKey: {
        paths: ['/id']
        kind: 'Hash'
      }
    }
  }
}

resource casesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-11-15' = {
  parent: cosmosDatabase
  name: 'cases'
  properties: {
    resource: {
      id: 'cases'
      partitionKey: {
        paths: ['/patientId']
        kind: 'Hash'
      }
    }
  }
}

resource auditContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-11-15' = {
  parent: cosmosDatabase
  name: 'auditLogs'
  properties: {
    resource: {
      id: 'auditLogs'
      partitionKey: {
        paths: ['/entityType']
        kind: 'Hash'
      }
      defaultTtl: 31536000 // 1 year retention
    }
  }
}

// =============================================================================
// Azure Health Data Services (FHIR)
// =============================================================================
resource healthDataServices 'Microsoft.HealthcareApis/workspaces@2023-11-01' = {
  name: '${replace(baseName, '-', '')}hds${uniqueSuffix}'
  location: location
  properties: {}
}

resource fhirService 'Microsoft.HealthcareApis/workspaces/fhirservices@2023-11-01' = {
  parent: healthDataServices
  name: 'fhir'
  location: location
  kind: 'fhir-R4'
  properties: {
    authenticationConfiguration: {
      authority: '${az.environment().authentication.loginEndpoint}${subscription().tenantId}'
      audience: 'https://${healthDataServices.name}-fhir.fhir.azurehealthcareapis.com'
    }
  }
}

// =============================================================================
// Azure Document Intelligence
// =============================================================================
resource documentIntelligence 'Microsoft.CognitiveServices/accounts@2023-10-01-preview' = {
  name: '${baseName}-docint-${uniqueSuffix}'
  location: location
  kind: 'FormRecognizer'
  sku: {
    name: 'S0'
  }
  properties: {
    customSubDomainName: '${baseName}-docint-${uniqueSuffix}'
    publicNetworkAccess: 'Enabled'
  }
}

// =============================================================================
// Azure Cognitive Search
// =============================================================================
resource searchService 'Microsoft.Search/searchServices@2023-11-01' = {
  name: '${baseName}-search-${uniqueSuffix}'
  location: location
  sku: {
    name: 'basic'
  }
  properties: {
    replicaCount: 1
    partitionCount: 1
    hostingMode: 'default'
    semanticSearch: 'free'
  }
}

// =============================================================================
// Application Insights & Log Analytics
// =============================================================================
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${baseName}-logs-${uniqueSuffix}'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 90
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${baseName}-insights-${uniqueSuffix}'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    IngestionMode: 'LogAnalytics'
  }
}

// =============================================================================
// App Service (Web App)
// =============================================================================
resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: '${baseName}-plan-${uniqueSuffix}'
  location: location
  sku: {
    name: appServicePlanSku
    tier: appServicePlanSku == 'B1' ? 'Basic' : 'Standard'
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource webApp 'Microsoft.Web/sites@2023-01-01' = {
  name: '${baseName}-app-${uniqueSuffix}'
  location: location
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      alwaysOn: true
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      appSettings: [
        {
          name: 'AZURE_OPENAI_ENDPOINT'
          value: openai.properties.endpoint
        }
        {
          name: 'AZURE_OPENAI_API_KEY'
          value: openai.listKeys().key1
        }
        {
          name: 'AZURE_OPENAI_DEPLOYMENT'
          value: openaiModelName
        }
        {
          name: 'AZURE_OPENAI_EMBEDDING_DEPLOYMENT'
          value: 'text-embedding-3-large'
        }
        {
          name: 'AZURE_COSMOS_ENDPOINT'
          value: cosmosAccount.properties.documentEndpoint
        }
        {
          name: 'AZURE_COSMOS_KEY'
          value: cosmosAccount.listKeys().primaryMasterKey
        }
        {
          name: 'AZURE_COSMOS_DATABASE'
          value: 'healthmesh'
        }
        {
          name: 'AZURE_FHIR_ENDPOINT'
          value: 'https://${healthDataServices.name}-fhir.fhir.azurehealthcareapis.com'
        }
        {
          name: 'AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT'
          value: documentIntelligence.properties.endpoint
        }
        {
          name: 'AZURE_DOCUMENT_INTELLIGENCE_KEY'
          value: documentIntelligence.listKeys().key1
        }
        {
          name: 'AZURE_SEARCH_ENDPOINT'
          value: 'https://${searchService.name}.search.windows.net'
        }
        {
          name: 'AZURE_SEARCH_ADMIN_KEY'
          value: searchService.listAdminKeys().primaryKey
        }
        {
          name: 'AZURE_SEARCH_INDEX_NAME'
          value: 'medical-guidelines'
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'NODE_ENV'
          value: 'production'
        }
      ]
    }
  }
}

// =============================================================================
// Role Assignments
// =============================================================================

// App Service -> FHIR Data Contributor
resource fhirRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(fhirService.id, webApp.id, 'fhir-contributor')
  scope: fhirService
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '5a1fc7df-4bf1-4951-a576-89034ee01acd')
    principalId: webApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// =============================================================================
// Alerts
// =============================================================================
resource actionGroup 'Microsoft.Insights/actionGroups@2023-01-01' = {
  name: '${baseName}-alerts'
  location: 'global'
  properties: {
    groupShortName: 'HMAlerts'
    enabled: true
    emailReceivers: [
      {
        name: 'Admin'
        emailAddress: adminEmail
        useCommonAlertSchema: true
      }
    ]
  }
}

resource highErrorRateAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${baseName}-high-error-rate'
  location: 'global'
  properties: {
    description: 'Alert when error rate exceeds threshold'
    severity: 1
    enabled: true
    scopes: [webApp.id]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'HighErrorRate'
          metricName: 'Http5xx'
          operator: 'GreaterThan'
          threshold: 10
          timeAggregation: 'Total'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// =============================================================================
// Outputs
// =============================================================================
output webAppUrl string = 'https://${webApp.properties.defaultHostName}'
output webAppName string = webApp.name
output resourceGroupName string = resourceGroup().name
output openaiEndpoint string = openai.properties.endpoint
output cosmosEndpoint string = cosmosAccount.properties.documentEndpoint
output fhirEndpoint string = 'https://${healthDataServices.name}-fhir.fhir.azurehealthcareapis.com'
output searchEndpoint string = 'https://${searchService.name}.search.windows.net'
output appInsightsConnectionString string = appInsights.properties.ConnectionString
