export function parseLinkedInCSV(csvText: string): string {
  const lines = csvText.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return csvText;

  const header = lines[0];
  const columns = header.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));

  const textColIndices: number[] = [];
  const candidateNames = [
    "postcontent",
    "text",
    "content",
    "body",
    "description",
    "message",
    "post text",
    "commentary",
  ];
  for (let i = 0; i < columns.length; i++) {
    const normalized = columns[i].toLowerCase().replace(/[\s_-]/g, "");
    if (candidateNames.some((name) => normalized.includes(name))) {
      textColIndices.push(i);
    }
  }

  if (textColIndices.length === 0) {
    textColIndices.push(0);
  }

  const posts: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const textParts = textColIndices
      .map((idx) => values[idx]?.trim())
      .filter(Boolean);
    if (textParts.length > 0) {
      posts.push(textParts.join(" "));
    }
  }

  return posts.join("\n\n---\n\n");
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        values.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  values.push(current);
  return values;
}
