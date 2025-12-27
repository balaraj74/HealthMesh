/**
 * Seed Script: Add a realistic patient with comprehensive medical data
 * for testing AI clinical analysis
 * 
 * Usage: npx tsx server/scripts/seed-test-patient.ts
 */

import sql from "mssql";
import { randomUUID } from "crypto";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ESM compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Use the same connection string format as the main app
const connectionString = process.env.AZURE_SQL_CONNECTION_STRING || "";

// Parse connection string
function parseConnectionString(connStr: string): sql.config {
    const parts = connStr.split(";").reduce((acc, part) => {
        const equalIndex = part.indexOf("=");
        if (equalIndex > 0) {
            const key = part.substring(0, equalIndex).toLowerCase().trim();
            const value = part.substring(equalIndex + 1).trim();
            acc[key] = value;
        }
        return acc;
    }, {} as Record<string, string>);

    // Handle server name - remove tcp: prefix and ,port suffix
    let server = parts["server"] || parts["data source"] || "";
    server = server.replace(/^tcp:/i, "").split(",")[0];

    return {
        server: server,
        database: parts["database"] || parts["initial catalog"] || "",
        user: parts["user id"] || parts["uid"] || "",
        password: parts["password"] || parts["pwd"] || "",
        port: 1433,
        options: {
            encrypt: true,
            trustServerCertificate: false,
        },
    };
}

const config = parseConnectionString(connectionString);

// Realistic test patient data - Complex oncology case
const testPatient = {
    id: randomUUID(),
    firstName: "Maria",
    lastName: "Santos",
    dateOfBirth: "1962-03-15",
    gender: "female",
    mrn: "MH-2024-78543",
    contactPhone: "+91 9876543210",
    contactEmail: "maria.santos@email.com",
    demographics: {
        address: "42 Gandhi Nagar, Near City Hospital, Bangalore, Karnataka - 560001",
        emergencyContact: "Carlos Santos (Husband) - +91 9876543211",
        bloodType: "A+",
        preferredLanguage: "English",
        occupation: "Retired Teacher"
    },
    // Active medical conditions
    diagnoses: [
        {
            id: randomUUID(),
            code: "C50.911",
            display: "Malignant neoplasm of unspecified site of right female breast",
            status: "active",
            onsetDate: "2024-08-15",
            clinicalStatus: "active",
            verificationStatus: "confirmed",
            severity: "moderate",
            note: "Stage IIA, T2N0M0, ER+/PR+/HER2-"
        },
        {
            id: randomUUID(),
            code: "E11.9",
            display: "Type 2 Diabetes Mellitus without complications",
            status: "active",
            onsetDate: "2018-06-10",
            clinicalStatus: "active",
            verificationStatus: "confirmed",
            severity: "moderate",
            note: "Well-controlled with oral medications, HbA1c 6.8%"
        },
        {
            id: randomUUID(),
            code: "I10",
            display: "Essential (Primary) Hypertension",
            status: "active",
            onsetDate: "2015-02-20",
            clinicalStatus: "active",
            verificationStatus: "confirmed",
            severity: "mild",
            note: "Controlled with ACE inhibitor"
        },
        {
            id: randomUUID(),
            code: "E78.0",
            display: "Pure Hypercholesterolemia",
            status: "active",
            onsetDate: "2019-11-05",
            clinicalStatus: "active",
            verificationStatus: "confirmed",
            severity: "mild",
            note: "On statin therapy, LDL at target"
        },
        {
            id: randomUUID(),
            code: "M81.0",
            display: "Age-related Osteoporosis without current pathological fracture",
            status: "active",
            onsetDate: "2022-03-12",
            clinicalStatus: "active",
            verificationStatus: "confirmed",
            severity: "moderate",
            note: "T-score -2.6 at lumbar spine"
        }
    ],
    // Current medications
    medications: [
        {
            id: randomUUID(),
            name: "Anastrozole",
            dosage: "1 mg",
            frequency: "Once daily",
            route: "Oral",
            status: "active",
            startDate: "2024-09-01",
            prescribedFor: "Breast cancer - Adjuvant hormonal therapy",
            note: "Aromatase inhibitor for ER+ breast cancer"
        },
        {
            id: randomUUID(),
            name: "Metformin",
            dosage: "500 mg",
            frequency: "Twice daily",
            route: "Oral",
            status: "active",
            startDate: "2018-07-01",
            prescribedFor: "Type 2 Diabetes",
            note: "With meals to reduce GI side effects"
        },
        {
            id: randomUUID(),
            name: "Lisinopril",
            dosage: "10 mg",
            frequency: "Once daily",
            route: "Oral",
            status: "active",
            startDate: "2015-03-01",
            prescribedFor: "Hypertension",
            note: "Morning dose, monitor potassium"
        },
        {
            id: randomUUID(),
            name: "Atorvastatin",
            dosage: "20 mg",
            frequency: "Once daily at bedtime",
            route: "Oral",
            status: "active",
            startDate: "2019-12-01",
            prescribedFor: "Hypercholesterolemia",
            note: "Monitor LFTs annually"
        },
        {
            id: randomUUID(),
            name: "Alendronate",
            dosage: "70 mg",
            frequency: "Once weekly",
            route: "Oral",
            status: "active",
            startDate: "2022-04-01",
            prescribedFor: "Osteoporosis",
            note: "Take on empty stomach, remain upright 30 min"
        },
        {
            id: randomUUID(),
            name: "Calcium + Vitamin D3",
            dosage: "600 mg / 400 IU",
            frequency: "Twice daily",
            route: "Oral",
            status: "active",
            startDate: "2022-04-01",
            prescribedFor: "Osteoporosis prevention",
            note: "With meals for better absorption"
        },
        {
            id: randomUUID(),
            name: "Aspirin",
            dosage: "81 mg",
            frequency: "Once daily",
            route: "Oral",
            status: "active",
            startDate: "2020-01-15",
            prescribedFor: "Cardiovascular protection",
            note: "Low-dose for primary prevention"
        }
    ],
    // Known allergies
    allergies: [
        {
            id: randomUUID(),
            substance: "Penicillin",
            reaction: "Severe skin rash, facial swelling",
            severity: "severe",
            status: "active",
            onsetDate: "1990-05-10",
            type: "medication",
            note: "Avoid all penicillin and cephalosporin antibiotics (potential cross-reactivity)"
        },
        {
            id: randomUUID(),
            substance: "Sulfonamides",
            reaction: "Hives, difficulty breathing",
            severity: "moderate",
            status: "active",
            onsetDate: "2005-08-22",
            type: "medication",
            note: "Includes sulfamethoxazole, avoid sulfa drugs"
        },
        {
            id: randomUUID(),
            substance: "Iodinated Contrast Media",
            reaction: "Mild skin flushing, nausea",
            severity: "mild",
            status: "active",
            onsetDate: "2021-07-15",
            type: "medication",
            note: "Pre-medicate with steroids and antihistamines if contrast needed"
        },
        {
            id: randomUUID(),
            substance: "Peanuts",
            reaction: "Throat tightness, wheezing",
            severity: "severe",
            status: "active",
            onsetDate: "1975-01-01",
            type: "food",
            note: "Carries EpiPen, avoid all peanut products"
        }
    ]
};

