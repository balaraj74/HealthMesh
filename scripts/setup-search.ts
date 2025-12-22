
import 'dotenv/config';
import { getCognitiveSearch, MEDICAL_GUIDELINES_INDEX_SCHEMA } from '../server/azure/cognitive-search';

async function main() {
    console.log('🔍 HealthMesh - Azure AI Search Setup');
    console.log('=====================================');

    const searchClient = getCognitiveSearch();

    try {
        // 1. Delete existing index (if any)
        console.log('\n🗑️  Deleting existing index (if present)...');
        try {
            await searchClient.deleteIndex();
            console.log('   ✓ Index deleted');
        } catch (error: any) {
            if (error.message.includes('404')) {
                console.log('   ℹ️  Index did not exist');
            } else {
                console.warn('   ⚠️  Warning during deletion:', error.message);
            }
        }

        // 2. Create new index
        console.log('\n🏗️  Creating new index...');
        await searchClient.createIndex(MEDICAL_GUIDELINES_INDEX_SCHEMA);
        console.log('   ✓ Index created successfully');

        console.log('   ⏳ Waiting for index to propagate...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 3. Populate with sample data
        console.log('\n📚 Indexing sample medical guidelines...');
        const sampleDocs = searchClient.getSampleGuidelines();
        console.log(`   Found ${sampleDocs.length} sample documents`);

        await searchClient.indexDocuments(sampleDocs);
        console.log('   ✓ Documents indexed successfully');

        // 4. Test Search
        console.log('\n🔎 Testing search functionality...');
        const query = 'diabetes treatment';
        console.log(`   Query: "${query}"`);

        // Give it a moment for indexing to propagate (though usually fast)
        await new Promise(resolve => setTimeout(resolve, 2000));

        const results = await searchClient.search(query, { top: 3 });
        console.log(`   Found ${results.length} results:`);

        results.forEach((r, i) => {
            console.log(`   ${i + 1}. ${r.document.title} (Score: ${r.score})`);
        });

        // 5. Test RAG
        console.log('\n🧠 Testing RAG (AI Answer)...');
        const ragResult = await searchClient.ragQuery(query);
        console.log('   Answer:', ragResult.answer);
        console.log('   Confidence:', ragResult.confidence);

        console.log('\n✨ Setup completed successfully!');
        process.exit(0);

    } catch (error: any) {
        console.error('\n❌ Setup failed:', error.message);
        if (error.message.includes('Access denied') || error.message.includes('Authorization')) {
            console.error('   👉 Check your AZURE_SEARCH_KEY in .env');
        }
        process.exit(1);
    }
}

main();
