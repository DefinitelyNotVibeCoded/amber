"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, X, ArrowUp, ArrowDown, Save, Trash2, ListFilter } from "lucide-react";
import type { VaultData, OkfNote } from "@/lib/types";
import { colorForType, isReservedFilename } from "@/lib/okfClient";
import {
  type QueryFilter,
  type SavedView,
  type QueryOperator,
  STANDARD_FIELDS,
  operatorsForField,
  operatorLabel,
  collectCustomFields,
  applyQuery,
  sortNotes,
} from "@/lib/query";

const FIELD_LABELS: Record<string, string> = {
  type: "Type",
  title: "Title",
  tags: "Tags",
  description: "Description",
  resource: "Resource",
  timestamp: "Timestamp",
  path: "Path",
};

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] || field.charAt(0).toUpperCase() + field.slice(1);
}

function newFilter(field: string): QueryFilter {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, field, operator: operatorsForField(field)[0], value: "" };
}

const selectCls =
  "bg-[var(--bg-2)] border border-[var(--border-soft)] rounded-[var(--radius-sm)] px-2 py-1.5 text-[12.5px] text-[var(--text-0)] outline-none focus:border-[var(--accent-dim)] transition-colors";
const inputCls =
  "bg-[var(--bg-2)] border border-[var(--border-soft)] rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[12.5px] text-[var(--text-0)] outline-none focus:border-[var(--accent-dim)] transition-colors placeholder:text-[var(--text-2)]";

