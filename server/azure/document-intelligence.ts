/**
 * HealthMesh - Azure Document Intelligence Client
 * Extracts lab values and clinical data from uploaded documents
 */

import { getAzureConfig } from './config';
import type { LabResult } from '@shared/schema';

interface ExtractedLabValue {
  testName: string;
  value: string;
  unit: string;
  referenceRange?: string;
  status: 'normal' | 'abnormal' | 'critical';
}

interface DocumentExtractionResult {
  success: boolean;
  documentType: string;
  extractedText: string;
  labResults: ExtractedLabValue[];
  confidence: number;
  processingTime: number;
}

interface AnalyzeResult {
  content: string;
  pages?: Array<{
    pageNumber: number;
    lines?: Array<{
      content: string;
      boundingRegions?: any[];
    }>;
  }>;
  tables?: Array<{
    rowCount: number;
    columnCount: number;
    cells: Array<{
      rowIndex: number;
      columnIndex: number;
      content: string;
    }>;
  }>;
  keyValuePairs?: Array<{
    key?: { content: string };
    value?: { content: string };
    confidence: number;
  }>;
}

// Common lab test reference ranges
const LAB_REFERENCE_RANGES: Record<string, { min: number; max: number; unit: string; criticalLow?: number; criticalHigh?: number }> = {
  'hemoglobin': { min: 12.0, max: 17.5, unit: 'g/dL', criticalLow: 7.0, criticalHigh: 20.0 },
  'hgb': { min: 12.0, max: 17.5, unit: 'g/dL', criticalLow: 7.0, criticalHigh: 20.0 },
  'wbc': { min: 4.5, max: 11.0, unit: 'K/uL', criticalLow: 2.0, criticalHigh: 30.0 },
  'white blood cell': { min: 4.5, max: 11.0, unit: 'K/uL', criticalLow: 2.0, criticalHigh: 30.0 },
  'rbc': { min: 4.2, max: 5.9, unit: 'M/uL' },
  'red blood cell': { min: 4.2, max: 5.9, unit: 'M/uL' },
  'platelets': { min: 150, max: 400, unit: 'K/uL', criticalLow: 50, criticalHigh: 1000 },
  'plt': { min: 150, max: 400, unit: 'K/uL', criticalLow: 50, criticalHigh: 1000 },
  'glucose': { min: 70, max: 100, unit: 'mg/dL', criticalLow: 40, criticalHigh: 500 },
  'creatinine': { min: 0.7, max: 1.3, unit: 'mg/dL', criticalHigh: 10.0 },
  'bun': { min: 7, max: 20, unit: 'mg/dL' },
  'sodium': { min: 136, max: 145, unit: 'mEq/L', criticalLow: 120, criticalHigh: 160 },
  'potassium': { min: 3.5, max: 5.0, unit: 'mEq/L', criticalLow: 2.5, criticalHigh: 6.5 },
  'chloride': { min: 98, max: 106, unit: 'mEq/L' },
  'co2': { min: 23, max: 29, unit: 'mEq/L' },
  'calcium': { min: 8.5, max: 10.5, unit: 'mg/dL', criticalLow: 6.0, criticalHigh: 14.0 },
  'alt': { min: 7, max: 56, unit: 'U/L' },
  'ast': { min: 10, max: 40, unit: 'U/L' },
  'albumin': { min: 3.5, max: 5.0, unit: 'g/dL' },
  'total protein': { min: 6.0, max: 8.3, unit: 'g/dL' },
  'bilirubin': { min: 0.1, max: 1.2, unit: 'mg/dL' },
  'alkaline phosphatase': { min: 44, max: 147, unit: 'U/L' },
  'alp': { min: 44, max: 147, unit: 'U/L' },
  'hba1c': { min: 4.0, max: 5.6, unit: '%' },
  'tsh': { min: 0.4, max: 4.0, unit: 'mIU/L' },
  'inr': { min: 0.9, max: 1.1, unit: '' },
  'ptt': { min: 25, max: 35, unit: 'seconds' },
  'pt': { min: 11, max: 13.5, unit: 'seconds' },
};

export class AzureDocumentIntelligenceClient {
  private endpoint: string;
  private apiKey: string;

  constructor() {
    const config = getAzureConfig();
    this.endpoint = config.documentIntelligence.endpoint.replace(/\/$/, '');
    this.apiKey = config.documentIntelligence.key;
  }

  /**
   * Analyze a document using the prebuilt-document model
   */
  async analyzeDocument(documentBuffer: Buffer, contentType: string): Promise<DocumentExtractionResult> {
    const startTime = Date.now();

    try {
      // Start analysis
      const analyzeUrl = `${this.endpoint}/documentintelligence/documentModels/prebuilt-layout:analyze?api-version=2024-02-29-preview`;

      // Convert Buffer to Uint8Array for fetch compatibility
      const uint8Array = new Uint8Array(documentBuffer);

      const analyzeResponse = await fetch(analyzeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': contentType,
          'Ocp-Apim-Subscription-Key': this.apiKey,
        },
        body: uint8Array,
      });

