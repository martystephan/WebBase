import { useEffect, useState } from "react";
import { useSchema } from "../hooks/useSchema";
import type { Connection } from "../lib/connections";
import type { TableInfo } from "../lib/api";
import { QueryEditor } from "./QueryEditor";
import { Sidebar } from "./Sidebar";

const FALLBACK_SQL = "SELECT 1;";
const sqlForTable = (name: string) => `SELECT * FROM \`${name}\` LIMIT 100;`;

type Props = {
  connection: Connection;
};

export function Workspace({ connection }: Props) {
  const { schema, loading, error, reload } = useSchema(connection.url);
  const [pendingSql, setPendingSql] = useState<string>(FALLBACK_SQL);

  // When a new schema arrives, prefill the editor with the first table.
  useEffect(() => {
    if (!schema) return;
    setPendingSql(
      schema.tables.length > 0 ? sqlForTable(schema.tables[0].name) : FALLBACK_SQL
    );
  }, [schema]);

  function handleSelectTable(t: TableInfo) {
    setPendingSql(sqlForTable(t.name));
  }

  return (
    <>
      <Sidebar
        database={schema?.database ?? ""}
        tables={schema?.tables ?? []}
        loading={loading}
        onSelectTable={handleSelectTable}
        onRefresh={reload}
      />
      <main className="flex min-w-0 flex-1 flex-col">
        {error && (
          <div className="m-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <QueryEditor
            url={connection.url}
            initialSql={pendingSql}
            tables={schema?.tables ?? []}
          />
        </div>
      </main>
    </>
  );
}