export default function QueryView({ vault, onSelect }: { vault: VaultData; onSelect: (path: string) => void }) {
  const allFields = useMemo(() => [...STANDARD_FIELDS, ...collectCustomFields(vault.notes)], [vault.notes]);

  const [filters, setFilters] = useState<QueryFilter[]>([]);
  const [sortField, setSortField] = useState("title");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [viewName, setViewName] = useState("");
  const [saving, setSaving] = useState(false);

  const loadViews = () => {
    fetch("/api/views")
      .then((r) => r.json())
      .then((d) => setSavedViews(d.views || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadViews();
  }, []);

  const queryableNotes = useMemo(() => vault.notes.filter((n) => !isReservedFilename(n.filename)), [vault.notes]);

  const results = useMemo(() => {
    const filtered = applyQuery(queryableNotes, filters);
    return sortNotes(filtered, sortField, sortDir);
  }, [queryableNotes, filters, sortField, sortDir]);

  function addFilter() {
    setFilters((f) => [...f, newFilter(allFields[0] || "type")]);
  }

  function updateFilter(id: string, patch: Partial<QueryFilter>) {
    setFilters((f) =>
      f.map((flt) => {
        if (flt.id !== id) return flt;
        const next = { ...flt, ...patch };
        if (patch.field && patch.field !== flt.field) {
          next.operator = operatorsForField(patch.field)[0];
          next.value = "";
        }
        return next;
      })
    );
  }

  function removeFilter(id: string) {
    setFilters((f) => f.filter((flt) => flt.id !== id));
  }

  async function saveView() {
    if (!viewName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: viewName.trim(), filters, sortField, sortDir }),
      });
      const data = await res.json();
      if (res.ok) {
        setViewName("");
        loadViews();
        setActiveViewId(data.view.id);
      }
    } finally {
      setSaving(false);
    }
  }

  function loadView(v: SavedView) {
    setFilters(v.filters);
    setSortField(v.sortField);
    setSortDir(v.sortDir);
    setActiveViewId(v.id);
  }

  async function removeView(id: string) {
    await fetch("/api/views/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (activeViewId === id) setActiveViewId(null);
    loadViews();
  }

  function valueInput(filter: QueryFilter) {
    if (filter.operator === "exists" || filter.operator === "not_exists") return null;
    if (filter.field === "type") {
      return (
        <select
          value={filter.value}
          onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
          className={selectCls}
        >
          <option value="">any</option>
          {vault.types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      );
    }
    if (filter.operator === "before" || filter.operator === "after") {
      return (
        <input
          type="date"
          value={filter.value}
          onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
          className={inputCls}
        />
      );
    }
    return (
      <>
        <input
          type="text"
          list={filter.field === "tags" ? "amber-tag-options" : undefined}
          value={filter.value}
          onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
          placeholder="value"
          className={`${inputCls} flex-1 min-w-0`}
        />
        {filter.field === "tags" && (
          <datalist id="amber-tag-options">
            {vault.tags.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        )}
      </>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--border-soft)] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-semibold flex items-center gap-2">
            <ListFilter size={15} className="text-[var(--accent-bright)]" />
            Query
          </h2>
          <span className="text-[11.5px] text-[var(--text-2)]">
            {results.length} of {queryableNotes.length} notes
          </span>
        </div>

        {savedViews.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {savedViews.map((v) => (
              <div
                key={v.id}
                className={`flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-[11.5px] border transition-colors ${
                  activeViewId === v.id
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-bright)]"
                    : "border-[var(--border-soft)] bg-[var(--bg-2)] text-[var(--text-1)] hover:text-[var(--text-0)]"
                }`}
              >
                <button onClick={() => loadView(v)}>{v.name}</button>
                <button
                  onClick={() => removeView(v.id)}
                  className="p-0.5 rounded-full hover:bg-[var(--bg-hover)] hover:text-[var(--danger)] transition-colors"
                  title="Delete view"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          {filters.map((f) => (
            <div key={f.id} className="flex items-center gap-1.5">
              <select value={f.field} onChange={(e) => updateFilter(f.id, { field: e.target.value })} className={selectCls}>
                {allFields.map((field) => (
                  <option key={field} value={field}>
                    {fieldLabel(field)}
                  </option>
                ))}
              </select>
              <select
                value={f.operator}
                onChange={(e) => updateFilter(f.id, { operator: e.target.value as QueryOperator })}
                className={selectCls}
              >
                {operatorsForField(f.field).map((op) => (
                  <option key={op} value={op}>
                    {operatorLabel(op)}
                  </option>
                ))}
              </select>
              {valueInput(f)}
              <button
                onClick={() => removeFilter(f.id)}
                className="p-1.5 rounded-md text-[var(--text-2)] hover:text-[var(--danger)] hover:bg-[var(--bg-2)] transition-colors shrink-0"
              >
                <X size={13} />
              </button>
            </div>
          ))}

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={addFilter}
              className="flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-full text-[var(--text-1)] bg-[var(--bg-2)] border border-[var(--border-soft)] hover:text-[var(--text-0)] transition-colors"
            >
              <Plus size={12} /> Add filter
            </button>

            <div className="w-px h-4 bg-[var(--border)]" />

            <span className="text-[11.5px] text-[var(--text-2)]">Sort</span>
            <select value={sortField} onChange={(e) => setSortField(e.target.value)} className={selectCls}>
              {allFields.map((field) => (
                <option key={field} value={field}>
                  {fieldLabel(field)}
                </option>
              ))}
            </select>
            <button
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="p-1.5 rounded-md text-[var(--text-1)] bg-[var(--bg-2)] border border-[var(--border-soft)] hover:text-[var(--text-0)] transition-colors"
              title={sortDir === "asc" ? "Ascending" : "Descending"}
            >
              {sortDir === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
            </button>

            <div className="w-px h-4 bg-[var(--border)]" />

            <input
              type="text"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              placeholder="Save this view as…"
              className={`${inputCls} w-40`}
            />
            <button
              onClick={saveView}
              disabled={!viewName.trim() || saving}
              className="flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-full text-[var(--text-1)] bg-[var(--bg-2)] border border-[var(--border-soft)] hover:text-[var(--text-0)] transition-colors disabled:opacity-40"
            >
              <Save size={12} /> Save view
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-16">
            <ListFilter size={26} className="text-[var(--text-2)]" />
            <p className="text-[13px] text-[var(--text-1)]">No notes match these filters.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-[var(--text-2)] border-b border-[var(--border-soft)]">
                <th className="pb-2 pr-3 font-medium">Type</th>
                <th className="pb-2 pr-3 font-medium">Title</th>
                <th className="pb-2 pr-3 font-medium">Tags</th>
                <th className="pb-2 pr-3 font-medium">Description</th>
                <th className="pb-2 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {results.map((n: OkfNote) => (
                <tr
                  key={n.path}
                  onClick={() => onSelect(n.path)}
                  className="border-b border-[var(--border-soft)] hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
                >
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {n.frontmatter.type && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                        style={{
                          background: colorForType(n.frontmatter.type, vault.types) + "22",
                          color: colorForType(n.frontmatter.type, vault.types),
                        }}
                      >
                        {n.frontmatter.type}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-[13px] font-medium text-[var(--text-0)]">{n.title}</td>
                  <td className="py-2 pr-3 text-[11.5px] text-[var(--text-2)]">
                    {(n.frontmatter.tags || []).map((t) => `#${t}`).join(" ")}
                  </td>
                  <td className="py-2 pr-3 text-[12px] text-[var(--text-1)] max-w-[280px] truncate">
                    {n.frontmatter.description || ""}
                  </td>
                  <td className="py-2 text-[11.5px] text-[var(--text-2)] whitespace-nowrap">
                    {n.frontmatter.timestamp ? new Date(n.frontmatter.timestamp).toLocaleDateString() : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
