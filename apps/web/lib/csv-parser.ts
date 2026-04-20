export interface CsvRow {
  [key: string]: string;
}

export function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const lines = text.trim().split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row: CsvRow = {};
    headers.forEach((h, j) => { row[h] = values[j] ?? ""; });
    rows.push(row);
  }
  return { headers, rows };
}

export function generateCsvTemplate(role: string): string {
  const templates: Record<string, string[]> = {
    student: ["full_name", "email", "roll_number", "class", "section"],
    teacher: ["full_name", "email"],
    parent: ["full_name", "email", "student_email"],
  };
  return (templates[role] ?? ["full_name", "email"]).join(",") + "\n";
}

export function validateRow(row: CsvRow, role: string): { valid: boolean; error?: string } {
  if (!row.full_name?.trim()) return { valid: false, error: "Missing full_name" };
  if (!row.email?.trim()) return { valid: false, error: "Missing email" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) return { valid: false, error: "Invalid email format" };
  return { valid: true };
}
