import { ChevronLeft, ChevronRight, Loader2, Pencil } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { QueryResult } from "../lib/api";
import type { EditableInfo } from "../lib/editable";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";

const PAGE_SIZE = 100;

type Props = {
  result: QueryResult;
  editable?: EditableInfo | null;
  /** Called when the user commits a cell edit. Should throw on failure. */
  onCommitCell?: (
    rowIndex: number,
    columnIndex: number,
    newValue: unknown
  ) => Promise<void>;
};

type EditTarget = { rowIndex: number; columnIndex: number };

export function ResultsTable({ result, editable, onCommitCell }: Props) {
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [draft, setDraft] = useState("");
  const [committing, setCommitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Set by cancelEdit() so the onBlur-triggered commit knows to skip.
  // Without this, pressing Escape unmounts the input, which fires blur,
  // which would commit the draft value the user just tried to discard.
  const cancelledRef = useRef(false);

  const isRows = result.kind === "rows";

  // Reset paging/edit state when a fresh result arrives.
  useEffect(() => {
    setPage(0);
    setEditing(null);
    setEditError(null);
  }, [result]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const totalPages = useMemo(
    () => (isRows ? Math.max(1, Math.ceil(result.rows.length / PAGE_SIZE)) : 1),
    [isRows, result]
  );

  const pageRows = useMemo(() => {
    if (!isRows) return [];
    return result.rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  }, [isRows, result, page]);

  if (result.kind === "exec") {
    return (
      <div className="px-4 py-3 text-sm text-neutral-500">
        Statement executed in {result.elapsedMs.toFixed(1)} ms.{" "}
        {result.affectedRows} row(s) affected.
        {result.insertId ? ` Insert id: ${result.insertId}.` : ""}
      </div>
    );
  }

  if (result.columns.length === 0) {
    return (
      <div className="px-4 py-3 text-sm text-neutral-500">
        Query returned no columns ({result.elapsedMs.toFixed(1)} ms).
      </div>
    );
  }

  function startEdit(rowIndex: number, columnIndex: number, cell: unknown) {
    if (!editable || !onCommitCell) return;
    if (!editable.columnByIndex.has(columnIndex)) return;
    setEditError(null);
    cancelledRef.current = false;
    setEditing({ rowIndex, columnIndex });
    setDraft(cell === null ? "" : String(cell));
  }

  function cancelEdit() {
    cancelledRef.current = true;
    setEditing(null);
    setDraft("");
  }

  async function commitEdit() {
    if (cancelledRef.current) {
      cancelledRef.current = false;
      return;
    }
    if (!editing || !onCommitCell || !editable) return;
    if (committing) return;
    const colInfo = editable.columnByIndex.get(editing.columnIndex);
    if (!colInfo) {
      cancelEdit();
      return;
    }
    // Empty input on a nullable column → NULL. Otherwise pass the raw string
    // and let MySQL coerce it (matches what users typically expect when
    // editing numeric/date columns inline).
    const newValue: unknown =
      draft === "" && colInfo.nullable ? null : draft;

    setCommitting(true);
    setEditError(null);
    try {
      await onCommitCell(editing.rowIndex, editing.columnIndex, newValue);
      setEditing(null);
      setDraft("");
    } catch (err) {
      setEditError((err as Error).message);
    } finally {
      setCommitting(false);
    }
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void commitEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  }

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10 bg-neutral-100 dark:bg-neutral-900">
            <tr>
              <th className="border-b border-r border-neutral-200 px-2 py-1.5 text-right text-xs font-normal text-neutral-500 dark:border-neutral-800">
                #
              </th>
              {result.columns.map((c, j) => {
                const isPk = editable?.pkColumns.some(
                  (p) => p.resultIndex === j
                );
                const isEditableCol = editable?.columnByIndex.has(j) ?? false;
                return (
                  <th
                    key={j}
                    className="border-b border-r border-neutral-200 px-3 py-1.5 text-left font-medium dark:border-neutral-800"
                  >
                    <span className="inline-flex items-center gap-1">
                      {c}
                      {isPk && (
                        <span
                          className="text-amber-600 dark:text-amber-400"
                          title="Primary key"
                        >
                          🔑
                        </span>
                      )}
                      {isEditableCol && (
                        <Pencil
                          className="h-3 w-3 text-neutral-400"
                          aria-label="Editable column"
                        />
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => {
              const absoluteRow = page * PAGE_SIZE + i;
              return (
                <tr
                  key={i}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-900"
                >
                  <td className="border-b border-r border-neutral-200 px-2 py-1 text-right text-xs text-neutral-400 dark:border-neutral-800">
                    {absoluteRow + 1}
                  </td>
                  {row.map((cell, j) => {
                    const isEditableCol =
                      editable?.columnByIndex.has(j) ?? false;
                    const isEditing =
                      editing?.rowIndex === absoluteRow &&
                      editing?.columnIndex === j;

                    if (isEditing) {
                      return (
                        <td
                          key={j}
                          className="border-b border-r border-blue-400 p-0 dark:border-blue-500"
                        >
                          <div className="flex items-center">
                            <input
                              ref={inputRef}
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              onKeyDown={handleInputKeyDown}
                              onBlur={() => void commitEdit()}
                              disabled={committing}
                              className="w-full bg-blue-50 px-3 py-1 font-mono text-xs outline-none dark:bg-blue-950"
                            />
                            {committing && (
                              <Loader2 className="mr-2 h-3 w-3 animate-spin text-neutral-400" />
                            )}
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={j}
                        className={cn(
                          "max-w-md truncate border-b border-r border-neutral-200 px-3 py-1 font-mono text-xs dark:border-neutral-800",
                          isEditableCol &&
                            "cursor-text hover:bg-blue-50 dark:hover:bg-blue-950"
                        )}
                        title={
                          isEditableCol
                            ? `${formatCell(cell)}\n(double-click to edit)`
                            : formatCell(cell)
                        }
                        onDoubleClick={
                          isEditableCol
                            ? () => startEdit(absoluteRow, j, cell)
                            : undefined
                        }
                      >
                        {renderCell(cell)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollArea>

      {editError && (
        <div className="border-t border-red-300 bg-red-50 px-4 py-2 font-mono text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {editError}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-2 text-xs text-neutral-500 dark:border-neutral-800">
        <div>
          {result.rows.length.toLocaleString()} row
          {result.rows.length === 1 ? "" : "s"} ·{" "}
          {result.elapsedMs.toFixed(1)} ms
          {editable && (
            <span className="ml-2 text-neutral-400">
              · double-click a cell to edit
            </span>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span>
              Page {page + 1} / {totalPages}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function renderCell(cell: unknown): React.ReactNode {
  if (cell === null) return <span className="text-neutral-400 italic">NULL</span>;
  if (typeof cell === "object") return JSON.stringify(cell);
  return String(cell);
}

function formatCell(cell: unknown): string {
  if (cell === null) return "NULL";
  if (typeof cell === "object") return JSON.stringify(cell);
  return String(cell);
}
