// Thin wrapper around the local backend at /api/*.

export type ColumnInfo = {
  name: string;
  type: string;
  pk: boolean;
  nullable: boolean;
};

export type TableInfo = {
  name: string;
  type: "table" | "view";
  approxRows: number | null;
  columns: ColumnInfo[];
};

export type SchemaResponse = {
  database: string;
  tables: TableInfo[];
};

export type QueryRowsResult = {
  kind: "rows";
  columns: string[];
  rows: unknown[][];
  elapsedMs: number;
};

export type QueryExecResult = {
  kind: "exec";
  affectedRows: number;
  insertId: number | null;
  elapsedMs: number;
};

export type QueryResult = QueryRowsResult | QueryExecResult;

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error ?? `HTTP ${res.status}`);
  }
  return data as T;
}

export function testConnection(url: string): Promise<{ ok: true }> {
  return post("/api/test", { url });
}

export function fetchSchema(url: string): Promise<SchemaResponse> {
  return post("/api/schema", { url });
}

export function runQuery(
  url: string,
  sql: string,
  params?: unknown[]
): Promise<QueryResult> {
  return post("/api/query", { url, sql, params });
}

export async function closePool(url: string): Promise<void> {
  await fetch("/api/pool", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
}