      if (!analyzeResponse.ok) {
        const errorText = await analyzeResponse.text();
        throw new Error(`Document analysis failed: ${errorText}`);
      }

      // Get operation location for polling
      const operationLocation = analyzeResponse.headers.get('Operation-Location');
      if (!operationLocation) {
        throw new Error('No operation location returned from document analysis');
      }

      // Poll for results
      const result = await this.pollForResult(operationLocation);
      const processingTime = Date.now() - startTime;

      // Extract lab results from the analyzed content
      const labResults = this.extractLabResults(result);

      return {
        success: true,
        documentType: this.detectDocumentType(result.content),
        extractedText: result.content,
        labResults,
        confidence: this.calculateOverallConfidence(result),
        processingTime,
      };
    } catch (error) {
      return {
        success: false,
        documentType: 'unknown',
        extractedText: '',
        labResults: [],
        confidence: 0,
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Analyze a document from URL
   */
  async analyzeDocumentFromUrl(documentUrl: string): Promise<DocumentExtractionResult> {
    const startTime = Date.now();

    try {
      const analyzeUrl = `${this.endpoint}/documentintelligence/documentModels/prebuilt-layout:analyze?api-version=2024-02-29-preview`;

      const analyzeResponse = await fetch(analyzeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': this.apiKey,
        },
        body: JSON.stringify({ urlSource: documentUrl }),
      });

      if (!analyzeResponse.ok) {
        const errorText = await analyzeResponse.text();
        throw new Error(`Document analysis failed: ${errorText}`);
      }

      const operationLocation = analyzeResponse.headers.get('Operation-Location');
      if (!operationLocation) {
        throw new Error('No operation location returned');
      }

      const result = await this.pollForResult(operationLocation);
      const processingTime = Date.now() - startTime;

      const labResults = this.extractLabResults(result);

      return {
        success: true,
        documentType: this.detectDocumentType(result.content),
        extractedText: result.content,
        labResults,
        confidence: this.calculateOverallConfidence(result),
        processingTime,
      };
    } catch (error) {
      return {
        success: false,
        documentType: 'unknown',
        extractedText: '',
        labResults: [],
        confidence: 0,
        processingTime: Date.now() - startTime,
      };
    }
  }

  private async pollForResult(operationLocation: string, maxAttempts = 60): Promise<AnalyzeResult> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await fetch(operationLocation, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get analysis result: ${response.status}`);
      }

      const result = await response.json();

      if (result.status === 'succeeded') {
        return result.analyzeResult;
      } else if (result.status === 'failed') {
        throw new Error(`Document analysis failed: ${result.error?.message || 'Unknown error'}`);
      }
      // Continue polling if status is 'running' or 'notStarted'
    }

    throw new Error('Document analysis timed out');
  }

  private extractLabResults(result: AnalyzeResult): ExtractedLabValue[] {
    const labResults: ExtractedLabValue[] = [];
    const content = result.content.toLowerCase();

    // Extract from tables if present
    if (result.tables) {
      for (const table of result.tables) {
        const tableResults = this.extractFromTable(table);
        labResults.push(...tableResults);
      }
    }

    // Extract from key-value pairs
    if (result.keyValuePairs) {
      for (const pair of result.keyValuePairs) {
        const key = pair.key?.content?.toLowerCase() || '';
        const value = pair.value?.content || '';

        for (const [testName, range] of Object.entries(LAB_REFERENCE_RANGES)) {
          if (key.includes(testName)) {
            const numericValue = this.parseNumericValue(value);
            if (numericValue !== null) {
              labResults.push({
                testName: this.normalizeTestName(testName),
                value: numericValue.toString(),
                unit: range.unit,
                referenceRange: `${range.min}-${range.max} ${range.unit}`,
                status: this.determineStatus(numericValue, range),
              });
            }
          }
        }
      }
    }

    // Fallback: regex-based extraction from text
    if (labResults.length === 0) {
      const textResults = this.extractFromText(result.content);
      labResults.push(...textResults);
    }

    return labResults;
  }

  private extractFromTable(table: { rowCount: number; columnCount: number; cells: Array<{ rowIndex: number; columnIndex: number; content: string }> }): ExtractedLabValue[] {
    const results: ExtractedLabValue[] = [];
    const cellMap: Record<string, string> = {};

    // Build a map of cells by position
    for (const cell of table.cells) {
      cellMap[`${cell.rowIndex}-${cell.columnIndex}`] = cell.content;
    }

    // Try to identify header row and extract values
    for (let row = 1; row < table.rowCount; row++) {
      const testName = cellMap[`${row}-0`]?.toLowerCase() || '';
      const value = cellMap[`${row}-1`] || '';
      const refRange = cellMap[`${row}-2`] || cellMap[`${row}-3`] || '';

      for (const [knownTest, range] of Object.entries(LAB_REFERENCE_RANGES)) {
        if (testName.includes(knownTest)) {
          const numericValue = this.parseNumericValue(value);
          if (numericValue !== null) {
            results.push({
              testName: this.normalizeTestName(knownTest),
              value: numericValue.toString(),
              unit: range.unit,
              referenceRange: refRange || `${range.min}-${range.max} ${range.unit}`,
              status: this.determineStatus(numericValue, range),
            });
          }
          break;
        }
      }
    }

    return results;
  }

  private extractFromText(text: string): ExtractedLabValue[] {
    const results: ExtractedLabValue[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      for (const [testName, range] of Object.entries(LAB_REFERENCE_RANGES)) {
        if (lowerLine.includes(testName)) {
          // Try to extract numeric value from the line
          const match = line.match(/[\d.]+/);
          if (match) {
            const numericValue = parseFloat(match[0]);
            if (!isNaN(numericValue)) {
              results.push({
                testName: this.normalizeTestName(testName),
                value: numericValue.toString(),
                unit: range.unit,
                referenceRange: `${range.min}-${range.max} ${range.unit}`,
                status: this.determineStatus(numericValue, range),
              });
            }
          }
        }
      }
    }

    return results;
  }

  private parseNumericValue(value: string): number | null {
    const cleaned = value.replace(/[^\d.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  private normalizeTestName(name: string): string {
    const nameMap: Record<string, string> = {
      'hgb': 'Hemoglobin',
      'hemoglobin': 'Hemoglobin',
      'wbc': 'White Blood Cell Count',
      'white blood cell': 'White Blood Cell Count',
      'rbc': 'Red Blood Cell Count',
      'red blood cell': 'Red Blood Cell Count',
      'plt': 'Platelet Count',
      'platelets': 'Platelet Count',
      'glucose': 'Glucose',
      'creatinine': 'Creatinine',
      'bun': 'Blood Urea Nitrogen',
      'sodium': 'Sodium',
      'potassium': 'Potassium',
      'chloride': 'Chloride',
      'co2': 'CO2 (Bicarbonate)',
      'calcium': 'Calcium',
      'alt': 'ALT (SGPT)',
      'ast': 'AST (SGOT)',
      'albumin': 'Albumin',
      'total protein': 'Total Protein',
      'bilirubin': 'Bilirubin',
      'alkaline phosphatase': 'Alkaline Phosphatase',
      'alp': 'Alkaline Phosphatase',
      'hba1c': 'Hemoglobin A1c',
      'tsh': 'TSH',
      'inr': 'INR',
      'ptt': 'PTT',
      'pt': 'PT (Prothrombin Time)',
    };

    return nameMap[name.toLowerCase()] || name.charAt(0).toUpperCase() + name.slice(1);
  }

  private determineStatus(value: number, range: { min: number; max: number; criticalLow?: number; criticalHigh?: number }): 'normal' | 'abnormal' | 'critical' {
    if (range.criticalLow !== undefined && value < range.criticalLow) {
      return 'critical';
    }
    if (range.criticalHigh !== undefined && value > range.criticalHigh) {
      return 'critical';
    }
    if (value < range.min || value > range.max) {
      return 'abnormal';
    }
    return 'normal';
  }

  private detectDocumentType(content: string): string {
    const lowerContent = content.toLowerCase();

    if (lowerContent.includes('complete blood count') || lowerContent.includes('cbc')) {
      return 'Complete Blood Count (CBC)';
    }
    if (lowerContent.includes('metabolic panel') || lowerContent.includes('cmp') || lowerContent.includes('bmp')) {
      return 'Metabolic Panel';
    }
    if (lowerContent.includes('lipid panel') || lowerContent.includes('cholesterol')) {
      return 'Lipid Panel';
    }
    if (lowerContent.includes('thyroid') || lowerContent.includes('tsh')) {
      return 'Thyroid Panel';
    }
    if (lowerContent.includes('urinalysis')) {
      return 'Urinalysis';
    }
    if (lowerContent.includes('pathology') || lowerContent.includes('biopsy')) {
      return 'Pathology Report';
    }
    if (lowerContent.includes('radiology') || lowerContent.includes('ct scan') || lowerContent.includes('mri') || lowerContent.includes('x-ray')) {
      return 'Radiology Report';
    }

    return 'Laboratory Report';
  }

  private calculateOverallConfidence(result: AnalyzeResult): number {
    if (result.keyValuePairs && result.keyValuePairs.length > 0) {
      const avgConfidence = result.keyValuePairs.reduce((sum, pair) => sum + pair.confidence, 0) / result.keyValuePairs.length;
      return Math.round(avgConfidence * 100);
    }
    return 75; // Default confidence if no key-value pairs
  }

  /**
   * Convert extracted results to HealthMesh LabResult schema
   */
  toLabResults(extractedValues: ExtractedLabValue[], collectedDate: string): LabResult[] {
    return extractedValues.map((ev, index) => ({
      id: `lab-${Date.now()}-${index}`,
      testName: ev.testName,
      value: ev.value,
      unit: ev.unit,
      referenceRange: ev.referenceRange,
      status: ev.status,
      collectedDate,
    }));
  }
}

// Singleton instance
let _client: AzureDocumentIntelligenceClient | null = null;

export function getDocumentIntelligence(): AzureDocumentIntelligenceClient {
  if (!_client) {
    _client = new AzureDocumentIntelligenceClient();
  }
  return _client;
}
