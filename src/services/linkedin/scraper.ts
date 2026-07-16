export interface LinkedInPost {
  text: string;
  author?: string;
  date?: string;
  likes?: number;
  comments?: number;
}

export interface LinkedInProfile {
  url: string;
  displayName: string;
  headline: string;
  posts: LinkedInPost[];
  extractedAt: string;
}

function parseLinkedInUrl(url: string): { type: "profile" | "post"; id: string } | null {
  const profileMatch = url.match(/linkedin\.com\/in\/([^/?]+)/);
  if (profileMatch) return { type: "profile", id: profileMatch[1] };

  const postMatch = url.match(/linkedin\.com\/posts\/([^/?]+)/);
  if (postMatch) return { type: "post", id: postMatch[1] };

  return null;
}

async function fetchLinkedInPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    clearTimeout(timer);

    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

function extractPostFromHtml(html: string): { text: string; author?: string } | null {
  const ogDescMatch =
    html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i) ||
    html.match(/<meta\s+content="([^"]*)"\s+property="og:description"/i);

  const metaDescMatch =
    html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) ||
    html.match(/<meta\s+content="([^"]*)"\s+name="description"/i);

  const jsonLdMatch = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/i,
  );

  const description = ogDescMatch?.[1] || metaDescMatch?.[1] || "";

  if (jsonLdMatch) {
    try {
      const data = JSON.parse(jsonLdMatch[1]);
      if (data.articleBody)
        return { text: data.articleBody, author: data.author?.name };
      if (data.description)
        return { text: data.description, author: data.author?.name };
    } catch {
      /* ignore */
    }
  }

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    const text = bodyMatch[1]
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#\d+;/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (text.length > 100) {
      return { text: text.slice(0, 5000) };
    }
  }

  if (description) {
    return { text: description };
  }

  return null;
}

export async function scrapeLinkedInContent(
  url: string,
): Promise<LinkedInProfile> {
  const parsed = parseLinkedInUrl(url);
  if (!parsed) {
    throw new Error(
      "Invalid LinkedIn URL. Expected format: linkedin.com/in/username or linkedin.com/posts/...",
    );
  }

  const html = await fetchLinkedInPage(url);

  if (!html) {
    throw new Error(
      "LINKEDIN_FETCH_FAILED: Could not fetch LinkedIn page. LinkedIn often blocks automated access. Please paste your posts manually.",
    );
  }

  const extracted = extractPostFromHtml(html);

  if (!extracted || extracted.text.length < 50) {
    throw new Error(
      "LINKEDIN_NO_CONTENT: Could not extract post content from this LinkedIn URL. LinkedIn may have blocked the request. Please paste your posts manually for best results.",
    );
  }

  return {
    url,
    displayName: extracted.author || "LinkedIn User",
    headline: "",
    posts: [{ text: extracted.text }],
    extractedAt: new Date().toISOString(),
  };
}
