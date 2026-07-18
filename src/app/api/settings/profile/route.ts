import { NextRequest } from "next/server";
import { extractBearerToken, verifyToken } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseServer(req, token);

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("first_name, last_name, linkedin_url")
      .eq("user_id", user.userId)
      .single();

    const { data: voiceProfile } = await supabase
      .from("brand_voice_profiles")
      .select("*")
      .eq("user_id", user.userId)
      .single();

    return Response.json({
      firstName: profile?.first_name || "",
      lastName: profile?.last_name || "",
      linkedinUrl: profile?.linkedin_url || "",
      voiceProfile: voiceProfile ? {
        tone: voiceProfile.tone || [],
        personality: voiceProfile.personality || "",
        vocabulary: voiceProfile.vocabulary || [],
        sentenceLength: voiceProfile.sentence_length || "medium",
        ctaStyle: voiceProfile.cta_style || "",
        storytellingStyle: voiceProfile.storytelling_style || "",
        contentPillars: voiceProfile.content_pillars || [],
        targetAudience: voiceProfile.target_audience || "",
        formattingStyle: voiceProfile.formatting_style || [],
        commonPhrases: voiceProfile.common_phrases || [],
        favoriteEmojis: voiceProfile.favorite_emojis || [],
        voicePrompt: voiceProfile.voice_prompt || "",
      } : null,
    });
  } catch (error) {
    console.error("Settings profile GET error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { firstName, lastName, linkedinUrl } = await req.json() as {
      firstName?: string;
      lastName?: string;
      linkedinUrl?: string;
    };

    const supabase = getSupabaseServer(req, token);

    const { error } = await supabase
      .from("user_profiles")
      .upsert({
        user_id: user.userId,
        first_name: firstName || "",
        last_name: lastName || "",
        linkedin_url: linkedinUrl || "",
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (error) {
      console.error("Settings profile PATCH error:", error);
      if (error.code === "42P01") {
        return Response.json({ success: true, warning: "Profile table not found" });
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Settings profile PATCH error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
