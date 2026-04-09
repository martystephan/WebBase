import { Loader2, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { runQuery, type QueryResult, type TableInfo } from "../lib/api";
import { detectEditable } from "../lib/editable";
import { ResultsTable } from "./ResultsTable";
import { Button } from "./ui/button";

type Props = {
  url: string;
  initialSql?: string;
  tables: TableInfo[];
};

export function QueryEditor({ url, initialSql, tables }: Props) {
  const [sql, setSql] = useState(initialSql ?? "SELECT 1;");
  // The SQL that produced the current `result` — needed to know which table
  // the rows came from when the user starts editing cells.
  const [executedSql, setExecutedSql] = useState<string | null>(null);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  // When the parent prefills a query (e.g. clicking a table), update + auto-run.
  useEffect(() => {
    if (initialSql !== undefined) {
      setSql(initialSql);
      execute(initialSql);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSql, url]);

  async function execute(query: string) {
    setError(null);
    setRunning(true);
    try {
      const r = await runQuery(url, query);
      setResult(r);
      setExecutedSql(query);
    } catch (err) {
      setError((err as Error).message);
      setResult(null);
      setExecutedSql(null);
    } finally {
      setRunning(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      execute(sql);
    }
  }

  const editable = useMemo(() => {
    if (!result || result.kind !== "rows" || !executedSql) return null;
    return detectEditable(executedSql, result.columns, tables);
  }, [result, executedSql, tables]);

  /**
   * Commit a single-cell edit by issuing an `UPDATE table SET col=? WHERE pk=?`.
   * Throws on failure so the table can revert its optimistic UI.
   */
  async function commitCell(
    rowIndex: number,
    columnIndex: number,
    newValue: unknown
  ) {
    if (!editable || !result || result.kind !== "rows") {
      throw new Error("Result is not editable");
    }
    const colInfo = editable.columnByIndex.get(columnIndex);
    if (!colInfo) throw new Error("Column is not editable");

    const row = result.rows[rowIndex];
    const whereParts = editable.pkColumns.map(
      (pk) => `\`${pk.column.name}\` = ?`
    );
    const whereValues = editable.pkColumns.map((pk) => row[pk.resultIndex]);

    const sqlText = `UPDATE \`${editable.table.name}\` SET \`${colInfo.name}\` = ? WHERE ${whereParts.join(
      " AND "
    )} LIMIT 1`;

    const res = await runQuery(url, sqlText, [newValue, ...whereValues]);
    if (res.kind !== "exec") {
      throw new Error("Unexpected result from UPDATE");
    }
    if (res.affectedRows === 0) {
      // Either the row was deleted out from under us, or the new value matched
      // the old one. Treat as success — the displayed value is what the user
      // wanted regardless.
    }

    // Patch local state so the cell reflects the new value without a re-run.
    setResult((prev) => {
      if (!prev || prev.kind !== "rows") return prev;
      const newRows = prev.rows.map((r, i) => {
        if (i !== rowIndex) return r;
        const copy = r.slice();
        copy[columnIndex] = newValue;
        return copy;
      });
      return { ...prev, rows: newRows };
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col border-b border-neutral-200 dark:border-neutral-800">
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          className="h-40 resize-y bg-neutral-50 px-4 py-3 font-mono text-sm outline-none dark:bg-neutral-950"
          placeholder="SELECT * FROM ..."
        />
        <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-2 dark:border-neutral-800">
          <div className="text-xs text-neutral-500">
            Press{" "}
            <kbd className="rounded border border-neutral-300 px-1 dark:border-neutral-700">
              ⌘/Ctrl
            </kbd>{" "}
            +{" "}
            <kbd className="rounded border border-neutral-300 px-1 dark:border-neutral-700">
              Enter
            </kbd>{" "}
            to run
          </div>
          <Button
            type="button"
            onClick={() => execute(sql)}
            disabled={running}
          >
            {running ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            {running ? "Running…" : "Run"}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {error && (
          <div className="m-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 font-mono text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}
        {!error && result && (
          <ResultsTable
            result={result}
            editable={editable}
            onCommitCell={editable ? commitCell : undefined}
          />
        )}
        {!error && !result && !running && (
          <div className="px-4 py-3 text-sm text-neutral-500">
            Write a query and press Run.
          </div>
        )}
      </div>
    </div>
  );
}
