// HealthMesh Production Infrastructure
// Healthcare-grade Azure deployment with HIPAA compliance readiness

targetScope = 'resourceGroup'

@description('Environment name (dev, staging, prod)')
@allowed([
  'dev'
  'staging'
  'prod'
])
param environment string = 'prod'

@description('Application name prefix')
param appName string = 'healthmesh'

@description('Azure region for resources')
param location string = resourceGroup().location

@description('Admin email for alerts')
param adminEmail string

@description('Azure AD Tenant ID for authentication')
param azureAdTenantId string

@description('SQL Server administrator login')
param sqlAdminUsername string = 'healthmeshadmin'

@description('SQL Server administrator password')
@secure()
param sqlAdminPassword string

// Environment-specific configurations
var envConfig = {
  dev: {
    appServiceSku: 'B2'
    sqlSku: 'S1'
    storageSku: 'Standard_LRS'
    keyVaultSku: 'standard'
    logRetentionDays: 90
    backupRetentionDays: 7
  }
  staging: {
    appServiceSku: 'P1V3'
    sqlSku: 'S2'
    storageSku: 'Standard_GRS'
    keyVaultSku: 'premium'
    logRetentionDays: 180
    backupRetentionDays: 30
  }
  prod: {
    appServiceSku: 'P1V3'
    sqlSku: 'S3'
    storageSku: 'Standard_GRS'
    keyVaultSku: 'premium'
    logRetentionDays: 365
    backupRetentionDays: 365
  }
}

var config = envConfig[environment]
var resourceNamePrefix = '${appName}-${environment}'

// ============================================================================
// KEY VAULT - Secure secrets management
// ============================================================================
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${appName}${environment}kv${substring(uniqueString(resourceGroup().id), 0, 8)}'
  location: location
  properties: {
    sku: {
      family: 'A'
      name: config.keyVaultSku
    }
    tenantId: azureAdTenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
    }
  }
}

// ============================================================================
// SQL SERVER & DATABASE - Multi-tenant healthcare data
// ============================================================================
resource sqlServer 'Microsoft.Sql/servers@2023-05-01-preview' = {
  name: '${appName}${environment}sql${substring(uniqueString(resourceGroup().id), 0, 8)}'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    administratorLogin: sqlAdminUsername
    administratorLoginPassword: sqlAdminPassword
    version: '12.0'
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
    administrators: {
      administratorType: 'ActiveDirectory'
      tenantId: azureAdTenantId
      azureADOnlyAuthentication: false
      principalType: 'Group'
      login: 'SQL Admins'
      sid: azureAdTenantId
    }
  }
}

resource sqlDatabase 'Microsoft.Sql/servers/databases@2023-05-01-preview' = {
  parent: sqlServer
  name: 'healthmesh'
  location: location
  sku: {
    name: config.sqlSku
    tier: 'Standard'
  }
  properties: {
    collation: 'SQL_Latin1_General_CP1_CI_AS'
    maxSizeBytes: 268435456000 // 250 GB
    catalogCollation: 'SQL_Latin1_General_CP1_CI_AS'
    zoneRedundant: environment == 'prod'
    readScale: environment == 'prod' ? 'Enabled' : 'Disabled'
    requestedBackupStorageRedundancy: environment == 'prod' ? 'Geo' : 'Local'
    isLedgerOn: true // Immutable audit log for compliance
  }
}

// SQL Server firewall - Allow Azure services
resource sqlFirewallRule 'Microsoft.Sql/servers/firewallRules@2023-05-01-preview' = {
  parent: sqlServer
  name: 'AllowAllWindowsAzureIps'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Advanced Threat Protection for SQL
resource sqlSecurityAlert 'Microsoft.Sql/servers/securityAlertPolicies@2023-05-01-preview' = {
  parent: sqlServer
  name: 'Default'
  properties: {
    state: 'Enabled'
    emailAddresses: [
      adminEmail
    ]
    emailAccountAdmins: true
    retentionDays: 90
  }
}

// ============================================================================
// STORAGE ACCOUNT - Medical documents and blobs
// ============================================================================
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: toLower(substring('${appName}${environment}st${uniqueString(resourceGroup().id)}', 0, 24))
  location: location
  sku: {
    name: config.storageSku
  }
  kind: 'StorageV2'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    accessTier: 'Hot'
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
    allowSharedKeyAccess: true
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
    }
  }
}

// Blob containers for medical data
resource labReportsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${storageAccount.name}/default/lab-reports'
  properties: {
    publicAccess: 'None'
  }
}

resource medicalDocsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${storageAccount.name}/default/medical-documents'
  properties: {
    publicAccess: 'None'
  }
}

resource backupsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${storageAccount.name}/default/backups'
  properties: {
    publicAccess: 'None'
  }
}

// ============================================================================
// LOG ANALYTICS - Centralized logging
// ============================================================================
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${resourceNamePrefix}-logs'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: config.logRetentionDays
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// ============================================================================
// APPLICATION INSIGHTS - Monitoring & telemetry
// ============================================================================
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${resourceNamePrefix}-insights'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// ============================================================================
// APP SERVICE PLAN
// ============================================================================
resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: '${resourceNamePrefix}-asp'
  location: location
  sku: {
    name: config.appServiceSku
    tier: environment == 'dev' ? 'Basic' : 'PremiumV3'
    capacity: environment == 'prod' ? 2 : 1
  }
  kind: 'linux'
  properties: {
    reserved: true // Required for Linux
  }
}

