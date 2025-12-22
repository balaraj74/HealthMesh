# HealthMesh Architecture Update: Azure SQL Database Integration

## 1. Updated Architecture

Due to enterprise constraints and the need for a robust, relational data model for complex clinical workflows, we have transitioned the core application data storage from **Azure Cosmos DB** to **Azure SQL Database**.

This architecture maintains the high standards required for a healthcare AI platform while optimizing for relational integrity, reporting capabilities, and cost-effectiveness within the subscription limits.

### Architecture Diagram

```mermaid
graph TD
    User[Clinician / User] -->|HTTPS| App[HealthMesh App (App Service)]
    
    subgraph "Data Layer"
        App -->|Clinical Data (FHIR)| FHIR[Azure Health Data Services]
        App -->|Workflow Data (SQL)| SQL[(Azure SQL Database)]
        App -->|Documents| Blob[Azure Blob Storage]
    end
    
    subgraph "AI & Intelligence"
        App -->|Reasoning| OpenAI[Azure OpenAI Service]
        App -->|Search (RAG)| Search[Azure Cognitive Search]
        App -->|Lab Processing| DocIntel[Azure Document Intelligence]
    end
    
    subgraph "Observability"
        App -->|Telemetry| AppInsights[Application Insights]
        App -->|Audit Logs| SQL
    end

    SQL -->|Persists| Cases[Cases Table]
    SQL -->|Persists| Agents[AgentResults Table]
    SQL -->|Persists| Audit[AuditLogs Table]
    SQL -->|Persists| Patients[Patients Table (Cache)]
```

### Data Separation Strategy

*   **Clinical Data (FHIR)**: The source of truth for patient demographics and clinical history remains **Azure Health Data Services (FHIR)**. This ensures interoperability and compliance with healthcare standards (HL7 FHIR).
*   **App Workflow Data (Azure SQL)**: Application-specific logic, such as Case Management, Agent Orchestration State, and Audit Trails, are stored in **Azure SQL Database**. This allows for:
    *   Strong consistency and transactional integrity.
    *   Complex querying for dashboarding and reporting.
    *   Structured storage of agent reasoning chains.
*   **Documents (Blob Storage)**: Raw lab reports and medical images are stored in Azure Blob Storage, with metadata and extraction results linked in Azure SQL.

## 2. Azure SQL Database Design

We have designed a relational schema optimized for the multi-agent workflow.

### Schema Overview

#### `Cases` Table
Stores the central case object, linking patients to clinical questions and AI analysis.
*   `id`: Primary Key (UUID)
*   `patientId`: Foreign Key (Reference to FHIR Patient ID)
*   `caseType`: Type of case (e.g., tumor-board, chronic-disease)
*   `status`: Current workflow status (draft, analyzing, review-ready, etc.)
*   `clinicalQuestion`: The query posed by the clinician.
*   `recommendations`: JSON (Structured AI recommendations)
*   `riskAlerts`: JSON (Critical safety alerts)
*   `createdAt`, `updatedAt`: Timestamps

#### `AgentResults` Table
Stores the individual outputs of each specialist AI agent, ensuring full traceability of the decision-making process.
*   `id`: Primary Key (UUID)
*   `caseId`: Foreign Key to Cases
*   `agentType`: The specific agent (e.g., oncology-specialist, risk-safety)
*   `status`: Execution status
*   `confidence`: Numerical confidence score (0-100)
*   `summary`: High-level summary of findings
*   `data`: JSON (Full evidence sources, reasoning chain, and raw output)

#### `AuditLogs` Table
Immutable log of all system actions for compliance and security.
*   `id`: Primary Key (UUID)
*   `entityType`: The resource affected (case, patient, etc.)
*   `entityId`: ID of the resource
*   `action`: The action performed (e.g., case-analyzed, recommendation-accepted)
*   `userId`: The user who performed the action (linked to Firebase Auth ID)
*   `details`: JSON (Contextual details)
*   `timestamp`: Time of occurrence

#### `Patients` Table (Local Cache)
*   Acts as a local cache for FHIR data to enable performant application joins and offline-capable workflows.
*   Stores full patient JSON for flexibility while indexing key fields like MRN.

### Why Azure SQL?
*   **Relational Integrity**: Ensures that agent results are always strictly linked to cases, and audit logs are never orphaned.
*   **Complex Querying**: Enables sophisticated dashboard queries (e.g., "Show me all critical alerts for tumor-board cases in the last week") which are difficult in NoSQL without duplication.
*   **Enterprise Compliance**: Azure SQL provides row-level security, dynamic data masking, and robust auditing features out-of-the-box, essential for HIPAA compliance.

## 3. Implementation Details

The backend has been updated to use the `mssql` Node.js driver with connection pooling for high performance.

*   **Connection Pooling**: Configured to handle concurrent agent requests efficiently.
*   **JSON Support**: Leverages Azure SQL's native JSON support to store semi-structured data (like AI reasoning chains) while keeping core metadata structured.
*   **Transactions**: Critical operations (like updating a case status after agent analysis) can be wrapped in transactions to ensure data consistency.

## 4. Logging & Compliance

*   **Application Insights**: Used for performance telemetry, error tracking, and AI token usage monitoring.
*   **SQL Audit Logs**: Business-critical events (who viewed what patient, who accepted what recommendation) are stored in the SQL `AuditLogs` table for permanent record keeping.

## 5. Firebase Integration

*   **Authentication**: Firebase Auth handles user identity verification.
*   **Linkage**: The Firebase User ID is passed to the backend and stored in the `userId` column of `AuditLogs`, ensuring that every action is traceable to a specific verified individual.
*   **Privacy**: No PHI (Protected Health Information) is stored in Firebase. All clinical data resides in Azure (SQL/FHIR) within the compliance boundary.

## 6. Conclusion for Judges

**Why we chose Azure SQL over Cosmos DB:**

While Cosmos DB is a powerful tool for global scale, **Azure SQL Database** was chosen as the primary persistence layer for HealthMesh's workflow engine to prioritize **data integrity, complex reporting, and healthcare compliance**.

In a clinical decision support system, the relationship between a patient, their case, the AI agents' reasoning, and the final clinician decision is strictly hierarchical and relational. Azure SQL enforces these relationships natively. Furthermore, the ability to perform complex analytical queries on the `AgentResults` and `AuditLogs` tables allows administrators to audit AI performance and bias effectively—a critical requirement for "Explainable AI" in healthcare.

This decision reflects a mature, enterprise-grade architectural approach that balances innovation (AI Agents) with the stability and reliability expected in medical software.
