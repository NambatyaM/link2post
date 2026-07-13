import { NextRequest } from "next/server";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function testInnerTube(clientName: string, clientVersion: string, extraContext: Record<string, unknown> = {}) {
  try {
    const resp = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({
        context: { client: { clientName, clientVersion, hl: "en", gl: "US", ...extraContext } },
        videoId: "O8_isifBeKk",
      }),
    });
    const data = await resp.json();
    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    return { status: resp.status, hasTracks: Array.isArray(tracks), trackCount: tracks?.length ?? 0, langs: tracks?.map((t: { languageCode: string }) => t.languageCode) ?? [] };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknown" };
  }
}

export async function POST(_req: NextRequest) {
  const results: Record<string, unknown> = {};

  // Test different InnerTube client types
  results.web = await testInnerTube("WEB", "2.20241126.01.00");
  results.android = await testInnerTube("ANDROID", "20.10.38");
  results.ios = await testInnerTube("IOS", "19.29.1");
  results.mweb = await testInnerTube("MWEB", "2.20241126.01.00");
  results.tv_embedded = await testInnerTube("TVHTML5_SIMPLY_EMBEDDED_PLAYER", "2.0");
  results.tv = await testInnerTube("TVHTML5", "7.20241016.16.00");

  // Test HTML with various cookies
  try {
    const resp = await fetch("https://www.youtube.com/watch?v=O8_isifBeKk", {
      headers: {
        "User-Agent": UA,
        "Accept-Language": "en-US,en;q=0.9",
        "Cookie": "SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjMwODI5LjA3X3AxGgJlbiACGgYIgJnPpwY",
      },
    });
    const html = await resp.text();
    const hasCaptionTracks = html.includes("captionTracks");
    const hasRecaptcha = html.includes("g-recaptcha");
    const title = html.match(/<title>(.*?)<\/title>/)?.[1]?.substring(0, 80);
    const trackCount = (html.match(/"captionTracks"/g) || []).length;
    results.html_with_cookie = { status: resp.status, htmlLen: html.length, hasCaptionTracks, trackCount, hasRecaptcha, title };
  } catch (e) {
    results.html_with_cookie = { error: e instanceof Error ? e.message : "unknown" };
  }

  // Test HTML embed page (might bypass consent)
  try {
    const resp = await fetch("https://www.youtube.com/embed/O8_isifBeKk", {
      headers: { "User-Agent": UA },
    });
    const html = await resp.text();
    const hasCaptionTracks = html.includes("captionTracks");
    results.embed_page = { status: resp.status, htmlLen: html.length, hasCaptionTracks };
  } catch (e) {
    results.embed_page = { error: e instanceof Error ? e.message : "unknown" };
  }

  return Response.json(results);
}
