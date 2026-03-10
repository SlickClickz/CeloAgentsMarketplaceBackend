// import axios from "axios";
// import { env } from "../config/env";

// interface EmbeddingResponse {
//   data: { embedding: number[]; index: number }[];
//   model: string;
//   usage: { prompt_tokens: number; total_tokens: number };
// }

// // ─────────────────────────────────────────
// // Generate a single embedding vector
// // for a text string
// // ─────────────────────────────────────────
// export async function generateEmbedding(text: string): Promise<number[]> {
//   if (!text || text.trim().length === 0) {
//     throw new Error("[Embeddings] Cannot embed empty text");
//   }

//   try {
//     const response = await axios.post<EmbeddingResponse>(
//       "https://openrouter.ai/api/v1/embeddings",
//       {
//         model: env.openRouterEmbeddingModel,
//         input: text.slice(0, 8000), // token safety limit
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${env.openRouterApiKey}`,
//           "Content-Type": "application/json",
//         },
//         timeout: 15000,
//       }
//     );

//     const embedding = response.data.data[0]?.embedding;
//     if (!embedding || embedding.length === 0) {
//       throw new Error("[Embeddings] Empty embedding returned from OpenRouter");
//     }

//     return embedding;
//   } catch (err: any) {
//     if (axios.isAxiosError(err)) {
//       throw new Error(
//         `[Embeddings] OpenRouter API error: ${err.response?.status} — ${err.response?.data?.error ?? err.message}`
//       );
//     }
//     throw err;
//   }
// }

// // ─────────────────────────────────────────
// // Generate embeddings for a batch of texts
// // Rate-limited to avoid API throttling
// // ─────────────────────────────────────────
// export async function generateEmbeddingBatch(
//   texts: string[],
//   delayMs = 200
// ): Promise<number[][]> {
//   const embeddings: number[][] = [];

//   for (const text of texts) {
//     const embedding = await generateEmbedding(text);
//     embeddings.push(embedding);
//     if (delayMs > 0) await sleep(delayMs);
//   }

//   return embeddings;
// }

// function sleep(ms: number): Promise<void> {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }

import axios from "axios";
import { env } from "../config/env";

const EMBEDDING_DIM = 1536;

// ─────────────────────────────────────────
// Deterministic fallback embedding
// Builds a pseudo-vector from keyword
// hashing — no API needed, same shape
// as OpenRouter embeddings so pgvector
// schema stays identical.
// When OpenRouter credits are available,
// the flag below switches back automatically.
// ─────────────────────────────────────────

function deterministicEmbedding(text: string): number[] {
  const vector = new Array(EMBEDDING_DIM).fill(0);
  const normalized = text.toLowerCase().trim();
  const tokens = normalized
    .split(/[\s,.\-_/]+/)
    .filter((t) => t.length > 2);

  // Seed each token into the vector using
  // a simple polynomial hash spread across
  // multiple dimensions
  for (const token of tokens) {
    let hash = 5381;
    for (let i = 0; i < token.length; i++) {
      hash = (hash * 33) ^ token.charCodeAt(i);
      hash = hash >>> 0; // keep unsigned 32bit
    }

    // Spread token influence across 8 dimensions
    // derived from the hash to avoid clustering
    for (let i = 0; i < 8; i++) {
      const dim = (hash * (i + 1) * 2654435761) % EMBEDDING_DIM;
      const value = ((hash >> (i * 4)) & 0xff) / 255;
      vector[dim] = Math.min(1, vector[dim] + value * 0.5);
    }
  }

  // L2 normalize so cosine similarity works
  // correctly in pgvector
  const magnitude = Math.sqrt(
    vector.reduce((sum, v) => sum + v * v, 0)
  );

  if (magnitude === 0) return vector;
  return vector.map((v) => v / magnitude);
}

// ─────────────────────────────────────────
// OpenRouter embedding via API
// ─────────────────────────────────────────
async function openRouterEmbedding(text: string): Promise<number[]> {
  const response = await axios.post(
    "https://openrouter.ai/api/v1/embeddings",
    {
      model: env.openRouterEmbeddingModel,
      input: text,
    },
    {
      headers: {
        Authorization: `Bearer ${env.openRouterApiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  return response.data.data[0].embedding;
}

// ─────────────────────────────────────────
// Main export — tries OpenRouter first,
// falls back to deterministic if:
// - No API key configured
// - 402 payment required
// - Any network error
// ─────────────────────────────────────────
export async function generateEmbedding(text: string): Promise<number[]> {
  // Skip OpenRouter entirely if no key set
  if (!env.openRouterApiKey) {
    console.log("[Embeddings] No API key — using deterministic embedding");
    return deterministicEmbedding(text);
  }

  try {
    return await openRouterEmbedding(text);
  } catch (err: any) {
    const is402 = err.response?.status === 402;
    const isNetwork =
      err.code === "ECONNREFUSED" ||
      err.code === "ENOTFOUND" ||
      err.message?.includes("timeout");

    if (is402) {
      console.warn(
        "[Embeddings] OpenRouter credits exhausted — using deterministic fallback"
      );
    } else if (isNetwork) {
      console.warn(
        "[Embeddings] OpenRouter unreachable — using deterministic fallback"
      );
    } else {
      console.warn(
        `[Embeddings] OpenRouter error: ${err.message} — using deterministic fallback`
      );
    }

    return deterministicEmbedding(text);
  }
}