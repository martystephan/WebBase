import express, { type Request, type Response } from "express";
import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const PORT = Number(process.env.PORT ?? 5174);
const HOST = process.env.HOST ?? "127.0.0.1";

const app = express();
app.use(express.json({ limit: "1mb" }));

// ─── Pool cache, keyed by mysql:// URL ──────────────────────────────────────
// Pools are kept alive across requests so MySQL handshakes only happen once.
const pools = new Map<string, Pool>();

function getPool(url: string): Pool {
  let pool = pools.get(url);
  if (!pool) {
    pool = mysql.createPool({
      uri: url,
      connectionLimit: 4,
      waitForConnections: true,
      dateStrings: true,
    });
    pools.set(url, pool);
  }
  return pool;
}

async function closePool(url: string): Promise<void> {
  const pool = pools.get(url);
  if (pool) {
    pools.delete(url);
    await pool.end().catch(() => {});
  }
}

function databaseFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const db = u.pathname.replace(/^\//, "");
    return db || null;
  } catch {
    return null;
  }
}

function errorResponse(res: Response, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  res.status(400).json({ error: message });
}

// ─── Routes ─────────────────────────────────────────────────────────────────

app.post("/api/test", async (req: Request, res: Response) => {
  const { url } = req.body ?? {};
  if (typeof url !== "string") return errorResponse(res, "url required");
  try {
    const pool = getPool(url);
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    res.json({ ok: true });
  } catch (err) {
    await closePool(url);
    errorResponse(res, err);
  }
});

app.post("/api/schema", async (req: Request, res: Response) => {
  const { url } = req.body ?? {};
  if (typeof url !== "string") return errorResponse(res, "url required");
  const dbName = databaseFromUrl(url);
  if (!dbName)
    return errorResponse(res, "URL must include a database name (mysql://.../db_name)");

  try {
    const pool = getPool(url);

    const [tablesRows] = await pool.query<RowDataPacket[]>(
      `SELECT table_name AS name, table_type AS type, table_rows AS approxRows
         FROM information_schema.tables
        WHERE table_schema = ?
        ORDER BY table_name`,
      [dbName]
    );

    const [colRows] = await pool.query<RowDataPacket[]>(
      `SELECT table_name   AS tableName,
              column_name  AS name,
              column_type  AS type,
              column_key   AS columnKey,
              is_nullable  AS isNullable,
              ordinal_position AS pos
         FROM information_schema.columns
        WHERE table_schema = ?
        ORDER BY table_name, ordinal_position`,
      [dbName]
    );

    const columnsByTable = new Map<
      string,
      { name: string; type: string; pk: boolean; nullable: boolean }[]
    >();
    for (const r of colRows) {
      const t = r.tableName as string;
      if (!columnsByTable.has(t)) columnsByTable.set(t, []);
      columnsByTable.get(t)!.push({
        name: r.name as string,
        type: r.type as string,
        pk: r.columnKey === "PRI",
        nullable: r.isNullable === "YES",
      });
    }

    const tables = tablesRows.map((t) => ({
      name: t.name as string,
      type: (t.type as string) === "VIEW" ? "view" : "table",
      approxRows: t.approxRows == null ? null : Number(t.approxRows),
      columns: columnsByTable.get(t.name as string) ?? [],
    }));

    res.json({ database: dbName, tables });
  } catch (err) {
    errorResponse(res, err);
  }
});

app.post("/api/query", async (req: Request, res: Response) => {
  const { url, sql, params } = req.body ?? {};
  if (typeof url !== "string") return errorResponse(res, "url required");
  if (typeof sql !== "string" || !sql.trim())
    return errorResponse(res, "sql required");

  try {
    const pool = getPool(url);
    const start = performance.now();
    // rowsAsArray keeps duplicate column names (e.g. JOINs with two `id` cols)
    // distinguishable; we ship column order separately.
    // multipleStatements is OFF by default — keeps things simple and safer.
    const [result, fields] = await pool.query({
      sql,
      rowsAsArray: true,
      values: Array.isArray(params) ? params : undefined,
    });
    const elapsedMs = performance.now() - start;

    if (Array.isArray(result)) {
      // SELECT-style result. With rowsAsArray:true, rows are number-indexed arrays.
      const columns = (fields ?? []).map((f) => f.name);
      res.json({
        kind: "rows",
        columns,
        rows: result as unknown[][],
        elapsedMs,
      });
    } else {
      // INSERT/UPDATE/DELETE/DDL — return affectedRows.
      res.json({
        kind: "exec",
        affectedRows: (result as { affectedRows?: number }).affectedRows ?? 0,
        insertId: (result as { insertId?: number }).insertId ?? null,
        elapsedMs,
      });
    }
  } catch (err) {
    errorResponse(res, err);
  }
});

app.delete("/api/pool", async (req: Request, res: Response) => {
  const { url } = req.body ?? {};
  if (typeof url !== "string") return errorResponse(res, "url required");
  await closePool(url);
  res.json({ ok: true });
});

// ─── Static hosting (for production single-process deployment) ──────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "..", "dist");
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(PORT, HOST, () => {
  console.log(`WebBase server listening on http://${HOST}:${PORT}`);
});

// Clean shutdown — close all pools so the process exits promptly.
async function shutdown() {
  await Promise.all([...pools.values()].map((p) => p.end().catch(() => {})));
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
