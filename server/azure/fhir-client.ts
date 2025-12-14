/**
 * HealthMesh - Azure FHIR Client
 * Handles Azure Health Data Services FHIR operations
 * Converts between HealthMesh Patient schema and FHIR R4 format
 */

import { getAzureConfig } from './config';
import type { Patient, PatientDemographics, Diagnosis, Medication, Allergy } from '@shared/schema';

// Type for Azure credential (will be dynamically imported when needed)
interface AzureCredential {
  getToken(scope: string): Promise<{ token: string; expiresOnTimestamp: number } | null>;
}

export interface FHIRPatient {
  resourceType: 'Patient';
  id?: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
  };
  identifier?: Array<{
    system: string;
    value: string;
  }>;
  name?: Array<{
    use?: string;
    family?: string;
    given?: string[];
  }>;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  telecom?: Array<{
    system: 'phone' | 'email';
    value: string;
    use?: string;
  }>;
  address?: Array<{
    use?: string;
    text?: string;
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }>;
}

export interface FHIRCondition {
  resourceType: 'Condition';
  id?: string;
  clinicalStatus?: {
    coding: Array<{
      system: string;
      code: string;
    }>;
  };
  code?: {
    coding: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  };
  subject: {
    reference: string;
  };
  onsetDateTime?: string;
  note?: Array<{
    text: string;
  }>;
}

export interface FHIRMedicationRequest {
  resourceType: 'MedicationRequest';
  id?: string;
  status: string;
  medicationCodeableConcept?: {
    coding: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  };
  subject: {
    reference: string;
  };
  dosageInstruction?: Array<{
    text?: string;
    timing?: {
      code?: {
        text: string;
      };
    };
    route?: {
      text: string;
    };
    doseAndRate?: Array<{
      doseQuantity?: {
        value: number;
        unit: string;
      };
    }>;
  }>;
  authoredOn?: string;
  requester?: {
    display?: string;
  };
}

export interface FHIRAllergyIntolerance {
  resourceType: 'AllergyIntolerance';
  id?: string;
  clinicalStatus?: {
    coding: Array<{
      system: string;
      code: string;
    }>;
  };
  criticality?: 'low' | 'high' | 'unable-to-assess';
  code?: {
    coding?: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  };
  patient: {
    reference: string;
  };
  reaction?: Array<{
    manifestation: Array<{
      coding?: Array<{
        system: string;
        code: string;
        display?: string;
      }>;
      text?: string;
    }>;
    severity?: 'mild' | 'moderate' | 'severe';
  }>;
}

