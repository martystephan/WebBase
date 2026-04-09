import { useCallback, useEffect, useState } from "react";
import { fetchSchema, type SchemaResponse } from "../lib/api";

export function useSchema(url: string | undefined) {
  const [schema, setSchema] = useState<SchemaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      setSchema(await fetchSchema(url));
    } catch (err) {
      setError((err as Error).message);
      setSchema(null);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    setSchema(null);
    setError(null);
    if (url) reload();
  }, [url, reload]);

  return { schema, loading, error, reload };
}
