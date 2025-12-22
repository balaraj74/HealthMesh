import { getCognitiveSearch, MEDICAL_GUIDELINES_INDEX_SCHEMA } from './azure/cognitive-search';

export async function initializeMedicalGuidelines() {
    const guidelines = [
        {
            id: 'nccn-breast-2024',
            title: 'NCCN Guidelines: Breast Cancer v2.2024',
            category: 'Oncology',
            content: `Treatment recommendations for early-stage breast cancer...
      
      For ER+/PR+/HER2- patients with intermediate Oncotype DX scores (16-25):
      - Consider adjuvant chemotherapy for patients aged 50-70
      - TAILORx trial data supports potential benefit
      - Discuss risks/benefits with patient
      - Endocrine therapy remains standard of care`,
            source: 'NCCN',
            publicationDate: '2024-01-15',
            url: 'https://www.nccn.org/professionals/physician_gls/pdf/breast.pdf'
        },
        {
            id: 'aha-cardiac-2023',
            title: 'AHA Guidelines: Management of Coronary Artery Disease',
            category: 'Cardiology',
            content: `Recommendations for stable ischemic heart disease...
      
      For patients with new symptoms on optimal medical therapy:
      - Stress testing to evaluate ischemia burden
      - Consider coronary angiography if high-risk features
      - Intensify anti-anginal therapy
      - Cardiology consultation recommended`,
            source: 'American Heart Association',
            publicationDate: '2023-11-01',
            url: 'https://www.ahajournals.org/guidelines'
        },
        {
            id: 'aan-ms-2023',
            title: 'AAN Practice Parameter: Multiple Sclerosis Disease-Modifying Therapies',
            category: 'Neurology',
            content: `Guidelines for DMT selection in relapsing-remitting MS...
      
      For patients stable on current DMT (no new lesions on MRI):
      - Continue current therapy if well-tolerated
      - Annual MRI surveillance recommended
      - Monitor for adverse effects
      - Consider treatment escalation only if breakthrough disease activity`,
            source: 'American Academy of Neurology',
            publicationDate: '2023-06-20',
            url: 'https://www.aan.com/Guidelines'
        }
    ];

    try {
        // Create or update search index
        await getCognitiveSearch().createIndex(MEDICAL_GUIDELINES_INDEX_SCHEMA);

        // Upload documents
        await getCognitiveSearch().indexDocuments(guidelines);

        console.log(`✓ Indexed ${guidelines.length} medical guidelines`);
    } catch (error) {
        console.error('Error initializing search index:', error);
    }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    initializeMedicalGuidelines().catch(console.error);
}
