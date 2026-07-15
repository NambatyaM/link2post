import type { LinkedInResult } from "@/lib/types";

export function exportToTxt(result: LinkedInResult): string {
  const lines: string[] = [];

  if (result.posts.length > 0) {
    lines.push("=== LINKEDIN POSTS ===", "");
    result.posts.forEach((post, i) => {
      lines.push(`--- Post ${i + 1} ---`, "");
      lines.push("HOOK:", post.hook, "");
      lines.push("BODY:", post.body, "");
      lines.push("IMAGE PROMPT:", post.imagePrompt, "");
      if (post.viralityScore != null) lines.push(`Virality: ${post.viralityScore}`);
      if (post.authorityScore != null) lines.push(`Authority: ${post.authorityScore}`);
      if (post.commentPotential != null) lines.push(`Comment Potential: ${post.commentPotential}`);
      if (post.readabilityScore != null) lines.push(`Readability: ${post.readabilityScore}`);
      lines.push("", "---", "");
    });
  }

  if (result.articles.length > 0) {
    lines.push("=== LINKEDIN ARTICLES ===", "");
    result.articles.forEach((article, i) => {
      lines.push(`--- Article ${i + 1} ---`, "");
      lines.push("TITLE:", article.title, "");
      lines.push("BODY:", article.body, "");
      lines.push("IMAGE PROMPTS:");
      article.imagePrompts.forEach((p, j) => {
        lines.push(`  [Image ${j + 1}]: ${p}`);
      });
      lines.push("", "---", "");
    });
  }

  if (result.calendar.length > 0) {
    lines.push("=== CONTENT CALENDAR ===", "");
    result.calendar.forEach((entry) => {
      lines.push(
        `${entry.day} (${entry.date}) — ${entry.type.toUpperCase()}: ${entry.title}`,
        `  Scheduled: ${entry.recommendedTime}`,
        `  Note: ${entry.note}`,
        "",
      );
    });
  }

  return lines.join("\n");
}

export function exportToMarkdown(result: LinkedInResult): string {
  const lines: string[] = [];

  if (result.posts.length > 0) {
    lines.push("# LinkedIn Posts", "");
    result.posts.forEach((post, i) => {
      lines.push(`## Post ${i + 1}`, "");
      lines.push(`**Hook:** ${post.hook}`, "");
      lines.push(post.body, "");
      lines.push(`> **Image Prompt:** ${post.imagePrompt}`, "");
      if (post.viralityScore != null || post.authorityScore != null) {
        lines.push(
          `*Scores — Virality: ${post.viralityScore ?? "N/A"} | Authority: ${post.authorityScore ?? "N/A"} | Comments: ${post.commentPotential ?? "N/A"} | Readability: ${post.readabilityScore ?? "N/A"}*`,
          "",
        );
      }
      lines.push("---", "");
    });
  }

  if (result.articles.length > 0) {
    lines.push("# LinkedIn Articles", "");
    result.articles.forEach((article) => {
      lines.push(`## ${article.title}`, "");
      lines.push(article.body, "");
      lines.push("### Image Prompts", "");
      article.imagePrompts.forEach((p, j) => {
        lines.push(`> **[${j + 1}]** ${p}`, "");
      });
      lines.push("---", "");
    });
  }

  if (result.calendar.length > 0) {
    lines.push("# Content Calendar", "");
    lines.push("| Day | Date | Type | Title | Time | Note |", "| --- | --- | --- | --- | --- | --- |");
    result.calendar.forEach((e) => {
      lines.push(`| ${e.day} | ${e.date} | ${e.type} | ${e.title} | ${e.recommendedTime} | ${e.note} |`);
    });
    lines.push("");
  }

  return lines.join("\n");
}

export function exportToCsv(result: LinkedInResult): string {
  const escape = (val: string) => {
    const s = val.replace(/"/g, '""');
    return s.includes(",") || s.includes("\n") || s.includes('"') ? `"${s}"` : s;
  };

  const rows: string[] = ["Date,Time,Type,Title,Body,Image Prompt"];

  result.calendar.forEach((entry) => {
    let body = "";
    let imagePrompt = "";

    if (entry.type === "post" && result.posts[entry.contentIndex]) {
      const post = result.posts[entry.contentIndex];
      body = post.hook + "\n\n" + post.body;
      imagePrompt = post.imagePrompt;
    } else if (entry.type === "article" && result.articles[entry.contentIndex]) {
      const article = result.articles[entry.contentIndex];
      body = article.title + "\n\n" + article.body;
      imagePrompt = article.imagePrompts.join(" | ");
    }

    rows.push(
      [entry.date, entry.recommendedTime, entry.type, escape(entry.title), escape(body), escape(imagePrompt)].join(","),
    );
  });

  return rows.join("\n");
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
