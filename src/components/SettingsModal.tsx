"use client";

import { useEffect, useState } from "react";
import { X, Settings as SettingsIcon, FolderCog, Plug, Info, Copy, Check, ExternalLink } from "lucide-react";
import Logo from "./Logo";

type Tab = "general" | "mcp" | "about";

interface McpConfigResponse {
  projectRoot: string;
  configPretty: string;
  claudeDesktopConfigPath: string;
  claudeCodeConfigHint: string;
}

const MCP_TOOLS = [
  { name: "get_vault_info", desc: "Root path, note count, all types and tags" },
  { name: "list_notes", desc: "Every note's path, title, type, tags" },
  { name: "search_notes", desc: "Free-text + type/tag filtered search" },
  { name: "read_note", desc: "Full raw markdown of one note" },
  { name: "get_backlinks", desc: "Notes linking to a given note" },
  { name: "write_note", desc: "Overwrite an existing note's content" },
  { name: "create_note", desc: "Create a new OKF-conformant note" },
];

function NavButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] text-left transition-colors ${
        active ? "bg-[var(--accent-soft)] text-[var(--accent-bright)] font-medium" : "text-[var(--text-1)] hover:bg-[var(--bg-2)]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export default function SettingsModal({
  currentPath,
  onClose,
  onSaved,
}: {
  currentPath: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tab, setTab] = useState<Tab>("general");
  const [value, setValue] = useState(currentPath);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [version, setVersion] = useState<{ name: string; version: string } | null>(null);
  const [mcpConfig, setMcpConfig] = useState<McpConfigResponse | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/version")
      .then((r) => r.json())
      .then(setVersion)
      .catch(() => {});
    fetch("/api/mcp-config")
      .then((r) => r.json())
      .then(setMcpConfig)
      .catch(() => {});
  }, []);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vaultPath: value.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not switch vault.");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function copyConfig() {
    if (!mcpConfig) return;
    await navigator.clipboard.writeText(mcpConfig.configPretty);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 animate-[fadeIn_0.12s_ease]"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-1)] border border-[var(--border)] rounded-[var(--radius-lg)] w-[680px] h-[540px] shadow-[var(--shadow-lg)] animate-[popIn_0.15s_ease] flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-48 shrink-0 border-r border-[var(--border-soft)] bg-[var(--bg-2)]/40 p-3 flex flex-col gap-0.5">
          <h2 className="text-[12.5px] font-semibold px-2 mb-3 flex items-center gap-2 text-[var(--text-0)]">
            <SettingsIcon size={14} /> Settings
          </h2>
          <NavButton active={tab === "general"} onClick={() => setTab("general")} icon={<FolderCog size={14} />} label="General" />
          <NavButton active={tab === "mcp"} onClick={() => setTab("mcp")} icon={<Plug size={14} />} label="MCP Server" />
          <NavButton active={tab === "about"} onClick={() => setTab("about")} icon={<Info size={14} />} label="About" />
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center justify-end px-4 py-3 border-b border-[var(--border-soft)]">
            <button
              onClick={onClose}
              className="text-[var(--text-2)] hover:text-[var(--text-0)] p-1 rounded-full hover:bg-[var(--bg-2)] transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {tab === "general" && (
              <div className="flex flex-col gap-4 max-w-[420px]">
                <div>
                  <h3 className="text-[14px] font-semibold mb-1">Vault</h3>
                  <p className="text-[12.5px] text-[var(--text-2)]">Point Amber at any folder of OKF markdown files.</p>
                </div>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="text-[var(--text-1)] text-[11.5px] font-medium">Vault path (absolute, on this machine)</span>
                  <input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="bg-[var(--bg-2)] border border-[var(--border-soft)] rounded-[var(--radius-sm)] px-2.5 py-1.5 outline-none focus:border-[var(--accent-dim)] transition-colors font-mono text-[12.5px] text-[var(--text-0)]"
                  />
                </label>
                {error && <div className="text-xs text-[var(--danger)]">{error}</div>}
                <div className="flex justify-end gap-2 mt-1">
                  <button
                    onClick={submit}
                    disabled={saving}
                    className="px-3.5 py-1.5 rounded-full text-[13px] font-medium bg-gradient-to-b from-[var(--accent-bright)] to-[var(--accent-dim)] hover:brightness-110 text-[#211a0d] disabled:opacity-60 shadow-[0_2px_8px_-2px_rgba(227,170,74,0.5)] w-fit"
                  >
                    {saving ? "Switching…" : "Switch vault"}
                  </button>
                </div>
              </div>
            )}

            {tab === "mcp" && (
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-[14px] font-semibold mb-1 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    MCP server built in
                  </h3>
                  <p className="text-[12.5px] text-[var(--text-2)] leading-relaxed max-w-[480px]">
                    Amber ships an MCP server (<code className="text-[var(--accent-bright)]">mcp/server.ts</code>) that reads and
                    writes this exact vault. Connect Claude Desktop or Claude Code to it and your notes stay in sync between the
                    app and any chat — an AI agent can search, read, create, and edit notes on repeat across sessions.
                  </p>
                </div>

                <div>
                  <h4 className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-2)] mb-1.5">Tools exposed</h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    {MCP_TOOLS.map((t) => (
                      <div key={t.name} className="bg-[var(--bg-2)] border border-[var(--border-soft)] rounded-md px-2.5 py-1.5">
                        <div className="text-[12px] font-mono text-[var(--accent-bright)]">{t.name}</div>
                        <div className="text-[11px] text-[var(--text-2)]">{t.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-2)]">
                      Claude Desktop config
                    </h4>
                    <button
                      onClick={copyConfig}
                      className="flex items-center gap-1 text-[11px] text-[var(--text-1)] hover:text-[var(--accent-bright)] transition-colors"
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <pre className="bg-[var(--bg-2)] border border-[var(--border-soft)] rounded-[var(--radius-sm)] p-3 text-[11px] font-mono text-[var(--text-1)] overflow-x-auto max-h-28">
{mcpConfig?.configPretty || "Loading…"}
                  </pre>
                  <p className="text-[11px] text-[var(--text-2)] mt-1.5">
                    Paste into <code className="text-[var(--text-1)]">{mcpConfig?.claudeDesktopConfigPath}</code>, or for Claude
                    Code run:
                  </p>
                  <pre className="bg-[var(--bg-2)] border border-[var(--border-soft)] rounded-[var(--radius-sm)] p-2 text-[11px] font-mono text-[var(--text-1)] overflow-x-auto mt-1">
{mcpConfig?.claudeCodeConfigHint || "Loading…"}
                  </pre>
                </div>
              </div>
            )}

            {tab === "about" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Logo size={40} />
                  <div>
                    <div className="text-[16px] font-semibold">Amber</div>
                    <div className="text-[12px] text-[var(--text-2)] font-mono">
                      v{version?.version ?? "…"}
                    </div>
                  </div>
                </div>
                <p className="text-[12.5px] text-[var(--text-1)] leading-relaxed max-w-[440px]">
                  An Obsidian-style local app for browsing, linking, and editing Open Knowledge Format (OKF) bundles — built for
                  notes that both you and AI agents maintain.
                </p>
                <div>
                  <h4 className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-2)] mb-1.5">
                    What&rsquo;s new in this version
                  </h4>
                  <ul className="text-[12.5px] text-[var(--text-1)] flex flex-col gap-1 list-disc pl-4">
                    <li>Built-in MCP server for Claude Desktop / Claude Code</li>
                    <li>Packaged as an Electron desktop app</li>
                    <li>Deeper Settings: General, MCP Server, About</li>
                  </ul>
                </div>
                <a
                  href="https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-[12.5px] external-link w-fit"
                >
                  <ExternalLink size={12} /> OKF v0.1 specification
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
