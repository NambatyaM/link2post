import type { LinkedInResult } from "@/lib/types";
import JSZip from "jszip";

export async function exportToZip(result: LinkedInResult): Promise<Blob> {
  const zip = new JSZip();

  // Posts folder
  const postsFolder = zip.folder("posts")!;
  result.posts.forEach((post, i) => {
    const lines: string[] = [];
    lines.push(`Post ${i + 1}`, "");
    lines.push("HOOK:", post.hook, "");
    lines.push("BODY:", post.body, "");
    lines.push("IMAGE PROMPT:", post.imagePrompt, "");
    if (post.viralityScore != null) lines.push(`Virality: ${post.viralityScore}`);
    if (post.authorityScore != null) lines.push(`Authority: ${post.authorityScore}`);
    if (post.commentPotential != null) lines.push(`Comment Potential: ${post.commentPotential}`);
    if (post.readabilityScore != null) lines.push(`Readability: ${post.readabilityScore}`);
    postsFolder.file(`post-${i + 1}.txt`, lines.join("\n"));
  });

  // Articles folder
  const articlesFolder = zip.folder("articles")!;
  result.articles.forEach((article, i) => {
    const lines: string[] = [];
    lines.push(`# ${article.title}`, "");
    lines.push(article.body, "");
    lines.push("## Image Prompts", "");
    article.imagePrompts.forEach((p, j) => {
      lines.push(`> **[${j + 1}]** ${p}`, "");
    });
    articlesFolder.file(`article-${i + 1}.md`, lines.join("\n"));
  });

  // Calendar JSON
  zip.file("calendar.json", JSON.stringify(result.calendar, null, 2));

  // CSV export
  const escape = (val: string) => {
    const s = val.replace(/"/g, '""');
    return s.includes(",") || s.includes("\n") || s.includes('"') ? `"${s}"` : s;
  };

  const csvRows: string[] = ["Date,Time,Type,Title,Body,Image Prompt"];
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

    csvRows.push(
      [entry.date, entry.recommendedTime, entry.type, escape(entry.title), escape(body), escape(imagePrompt)].join(","),
    );
  });
  zip.file("export.csv", csvRows.join("\n"));

  // README
  const readmeLines: string[] = [];
  readmeLines.push("# LinkedIn Content Export", "");
  readmeLines.push(`Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, "");
  readmeLines.push("## Summary", "");
  readmeLines.push(`- **Posts:** ${result.posts.length}`);
  readmeLines.push(`- **Articles:** ${result.articles.length}`);
  readmeLines.push(`- **Calendar entries:** ${result.calendar.length}`);
  readmeLines.push("", "## Contents", "");
  readmeLines.push("- `posts/` — Individual text files for each LinkedIn post");
  readmeLines.push("- `articles/` — Individual Markdown files for each LinkedIn article");
  readmeLines.push("- `calendar.json` — Full calendar data in JSON format");
  readmeLines.push("- `export.csv` — All content in CSV format");
  readmeLines.push("", "## Usage", "");
  readmeLines.push("Import the CSV into any spreadsheet tool, or use the individual files for scheduling.");
  zip.file("README.md", readmeLines.join("\n"));

  return zip.generateAsync({ type: "blob" });
}

export async function downloadZip(result: LinkedInResult, filename?: string): Promise<void> {
  const blob = await exportToZip(result);
  const name = filename ?? "linkedin-export";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
