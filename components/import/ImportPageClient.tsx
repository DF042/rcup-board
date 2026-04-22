"use client";

import { useMemo, useState } from "react";

type ImportLog = {
  id: string;
  timestamp: string;
  summary: string;
};

const inferType = (fileName: string) => {
  const lower = fileName.toLowerCase();
  if (lower.includes("league")) return "League";
  if (lower.includes("team")) return "Teams";
  if (lower.includes("matchup")) return "Matchups";
  if (lower.includes("player")) return "Players";
  return "Unknown";
};

export function ImportPageClient() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [logs, setLogs] = useState<ImportLog[]>([]);

  const detectedType = useMemo(() => (file ? inferType(file.name) : null), [file]);

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/import", { method: "POST", body: formData });
      if (!response.ok) {
        const errPayload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errPayload?.error ?? `Import failed (${response.status})`);
      }
      const payload = (await response.json()) as { data?: { summary?: Record<string, number> } };
      const summary = payload?.data?.summary ?? {};
      const text = `✓ Imported: ${summary.league ?? 0} league, ${summary.teams ?? 0} teams, ${summary.matchups ?? 0} matchups`;
      setResult(text);
      setLogs((prev) => [
        { id: crypto.randomUUID(), timestamp: new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }), summary: text },
        ...prev,
      ].slice(0, 5));
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Import failed. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 py-4">
      <div className="rounded border border-dashed p-6 text-center">
        <input type="file" accept="application/json" className="mx-auto mb-3 block" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        <p className="text-sm text-muted-foreground">Drag-and-drop or click to browse Yahoo JSON exports.</p>
        {detectedType ? <p className="mt-2 text-sm">Detected data type: {detectedType}</p> : null}
      </div>

      <button type="button" onClick={handleImport} disabled={!file || loading} className="rounded border px-3 py-2 text-sm disabled:opacity-50">
        {loading ? "Importing..." : "Run Import"}
      </button>

      {loading ? <div className="h-2 w-full overflow-hidden rounded bg-muted"><div className="h-full w-2/3 animate-pulse bg-primary" /></div> : null}
      {result ? <p className="rounded border p-3 text-sm">{result}</p> : null}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Recent imports</h3>
        {logs.length === 0 ? <p className="text-sm text-muted-foreground">No imports yet.</p> : null}
        {logs.map((entry) => (
          <div key={entry.id} className="rounded border p-2 text-sm">
            <p>{entry.summary}</p>
            <p className="text-xs text-muted-foreground">{entry.timestamp}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