export class AzureFHIRClient {
  private endpoint: string;
  private audience: string;
  private useManagedIdentity: boolean;
  private credential: AzureCredential | null = null;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    const config = getAzureConfig();
    this.endpoint = config.fhir.endpoint.replace(/\/$/, '');
    this.audience = config.fhir.audience;
    this.useManagedIdentity = config.useManagedIdentity;
  }

  private async initializeCredential(): Promise<void> {
    if (!this.credential && this.useManagedIdentity) {
      const { DefaultAzureCredential } = await import('@azure/identity');
      this.credential = new DefaultAzureCredential();
    }
  }

  private async getAccessToken(): Promise<string> {
    if (!this.useManagedIdentity) {
      // For development, you might use a fixed token or different auth method
      throw new Error('FHIR requires Managed Identity in production. Set USE_MANAGED_IDENTITY=true');
    }

    // Check if we have a valid cached token
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    await this.initializeCredential();

    if (!this.credential) {
      throw new Error('Azure credential not initialized');
    }

    const token = await this.credential.getToken(this.audience);
    if (!token) {
      throw new Error('Failed to acquire access token for FHIR');
    }

    this.accessToken = token.token;
    this.tokenExpiry = new Date(token.expiresOnTimestamp);

    return this.accessToken;
  }

  private async request(method: string, path: string, body?: any): Promise<any> {
    const token = await this.getAccessToken();
    const url = `${this.endpoint}${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/fhir+json',
        'Authorization': `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FHIR API error (${response.status}): ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json') || contentType?.includes('application/fhir+json')) {
      return response.json();
    }

    return response.text();
  }

  // ==========================================
  // Patient Operations
  // ==========================================

  async createPatient(patient: Patient): Promise<FHIRPatient> {
    const fhirPatient = this.toFHIRPatient(patient);
    return this.request('POST', '/Patient', fhirPatient);
  }

  async getPatient(id: string): Promise<FHIRPatient> {
    return this.request('GET', `/Patient/${id}`);
  }

  async searchPatientByMRN(mrn: string): Promise<FHIRPatient | null> {
    const result = await this.request('GET', `/Patient?identifier=${encodeURIComponent(mrn)}`);
    if (result.entry && result.entry.length > 0) {
      return result.entry[0].resource;
    }
    return null;
  }

  async updatePatient(id: string, patient: Patient): Promise<FHIRPatient> {
    const fhirPatient = this.toFHIRPatient(patient);
    fhirPatient.id = id;
    return this.request('PUT', `/Patient/${id}`, fhirPatient);
  }

  // ==========================================
  // Condition Operations
  // ==========================================

  async createCondition(patientId: string, diagnosis: Diagnosis): Promise<FHIRCondition> {
    const condition = this.toFHIRCondition(patientId, diagnosis);
    return this.request('POST', '/Condition', condition);
  }

  async getPatientConditions(patientId: string): Promise<FHIRCondition[]> {
    const result = await this.request('GET', `/Condition?patient=${patientId}`);
    return result.entry?.map((e: any) => e.resource) || [];
  }

  // ==========================================
  // Medication Operations
  // ==========================================

  async createMedicationRequest(patientId: string, medication: Medication): Promise<FHIRMedicationRequest> {
    const medicationRequest = this.toFHIRMedicationRequest(patientId, medication);
    return this.request('POST', '/MedicationRequest', medicationRequest);
  }

  async getPatientMedications(patientId: string): Promise<FHIRMedicationRequest[]> {
    const result = await this.request('GET', `/MedicationRequest?patient=${patientId}`);
    return result.entry?.map((e: any) => e.resource) || [];
  }

  // ==========================================
  // Allergy Operations
  // ==========================================

  async createAllergyIntolerance(patientId: string, allergy: Allergy): Promise<FHIRAllergyIntolerance> {
    const allergyIntolerance = this.toFHIRAllergyIntolerance(patientId, allergy);
    return this.request('POST', '/AllergyIntolerance', allergyIntolerance);
  }

  async getPatientAllergies(patientId: string): Promise<FHIRAllergyIntolerance[]> {
    const result = await this.request('GET', `/AllergyIntolerance?patient=${patientId}`);
    return result.entry?.map((e: any) => e.resource) || [];
  }

  // ==========================================
  // Full Patient Bundle
  // ==========================================

  async createPatientBundle(patient: Patient): Promise<{ patientId: string }> {
    // Create patient first
    const fhirPatient = await this.createPatient(patient);
    const patientId = fhirPatient.id!;

    // Create conditions
    for (const diagnosis of patient.diagnoses) {
      await this.createCondition(patientId, diagnosis);
    }

    // Create medications
    for (const medication of patient.medications) {
      await this.createMedicationRequest(patientId, medication);
    }

    // Create allergies
    for (const allergy of patient.allergies) {
      await this.createAllergyIntolerance(patientId, allergy);
    }

    return { patientId };
  }

  async getFullPatient(patientId: string): Promise<Patient> {
    const [fhirPatient, conditions, medications, allergies] = await Promise.all([
      this.getPatient(patientId),
      this.getPatientConditions(patientId),
      this.getPatientMedications(patientId),
      this.getPatientAllergies(patientId),
    ]);

    return this.fromFHIRPatient(fhirPatient, conditions, medications, allergies);
  }

  // ==========================================
  // Conversion Methods: HealthMesh -> FHIR
  // ==========================================

  private toFHIRPatient(patient: Patient): FHIRPatient {
    const d = patient.demographics;
    return {
      resourceType: 'Patient',
      identifier: [
        {
          system: 'urn:healthmesh:mrn',
          value: d.mrn,
        },
      ],
      name: [
        {
          use: 'official',
          family: d.lastName,
          given: [d.firstName],
        },
      ],
      gender: d.gender,
      birthDate: d.dateOfBirth,
      telecom: [
        ...(d.contactPhone ? [{ system: 'phone' as const, value: d.contactPhone, use: 'home' }] : []),
        ...(d.contactEmail ? [{ system: 'email' as const, value: d.contactEmail }] : []),
      ],
      address: d.address ? [{ use: 'home', text: d.address }] : [],
    };
  }

  private toFHIRCondition(patientId: string, diagnosis: Diagnosis): FHIRCondition {
    const statusMap: Record<string, string> = {
      active: 'active',
      resolved: 'resolved',
      inactive: 'inactive',
    };

    return {
      resourceType: 'Condition',
      clinicalStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: statusMap[diagnosis.status] || 'active',
          },
        ],
      },
      code: {
        coding: [
          {
            system: diagnosis.codeSystem === 'ICD-10' 
              ? 'http://hl7.org/fhir/sid/icd-10' 
              : 'http://snomed.info/sct',
            code: diagnosis.code,
            display: diagnosis.display,
          },
        ],
        text: diagnosis.display,
      },
      subject: {
        reference: `Patient/${patientId}`,
      },
      onsetDateTime: diagnosis.onsetDate,
      note: diagnosis.notes ? [{ text: diagnosis.notes }] : undefined,
    };
  }

  private toFHIRMedicationRequest(patientId: string, medication: Medication): FHIRMedicationRequest {
    return {
      resourceType: 'MedicationRequest',
      status: medication.status === 'active' ? 'active' : 'completed',
      medicationCodeableConcept: {
        coding: [{
          system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
          code: 'unknown',
          display: medication.name,
        }],
        text: medication.name,
      },
      subject: {
        reference: `Patient/${patientId}`,
      },
      dosageInstruction: [
        {
          text: `${medication.dosage} ${medication.frequency}`,
          timing: {
            code: {
              text: medication.frequency,
            },
          },
          route: medication.route ? { text: medication.route } : undefined,
        },
      ],
      authoredOn: medication.startDate,
      requester: medication.prescriber ? { display: medication.prescriber } : undefined,
    };
  }

  private toFHIRAllergyIntolerance(patientId: string, allergy: Allergy): FHIRAllergyIntolerance {
    const severityMap: Record<string, 'low' | 'high'> = {
      mild: 'low',
      moderate: 'low',
      severe: 'high',
      'life-threatening': 'high',
    };

    return {
      resourceType: 'AllergyIntolerance',
      clinicalStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
            code: allergy.status,
          },
        ],
      },
      criticality: severityMap[allergy.severity] || 'low',
      code: {
        text: allergy.substance,
      },
      patient: {
        reference: `Patient/${patientId}`,
      },
      reaction: [
        {
          manifestation: [
            {
              text: allergy.reaction,
            },
          ],
          severity: allergy.severity === 'life-threatening' ? 'severe' : allergy.severity as any,
        },
      ],
    };
  }

  // ==========================================
  // Conversion Methods: FHIR -> HealthMesh
  // ==========================================

  private fromFHIRPatient(
    fhirPatient: FHIRPatient,
    conditions: FHIRCondition[],
    medications: FHIRMedicationRequest[],
    allergies: FHIRAllergyIntolerance[]
  ): Patient {
    const name = fhirPatient.name?.[0];
    const phone = fhirPatient.telecom?.find(t => t.system === 'phone');
    const email = fhirPatient.telecom?.find(t => t.system === 'email');
    const mrn = fhirPatient.identifier?.find(i => i.system === 'urn:healthmesh:mrn');

    const demographics: PatientDemographics = {
      firstName: name?.given?.[0] || '',
      lastName: name?.family || '',
      dateOfBirth: fhirPatient.birthDate || '',
      gender: fhirPatient.gender || 'unknown',
      mrn: mrn?.value || fhirPatient.id || '',
      contactPhone: phone?.value,
      contactEmail: email?.value,
      address: fhirPatient.address?.[0]?.text,
    };

    return {
      id: fhirPatient.id || '',
      demographics,
      diagnoses: conditions.map(c => this.fromFHIRCondition(c)),
      medications: medications.map(m => this.fromFHIRMedicationRequest(m)),
      allergies: allergies.map(a => this.fromFHIRAllergyIntolerance(a)),
      createdAt: fhirPatient.meta?.lastUpdated || new Date().toISOString(),
      updatedAt: fhirPatient.meta?.lastUpdated || new Date().toISOString(),
    };
  }

  private fromFHIRCondition(condition: FHIRCondition): Diagnosis {
    const coding = condition.code?.coding?.[0];
    const status = condition.clinicalStatus?.coding?.[0]?.code || 'active';

    return {
      id: condition.id || '',
      code: coding?.code || '',
      codeSystem: coding?.system?.includes('icd-10') ? 'ICD-10' : 'SNOMED-CT',
      display: coding?.display || condition.code?.text || '',
      status: status as 'active' | 'resolved' | 'inactive',
      onsetDate: condition.onsetDateTime,
      notes: condition.note?.[0]?.text,
    };
  }

  private fromFHIRMedicationRequest(med: FHIRMedicationRequest): Medication {
    const dosage = med.dosageInstruction?.[0];
    return {
      id: med.id || '',
      name: med.medicationCodeableConcept?.text || '',
      dosage: dosage?.doseAndRate?.[0]?.doseQuantity 
        ? `${dosage.doseAndRate[0].doseQuantity.value} ${dosage.doseAndRate[0].doseQuantity.unit}`
        : dosage?.text?.split(' ')[0] || '',
      frequency: dosage?.timing?.code?.text || '',
      route: dosage?.route?.text,
      status: med.status === 'active' ? 'active' : 'completed',
      startDate: med.authoredOn,
      prescriber: med.requester?.display,
    };
  }

  private fromFHIRAllergyIntolerance(allergy: FHIRAllergyIntolerance): Allergy {
    const reaction = allergy.reaction?.[0];
    const severityMap: Record<string, 'mild' | 'moderate' | 'severe' | 'life-threatening'> = {
      mild: 'mild',
      moderate: 'moderate',
      severe: 'severe',
    };

    return {
      id: allergy.id || '',
      substance: allergy.code?.text || '',
      reaction: reaction?.manifestation?.[0]?.text || '',
      severity: allergy.criticality === 'high' 
        ? (reaction?.severity === 'severe' ? 'life-threatening' : 'severe')
        : (severityMap[reaction?.severity || 'mild'] || 'mild'),
      status: allergy.clinicalStatus?.coding?.[0]?.code as 'active' | 'inactive' | 'resolved' || 'active',
    };
  }
}

// Singleton instance
let _client: AzureFHIRClient | null = null;

export function getAzureFHIR(): AzureFHIRClient {
  if (!_client) {
    _client = new AzureFHIRClient();
  }
  return _client;
}
