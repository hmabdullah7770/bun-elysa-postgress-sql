// src/scripts/resetOpensearchIndex.js
import { Client } from "@opensearch-project/opensearch";
import 'dotenv/config';

const osClient = new Client({
  node: process.env.OPENSEARCH_URL, // Use your OpenSearch URL here
  auth: {
    apiKey: process.env.OPENSEARCH_API_KEY // Use your OpenSearch Key here
  }
});

async function resetIndex() {
  try {
    await osClient.indices.delete({ index: 'posts' }, { ignore_unavailable: true });
    console.log("🗑️  Deleted old 'posts' OpenSearch index (if it existed)");

    // NOTE: OpenSearch client requires the 'body' wrapper here
    await osClient.indices.create({
      index: 'posts',
      body: {
        mappings: {
          properties: {
            title: { type: 'text' },
            description: { type: 'text' },
            category: { type: 'keyword' },
            location: { type: 'text' },
            product: { type: 'text' },
            store: { type: 'text' },
            owner: {
              properties: {
                username: { type: 'text' }
              }
            },
            isPublished: { type: 'boolean' },
            createdAt: { type: 'date' }
          }
        }
      }
    });

    console.log("✅ Created 'posts' index in OpenSearch with correct mapping");
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to reset OpenSearch index:", err);
    process.exit(1);
  }
}

resetIndex();