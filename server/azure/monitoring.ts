/**
 * HealthMesh - Azure Monitor & Application Insights
 * Provides comprehensive logging, monitoring, and audit trails for AI decisions
 */

import { getAzureConfig } from './config';
import type { AgentType, AgentOutput, RiskAlert, Recommendation } from '@shared/schema';

interface TelemetryEvent {
  name: string;
  properties?: Record<string, string>;
  measurements?: Record<string, number>;
}

interface TelemetryMetric {
  name: string;
  value: number;
  properties?: Record<string, string>;
}

interface TelemetryException {
  exception: Error;
  properties?: Record<string, string>;
  measurements?: Record<string, number>;
}

interface AgentExecutionContext {
  agentType: AgentType;
  caseId: string;
  patientId: string;
  startTime: Date;
  endTime?: Date;
  success: boolean;
  confidence?: number;
  errorMessage?: string;
}

interface ClinicalDecisionContext {
  caseId: string;
  patientId: string;
  decisionType: 'recommendation' | 'alert' | 'agent-output';
  agentType: AgentType;
  summary: string;
  confidence: number;
  evidenceSources: string[];
  timestamp: Date;
}

export class AzureMonitor {
  private connectionString: string;
  private instrumentationKey: string;
  private isEnabled: boolean;

  constructor() {
    const config = getAzureConfig();
    this.connectionString = config.appInsights.connectionString;
    this.isEnabled = !!this.connectionString;

    // Extract instrumentation key from connection string
    const match = this.connectionString.match(/InstrumentationKey=([^;]+)/);
    this.instrumentationKey = match?.[1] || '';
  }

  // ==========================================
  // Core Telemetry Methods
  // ==========================================

  async trackEvent(event: TelemetryEvent): Promise<void> {
    if (!this.isEnabled) {
      console.log(`[Telemetry Event] ${event.name}`, event.properties);
      return;
    }

    await this.sendTelemetry({
      name: 'Microsoft.ApplicationInsights.Event',
      time: new Date().toISOString(),
      iKey: this.instrumentationKey,
      data: {
        baseType: 'EventData',
        baseData: {
          name: event.name,
          properties: event.properties,
          measurements: event.measurements,
        },
      },
    });
  }

  async trackMetric(metric: TelemetryMetric): Promise<void> {
    if (!this.isEnabled) {
      console.log(`[Telemetry Metric] ${metric.name}: ${metric.value}`, metric.properties);
      return;
    }

    await this.sendTelemetry({
      name: 'Microsoft.ApplicationInsights.Metric',
      time: new Date().toISOString(),
      iKey: this.instrumentationKey,
      data: {
        baseType: 'MetricData',
        baseData: {
          metrics: [
            {
              name: metric.name,
              value: metric.value,
              count: 1,
            },
          ],
          properties: metric.properties,
        },
      },
    });
  }

  async trackException(exception: TelemetryException): Promise<void> {
    if (!this.isEnabled) {
      console.error(`[Telemetry Exception]`, exception.exception, exception.properties);
      return;
    }

    await this.sendTelemetry({
      name: 'Microsoft.ApplicationInsights.Exception',
      time: new Date().toISOString(),
      iKey: this.instrumentationKey,
      data: {
        baseType: 'ExceptionData',
        baseData: {
          exceptions: [
            {
              typeName: exception.exception.name,
              message: exception.exception.message,
              stack: exception.exception.stack,
            },
          ],
          properties: exception.properties,
          measurements: exception.measurements,
        },
      },
    });
  }

  async trackTrace(message: string, severity: 'Verbose' | 'Information' | 'Warning' | 'Error' | 'Critical', properties?: Record<string, string>): Promise<void> {
    if (!this.isEnabled) {
      console.log(`[Telemetry Trace] [${severity}] ${message}`, properties);
      return;
    }

    const severityLevel = {
      Verbose: 0,
      Information: 1,
      Warning: 2,
      Error: 3,
      Critical: 4,
    }[severity];

    await this.sendTelemetry({
      name: 'Microsoft.ApplicationInsights.Message',
      time: new Date().toISOString(),
      iKey: this.instrumentationKey,
      data: {
        baseType: 'MessageData',
        baseData: {
          message,
          severityLevel,
          properties,
        },
      },
    });
  }

  async trackDependency(
    name: string,
    target: string,
    duration: number,
    success: boolean,
    properties?: Record<string, string>
  ): Promise<void> {
    if (!this.isEnabled) {
      console.log(`[Telemetry Dependency] ${name} -> ${target}: ${duration}ms (${success ? 'success' : 'failed'})`, properties);
      return;
    }

    await this.sendTelemetry({
      name: 'Microsoft.ApplicationInsights.RemoteDependency',
      time: new Date().toISOString(),
      iKey: this.instrumentationKey,
      data: {
        baseType: 'RemoteDependencyData',
        baseData: {
          name,
          target,
          duration: this.formatDuration(duration),
          success,
          properties,
        },
      },
    });
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    return `${days}.${hours % 24}:${minutes % 60}:${seconds % 60}.${ms % 1000}`;
  }

