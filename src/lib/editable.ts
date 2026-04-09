// Detect when a query result maps cleanly back to a single base table, so the
// UI can offer inline cell editing. We deliberately keep this conservative —
// anything we can't statically prove is a single-table SELECT is treated as
// non-editable.

import type { ColumnInfo, TableInfo } from "./api";

export type EditableInfo = {
  table: TableInfo;
  /** PK columns (from schema) and their index in the result columns array. */
  pkColumns: { column: ColumnInfo; resultIndex: number }[];
  /** Map result-column index → ColumnInfo for non-PK editable columns. */
  columnByIndex: Map<number, ColumnInfo>;
};

/**
 * Returns editable info if `sql` is a simple `SELECT ... FROM <table>` against
 * a single base table whose PK columns are all present in `resultColumns`.
 */
export function detectEditable(
  sql: string,
  resultColumns: string[],
  tables: TableInfo[]
): EditableInfo | null {
  const normalized = sql
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!/^select\b/i.test(normalized)) return null;
  if (/\bjoin\b/i.test(normalized)) return null;
  if (/\bunion\b/i.test(normalized)) return null;

  const fromMatch = normalized.match(/\bfrom\s+`?([A-Za-z_][\w$]*)`?/i);
  if (!fromMatch) return null;

  // Make sure the FROM clause has only one table (no commas before WHERE/etc).
  const fromIdx = normalized.toLowerCase().search(/\bfrom\b/);
  const afterFrom = normalized.slice(fromIdx + 4);
  const stop = afterFrom.search(/\b(where|group|order|limit|having)\b/i);
  const fromClause = stop === -1 ? afterFrom : afterFrom.slice(0, stop);
  if (fromClause.includes(",")) return null;

  const tableName = fromMatch[1];
  const table = tables.find((t) => t.name === tableName && t.type === "table");
  if (!table) return null;

  const pkSchema = table.columns.filter((c) => c.pk);
  if (pkSchema.length === 0) return null;

  const pkColumns: EditableInfo["pkColumns"] = [];
  for (const pk of pkSchema) {
    const idx = resultColumns.indexOf(pk.name);
    if (idx === -1) return null; // PK not selected → can't build WHERE clause
    pkColumns.push({ column: pk, resultIndex: idx });
  }

  const columnByIndex = new Map<number, ColumnInfo>();
  resultColumns.forEach((name, idx) => {
    const col = table.columns.find((c) => c.name === name);
    if (col && !col.pk) columnByIndex.set(idx, col);
  });

  return { table, pkColumns, columnByIndex };
}
