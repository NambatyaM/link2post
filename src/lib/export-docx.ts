import type { LinkedInResult } from "@/lib/types";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
} from "docx";

function buildPostParagraphs(post: { hook: string; body: string; imagePrompt: string; viralityScore?: number; authorityScore?: number }, index: number): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  elements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Post ${index + 1}`,
          bold: true,
          size: 28,
          color: "1a1a2e",
        }),
      ],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 150 },
    }),
  );

  elements.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Hook: ", bold: true, size: 22 }),
        new TextRun({ text: post.hook, size: 22 }),
      ],
      spacing: { after: 100 },
    }),
  );

  const bodyLines = post.body.split("\n");
  bodyLines.forEach((line) => {
    elements.push(
      new Paragraph({
        children: [new TextRun({ text: line, size: 22 })],
        spacing: { after: 60 },
      }),
    );
  });

  elements.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Image Prompt: ", bold: true, size: 22 }),
        new TextRun({ text: post.imagePrompt, italics: true, size: 20, color: "666666" }),
      ],
      spacing: { before: 100, after: 100 },
    }),
  );

  const scores: string[] = [];
  if (post.viralityScore != null) scores.push(`Virality: ${post.viralityScore}`);
  if (post.authorityScore != null) scores.push(`Authority: ${post.authorityScore}`);
  if (scores.length > 0) {
    elements.push(
      new Paragraph({
        children: [
          new TextRun({ text: scores.join("  |  "), size: 18, color: "0a66c2" }),
        ],
        spacing: { after: 150 },
      }),
    );
  }

  return elements;
}

function buildArticleParagraphs(article: { title: string; body: string; imagePrompts: string[] }, index: number): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  elements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Article ${index + 1}: ${article.title}`,
          bold: true,
          size: 28,
          color: "1a1a2e",
        }),
      ],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 150 },
    }),
  );

  const bodyLines = article.body.split("\n");
  bodyLines.forEach((line) => {
    elements.push(
      new Paragraph({
        children: [new TextRun({ text: line, size: 22 })],
        spacing: { after: 60 },
      }),
    );
  });

  if (article.imagePrompts.length > 0) {
    elements.push(
      new Paragraph({
        children: [new TextRun({ text: "Image Prompts", bold: true, size: 22 })],
        spacing: { before: 150, after: 100 },
      }),
    );
    article.imagePrompts.forEach((p, j) => {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({ text: `[${j + 1}] `, bold: true, size: 20 }),
            new TextRun({ text: p, italics: true, size: 20, color: "666666" }),
          ],
          spacing: { after: 60 },
        }),
      );
    });
  }

  return elements;
}

export async function exportToDocx(result: LinkedInResult): Promise<Blob> {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const children: (Paragraph | Table)[] = [];

  // Title page
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "LinkedIn Content Export",
          bold: true,
          size: 56,
          color: "1a1a2e",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 3000, after: 200 },
    }),
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: dateStr, size: 28, color: "555555" }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${result.posts.length} posts  |  ${result.articles.length} articles  |  ${result.calendar.length} calendar entries`,
          size: 24,
          color: "777777",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  );

  // Posts section
  if (result.posts.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "LINKEDIN POSTS",
            bold: true,
            size: 36,
            color: "0a66c2",
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
    );

    result.posts.forEach((post, i) => {
      children.push(...buildPostParagraphs(post, i));
    });
  }

  // Articles section
  if (result.articles.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "LINKEDIN ARTICLES",
            bold: true,
            size: 36,
            color: "0a66c2",
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
    );

    result.articles.forEach((article, i) => {
      children.push(...buildArticleParagraphs(article, i));
    });
  }

  // Calendar section
  if (result.calendar.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "CONTENT CALENDAR",
            bold: true,
            size: 36,
            color: "0a66c2",
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
    );

    const headerShading = { type: ShadingType.SOLID, color: "1a1a2e", fill: "1a1a2e" };
    const headerCellBorders = {
      top: { style: BorderStyle.SINGLE, size: 1, color: "1a1a2e" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "1a1a2e" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "1a1a2e" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "1a1a2e" },
    };
    const cellBorders = {
      top: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
    };

    const headerRow = new TableRow({
      children: ["Day", "Date", "Type", "Title", "Time", "Note"].map(
        (h) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: h, bold: true, size: 20, color: "ffffff" })],
              }),
            ],
            shading: headerShading,
            borders: headerCellBorders,
          }),
      ),
      tableHeader: true,
    });

    const dataRows = result.calendar.map(
      (e) =>
        new TableRow({
          children: [e.day, e.date, e.type, e.title, e.recommendedTime, e.note].map(
            (val) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: val, size: 20 })],
                  }),
                ],
                borders: cellBorders,
              }),
          ),
        }),
    );

    children.push(
      new Table({
        rows: [headerRow, ...dataRows],
        width: {
          size: 100,
          type: WidthType.PERCENTAGE,
        },
      }),
    );
  }

  const doc = new Document({
    sections: [{ children }],
  });

  return Packer.toBlob(doc);
}

export async function downloadDocx(result: LinkedInResult, filename?: string): Promise<void> {
  const blob = await exportToDocx(result);
  const name = filename ?? "linkedin-export";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
