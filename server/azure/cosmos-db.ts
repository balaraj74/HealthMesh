/**
 * HealthMesh - Azure Cosmos DB Client
 * Provides persistent storage for patients, cases, and audit logs
 */

import { getAzureConfig } from './config';
import type {
  Patient, InsertPatient,
  ClinicalCase, InsertCase,
  AuditLog, ChatMessage,
  LabReport, DashboardStats,
  Recommendation, RiskAlert
} from '@shared/schema';
import { randomUUID } from 'crypto';

interface CosmosDocument {
  id: string;
  partitionKey: string;
  _etag?: string;
  _ts?: number;
}

export class AzureCosmosDBClient {
  private endpoint: string;
  private key: string;
  private database: string;
  private containers: {
    patients: string;
    cases: string;
    audit: string;
  };

  constructor() {
    const config = getAzureConfig();
    this.endpoint = config.cosmos.endpoint.replace(/\/$/, '');
    this.key = config.cosmos.key;
    this.database = config.cosmos.database;
    this.containers = config.cosmos.containers;
  }

  private generateAuthHeader(verb: string, resourceType: string, resourceId: string, date: string): string {
    const crypto = require('crypto');
    
    const text = `${verb.toLowerCase()}\n${resourceType.toLowerCase()}\n${resourceId}\n${date.toLowerCase()}\n\n`;
    const key = Buffer.from(this.key, 'base64');
    const signature = crypto.createHmac('sha256', key).update(text, 'utf8').digest('base64');
    
    return encodeURIComponent(`type=master&ver=1.0&sig=${signature}`);
  }

  private async request(
    method: string,
    containerName: string,
    path: string,
    body?: any,
    partitionKey?: string
  ): Promise<any> {
    const date = new Date().toUTCString();
    const resourceType = path.includes('/docs') ? 'docs' : 'colls';
    const resourceId = `dbs/${this.database}/colls/${containerName}${path.replace('/docs', '')}`;
    
    const url = `${this.endpoint}/dbs/${this.database}/colls/${containerName}${path}`;
    const authHeader = this.generateAuthHeader(method, resourceType, resourceId, date);

    const headers: Record<string, string> = {
      'Authorization': authHeader,
      'x-ms-date': date,
      'x-ms-version': '2018-12-31',
      'Content-Type': 'application/json',
    };

    if (partitionKey) {
      headers['x-ms-documentdb-partitionkey'] = JSON.stringify([partitionKey]);
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cosmos DB error (${response.status}): ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    }
    return response.text();
  }

  // ==========================================
  // Patient Operations
  // ==========================================

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const now = new Date().toISOString();
    const newPatient: Patient & CosmosDocument = {
      id: randomUUID(),
      partitionKey: 'patient',
      ...patient,
      createdAt: now,
      updatedAt: now,
    };