// Clinical case for testing
const testCase = {
    id: randomUUID(),
    patientId: testPatient.id,
    caseType: "tumor-board",
    clinicalQuestion: `62-year-old female with newly diagnosed Stage IIA breast cancer (T2N0M0, ER+/PR+/HER2-) presenting for tumor board discussion regarding adjuvant treatment recommendations. 

Patient underwent lumpectomy with sentinel lymph node biopsy on August 25, 2024. Pathology confirmed invasive ductal carcinoma, grade 2, 2.3 cm, with clear margins (>2mm). Sentinel node negative (0/3). Oncotype DX recurrence score: 18 (intermediate risk).

Key considerations:
1. Should this patient receive adjuvant chemotherapy given intermediate Oncotype score?
2. What is the optimal radiation therapy approach post-lumpectomy?
3. Are there any drug interactions with her current medications (metformin, anastrozole, atorvastatin)?
4. Given her osteoporosis and aromatase inhibitor therapy, what bone health monitoring is recommended?
5. How should her diabetes management be optimized during cancer treatment?

Please provide evidence-based recommendations with consideration for her comorbidities and polypharmacy.`,
    status: "submitted",
    priority: "high"
};

async function seedTestPatient() {
    let pool: sql.ConnectionPool | null = null;

    try {
        console.log("🔄 Connecting to Azure SQL Database...");
        pool = await sql.connect(config);
        console.log("✅ Connected to database");

        // Get hospital ID from existing data or use a default
        const hospitalResult = await pool.request()
            .query("SELECT TOP 1 id FROM hospitals");

        let hospitalId: string;
        if (hospitalResult.recordset.length > 0) {
            hospitalId = hospitalResult.recordset[0].id;
            console.log(`📋 Using existing hospital: ${hospitalId}`);
        } else {
            // Create a test hospital
            hospitalId = randomUUID();
            await pool.request()
                .input("id", sql.NVarChar, hospitalId)
                .input("name", sql.NVarChar, "HealthMesh Test Hospital")
                .input("domain", sql.NVarChar, "test.healthmesh.com")
                .query(`
                    INSERT INTO hospitals (id, name, domain, created_at)
                    VALUES (@id, @name, @domain, GETUTCDATE())
                `);
            console.log(`✅ Created test hospital: ${hospitalId}`);
        }

        // Get a user ID from existing data
        const userResult = await pool.request()
            .input("hospitalId", sql.NVarChar, hospitalId)
            .query("SELECT TOP 1 id FROM users WHERE hospital_id = @hospitalId");

        let userId: string;
        if (userResult.recordset.length > 0) {
            userId = userResult.recordset[0].id;
        } else {
            userId = randomUUID();
        }

        // Insert the test patient
        console.log("\n📝 Creating test patient: Maria Santos...");
        await pool.request()
            .input("id", sql.NVarChar, testPatient.id)
            .input("hospitalId", sql.NVarChar, hospitalId)
            .input("firstName", sql.NVarChar, testPatient.firstName)
            .input("lastName", sql.NVarChar, testPatient.lastName)
            .input("dateOfBirth", sql.Date, testPatient.dateOfBirth)
            .input("gender", sql.NVarChar, testPatient.gender)
            .input("mrn", sql.NVarChar, testPatient.mrn)
            .input("contactPhone", sql.NVarChar, testPatient.contactPhone)
            .input("contactEmail", sql.NVarChar, testPatient.contactEmail)
            .input("demographics", sql.NVarChar, JSON.stringify(testPatient.demographics))
            .input("diagnoses", sql.NVarChar, JSON.stringify(testPatient.diagnoses))
            .input("medications", sql.NVarChar, JSON.stringify(testPatient.medications))
            .input("allergies", sql.NVarChar, JSON.stringify(testPatient.allergies))
            .input("createdByUserId", sql.NVarChar, userId)
            .query(`
                INSERT INTO patients (
                    id, hospital_id, first_name, last_name, date_of_birth, gender, 
                    mrn, contact_phone, contact_email, demographics, diagnoses, 
                    medications, allergies, created_by_user_id, created_at, updated_at
                )
                VALUES (
                    @id, @hospitalId, @firstName, @lastName, @dateOfBirth, @gender,
                    @mrn, @contactPhone, @contactEmail, @demographics, @diagnoses,
                    @medications, @allergies, @createdByUserId, GETUTCDATE(), GETUTCDATE()
                )
            `);

        console.log(`✅ Patient created: ${testPatient.firstName} ${testPatient.lastName}`);
        console.log(`   MRN: ${testPatient.mrn}`);
        console.log(`   ID: ${testPatient.id}`);
        console.log(`   Diagnoses: ${testPatient.diagnoses.length}`);
        console.log(`   Medications: ${testPatient.medications.length}`);
        console.log(`   Allergies: ${testPatient.allergies.length}`);

        // Insert the test case
        console.log("\n📝 Creating test clinical case...");
        await pool.request()
            .input("id", sql.NVarChar, testCase.id)
            .input("hospitalId", sql.NVarChar, hospitalId)
            .input("patientId", sql.NVarChar, testCase.patientId)
            .input("caseType", sql.NVarChar, testCase.caseType)
            .input("chiefComplaint", sql.NVarChar, testCase.clinicalQuestion)
            .input("status", sql.NVarChar, testCase.status)
            .input("priority", sql.NVarChar, testCase.priority)
            .query(`
                INSERT INTO clinical_cases (
                    id, hospital_id, patient_id, case_type, chief_complaint, 
                    status, priority, created_at, updated_at
                )
                VALUES (
                    @id, @hospitalId, @patientId, @caseType, @chiefComplaint,
                    @status, @priority, GETUTCDATE(), GETUTCDATE()
                )
            `);

        console.log(`✅ Clinical case created: ${testCase.id.slice(0, 8)}...`);
        console.log(`   Case Type: ${testCase.caseType}`);
        console.log(`   Status: ${testCase.status}`);
        console.log(`   Priority: ${testCase.priority}`);

        console.log("\n" + "=".repeat(60));
        console.log("✅ TEST DATA SEEDED SUCCESSFULLY!");
        console.log("=".repeat(60));
        console.log("\n📋 Patient Summary:");
        console.log(`   Name: ${testPatient.firstName} ${testPatient.lastName}`);
        console.log(`   Age: 62 years old`);
        console.log(`   Primary Condition: Stage IIA Breast Cancer (ER+/PR+/HER2-)`);
        console.log(`   Comorbidities: Type 2 Diabetes, Hypertension, Hyperlipidemia, Osteoporosis`);
        console.log(`   Key Allergies: Penicillin (severe), Sulfonamides, Peanuts (severe)`);
        console.log(`   Current Medications: 7 active medications`);
        console.log("\n🔬 Clinical Case:");
        console.log(`   Type: Tumor Board Review`);
        console.log(`   Focus: Adjuvant treatment recommendations for intermediate-risk breast cancer`);
        console.log(`   Key Questions: Chemotherapy decision, radiation approach, drug interactions`);
        console.log("\n🚀 Next Steps:");
        console.log("   1. Open the HealthMesh app in your browser");
        console.log("   2. Navigate to Patients and find 'Maria Santos'");
        console.log("   3. Open her case and click 'AI Clinical Analysis'");
        console.log("   4. Watch the 5-agent pipeline analyze the case!");
        console.log("=".repeat(60));

    } catch (error) {
        console.error("❌ Error seeding test data:", error);
        throw error;
    } finally {
        if (pool) {
            await pool.close();
            console.log("\n🔌 Database connection closed");
        }
    }
}

// Run the seed script
seedTestPatient().catch(console.error);
