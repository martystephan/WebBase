import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { testConnection } from "../lib/api";
import { defaultLabel, newId, type Connection } from "../lib/connections";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

type Props = {
  connections: Connection[];
  activeId: string | null;
  onChange: (next: Connection[]) => void;
  onSelect: (id: string | null) => void;
};

export function ConnectionManager({
  connections,
  activeId,
  onChange,
  onSelect,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(connections.length === 0);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftUrl, setDraftUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  function resetForm() {
    setDraftLabel("");
    setDraftUrl("");
    setError(null);
    setEditingId(null);
  }

  function openCreate() {
    resetForm();
    setDialogOpen(true);
  }

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open);
    if (!open) resetForm();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!draftUrl.trim()) return;
    setError(null);
    setBusy(true);
    try {
      await testConnection(draftUrl.trim());
      const label = draftLabel.trim() || defaultLabel(draftUrl.trim());
      let next: Connection[];
      let savedId: string;
      if (editingId) {
        next = connections.map((c) =>
          c.id === editingId ? { ...c, label, url: draftUrl.trim() } : c
        );
        savedId = editingId;
      } else {
        const id = newId();
        next = [...connections, { id, label, url: draftUrl.trim() }];
        savedId = id;
      }
      onChange(next);
      onSelect(savedId);
      resetForm();
      setDialogOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(c: Connection) {
    setEditingId(c.id);
    setDraftLabel(c.label);
    setDraftUrl(c.url);
    setError(null);
    setDialogOpen(true);
  }

  function handleDelete(id: string) {
    const next = connections.filter((c) => c.id !== id);
    onChange(next);
    if (activeId === id) onSelect(null);
    if (editingId === id) resetForm();
  }

  return (
    <div className="flex flex-col gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-center gap-2">
        <Label htmlFor="connection-select">Connection</Label>
        <div className="min-w-0 flex-1">
          <Select
            value={activeId ?? ""}
            onValueChange={(value) => onSelect(value || null)}
          >
            <SelectTrigger id="connection-select">
              <SelectValue placeholder="— select a connection —" />
            </SelectTrigger>
            <SelectContent>
              {connections.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {activeId && (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                const c = connections.find((x) => x.id === activeId);
                if (c) startEdit(c);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => activeId && handleDelete(activeId)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </>
        )}
        <Button type="button" size="sm" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit connection" : "Add connection"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="conn-label">Label</Label>
              <Input
                id="conn-label"
                placeholder="Label (optional)"
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="conn-url">Connection URL</Label>
              <Input
                id="conn-url"
                required
                placeholder="mysql://user:password@host:3306/database"
                value={draftUrl}
                onChange={(e) => setDraftUrl(e.target.value)}
                className="font-mono"
              />
            </div>
            {error && (
              <div className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                {error}
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => handleDialogOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Testing…" : editingId ? "Update" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
