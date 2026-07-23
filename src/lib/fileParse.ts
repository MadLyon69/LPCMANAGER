import Papa from "papaparse";
import * as XLSX from "xlsx";

export type ParsedTable = {
  headers: string[];
  rows: string[][];
};

export async function parseTabularFile(file: File): Promise<ParsedTable> {
  const isCsv = /\.csv$/i.test(file.name) || file.type === "text/csv";

  if (isCsv) {
    const text = await file.text();
    const result = Papa.parse<string[]>(text, { skipEmptyLines: true });
    const rows = result.data as string[][];
    const [headers, ...body] = rows;
    return { headers: headers ?? [], rows: body };
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
  });
  const [headers, ...body] = rows as string[][];
  return { headers: headers ?? [], rows: body };
}
