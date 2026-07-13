import { NextRequest } from "next/server";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const VIDEO_ID = "O8_isifBeKk";

function buildTranscriptParams(videoId: string): string {
  // Protobuf field 1: video_id (string) with tag 0x0a
  const vidField = Buffer.concat([
    Buffer.from([0x0a, videoId.length]),
    Buffer.from(videoId, "ascii"),
  ]);
  // Protobuf field 2: nested transcript params (message) with tag 0x12
  const innerParams = Buffer.from([
    0x0a, 0x03, 0x61, 0x73, 0x72, // field 1: "asr"
    0x12, 0x02, 0x65, 0x6e,       // field 2: "en"
    0x1a, 0x05, 0x65, 0x6e, 0x2d, 0x55, 0x53, // field 3: "en-US"
    0x20, 0x01,                    // field 4: varint 1
  ]);
  const field2 = Buffer.concat([
    Buffer.from([0x12, innerParams.length]),
    innerParams,
  ]);
  const outerParams = Buffer.concat([vidField, field2]);
  const outerField = Buffer.concat([
    Buffer.from([0x0a, outerParams.length]),
    outerParams,
    Buffer.from([0x10, 0x01]), // field 2 (varint): 1
  ]);
  return outerField.toString("base64");
}

export async function POST(_req: NextRequest) {
  const results: Record<string, unknown> = {};

  // Test 1: get_transcript with fixed protobuf
  try {
    const params = buildTranscriptParams(VIDEO_ID);
    const resp = await fetch("https://www.youtube.com/youtubei/v1/get_transcript?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({
        context: { client: { clientName: "WEB", clientVersion: "2.20241126.01.00", hl: "en", gl: "US" } },
        params,
      }),
    });
    const data = await resp.json();
    // Navigate the response structure
    const panel = data?.actions?.[0]?.updateEngagementPanelAction?.content;
    const transcript = panel?.transcriptRenderer?.content?.transcriptSearchPanelRenderer;
    const segments = transcript?.body?.transcriptSegmentListRenderer?.initialSegments;
    const bodyStr = JSON.stringify(data).substring(0, 500);
    results.get_transcript = {
      status: resp.status,
      hasActions: !!data?.actions,
      panelKeys: panel ? Object.keys(panel) : [],
      hasSegments: Array.isArray(segments),
      segmentCount: segments?.length ?? 0,
      firstSegment: segments?.[0]?.transcriptSegmentRenderer?.snippet?.runs?.map((r: { text: string }) => r.text).join(""),
      raw: bodyStr,
    };
  } catch (e) {
    results.get_transcript = { error: e instanceof Error ? e.message : "unknown" };
  }

  // Test 2: Decode embed page's embedded_player_response
  try {
    const resp = await fetch(`https://www.youtube.com/embed/${VIDEO_ID}`, {
      headers: { "User-Agent": UA },
    });
    const html = await resp.text();

    // Find embedded_player_response and decode it
    const eprMatch = html.match(/"embedded_player_response"\s*:\s*"([^"]+)"/);
    if (eprMatch) {
      const encoded = eprMatch[1].replace(/\\x([0-9a-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
      const decoded = Buffer.from(encoded, "base64").toString("latin1");
      // Search for timedtext URLs in the decoded binary
      const timedtextMatches = [...decoded.matchAll(/https?:\/\/www\.youtube\.com\/api\/timedtext[^"'\s\x00-\x1f]*/g)];
      const captionMatches = [...decoded.matchAll(/captionTrack/gi)];
      // Also search for language codes near timedtext
      results.embed_decode = {
        eprLen: encoded.length,
        decodedLen: decoded.length,
        timedtextUrls: timedtextMatches.map(m => m[0].substring(0, 200)),
        captionTrackOccurrences: captionMatches.length,
        hasAsr: decoded.includes("asr"),
      };
    } else {
      results.embed_decode = { error: "No embedded_player_response found" };
    }
  } catch (e) {
    results.embed_decode = { error: e instanceof Error ? e.message : "unknown" };
  }

  // Test 3: Try getting transcript via YouTube's timedtext list endpoint
  try {
    const resp = await fetch(`https://www.youtube.com/api/timedtext?type=list&v=${VIDEO_ID}`, {
      headers: { "User-Agent": UA },
    });
    const text = await resp.text();
    results.timedtext_list = {
      status: resp.status,
      bodyLen: text.length,
      preview: text.substring(0, 300),
      hasTranscript: text.includes("transcript"),
    };
  } catch (e) {
    results.timedtext_list = { error: e instanceof Error ? e.message : "unknown" };
  }

  return Response.json(results);
}
