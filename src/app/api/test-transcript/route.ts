import { NextRequest } from "next/server";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const VIDEO_ID = "O8_isifBeKk";

export async function POST(_req: NextRequest) {
  const results: Record<string, unknown> = {};

  // Test 1: Embed page — YouTube's embed player loads player response inside JS
  try {
    const resp = await fetch(`https://www.youtube.com/embed/${VIDEO_ID}`, {
      headers: { "User-Agent": UA },
    });
    const html = await resp.text();
    // Look for captionTracks in any form
    const hasCaptionTracks = html.includes("captionTracks");
    const hasTimedtext = html.includes("timedtext");
    const hasPlayerResponse = html.includes("PLAYER_VARS") || html.includes("ytcfg.set");
    // Extract any timedtext URLs
    const timedtextUrls = [...html.matchAll(/timedtext[^"'\s]*/g)].map(m => m[0]).slice(0, 3);
    // Try to find embedded player config
    const configMatch = html.match(/"PLAYER_VARS"\s*:\s*({[^}]+})/);
    // Check for embedded_player_response
    const eprMatch = html.match(/"embedded_player_response"\s*:\s*"([^"]+)"/);
    results.embed = {
      status: resp.status,
      htmlLen: html.length,
      hasCaptionTracks,
      hasTimedtext,
      hasPlayerResponse,
      timedtextUrls,
      hasEpr: !!eprMatch,
    };
  } catch (e) {
    results.embed = { error: e instanceof Error ? e.message : "unknown" };
  }

  // Test 2: YouTube web_creator InnerTube endpoint (YouTube Studio uses this)
  try {
    const resp = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({
        context: { client: { clientName: "WEB_CREATOR", clientVersion: "1.20241120.01.00", hl: "en", gl: "US" } },
        videoId: VIDEO_ID,
      }),
    });
    const data = await resp.json();
    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    results.web_creator = {
      status: resp.status,
      hasTracks: Array.isArray(tracks),
      trackCount: tracks?.length ?? 0,
      langs: tracks?.map((t: { languageCode: string }) => t.languageCode) ?? [],
    };
  } catch (e) {
    results.web_creator = { error: e instanceof Error ? e.message : "unknown" };
  }

  // Test 3: Try with key parameter (some InnerTube endpoints need an API key)
  try {
    const resp = await fetch(`https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8&prettyPrint=false`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({
        context: { client: { clientName: "WEB", clientVersion: "2.20241126.01.00", hl: "en", gl: "US" } },
        videoId: VIDEO_ID,
      }),
    });
    const data = await resp.json();
    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    results.web_with_key = {
      status: resp.status,
      hasTracks: Array.isArray(tracks),
      trackCount: tracks?.length ?? 0,
      langs: tracks?.map((t: { languageCode: string }) => t.languageCode) ?? [],
    };
  } catch (e) {
    results.web_with_key = { error: e instanceof Error ? e.message : "unknown" };
  }

  // Test 4: Try fetching from noembed.com (proxy)
  try {
    const resp = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${VIDEO_ID}`);
    const data = await resp.json();
    results.noembed = { status: resp.status, title: data.title, hasError: !!data.error };
  } catch (e) {
    results.noembed = { error: e instanceof Error ? e.message : "unknown" };
  }

  // Test 5: Try YouTube transcript via get_transcript with proper protobuf
  try {
    // Build the protobuf params correctly
    // Field 1 (video ID): \x0a\x0b + videoId (11 bytes)
    // Field 2 (transcript params): \x12\x12 + \x0a\x03asr\x12\x02en\x1a\x05en-US\x20\x01
    const videoIdField = Buffer.from([0x0a, 0x0b, ...Buffer.from(VIDEO_ID)]);
    const transcriptParams = Buffer.from([0x12, 0x12, 0x0a, 0x03, 0x61, 0x73, 0x72, 0x12, 0x02, 0x65, 0x6e, 0x1a, 0x05, 0x65, 0x6e, 0x2d, 0x55, 0x53, 0x20, 0x01]);
    const wrapper = Buffer.concat([Buffer.from([0x0a]), Buffer.from([videoIdField.length]), videoIdField, Buffer.from([0x12]), Buffer.from([transcriptParams.length]), transcriptParams]);
    const params = wrapper.toString("base64");

    const resp = await fetch("https://www.youtube.com/youtubei/v1/get_transcript?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({
        context: { client: { clientName: "WEB", clientVersion: "2.20241126.01.00", hl: "en", gl: "US" } },
        params,
      }),
    });
    const data = await resp.json();
    const segments = data?.actions?.[0]?.updateEngagementPanelAction?.content?.transcriptRenderer?.content?.transcriptSearchPanelRenderer?.body?.transcriptSegmentListRenderer?.initialSegments;
    results.get_transcript = {
      status: resp.status,
      hasSegments: Array.isArray(segments),
      segmentCount: segments?.length ?? 0,
      firstSegment: segments?.[0]?.transcriptSegmentRenderer?.snippet?.runs?.map((r: { text: string }) => r.text).join("")?.substring(0, 100),
    };
  } catch (e) {
    results.get_transcript = { error: e instanceof Error ? e.message : "unknown" };
  }

  return Response.json(results);
}
