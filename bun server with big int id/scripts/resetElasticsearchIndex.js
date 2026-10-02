// src/scripts/resetElasticsearchIndex.js
import { Client } from "@elastic/elasticsearch";
import 'dotenv/config';

const esClient = new Client({
  node: process.env.ES_URL,
  auth: {
    apiKey: process.env.ES_API_KEY
  }
});

async function resetIndex() {
  try {
    await esClient.indices.delete({ index: 'posts' }, { ignore_unavailable: true });
    console.log("🗑️  Deleted old 'posts' index (if it existed)");

    await esClient.indices.create({
      index: 'posts',
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
    });

    console.log("✅ Created 'posts' index with correct mapping");
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to reset index:", err);
    process.exit(1);
  }
}

resetIndex();