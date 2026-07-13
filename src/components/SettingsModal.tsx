"use client";

import { useEffect, useState } from "react";
import { X, Settings as SettingsIcon, FolderCog, Plug, Info, Copy, Check, ExternalLink, FolderPlus, Palette, RotateCcw } from "lucide-react";
import Logo from "./Logo";
import NewVaultModal from "./NewVaultModal";
import { THEME_PRESETS, getThemeBase } from "@/lib/themes";

type Tab = "general" | "appearance" | "mcp" | "about";

interface StdioConnector {
  label: string;
  configPretty?: string;
  filePath?: string;
  command?: string;
}
interface HttpConnector {
  label: string;
  code?: string;
  note?: string;
}
interface McpConfigResponse {
  projectRoot: string;
  httpUrl: string;
  startHttpCommand: string;
  stdio: Record<string, StdioConnector>;
  http: Record<string, HttpConnector>;
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

const STDIO_ORDER = ["claudeDesktop", "claudeCode", "cursor", "windsurf", "geminiCli", "vscode", "openclaw", "hermes"];
const HTTP_ORDER = ["openaiAgentsPython", "openaiAgentsJs", "openaiResponses", "chatgpt"];

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

function ConnectorChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-[11.5px] font-medium border transition-colors ${
        active
          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-bright)]"
          : "border-[var(--border-soft)] bg-[var(--bg-2)] text-[var(--text-1)] hover:text-[var(--text-0)]"
      }`}
    >
      {label}
    </button>
  );
}

function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <pre className="bg-[var(--bg-2)] border border-[var(--border-soft)] rounded-[var(--radius-sm)] p-3 text-[11px] font-mono text-[var(--text-1)] overflow-x-auto whitespace-pre max-h-40">
        {text}
      </pre>
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
        className="absolute top-2 right-2 flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-[var(--bg-1)] border border-[var(--border-soft)] text-[var(--text-1)] hover:text-[var(--accent-bright)] transition-colors opacity-0 group-hover:opacity-100"
      >
        {copied ? <Check size={11} /> : <Copy size={11} />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export default function SettingsModal({
  currentPath,
  themePreset,
  accentOverride,
  onSetThemePreset,
  onSetAccentOverride,
  onClose,
  onSaved,
}: {
  currentPath: string;
  themePreset: string;
  accentOverride: string | null;
  onSetThemePreset: (id: string) => void;
  onSetAccentOverride: (hex: string | null) => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tab, setTab] = useState<Tab>("general");
  const [value, setValue] = useState(currentPath);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [version, setVersion] = useState<{ name: string; version: string } | null>(null);
  const [mcpConfig, setMcpConfig] = useState<McpConfigResponse | null>(null);
  const [connector, setConnector] = useState<string>("claudeDesktop");
  const [transport, setTransport] = useState<"local" | "remote">("local");
  const [showNewVault, setShowNewVault] = useState(false);

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

  const stdioConnector = mcpConfig?.stdio[connector];
  const httpConnector = mcpConfig?.http[connector];

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 animate-[fadeIn_0.12s_ease]"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-1)] border border-[var(--border)] rounded-[var(--radius-lg)] w-[760px] h-[600px] shadow-[var(--shadow-lg)] animate-[popIn_0.15s_ease] flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-48 shrink-0 border-r border-[var(--border-soft)] bg-[var(--bg-2)]/40 p-3 flex flex-col gap-0.5">
          <h2 className="text-[12.5px] font-semibold px-2 mb-3 flex items-center gap-2 text-[var(--text-0)]">
            <SettingsIcon size={14} /> Settings
          </h2>
          <NavButton active={tab === "general"} onClick={() => setTab("general")} icon={<FolderCog size={14} />} label="General" />
          <NavButton
            active={tab === "appearance"}
            onClick={() => setTab("appearance")}
            icon={<Palette size={14} />}
            label="Appearance"
          />
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
                    className="px-3.5 py-1.5 rounded-full text-[13px] font-medium bg-gradient-to-b from-[var(--accent-bright)] to-[var(--accent-dim)] hover:brightness-110 text-[var(--accent-contrast)] disabled:opacity-60 shadow-[0_2px_8px_-2px_rgba(var(--accent-rgb),0.5)] w-fit"
                  >
                    {saving ? "Switching…" : "Switch vault"}
                  </button>
                </div>

                <div className="pt-3 mt-1 border-t border-[var(--border-soft)]">
                  <p className="text-[12px] text-[var(--text-2)] mb-2">Starting fresh instead?</p>
                  <button
                    onClick={() => setShowNewVault(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-[12.5px] text-[var(--text-1)] bg-[var(--bg-2)] border border-[var(--border-soft)] hover:text-[var(--text-0)] transition-colors w-fit"
                  >
                    <FolderPlus size={13} /> Create new vault
                  </button>
                </div>
              </div>
            )}

            {tab === "appearance" && (
              <div className="flex flex-col gap-5 max-w-[440px]">
                <div>
                  <h3 className="text-[14px] font-semibold mb-1">Theme</h3>
                  <p className="text-[12.5px] text-[var(--text-2)]">Pick a preset, or set your own accent color below.</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {THEME_PRESETS.map((t) => {
                    const active = themePreset === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => onSetThemePreset(t.id)}
                        className={`text-left p-2.5 rounded-[var(--radius-sm)] border transition-colors ${
                          active ? "border-[var(--accent)]" : "border-[var(--border-soft)] hover:border-[var(--border)]"
                        }`}
                        style={{ background: t.bg1 }}
                      >
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ background: t.bg0 }} />
                          <span className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ background: t.accent }} />
                          <span className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ background: t.text0 }} />
                          {active && <Check size={13} className="ml-auto" style={{ color: t.accent }} />}
                        </div>
                        <span className="text-[12.5px] font-medium" style={{ color: t.text0 }}>
                          {t.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-1 border-t border-[var(--border-soft)]">
                  <h4 className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-2)] mt-3 mb-2">
                    Custom accent
                  </h4>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accentOverride || getThemeBase(themePreset).accent}
                      onChange={(e) => onSetAccentOverride(e.target.value)}
                      className="w-9 h-9 rounded-md border border-[var(--border-soft)] bg-transparent cursor-pointer p-0.5"
                    />
                    <span className="text-[12.5px] font-mono text-[var(--text-1)]">
                      {accentOverride || getThemeBase(themePreset).accent}
                    </span>
                    {accentOverride && (
                      <button
                        onClick={() => onSetAccentOverride(null)}
                        className="flex items-center gap-1 text-[11.5px] text-[var(--text-2)] hover:text-[var(--text-0)] ml-auto transition-colors"
                      >
                        <RotateCcw size={11} /> Reset
                      </button>
                    )}
                  </div>
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
                  <p className="text-[12.5px] text-[var(--text-2)] leading-relaxed">
                    Amber ships an MCP server that reads and writes this exact vault, over two transports: a local{" "}
                    <code className="text-[var(--accent-bright)]">stdio</code> server for desktop tools, and a Streamable{" "}
                    <code className="text-[var(--accent-bright)]">HTTP</code> server for OpenAI and anything else that needs a URL
                    instead of a spawned process.
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

                <div className="flex items-center gap-1 bg-[var(--bg-2)] border border-[var(--border-soft)] rounded-full p-0.5 w-fit">
                  <button
                    onClick={() => {
                      setTransport("local");
                      setConnector("claudeDesktop");
                    }}
                    className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${
                      transport === "local" ? "bg-[var(--accent-dim)] text-[var(--accent-contrast)]" : "text-[var(--text-1)]"
                    }`}
                  >
                    Local (stdio)
                  </button>
                  <button
                    onClick={() => {
                      setTransport("remote");
                      setConnector("openaiAgentsPython");
                    }}
                    className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${
                      transport === "remote" ? "bg-[var(--accent-dim)] text-[var(--accent-contrast)]" : "text-[var(--text-1)]"
                    }`}
                  >
                    Remote (HTTP)
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(transport === "local" ? STDIO_ORDER : HTTP_ORDER).map((key) => {
                    const label = transport === "local" ? mcpConfig?.stdio[key]?.label : mcpConfig?.http[key]?.label;
                    return (
                      <ConnectorChip
                        key={key}
                        active={connector === key}
                        onClick={() => setConnector(key)}
                        label={label || key}
                      />
                    );
                  })}
                </div>

                {transport === "local" && stdioConnector && (
                  <div className="flex flex-col gap-2">
                    {stdioConnector.command ? (
                      <>
                        <p className="text-[12px] text-[var(--text-2)]">Run in a terminal:</p>
                        <CopyBlock text={stdioConnector.command} />
                      </>
                    ) : (
                      <>
                        <CopyBlock text={stdioConnector.configPretty || ""} />
                        <p className="text-[11px] text-[var(--text-2)]">
                          Paste into <code className="text-[var(--text-1)]">{stdioConnector.filePath}</code>
                        </p>
                      </>
                    )}
                  </div>
                )}

                {transport === "remote" && httpConnector && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[11px] text-[var(--text-2)]">
                      Start the server once:{" "}
                      <code className="text-[var(--accent-bright)]">{mcpConfig?.startHttpCommand}</code>, it listens on{" "}
                      <code className="text-[var(--text-1)]">{mcpConfig?.httpUrl}</code> (loopback only).
                    </p>
                    {httpConnector.code && <CopyBlock text={httpConnector.code} />}
                    {httpConnector.note && (
                      <p className="text-[12px] text-[var(--text-1)] leading-relaxed bg-[var(--bg-2)] border border-[var(--border-soft)] rounded-md p-3">
                        {httpConnector.note}
                      </p>
                    )}
                  </div>
                )}
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
                <p className="text-[12.5px] text-[var(--text-1)] leading-relaxed max-w-[480px]">
                  An Obsidian-style local app for browsing, linking, and editing Open Knowledge Format (OKF) bundles, built for
                  notes that both you and AI agents maintain.
                </p>
                <div>
                  <h4 className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-2)] mb-1.5">
                    What&rsquo;s new in this version
                  </h4>
                  <ul className="text-[12.5px] text-[var(--text-1)] flex flex-col gap-1 list-disc pl-4">
                    <li>Query view: built-in filtering and saved views, no plugin needed</li>
                    <li>Agent Activity Log: review and revert every AI-made edit, with diffs</li>
                    <li>Customizable theme and an interactive knowledge graph</li>
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

      {showNewVault && (
        <NewVaultModal
          onClose={() => setShowNewVault(false)}
          onCreated={(newPath) => {
            setShowNewVault(false);
            setValue(newPath);
            onSaved();
          }}
        />
      )}
    </div>
  );
}
