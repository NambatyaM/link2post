import { getSupabaseServer } from "./supabase-server";

export function stubEmbedding(text: string): number[] {
  const embedding = new Array(1536).fill(0);
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    embedding[i % 1536] += charCode;
    embedding[(i * 7 + 3) % 1536] += charCode * 0.618;
    embedding[(i * 13 + 7) % 1536] += Math.sin(charCode * 0.01) * 0.5;
  }
  let norm = 0;
  for (let i = 0; i < 1536; i++) {
    norm += embedding[i] * embedding[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < 1536; i++) {
      embedding[i] /= norm;
    }
  }
  return embedding;
}

export async function storeMemory(
  userId: string,
  contentType: string,
  contentText: string,
  embedding: number[],
  metadata: Record<string, unknown> = {},
) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("brand_voice_memories")
    .insert({
      user_id: userId,
      content_type: contentType,
      content_text: contentText,
      embedding: `[${embedding.join(",")}]`,
      metadata,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function matchMemories(
  userId: string,
  queryEmbedding: number[],
  matchCount: number = 5,
  contentTypeFilter?: string,
) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase.rpc("match_brand_voice", {
    query_embedding: `[${queryEmbedding.join(",")}]`,
    p_user_id: userId,
    p_match_count: matchCount,
    p_content_type_filter: contentTypeFilter ?? null,
  });

  if (error) throw error;
  return data as Array<{
    id: string;
    content_type: string;
    content_text: string;
    metadata: Record<string, unknown>;
    created_at: string;
    similarity: number;
  }>;
}

export async function buildVoiceContext(
  userId: string,
  contentType: string,
  currentContent: string,
): Promise<string> {
  const embedding = stubEmbedding(currentContent);
  const matches = await matchMemories(userId, embedding, 5, contentType);

  if (matches.length === 0) return "";

  const references = matches
    .map(
      (m, i) =>
        `--- Reference ${i + 1} (similarity: ${(m.similarity * 100).toFixed(0)}%) ---\nType: ${m.content_type}\nContent:\n${m.content_text}`,
    )
    .join("\n\n");

  return `--- BRAND VOICE REFERENCE MATERIAL ---\nBelow are past posts from this author that are most similar to the current content. Use them to match tone, vocabulary, structure, and energy.\n\n${references}\n--- END BRAND VOICE REFERENCE ---`;
}

export async function syncVoiceMemory(
  userId: string,
  postId: string,
  postContent: string,
  postType: string,
) {
  const embedding = stubEmbedding(postContent);
  return storeMemory(userId, postType, postContent, embedding, {
    source_post_id: postId,
  });
}