    await this.request('POST', this.containers.patients, '/docs', newPatient, 'patient');
    return newPatient;
  }

  async getPatient(id: string): Promise<Patient | undefined> {
    try {
      const result = await this.request('GET', this.containers.patients, `/docs/${id}`, undefined, 'patient');
      return result;
    } catch (error) {
      return undefined;
    }
  }

  async getPatients(): Promise<Patient[]> {
    const query = {
      query: 'SELECT * FROM c WHERE c.partitionKey = @partitionKey',
      parameters: [{ name: '@partitionKey', value: 'patient' }],
    };

    const result = await this.request('POST', this.containers.patients, '/docs', query, 'patient');
    return result.Documents || [];
  }

  async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient | undefined> {
    const existing = await this.getPatient(id);
    if (!existing) return undefined;

    const updated: Patient & CosmosDocument = {
      ...existing,
      ...updates,
      id,
      partitionKey: 'patient',
      updatedAt: new Date().toISOString(),
    };

    await this.request('PUT', this.containers.patients, `/docs/${id}`, updated, 'patient');
    return updated;
  }

  async deletePatient(id: string): Promise<boolean> {
    try {
      await this.request('DELETE', this.containers.patients, `/docs/${id}`, undefined, 'patient');
      return true;
    } catch {
      return false;
    }
  }

  // ==========================================
  // Case Operations
  // ==========================================

  async createCase(caseData: InsertCase): Promise<ClinicalCase> {
    const now = new Date().toISOString();
    const newCase: ClinicalCase & CosmosDocument = {
      id: randomUUID(),
      partitionKey: caseData.patientId,
      patientId: caseData.patientId,
      caseType: caseData.caseType,
      status: 'draft',
      clinicalQuestion: caseData.clinicalQuestion,
      agentOutputs: [],
      recommendations: [],
      riskAlerts: [],
      labReports: [],
      createdAt: now,
      updatedAt: now,
    };

    await this.request('POST', this.containers.cases, '/docs', newCase, caseData.patientId);
    return newCase;
  }

  async getCase(id: string, patientId?: string): Promise<ClinicalCase | undefined> {
    if (!patientId) {
      // Query to find case without partition key
      const query = {
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: id }],
      };
      const result = await this.request('POST', this.containers.cases, '/docs', query);
      return result.Documents?.[0];
    }

    try {
      const result = await this.request('GET', this.containers.cases, `/docs/${id}`, undefined, patientId);
      return result;
    } catch {
      return undefined;
    }
  }

  async getCases(): Promise<ClinicalCase[]> {
    const query = {
      query: 'SELECT * FROM c ORDER BY c.createdAt DESC',
      parameters: [],
    };

    const result = await this.request('POST', this.containers.cases, '/docs', query);
    return result.Documents || [];
  }

  async getCasesByPatient(patientId: string): Promise<ClinicalCase[]> {
    const query = {
      query: 'SELECT * FROM c WHERE c.patientId = @patientId ORDER BY c.createdAt DESC',
      parameters: [{ name: '@patientId', value: patientId }],
    };

    const result = await this.request('POST', this.containers.cases, '/docs', query, patientId);
    return result.Documents || [];
  }

  async updateCase(id: string, patientId: string, updates: Partial<ClinicalCase>): Promise<ClinicalCase | undefined> {
    const existing = await this.getCase(id, patientId);
    if (!existing) return undefined;

    const updated: ClinicalCase & CosmosDocument = {
      ...existing,
      ...updates,
      id,
      partitionKey: patientId,
      updatedAt: new Date().toISOString(),
    };

    await this.request('PUT', this.containers.cases, `/docs/${id}`, updated, patientId);
    return updated;
  }

  async deleteCase(id: string, patientId: string): Promise<boolean> {
    try {
      await this.request('DELETE', this.containers.cases, `/docs/${id}`, undefined, patientId);
      return true;
    } catch {
      return false;
    }
  }

  // ==========================================
  // Audit Log Operations
  // ==========================================

  async createAuditLog(log: Omit<AuditLog, 'id'>): Promise<AuditLog> {
    const newLog: AuditLog & CosmosDocument = {
      id: randomUUID(),
      partitionKey: log.entityId,
      ...log,
    };

    await this.request('POST', this.containers.audit, '/docs', newLog, log.entityId);
    return newLog;
  }

  async getAuditLogs(entityId?: string): Promise<AuditLog[]> {
    let query: any;
    
    if (entityId) {
      query = {
        query: 'SELECT * FROM c WHERE c.entityId = @entityId ORDER BY c.timestamp DESC',
        parameters: [{ name: '@entityId', value: entityId }],
      };
    } else {
      query = {
        query: 'SELECT * FROM c ORDER BY c.timestamp DESC OFFSET 0 LIMIT 100',
        parameters: [],
      };
    }

    const result = await this.request('POST', this.containers.audit, '/docs', query, entityId);
    return result.Documents || [];
  }

  // ==========================================
  // Lab Reports (stored in cases container)
  // ==========================================

  async createLabReport(report: Omit<LabReport, 'id'>): Promise<LabReport> {
    const newReport: LabReport & CosmosDocument = {
      id: randomUUID(),
      partitionKey: report.caseId,
      ...report,
    };

    // Store in cases container with different document type
    await this.request('POST', this.containers.cases, '/docs', {
      ...newReport,
      documentType: 'labReport',
    }, report.caseId);

    return newReport;
  }

  async getLabReports(caseId?: string): Promise<LabReport[]> {
    let query: any;
    
    if (caseId) {
      query = {
        query: "SELECT * FROM c WHERE c.documentType = 'labReport' AND c.caseId = @caseId",
        parameters: [{ name: '@caseId', value: caseId }],
      };
    } else {
      query = {
        query: "SELECT * FROM c WHERE c.documentType = 'labReport' ORDER BY c.uploadedAt DESC",
        parameters: [],
      };
    }

    const result = await this.request('POST', this.containers.cases, '/docs', query, caseId);
    return result.Documents || [];
  }

  async updateLabReport(id: string, caseId: string, updates: Partial<LabReport>): Promise<LabReport | undefined> {
    const query = {
      query: "SELECT * FROM c WHERE c.id = @id AND c.documentType = 'labReport'",
      parameters: [{ name: '@id', value: id }],
    };

    const result = await this.request('POST', this.containers.cases, '/docs', query, caseId);
    const existing = result.Documents?.[0];
    
    if (!existing) return undefined;

    const updated = {
      ...existing,
      ...updates,
    };

    await this.request('PUT', this.containers.cases, `/docs/${id}`, updated, caseId);
    return updated;
  }

  // ==========================================
  // Chat Messages (stored in cases container)
  // ==========================================

  async createChatMessage(message: Omit<ChatMessage, 'id'>): Promise<ChatMessage> {
    const newMessage: ChatMessage & CosmosDocument = {
      id: randomUUID(),
      partitionKey: message.caseId,
      ...message,
    };

    await this.request('POST', this.containers.cases, '/docs', {
      ...newMessage,
      documentType: 'chatMessage',
    }, message.caseId);

    return newMessage;
  }

  async getChatMessages(caseId: string): Promise<ChatMessage[]> {
    const query = {
      query: "SELECT * FROM c WHERE c.documentType = 'chatMessage' AND c.caseId = @caseId ORDER BY c.timestamp ASC",
      parameters: [{ name: '@caseId', value: caseId }],
    };

    const result = await this.request('POST', this.containers.cases, '/docs', query, caseId);
    return result.Documents || [];
  }

  // ==========================================
  // Dashboard Statistics
  // ==========================================

  async getDashboardStats(): Promise<DashboardStats> {
    // Get case counts by status
    const casesQuery = {
      query: `SELECT 
        COUNT(1) as totalCases,
        COUNT(c.status = 'analyzing' OR c.status = 'submitted' ? 1 : undefined) as activeCases,
        COUNT(c.status = 'review-ready' ? 1 : undefined) as pendingReviews
      FROM c 
      WHERE NOT IS_DEFINED(c.documentType)`,
      parameters: [],
    };

    // Get critical alerts count
    const alertsQuery = {
      query: `SELECT VALUE COUNT(1) FROM c 
        JOIN a IN c.riskAlerts 
        WHERE a.severity = 'critical' AND NOT IS_DEFINED(c.documentType)`,
      parameters: [],
    };

    try {
      const [casesResult, alertsResult] = await Promise.all([
        this.request('POST', this.containers.cases, '/docs', casesQuery),
        this.request('POST', this.containers.cases, '/docs', alertsQuery),
      ]);

      const stats = casesResult.Documents?.[0] || {};
      const criticalAlerts = alertsResult.Documents?.[0] || 0;

      return {
        totalCases: stats.totalCases || 0,
        activeCases: stats.activeCases || 0,
        pendingReviews: stats.pendingReviews || 0,
        criticalAlerts,
        casesThisWeek: 0, // Would need date-based query
        avgConfidenceScore: 85, // Would need aggregation query
      };
    } catch {
      return {
        totalCases: 0,
        activeCases: 0,
        pendingReviews: 0,
        criticalAlerts: 0,
        casesThisWeek: 0,
        avgConfidenceScore: 0,
      };
    }
  }

  // ==========================================
  // Risk Alerts (aggregated from cases)
  // ==========================================

  async getRiskAlerts(caseId?: string): Promise<RiskAlert[]> {
    let query: any;
    
    if (caseId) {
      query = {
        query: 'SELECT VALUE a FROM c JOIN a IN c.riskAlerts WHERE c.id = @caseId AND NOT IS_DEFINED(c.documentType)',
        parameters: [{ name: '@caseId', value: caseId }],
      };
    } else {
      query = {
        query: 'SELECT VALUE a FROM c JOIN a IN c.riskAlerts WHERE NOT IS_DEFINED(c.documentType) ORDER BY a.createdAt DESC OFFSET 0 LIMIT 50',
        parameters: [],
      };
    }

    const result = await this.request('POST', this.containers.cases, '/docs', query, caseId);
    return result.Documents || [];
  }

  // ==========================================
  // Recommendations
  // ==========================================

  async updateRecommendation(
    caseId: string,
    recommendationId: string,
    feedback: { status: string; clinicianFeedback?: string }
  ): Promise<Recommendation | undefined> {
    const clinicalCase = await this.getCase(caseId);
    if (!clinicalCase) return undefined;

    const recIndex = clinicalCase.recommendations.findIndex(r => r.id === recommendationId);
    if (recIndex === -1) return undefined;

    clinicalCase.recommendations[recIndex] = {
      ...clinicalCase.recommendations[recIndex],
      status: feedback.status as any,
      clinicianFeedback: feedback.clinicianFeedback,
    };

    await this.updateCase(caseId, clinicalCase.patientId, {
      recommendations: clinicalCase.recommendations,
    });

    return clinicalCase.recommendations[recIndex];
  }
}

// Singleton instance
let _client: AzureCosmosDBClient | null = null;

export function getCosmosDB(): AzureCosmosDBClient {
  if (!_client) {
    _client = new AzureCosmosDBClient();
  }
  return _client;
}
