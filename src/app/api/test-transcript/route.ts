import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  const videoId = "O8_isifBeKk";
  const results: Record<string, unknown> = {};

  // Test 1: InnerTube WEB
  try {
    const resp = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" },
      body: JSON.stringify({ context: { client: { clientName: "WEB", clientVersion: "2.20241126.01.00", hl: "en", gl: "US" } }, videoId }),
    });
    const data = await resp.json();
    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    results.innertube_web = { status: resp.status, hasTracks: Array.isArray(tracks), trackCount: tracks?.length ?? 0, firstTrackLang: tracks?.[0]?.languageCode };
  } catch (e) {
    results.innertube_web = { error: e instanceof Error ? e.message : "unknown" };
  }

  // Test 2: HTML scrape
  try {
    const resp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36", "Cookie": "CONSENT=YES+cb.20210328-17-p0.en+FX+999" },
    });
    const html = await resp.text();
    const hasRecaptcha = html.includes("g-recaptcha");
    const hasPlayability = html.includes("playabilityStatus");
    const hasCaptionTracks = html.includes("captionTracks");
    const hasYtInitial = html.includes("ytInitialPlayerResponse");
    results.html_scrape = { status: resp.status, htmlLength: html.length, hasRecaptcha, hasPlayability, hasCaptionTracks, hasYtInitial, titleSnippet: html.match(/<title>(.*?)<\/title>/)?.[1]?.substring(0, 80) };
  } catch (e) {
    results.html_scrape = { error: e instanceof Error ? e.message : "unknown" };
  }

  // Test 3: timedtext API
  try {
    const resp = await fetch(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    const text = await resp.text();
    results.timedtext = { status: resp.status, bodyLength: text.length, hasTextTag: text.includes("<text") };
  } catch (e) {
    results.timedtext = { error: e instanceof Error ? e.message : "unknown" };
  }

  return Response.json(results, { status: 200 });
}
