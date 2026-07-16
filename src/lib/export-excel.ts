import type { LinkedInResult } from "@/lib/types";
import ExcelJS from "exceljs";

function autoWidth(sheet: ExcelJS.Worksheet) {
  sheet.columns.forEach((col) => {
    if (!col || !col.eachCell) return;
    let maxLen = 10;
    col.eachCell({ includeEmpty: false }, (cell) => {
      const val = cell.value?.toString() ?? "";
      if (val.length > maxLen) maxLen = val.length;
    });
    col.width = Math.min(maxLen + 4, 60);
  });
}

function styleHeaders(sheet: ExcelJS.Worksheet) {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1a1a2e" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 24;

  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: "thin" as const, color: { argb: "FF1a1a2e" } },
      bottom: { style: "thin" as const, color: { argb: "FF1a1a2e" } },
      left: { style: "thin" as const, color: { argb: "FF1a1a2e" } },
      right: { style: "thin" as const, color: { argb: "FF1a1a2e" } },
    };
  });
}

function addDataBorders(sheet: ExcelJS.Worksheet) {
  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" as const, color: { argb: "FFcccccc" } },
        bottom: { style: "thin" as const, color: { argb: "FFcccccc" } },
        left: { style: "thin" as const, color: { argb: "FFcccccc" } },
        right: { style: "thin" as const, color: { argb: "FFcccccc" } },
      };
    });
  }
}

export async function exportToExcel(result: LinkedInResult): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "LinkedIn Content Repurposer";

  // Posts sheet
  const postsSheet = workbook.addWorksheet("Posts");
  postsSheet.columns = [
    { header: "Title", key: "title", width: 30 },
    { header: "Type", key: "type", width: 15 },
    { header: "Hooks", key: "hooks", width: 40 },
    { header: "Body", key: "body", width: 50 },
    { header: "Image Prompts", key: "imagePrompts", width: 40 },
    { header: "Virality Score", key: "viralityScore", width: 15 },
    { header: "Status", key: "status", width: 12 },
  ];

  result.posts.forEach((post, i) => {
    postsSheet.addRow({
      title: `Post ${i + 1}`,
      type: "post",
      hooks: post.hook,
      body: post.body,
      imagePrompts: post.imagePrompt,
      viralityScore: post.viralityScore ?? "",
      status: "draft",
    });
  });

  styleHeaders(postsSheet);
  addDataBorders(postsSheet);
  autoWidth(postsSheet);

  // Articles sheet
  const articlesSheet = workbook.addWorksheet("Articles");
  articlesSheet.columns = [
    { header: "Title", key: "title", width: 30 },
    { header: "Body", key: "body", width: 60 },
    { header: "Image Prompts", key: "imagePrompts", width: 40 },
  ];

  result.articles.forEach((article) => {
    articlesSheet.addRow({
      title: article.title,
      body: article.body,
      imagePrompts: article.imagePrompts.join("\n"),
    });
  });

  styleHeaders(articlesSheet);
  addDataBorders(articlesSheet);
  autoWidth(articlesSheet);

  // Calendar sheet
  const calendarSheet = workbook.addWorksheet("Calendar");
  calendarSheet.columns = [
    { header: "Date", key: "date", width: 15 },
    { header: "Type", key: "type", width: 12 },
    { header: "Title", key: "title", width: 30 },
    { header: "Content Index", key: "contentIndex", width: 15 },
    { header: "Recommended Time", key: "recommendedTime", width: 20 },
    { header: "Note", key: "note", width: 40 },
  ];

  result.calendar.forEach((entry) => {
    calendarSheet.addRow({
      date: entry.date,
      type: entry.type,
      title: entry.title,
      contentIndex: entry.contentIndex,
      recommendedTime: entry.recommendedTime,
      note: entry.note,
    });
  });

  styleHeaders(calendarSheet);
  addDataBorders(calendarSheet);
  autoWidth(calendarSheet);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export async function downloadExcel(result: LinkedInResult, filename?: string): Promise<void> {
  const blob = await exportToExcel(result);
  const name = filename ?? "linkedin-export";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
