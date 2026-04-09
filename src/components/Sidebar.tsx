import {
  ChevronRight,
  Database,
  Eye,
  Key,
  RefreshCw,
  Search,
  Table2,
} from "lucide-react";
import { useState } from "react";
import type { TableInfo } from "../lib/api";
import { Button } from "./ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

type Props = {
  database: string;
  tables: TableInfo[];
  loading: boolean;
  onSelectTable: (table: TableInfo) => void;
  onRefresh: () => void;
};

export function Sidebar({
  database,
  tables,
  loading,
  onSelectTable,
  onRefresh,
}: Props) {
  const [filter, setFilter] = useState("");

  const filtered = filter
    ? tables.filter((t) => t.name.toLowerCase().includes(filter.toLowerCase()))
    : tables;

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <div className="flex min-w-0 items-center gap-2">
          <Database className="h-4 w-4 shrink-0 text-neutral-500" />
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-neutral-500">
              Database
            </div>
            <div className="truncate text-sm font-medium" title={database}>
              {database || "—"}
            </div>
          </div>
        </div>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                aria-label="Refresh schema"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh schema</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="Filter tables…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-7"
          />
        </div>
      </div>

      <ScrollArea className="flex-1" viewportClassName="px-2 py-2">
        {loading && (
          <div className="px-2 py-4 text-sm text-neutral-500">Loading…</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="px-2 py-4 text-sm text-neutral-500">
            {tables.length === 0 ? "No tables found." : "No matches."}
          </div>
        )}
        {filtered.map((t) => (
          <Collapsible key={t.name} className="mb-0.5">
            <div className="flex items-center gap-0.5">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="group flex h-7 w-5 shrink-0 items-center justify-center rounded text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                  aria-label="Toggle columns"
                >
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-90" />
                </button>
              </CollapsibleTrigger>
              <button
                type="button"
                onClick={() => onSelectTable(t)}
                className="flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded px-2 text-left text-sm hover:bg-neutral-200 dark:hover:bg-neutral-800"
                title={t.name}
              >
                {t.type === "view" ? (
                  <Eye className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                ) : (
                  <Table2 className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                )}
                <span className="min-w-0 flex-1 truncate font-medium">
                  {t.name}
                </span>
                {t.approxRows !== null && (
                  <span className="shrink-0 pl-1 text-xs text-neutral-500">
                    ~{t.approxRows.toLocaleString()}
                  </span>
                )}
              </button>
            </div>
            <CollapsibleContent>
              <ul className="ml-4.5 mt-0.5 space-y-0.5 border-l border-neutral-200 pl-2 dark:border-neutral-800">
                {t.columns.map((c) => (
                  <li
                    key={c.name}
                    className="flex min-w-0 items-center gap-1 py-0.5 text-xs text-neutral-600 dark:text-neutral-400"
                    title={`${c.name} ${c.type}${c.nullable ? "" : " NOT NULL"}`}
                  >
                    {c.pk ? (
                      <Key className="h-3 w-3 shrink-0 text-amber-500" />
                    ) : (
                      <span className="h-3 w-3 shrink-0" aria-hidden />
                    )}
                    <span className="min-w-0 flex-1 truncate font-mono">
                      {c.name}
                    </span>
                    <span className="shrink-0 pl-2 text-neutral-400">
                      {c.type}
                    </span>
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </ScrollArea>
    </aside>
  );
}