// ============================================================================
// APP SERVICE - Node.js application
// ============================================================================
resource appService 'Microsoft.Web/sites@2022-09-01' = {
  name: '${resourceNamePrefix}-app'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    clientAffinityEnabled: false
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      alwaysOn: environment != 'dev'
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      http20Enabled: true
      healthCheckPath: '/api/health'
      appSettings: [
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'AZURE_SQL_SERVER'
          value: sqlServer.properties.fullyQualifiedDomainName
        }
        {
          name: 'AZURE_SQL_DATABASE'
          value: sqlDatabase.name
        }
        {
          name: 'AZURE_SQL_USERNAME'
          value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/sql-admin-username/)'
        }
        {
          name: 'AZURE_SQL_PASSWORD'
          value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/sql-admin-password/)'
        }
        {
          name: 'AZURE_STORAGE_ACCOUNT'
          value: storageAccount.name
        }
        {
          name: 'AZURE_STORAGE_CONNECTION_STRING'
          value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/storage-connection-string/)'
        }
        {
          name: 'AZURE_AD_TENANT_ID'
          value: azureAdTenantId
        }
        {
          name: 'NODE_ENV'
          value: environment
        }
      ]
    }
  }
}

// ============================================================================
// KEY VAULT SECRETS
// ============================================================================
resource sqlUsernameSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'sql-admin-username'
  properties: {
    value: sqlAdminUsername
  }
}

resource sqlPasswordSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'sql-admin-password'
  properties: {
    value: sqlAdminPassword
  }
}

resource storageConnectionStringSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'storage-connection-string'
  properties: {
    value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=${az.environment().suffixes.storage}'
  }
}

// ============================================================================
// RBAC ROLE ASSIGNMENTS
// ============================================================================

// App Service -> Key Vault Secrets User
resource appServiceKeyVaultRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, appService.id, 'Key Vault Secrets User')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6') // Key Vault Secrets User
    principalId: appService.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// App Service -> Storage Blob Data Contributor
resource appServiceStorageRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, appService.id, 'Storage Blob Data Contributor')
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe') // Storage Blob Data Contributor
    principalId: appService.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// ============================================================================
// DIAGNOSTIC SETTINGS - Audit logging
// ============================================================================
resource sqlDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'sql-diagnostics'
  scope: sqlDatabase
  properties: {
    workspaceId: logAnalytics.id
    logs: [
      {
        category: 'SQLSecurityAuditEvents'
        enabled: true
      }
      {
        category: 'Errors'
        enabled: true
      }
      {
        category: 'QueryStoreRuntimeStatistics'
        enabled: true
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}

resource appServiceDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'appservice-diagnostics'
  scope: appService
  properties: {
    workspaceId: logAnalytics.id
    logs: [
      {
        category: 'AppServiceHTTPLogs'
        enabled: true
      }
      {
        category: 'AppServiceConsoleLogs'
        enabled: true
      }
      {
        category: 'AppServiceAppLogs'
        enabled: true
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}

// ============================================================================
// MONITORING ALERTS
// ============================================================================
resource actionGroup 'Microsoft.Insights/actionGroups@2023-01-01' = {
  name: '${resourceNamePrefix}-alerts'
  location: 'global'
  properties: {
    enabled: true
    groupShortName: 'HMAlerts'
    emailReceivers: [
      {
        name: 'Admin'
        emailAddress: adminEmail
        useCommonAlertSchema: true
      }
    ]
  }
}

// Alert: High CPU
resource highCpuAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${resourceNamePrefix}-high-cpu'
  location: 'global'
  properties: {
    enabled: true
    severity: 2
    description: 'Alert when App Service CPU exceeds 80%'
    scopes: [
      appServicePlan.id
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          criterionType: 'StaticThresholdCriterion'
          name: 'CpuPercentage'
          metricName: 'CpuPercentage'
          operator: 'GreaterThan'
          threshold: 80
          timeAggregation: 'Average'
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

// Alert: HTTP 5xx errors
resource http5xxAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${resourceNamePrefix}-http-5xx'
  location: 'global'
  properties: {
    enabled: true
    severity: 1
    description: 'Alert when HTTP 5xx errors exceed threshold'
    scopes: [
      appService.id
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          criterionType: 'StaticThresholdCriterion'
          name: 'Http5xx'
          metricName: 'Http5xx'
          metricNamespace: 'Microsoft.Web/sites'
          operator: 'GreaterThan'
          threshold: 10
          timeAggregation: 'Total'
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

// Alert: SQL DTU high
resource sqlDtuAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${resourceNamePrefix}-sql-dtu'
  location: 'global'
  properties: {
    enabled: true
    severity: 2
    description: 'Alert when SQL DTU exceeds 80%'
    scopes: [
      sqlDatabase.id
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          criterionType: 'StaticThresholdCriterion'
          name: 'DtuPercentage'
          metricName: 'dtu_consumption_percent'
          metricNamespace: 'Microsoft.Sql/servers/databases'
          operator: 'GreaterThan'
          threshold: 80
          timeAggregation: 'Average'
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

// ============================================================================
// OUTPUTS
// ============================================================================
output appServiceUrl string = 'https://${appService.properties.defaultHostName}'
output sqlServerFqdn string = sqlServer.properties.fullyQualifiedDomainName
output sqlDatabaseName string = sqlDatabase.name
output storageAccountName string = storageAccount.name
output keyVaultName string = keyVault.name
output appInsightsConnectionString string = appInsights.properties.ConnectionString
output resourceGroupName string = resourceGroup().name
