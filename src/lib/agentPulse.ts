import fs from "fs";
import path from "path";

export type PulseKind = "read" | "write";

export interface AgentPulseEvent {
  id: string;
  timestamp: string;
  tool: string;
  kind: PulseKind;
  /** Bundle-relative note paths this call touched. Empty for vault-wide calls like list_notes. */
  paths: string[];
  /** Short human-readable detail, e.g. the search query. */
  detail?: string;
}

const LOG_DIR = ".amber";
const LOG_FILE = "agent-pulse.json";
const MAX_EVENTS = 500;
const MAX_PATHS_PER_EVENT = 20;

function logPath(root: string): string {
  return path.join(root, LOG_DIR, LOG_FILE);
}

export function readAgentPulse(root: string): AgentPulseEvent[] {
  try {
    const raw = fs.readFileSync(logPath(root), "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAgentPulse(root: string, events: AgentPulseEvent[]): void {
  const dir = path.join(root, LOG_DIR);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(logPath(root), JSON.stringify(events, null, 2), "utf-8");
}

export function appendAgentPulse(
  root: string,
  event: Pick<AgentPulseEvent, "tool" | "kind" | "paths" | "detail">
): AgentPulseEvent {
  const events = readAgentPulse(root);
  const full: AgentPulseEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    tool: event.tool,
    kind: event.kind,
    paths: event.paths.slice(0, MAX_PATHS_PER_EVENT),
    detail: event.detail,
  };
  events.push(full);
  writeAgentPulse(root, events.slice(-MAX_EVENTS));
  return full;
}

export function readAgentPulseSince(root: string, sinceIso: string | null): AgentPulseEvent[] {
  const events = readAgentPulse(root);
  if (!sinceIso) return events.slice(-50);
  return events.filter((e) => e.timestamp > sinceIso);
}
