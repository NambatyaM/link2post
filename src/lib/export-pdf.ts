import type { LinkedInResult } from "@/lib/types";
import pdfMake from "pdfmake/build/pdfmake";
import "pdfmake/build/vfs_fonts";

function buildPostSection(post: { hook: string; body: string; imagePrompt: string; viralityScore?: number; authorityScore?: number }, index: number) {
  const content: Record<string, unknown>[] = [];

  content.push({
    text: `Post ${index + 1}`,
    style: "sectionHeader",
    margin: [0, 20, 0, 10],
  });

  content.push({
    text: "Hook",
    style: "subHeader",
    margin: [0, 0, 0, 5],
  });
  content.push({
    text: post.hook,
    style: "bodyText",
    margin: [0, 0, 0, 10],
  });

  content.push({
    text: "Body",
    style: "subHeader",
    margin: [0, 0, 0, 5],
  });
  content.push({
    text: post.body,
    style: "bodyText",
    margin: [0, 0, 0, 10],
  });

  content.push({
    text: "Image Prompt",
    style: "subHeader",
    margin: [0, 0, 0, 5],
  });
  content.push({
    text: post.imagePrompt,
    style: "italicText",
    margin: [0, 0, 0, 10],
  });

  const scores: string[] = [];
  if (post.viralityScore != null) scores.push(`Virality: ${post.viralityScore}`);
  if (post.authorityScore != null) scores.push(`Authority: ${post.authorityScore}`);
  if (scores.length > 0) {
    content.push({
      text: scores.join("  |  "),
      style: "scoreText",
      margin: [0, 0, 0, 10],
    });
  }

  content.push({ text: "", margin: [0, 0, 0, 5] });

  return content;
}

function buildArticleSection(article: { title: string; body: string; imagePrompts: string[] }, index: number) {
  const content: Record<string, unknown>[] = [];

  content.push({
    text: `Article ${index + 1}: ${article.title}`,
    style: "sectionHeader",
    margin: [0, 20, 0, 10],
  });

  content.push({
    text: "Body",
    style: "subHeader",
    margin: [0, 0, 0, 5],
  });
  content.push({
    text: article.body,
    style: "bodyText",
    margin: [0, 0, 0, 10],
  });

  if (article.imagePrompts.length > 0) {
    content.push({
      text: "Image Prompts",
      style: "subHeader",
      margin: [0, 0, 0, 5],
    });
    article.imagePrompts.forEach((p, j) => {
      content.push({
        text: `[Image ${j + 1}]: ${p}`,
        style: "italicText",
        margin: [0, 0, 0, 5],
      });
    });
  }

  content.push({ text: "", margin: [0, 0, 0, 5] });

  return content;
}

export function exportToPdf(result: LinkedInResult): Record<string, unknown> {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const content: Record<string, unknown>[] = [];

  // Title page
  content.push({
    text: "LinkedIn Content Export",
    style: "title",
    alignment: "center",
    margin: [0, 100, 0, 20],
  });
  content.push({
    text: dateStr,
    style: "subtitle",
    alignment: "center",
    margin: [0, 0, 0, 10],
  });
  content.push({
    text: `${result.posts.length} posts  |  ${result.articles.length} articles  |  ${result.calendar.length} calendar entries`,
    style: "summaryText",
    alignment: "center",
    margin: [0, 20, 0, 0],
  });

  // Posts section
  if (result.posts.length > 0) {
    content.push({ text: "" });
    content.push({
      text: "LINKEDIN POSTS",
      style: "sectionTitle",
      margin: [0, 30, 0, 15],
    });
    result.posts.forEach((post, i) => {
      content.push(...buildPostSection(post, i));
    });
  }

  // Articles section
  if (result.articles.length > 0) {
    content.push({ text: "" });
    content.push({
      text: "LINKEDIN ARTICLES",
      style: "sectionTitle",
      margin: [0, 30, 0, 15],
    });
    result.articles.forEach((article, i) => {
      content.push(...buildArticleSection(article, i));
    });
  }

  const docDefinition = {
    content,
    defaultStyle: {
      fontSize: 11,
      lineHeight: 1.4,
    },
    styles: {
      title: {
        fontSize: 28,
        bold: true,
        color: "#1a1a2e",
      },
      subtitle: {
        fontSize: 16,
        color: "#555555",
      },
      summaryText: {
        fontSize: 12,
        color: "#777777",
      },
      sectionTitle: {
        fontSize: 20,
        bold: true,
        color: "#0a66c2",
      },
      sectionHeader: {
        fontSize: 15,
        bold: true,
        color: "#1a1a2e",
      },
      subHeader: {
        fontSize: 12,
        bold: true,
        color: "#333333",
      },
      bodyText: {
        fontSize: 11,
        color: "#222222",
      },
      italicText: {
        fontSize: 10,
        italics: true,
        color: "#666666",
      },
      scoreText: {
        fontSize: 10,
        color: "#0a66c2",
      },
    },
    pageMargins: [60, 60, 60, 60] as [number, number, number, number],
  };

  return docDefinition as Record<string, unknown>;
}

export function downloadPdf(result: LinkedInResult, filename?: string): void {
  const docDefinition = exportToPdf(result);
  const name = filename ?? "linkedin-export";
  pdfMake.createPdf(docDefinition).download(`${name}.pdf`);
}