  private async sendTelemetry(payload: any): Promise<void> {
    try {
      // Extract ingestion endpoint from connection string
      const endpointMatch = this.connectionString.match(/IngestionEndpoint=([^;]+)/);
      const ingestionEndpoint = endpointMatch?.[1] || 'https://dc.services.visualstudio.com';

      const response = await fetch(`${ingestionEndpoint}/v2/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([payload]),
      });

      if (!response.ok) {
        console.error(`Failed to send telemetry: ${response.status}`);
      }
    } catch (error) {
      console.error('Error sending telemetry:', error);
    }
  }

  // ==========================================
  // Healthcare-Specific Tracking Methods
  // ==========================================

  async trackAgentExecution(context: AgentExecutionContext): Promise<void> {
    const duration = context.endTime 
      ? context.endTime.getTime() - context.startTime.getTime() 
      : 0;

    await this.trackEvent({
      name: 'AgentExecution',
      properties: {
        agentType: context.agentType,
        caseId: context.caseId,
        patientId: context.patientId,
        success: context.success.toString(),
        errorMessage: context.errorMessage || '',
      },
      measurements: {
        duration,
        confidence: context.confidence || 0,
      },
    });

    await this.trackMetric({
      name: `Agent.${context.agentType}.ExecutionTime`,
      value: duration,
      properties: {
        caseId: context.caseId,
      },
    });

    if (context.confidence !== undefined) {
      await this.trackMetric({
        name: `Agent.${context.agentType}.Confidence`,
        value: context.confidence,
        properties: {
          caseId: context.caseId,
        },
      });
    }

    if (!context.success && context.errorMessage) {
      await this.trackTrace(
        `Agent ${context.agentType} failed: ${context.errorMessage}`,
        'Error',
        {
          agentType: context.agentType,
          caseId: context.caseId,
        }
      );
    }
  }

  async trackClinicalDecision(context: ClinicalDecisionContext): Promise<void> {
    await this.trackEvent({
      name: 'ClinicalDecision',
      properties: {
        decisionType: context.decisionType,
        agentType: context.agentType,
        caseId: context.caseId,
        patientId: context.patientId,
        summary: context.summary.substring(0, 500), // Truncate for telemetry
        evidenceSources: context.evidenceSources.join(', '),
      },
      measurements: {
        confidence: context.confidence,
        evidenceCount: context.evidenceSources.length,
      },
    });
  }

  async trackRiskAlert(alert: RiskAlert, caseId: string, patientId: string): Promise<void> {
    await this.trackEvent({
      name: 'RiskAlert',
      properties: {
        alertId: alert.id,
        alertType: alert.type,
        severity: alert.severity,
        title: alert.title,
        caseId,
        patientId,
        source: alert.source,
      },
    });

    // Track as warning or error based on severity
    const severity = alert.severity === 'critical' ? 'Error' : 
                     alert.severity === 'warning' ? 'Warning' : 'Information';
    
    await this.trackTrace(
      `Risk Alert: ${alert.title} - ${alert.description}`,
      severity,
      {
        alertType: alert.type,
        caseId,
      }
    );
  }

  async trackRecommendation(recommendation: Recommendation, patientId: string): Promise<void> {
    await this.trackEvent({
      name: 'AIRecommendation',
      properties: {
        recommendationId: recommendation.id,
        caseId: recommendation.caseId,
        patientId,
        agentType: recommendation.agentType,
        category: recommendation.category,
        title: recommendation.title,
        status: recommendation.status,
      },
      measurements: {
        confidence: recommendation.confidence,
        evidenceSourceCount: recommendation.evidenceSources.length,
        reasoningStepCount: recommendation.reasoningChain.length,
      },
    });
  }

  async trackClinicianFeedback(
    recommendationId: string,
    caseId: string,
    status: string,
    feedback?: string
  ): Promise<void> {
    await this.trackEvent({
      name: 'ClinicianFeedback',
      properties: {
        recommendationId,
        caseId,
        status,
        hasFeedback: (!!feedback).toString(),
        feedback: feedback?.substring(0, 500) || '',
      },
    });
  }

  async trackCaseAnalysis(
    caseId: string,
    patientId: string,
    agentOutputs: AgentOutput[],
    totalDuration: number
  ): Promise<void> {
    const successfulAgents = agentOutputs.filter(o => o.status === 'completed').length;
    const avgConfidence = agentOutputs
      .filter(o => o.confidence !== undefined)
      .reduce((sum, o) => sum + (o.confidence || 0), 0) / agentOutputs.length || 0;

    await this.trackEvent({
      name: 'CaseAnalysis',
      properties: {
        caseId,
        patientId,
        agentResults: agentOutputs.map(o => `${o.agentType}:${o.status}`).join(','),
      },
      measurements: {
        totalDuration,
        agentCount: agentOutputs.length,
        successfulAgentCount: successfulAgents,
        averageConfidence: avgConfidence,
      },
    });
  }

  async trackLabReportProcessing(
    reportId: string,
    caseId: string,
    documentType: string,
    extractedValueCount: number,
    abnormalValueCount: number,
    processingTime: number
  ): Promise<void> {
    await this.trackEvent({
      name: 'LabReportProcessing',
      properties: {
        reportId,
        caseId,
        documentType,
      },
      measurements: {
        extractedValueCount,
        abnormalValueCount,
        processingTime,
      },
    });
  }
}

// Singleton instance
let _monitor: AzureMonitor | null = null;

export function getMonitor(): AzureMonitor {
  if (!_monitor) {
    _monitor = new AzureMonitor();
  }
  return _monitor;
}

// Convenience wrapper functions
export async function trackAgentExecution(context: AgentExecutionContext): Promise<void> {
  return getMonitor().trackAgentExecution(context);
}

export async function trackClinicalDecision(context: ClinicalDecisionContext): Promise<void> {
  return getMonitor().trackClinicalDecision(context);
}
