"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Project, LinkedInPost } from "@/lib/types";
import {
  exportToTxt,
  exportToMarkdown,
  exportToCsv,
  downloadFile,
} from "@/lib/export";

interface ExportToolbarProps {
  project: Project;
  posts: LinkedInPost[];
}

type ExportFormat = "txt" | "md" | "csv" | "pdf" | "docx" | "xlsx" | "zip";

const EXPORT_OPTIONS: { format: ExportFormat; label: string; ext: string; mime: string }[] = [
  { format: "txt", label: "TXT", ext: ".txt", mime: "text/plain" },
  { format: "md", label: "Markdown", ext: ".md", mime: "text/markdown" },
  { format: "csv", label: "CSV", ext: ".csv", mime: "text/csv" },
  { format: "pdf", label: "PDF", ext: ".pdf", mime: "application/pdf" },
  { format: "docx", label: "Word", ext: ".docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  { format: "xlsx", label: "Excel", ext: ".xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  { format: "zip", label: "ZIP (All)", ext: ".zip", mime: "application/zip" },
];

export default function ExportToolbar({ project, posts }: ExportToolbarProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      setOpen(false);

      const result = { posts, articles: [], calendar: [] };
      const title = project.title.replace(/[^a-zA-Z0-9-_ ]/g, "").trim() || "export";

      switch (format) {
        case "txt":
          downloadFile(exportToTxt(result), `${title}.txt`, "text/plain");
          break;
        case "md":
          downloadFile(exportToMarkdown(result), `${title}.md`, "text/markdown");
          break;
        case "csv":
          downloadFile(exportToCsv(result), `${title}.csv`, "text/csv");
          break;
        case "pdf": {
          const { default: jsPDF } = await import("jspdf");
          const doc = new jsPDF();
          doc.setFontSize(18);
          doc.text(title, 20, 20);
          let y = 35;
          posts.forEach((post, i) => {
            if (y > 260) { doc.addPage(); y = 20; }
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text(`Post ${i + 1}`, 20, y);
            y += 7;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            if (post.hook) {
              const hookLines = doc.splitTextToSize(`Hook: ${post.hook}`, 170);
              doc.text(hookLines, 20, y);
              y += hookLines.length * 5 + 2;
            }
            const bodyLines = doc.splitTextToSize(post.body, 170);
            bodyLines.forEach((line: string) => {
              if (y > 275) { doc.addPage(); y = 20; }
              doc.text(line, 20, y);
              y += 5;
            });
            y += 8;
          });
          doc.save(`${title}.pdf`);
          break;
        }
        case "docx": {
          const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");
          const children = posts.flatMap((post, i) => [
            new Paragraph({
              children: [new TextRun({ text: `Post ${i + 1}`, bold: true, size: 28 })],
              spacing: { after: 200 },
            }),
            ...(post.hook
              ? [new Paragraph({
                  children: [new TextRun({ text: `Hook: ${post.hook}`, bold: true, size: 22 })],
                  spacing: { after: 100 },
                })]
              : []),
            new Paragraph({
              children: [new TextRun({ text: post.body, size: 22 })],
              spacing: { after: 300 },
            }),
          ]);
          const doc = new Document({
            sections: [{ children }],
          });
          const blob = await Packer.toBlob(doc);
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${title}.docx`;
          a.click();
          URL.revokeObjectURL(url);
          break;
        }
        case "xlsx": {
          const ExcelJS = await import("exceljs");
          const wb = new ExcelJS.default.Workbook();
          const ws = wb.addWorksheet("Posts");
          ws.columns = [
            { header: "#", key: "num", width: 5 },
            { header: "Hook", key: "hook", width: 40 },
            { header: "Body", key: "body", width: 60 },
            { header: "Virality", key: "virality", width: 10 },
            { header: "Image Prompt", key: "imagePrompt", width: 40 },
          ];
          posts.forEach((post, i) => {
            ws.addRow({ num: i + 1, hook: post.hook, body: post.body, virality: post.viralityScore ?? "", imagePrompt: post.imagePrompt });
          });
          const buf = await wb.xlsx.writeBuffer();
          const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${title}.xlsx`;
          a.click();
          URL.revokeObjectURL(url);
          break;
        }
        case "zip": {
          const JSZip = (await import("jszip")).default;
          const zip = new JSZip();
          zip.file("posts.txt", exportToTxt(result));
          zip.file("posts.md", exportToMarkdown(result));
          zip.file("posts.csv", exportToCsv(result));
          const blob = await zip.generateAsync({ type: "blob" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${title}.zip`;
          a.click();
          URL.revokeObjectURL(url);
          break;
        }
      }
    },
    [project.title, posts]
  );

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        className="btn-secondary"
        style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Export
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: "4px",
            minWidth: "160px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "4px",
            zIndex: 50,
            boxShadow: "var(--shadow-md)",
          }}
        >
          {EXPORT_OPTIONS.map((opt) => (
            <button
              key={opt.format}
              onClick={() => handleExport(opt.format)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--text-secondary)",
                background: "transparent",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-hover)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
