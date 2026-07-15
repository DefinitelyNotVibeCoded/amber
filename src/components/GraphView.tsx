"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, type Simulation } from "d3-force";
import { Maximize2, RotateCcw, Radio, FileSearch, Pencil, FilePlus, Info } from "lucide-react";
import type { VaultData } from "@/lib/types";
import { colorForType } from "@/lib/okfClient";
import { mix, hexToRgb } from "@/lib/color";
import type { AgentPulseEvent, PulseKind } from "@/lib/agentPulse";

interface NodeMeta {
  id: string;
  title: string;
  type?: string;
  degree: number;
}
interface LinkMeta {
  source: string;
  target: string;
}
interface SimNode {
  id: string;
  title: string;
  type?: string;
  degree: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;
}
interface SimLink {
  source: SimNode | string;
  target: SimNode | string;
}
interface ViewTransform {
  x: number;
  y: number;
  k: number;
}

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;
const DRAG_THRESHOLD = 4;
const MIN_RADIUS = 5;
const MAX_RADIUS = 16;
const IDLE_ALPHA_TARGET = 0;
const DRAG_ALPHA_TARGET = 0.35;

const DORMANT_HEX = "#332f28";
const KIND_RGB: Record<PulseKind, [number, number, number]> = {
  read: [94, 200, 224],
  write: [242, 192, 105],
};
const PULSE_FADE_MS = 45000;
const PULSE_POLL_MS = 1500;
const TRAVEL_DURATION_MS = 700;
const RING_DURATION_MS = 900;
// Below this many nodes, every label stays on (matches the original small-vault feel). Above it,
// only hovered/focused/hub nodes get a label, so density reads as texture instead of text soup.
const LABEL_ALWAYS_THRESHOLD = 60;
// Relative to the vault's own most-connected note, not a fixed degree count - same reasoning as
// node radius. Once notes average 6-10 links each, a fixed threshold like "7" matches nearly
// everything and every label shows at once; a handful of genuinely exceptional hubs should not.
const LABEL_HUB_FRACTION = 0.35;
const LABEL_HUB_MIN_DEGREE = 8;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

// Scaled relative to the most-connected note in THIS vault (not an absolute degree count), so the
// hub node always visibly reaches maxR and low-degree notes stay near minR, regardless of whether
// the vault is small and sparse or huge and dense. A fixed absolute scale saturated almost every
// node to maxR once average degree passed about 4, which is why size stopped reading as meaningful.
function radiusForDegree(degree: number, minR: number = MIN_RADIUS, maxR: number = MAX_RADIUS, maxDegree: number = 1) {
  const t = Math.sqrt(degree / Math.max(maxDegree, 1));
  return clamp(minR + t * (maxR - minR), minR, maxR);
}

// Obsidian's own graph doesn't know about folders or topics - it just runs a plain force
// simulation (link + repel + center) over the real note-to-note links and lets clusters emerge
// from whatever notes actually happen to link densely to each other. No synthetic per-folder
// clustering force, no artificial intra/inter distance split - both of those fought the natural
// layout and produced a mechanical-looking ring. Same approach here: one link distance, one
// charge, scaled down as note count grows so density stays readable instead of exploding outward.
function physicsForScale(n: number) {
  if (n <= 60) {
    return { minR: 5, maxR: 16, collidePad: 6, charge: -220, linkDistance: 60, linkStrength: 0.5 };
  }
  if (n <= 300) {
    return { minR: 3.2, maxR: 9, collidePad: 2.2, charge: -70, linkDistance: 32, linkStrength: 0.45 };
  }
  return { minR: 1.8, maxR: 5, collidePad: 0.7, charge: -18, linkDistance: 16, linkStrength: 0.4 };
}

// Shortest real path from Index down to a touched note (e.g. Index -> Books -> Sapiens), found by
// plain BFS over the actual link graph rather than assumed from folder structure - works whether a
// note sits one hop from Index (a real vault note Index links to directly) or two (a demo note
// under a category holder), and degrades to just the note itself if no path exists at all.
function pathFromIndex(adjacency: Map<string, Set<string>>, targetId: string, maxDepth = 4): string[] {
  const ROOT = "/index.md";
  if (targetId === ROOT) return [ROOT];
  if (!adjacency.has(ROOT) || !adjacency.has(targetId)) return [targetId];
  const visited = new Set([ROOT]);
  const queue: string[][] = [[ROOT]];
  while (queue.length > 0) {
    const path = queue.shift()!;
    const last = path[path.length - 1];
    if (last === targetId) return path;
    if (path.length > maxDepth) continue;
    for (const next of adjacency.get(last) || []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push([...path, next]);
      }
    }
  }
  return [targetId];
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 1000) return "just now";
  if (ms < 60000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
  return `${Math.floor(ms / 3600000)}h ago`;
}

interface ThemeColors {
  bg0: string;
  text1: string;
  text2: string;
  accent: string;
  accentRgb: [number, number, number];
}

function resolveTheme(el: Element): ThemeColors {
  const cs = getComputedStyle(el);
  const read = (v: string, fallback: string) => cs.getPropertyValue(v).trim() || fallback;
  const accent = read("--accent", "#e3aa4a");
  return {
    bg0: read("--bg-0", "#171613"),
    text1: read("--text-1", "#b3ac9c"),
    text2: read("--text-2", "#7c7466"),
    accent,
    accentRgb: hexToRgb(accent),
  };
}

type DragState =
  | { type: "pan"; startClientX: number; startClientY: number; startView: ViewTransform; moved: boolean }
  | { type: "node"; id: string; startClientX: number; startClientY: number; moved: boolean };

interface RingBurst {
  x: number;
  y: number;
  color: [number, number, number];
  start: number;
}
interface TravelPulse {
  fromId: string;
  toId: string;
  start: number;
  duration: number;
  color: [number, number, number];
}

const TOOL_ICON: Record<string, typeof FileSearch> = {
  get_vault_info: Info,
  list_notes: FileSearch,
  search_notes: FileSearch,
  read_note: FileSearch,
  get_backlinks: FileSearch,
  write_note: Pencil,
  create_note: FilePlus,
};

export default function GraphView({
  vault,
  onSelect,
  focusPath,
  mode = "type",
}: {
  vault: VaultData;
  onSelect: (path: string) => void;
  focusPath: string | null;
  mode?: "type" | "agents";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [nodeMetas, setNodeMetas] = useState<NodeMeta[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [view, setView] = useState<ViewTransform>({ x: 0, y: 0, k: 1 });
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [linkCount, setLinkCount] = useState(0);
  const [feed, setFeed] = useState<AgentPulseEvent[]>([]);
  const [, forceTick] = useState(0);

  const dragRef = useRef<DragState | null>(null);
  const viewRef = useRef<ViewTransform>(view);
  viewRef.current = view;
  const hoveredRef = useRef<string | null>(hovered);
  hoveredRef.current = hovered;
  const focusPathRef = useRef<string | null>(focusPath);
  focusPathRef.current = focusPath;
  const typeFilterRef = useRef<string | null>(typeFilter);
  typeFilterRef.current = typeFilter;

  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null);
  const simNodesRef = useRef<SimNode[]>([]);
  const simLinksRef = useRef<SimLink[]>([]);
  const adjacencyRef = useRef<Map<string, Set<string>>>(new Map());
  const pulseHeatRef = useRef<Map<string, { kind: PulseKind; updatedAt: number }>>(new Map());
  const travelsRef = useRef<Map<string, TravelPulse>>(new Map());
  const ringsRef = useRef<RingBurst[]>([]);
  const radiusBoundsRef = useRef({ minR: MIN_RADIUS, maxR: MAX_RADIUS, maxDegree: 1 });
  const themeRef = useRef<ThemeColors>({ bg0: "#171613", text1: "#b3ac9c", text2: "#7c7466", accent: "#e3aa4a", accentRgb: [227, 170, 74] });
  const dprRef = useRef(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Keep the canvas backing store sized for the display's pixel ratio so it stays crisp, not blurry.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
  }, [size.width, size.height]);

  // Index is real content here, deliberately the hub every note connects back to, so (unlike
  // log.md, which is just a running audit trail) it belongs in the graph like any other note.
  const graphNotes = useMemo(() => vault.notes.filter((n) => n.filename !== "log.md"), [vault.notes]);

  const fitToView = useCallback((nodeList: { x: number; y: number }[], width: number, height: number) => {
    if (nodeList.length === 0) {
      setView({ x: width / 2, y: height / 2, k: 1 });
      return;
    }
    const xs = nodeList.map((n) => n.x);
    const ys = nodeList.map((n) => n.y);
    const minX = Math.min(...xs) - 30;
    const maxX = Math.max(...xs) + 30;
    const minY = Math.min(...ys) - 30;
    const maxY = Math.max(...ys) + 30;
    const spanX = Math.max(maxX - minX, 1);
    const spanY = Math.max(maxY - minY, 1);
    const k = clamp(Math.min(width / spanX, height / spanY) * 0.92, MIN_ZOOM, MAX_ZOOM);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setView({ x: width / 2 - cx * k, y: height / 2 - cy * k, k });
  }, []);

  // Draw one frame straight to canvas: no per-node DOM elements, so this stays fast at 1000+ notes.
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const now = Date.now();
    const { minR, maxR, maxDegree } = radiusBoundsRef.current;
    const theme = themeRef.current;
    const v = viewRef.current;
    const dpr = dprRef.current;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(v.x, v.y);
    ctx.scale(v.k, v.k);

    const active = typeFilterRef.current ? null : hoveredRef.current || focusPathRef.current;
    const activeNeighbors = active ? adjacencyRef.current.get(active) : null;

    // Links: one plain thin gray line style for every edge, same as Obsidian's own graph - the
    // wiring stays quiet and lets the node clusters that emerge from real link density carry the
    // shape, rather than us pre-deciding which edges "matter" more.
    ctx.lineCap = "round";
    for (const l of simLinksRef.current) {
      const s = l.source as SimNode;
      const t = l.target as SimNode;
      if (typeof s !== "object" || typeof t !== "object") continue;
      let alpha = mode === "agents" ? 0.13 : 0.22;
      let color = theme.text2;
      if (mode === "type") {
        if (typeFilterRef.current) {
          const dim = s.type !== typeFilterRef.current || t.type !== typeFilterRef.current;
          alpha = dim ? 0.02 : 0.45;
        } else if (active) {
          const connects = s.id === active || t.id === active;
          if (connects) {
            alpha = 0.6;
            color = theme.accent;
          } else if (activeNeighbors) {
            alpha = 0.03;
          }
        }
      }
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 0.85 / v.k;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Nodes: flat glowing dots, no per-node border. Glow (shadowBlur) is reserved for a small
    // subset (hover/focus/hub/pulsing) since it's the one part of canvas drawing that isn't free.
    const labelQueue: { x: number; y: number; text: string; hub: boolean; emphasize: boolean }[] = [];
    for (const n of simNodesRef.current) {
      const isFocus = n.id === focusPathRef.current;
      const isHovered = n.id === hoveredRef.current;
      // Index is the vault's one designated entry point - it stays labeled regardless of how its
      // raw degree compares to category-overview notes, which can easily out-link it numerically.
      const isHub = n.id === "/index.md" || n.degree >= Math.max(LABEL_HUB_MIN_DEGREE, maxDegree * LABEL_HUB_FRACTION);
      const baseR = radiusForDegree(n.degree, minR, maxR, maxDegree);
      let r = baseR;
      let fill: string;
      let glow = 0;
      let alpha = 1;

      if (mode === "agents") {
        const pulse = pulseHeatRef.current.get(n.id);
        const t = pulse ? clamp(1 - (now - pulse.updatedAt) / PULSE_FADE_MS, 0, 1) : 0;
        fill = pulse ? mix(DORMANT_HEX, KIND_RGB[pulse.kind], t) : DORMANT_HEX;
        r = baseR + t * (1.5 + maxR * 0.25);
        if (t > 0.03) glow = 6 + t * 14;
      } else {
        fill = colorForType(n.type, vault.types);
        if (typeFilterRef.current) {
          alpha = n.type === typeFilterRef.current ? 1 : 0.12;
        } else if (active) {
          alpha = n.id === active || activeNeighbors?.has(n.id) ? 1 : 0.22;
        }
        if (isFocus || isHovered) {
          r = baseR + 2;
          glow = 10;
        } else if (isHub && !active) {
          glow = 3;
        }
      }

      ctx.globalAlpha = alpha;
      if (glow > 0) {
        ctx.shadowColor = fill;
        ctx.shadowBlur = glow;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.beginPath();
      ctx.arc(n.x, n.y, r / v.k, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Category-holder labels are structural (which topic is which), not agent-activity signal,
      // so they should read the same way in both views - only the pulse glow itself is agents-only.
      const showLabel = alpha > 0.5 && (nodeMetas.length <= LABEL_ALWAYS_THRESHOLD || isFocus || isHovered || isHub);
      if (showLabel) {
        labelQueue.push({ x: n.x, y: n.y, text: n.title, hub: isHub, emphasize: isFocus || isHovered });
      }
    }
    ctx.globalAlpha = 1;

    // Traveling pulses: a dot riding the straight line between the two most recently touched notes.
    if (mode === "agents" && travelsRef.current.size > 0) {
      for (const [key, tr] of travelsRef.current) {
        const s = simNodesRef.current.find((n) => n.id === tr.fromId);
        const t = simNodesRef.current.find((n) => n.id === tr.toId);
        const frac = (now - tr.start) / tr.duration;
        if (!s || !t || frac >= 1) {
          travelsRef.current.delete(key);
          continue;
        }
        const x = s.x + (t.x - s.x) * frac;
        const y = s.y + (t.y - s.y) * frac;
        const fade = frac < 0.12 ? frac / 0.12 : frac > 0.8 ? (1 - frac) / 0.2 : 1;
        const rgb = `rgb(${tr.color.join(",")})`;
        ctx.globalAlpha = clamp(fade, 0, 1);
        ctx.shadowColor = rgb;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x, y, 3.2 / v.k, 0, Math.PI * 2);
        ctx.fillStyle = rgb;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
    }

    // Ring bursts on freshly touched nodes.
    if (mode === "agents" && ringsRef.current.length > 0) {
      ringsRef.current = ringsRef.current.filter((ring) => now - ring.start < RING_DURATION_MS);
      for (const ring of ringsRef.current) {
        const frac = (now - ring.start) / RING_DURATION_MS;
        const rgb = `rgb(${ring.color.join(",")})`;
        ctx.globalAlpha = clamp(1 - frac, 0, 1) * 0.85;
        ctx.strokeStyle = rgb;
        ctx.lineWidth = 1.8 / v.k;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, (10 + frac * 26) / v.k, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Labels last, in graph space but counter-scaled to stay a constant screen size, with a thin
    // dark halo so they stay legible over both dense clusters and empty background.
    for (const label of labelQueue) {
      const fontSize = (label.emphasize ? 12.5 : 11) / v.k;
      ctx.font = `${label.emphasize ? 600 : 500} ${fontSize}px system-ui, sans-serif`;
      ctx.textBaseline = "middle";
      const tx = label.x + (8 + 2) / v.k;
      const ty = label.y;
      ctx.lineWidth = 3 / v.k;
      ctx.strokeStyle = theme.bg0;
      ctx.globalAlpha = 0.85;
      ctx.strokeText(label.text, tx, ty);
      ctx.globalAlpha = 1;
      ctx.fillStyle = label.emphasize ? theme.text1 : theme.text2;
      ctx.fillText(label.text, tx, ty);
    }
  }, [mode, vault.types, nodeMetas.length]);

  // Build the simulation whenever the vault's link graph changes, and let it run continuously
  // (settles gracefully on load, reheats and ripples through neighbors when a node is dragged)
  // instead of the old "tick 400 times then freeze" snapshot.
  useEffect(() => {
    if (containerRef.current) themeRef.current = resolveTheme(containerRef.current);

    const degree = new Map<string, number>();
    const validIds = new Set(graphNotes.map((n) => n.path));
    const rawLinks: LinkMeta[] = [];
    const adjacency = new Map<string, Set<string>>();
    for (const n of graphNotes) adjacency.set(n.path, new Set());
    for (const n of graphNotes) {
      for (const l of n.links) {
        if (validIds.has(l.target) && l.target !== n.path) {
          rawLinks.push({ source: n.path, target: l.target });
          degree.set(n.path, (degree.get(n.path) || 0) + 1);
          degree.set(l.target, (degree.get(l.target) || 0) + 1);
          adjacency.get(n.path)!.add(l.target);
          adjacency.get(l.target)!.add(n.path);
        }
      }
    }
    adjacencyRef.current = adjacency;

    const phys = physicsForScale(graphNotes.length);
    const maxDegree = degree.size > 0 ? Math.max(...degree.values()) : 1;
    radiusBoundsRef.current = { minR: phys.minR, maxR: phys.maxR, maxDegree };

    // Plain random scatter to start, same as Obsidian: no pre-sorting into folders or topics, just
    // let link + charge + center pull it into shape from here.
    const seedRadius = 40 + Math.sqrt(graphNotes.length) * 8;
    const simNodes: SimNode[] = graphNotes.map((n) => {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * seedRadius;
      return {
        id: n.path,
        title: n.title,
        type: n.frontmatter.type,
        degree: degree.get(n.path) || 0,
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
        vx: 0,
        vy: 0,
      };
    });
    const simLinks: SimLink[] = rawLinks.map((l) => ({ source: l.source, target: l.target }));

    simNodesRef.current = simNodes;
    simLinksRef.current = simLinks;
    setNodeMetas(simNodes.map((n) => ({ id: n.id, title: n.title, type: n.type, degree: n.degree })));
    setLinkCount(rawLinks.length);

    simRef.current?.stop();
    const sim = forceSimulation(simNodes)
      .force(
        "link",
        forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance(phys.linkDistance)
          .strength(phys.linkStrength)
      )
      .force("charge", forceManyBody().strength(phys.charge))
      .force("center", forceCenter(0, 0))
      .force(
        "collide",
        forceCollide<SimNode>().radius((d) => radiusForDegree(d.degree, phys.minR, phys.maxR, maxDegree) + phys.collidePad)
      )
      .alphaDecay(0.02)
      .velocityDecay(0.42)
      .on("tick", drawFrame);
    simRef.current = sim;

    let raf = requestAnimationFrame(function loop() {
      drawFrame();
      raf = requestAnimationFrame(loop);
    });

    // First graceful settle, then fit the camera to the resting layout.
    const fitTimer = setTimeout(() => {
      fitToView(simNodesRef.current, size.width, size.height);
    }, 900);

    return () => {
      cancelAnimationFrame(raf);
      sim.stop();
      clearTimeout(fitTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphNotes, layoutVersion, drawFrame]);

  // Re-fit only on first size measurement (avoid re-fitting on every resize once user has interacted)
  const didInitialFit = useRef(false);
  useEffect(() => {
    if (!didInitialFit.current && simNodesRef.current.length > 0 && size.width > 0) {
      didInitialFit.current = true;
      fitToView(simNodesRef.current, size.width, size.height);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height, nodeMetas.length]);

  // Agents mode: poll for new MCP tool calls, light up the notes they touched, and keep a live feed.
  useEffect(() => {
    if (mode !== "agents") return;
    let sinceIso: string | null = new Date(Date.now() - 60000).toISOString();
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/agent-pulse${sinceIso ? `?since=${encodeURIComponent(sinceIso)}` : ""}`);
        const data = await res.json();
        if (cancelled) return;
        sinceIso = data.now;
        const events: AgentPulseEvent[] = data.events || [];
        if (events.length === 0) return;

        for (const ev of events) {
          for (const p of ev.paths) {
            pulseHeatRef.current.set(p, { kind: ev.kind, updatedAt: Date.now() });
            const n = simNodesRef.current.find((sn) => sn.id === p);
            if (n) {
              ringsRef.current = [...ringsRef.current.slice(-19), { x: n.x, y: n.y, color: KIND_RGB[ev.kind], start: Date.now() }];
            }
          }

          // Light up (and animate a pulse cascading down) the real path from Index to the note the
          // agent touched - Index -> category holder -> the note itself - not just the leaf. This is
          // the vault's actual structure via BFS over real links, not a guess, so it's correct
          // whether a note is one hop from Index or several.
          const primary = ev.paths[0];
          if (primary) {
            const path = pathFromIndex(adjacencyRef.current, primary);
            if (path.length > 1) {
              const now = Date.now();
              for (const nodeId of path) {
                pulseHeatRef.current.set(nodeId, { kind: ev.kind, updatedAt: now });
              }
              for (let i = 1; i < path.length; i++) {
                const key = `${ev.id}-hop-${i}`;
                const hopStart = now + (i - 1) * TRAVEL_DURATION_MS * 0.7;
                const duration = TRAVEL_DURATION_MS + Math.random() * 200;
                travelsRef.current.set(key, { fromId: path[i - 1], toId: path[i], start: hopStart, duration, color: KIND_RGB[ev.kind] });
              }
            }
          }
        }
        setFeed((prev) => [...events, ...prev].slice(0, 10));
      } catch {
        // transient fetch failure, just retry on the next interval
      }
    }

    poll();
    const interval = setInterval(poll, PULSE_POLL_MS);
    const tickInterval = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      clearInterval(tickInterval);
    };
  }, [mode]);

  const screenToGraph = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const v = viewRef.current;
    return {
      x: (clientX - rect.left - v.x) / v.k,
      y: (clientY - rect.top - v.y) / v.k,
    };
  }, []);

  const nodeAt = useCallback((graphX: number, graphY: number): SimNode | null => {
    const { minR, maxR, maxDegree } = radiusBoundsRef.current;
    let best: SimNode | null = null;
    let bestDist = Infinity;
    for (const n of simNodesRef.current) {
      const rad = radiusForDegree(n.degree, minR, maxR, maxDegree) + 3;
      const dx = graphX - n.x;
      const dy = graphY - n.y;
      const dist = dx * dx + dy * dy;
      if (dist <= rad * rad && dist < bestDist) {
        bestDist = dist;
        best = n;
      }
    }
    return best;
  }, []);

  // Native (non-passive) wheel listener so preventDefault works for zoom-to-cursor.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const v = viewRef.current;
      const scaleFactor = Math.pow(1.0015, -e.deltaY);
      const newK = clamp(v.k * scaleFactor, MIN_ZOOM, MAX_ZOOM);
      const graphX = (mouseX - v.x) / v.k;
      const graphY = (mouseY - v.y) / v.k;
      setView({ x: mouseX - graphX * newK, y: mouseY - graphY * newK, k: newK });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startClientX;
      const dy = e.clientY - drag.startClientY;
      if (Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) drag.moved = true;

      if (drag.type === "pan") {
        setView({ x: drag.startView.x + dx, y: drag.startView.y + dy, k: drag.startView.k });
      } else {
        const { x, y } = screenToGraph(e.clientX, e.clientY);
        const n = simNodesRef.current.find((n) => n.id === drag.id);
        if (n) {
          n.fx = x;
          n.fy = y;
        }
      }
    }
    function onMouseUp() {
      const drag = dragRef.current;
      if (!drag) return;
      if (drag.type === "node") {
        const n = simNodesRef.current.find((n) => n.id === drag.id);
        if (n) {
          n.fx = null;
          n.fy = null;
        }
        simRef.current?.alphaTarget(IDLE_ALPHA_TARGET);
        if (!drag.moved) onSelect(drag.id);
      }
      dragRef.current = null;
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenToGraph, onSelect]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const { x, y } = screenToGraph(e.clientX, e.clientY);
    const hit = nodeAt(x, y);
    if (hit) {
      dragRef.current = { type: "node", id: hit.id, startClientX: e.clientX, startClientY: e.clientY, moved: false };
      hit.fx = hit.x;
      hit.fy = hit.y;
      // Reheat the whole simulation so connected neighbors ripple with the drag instead of moving in isolation.
      simRef.current?.alphaTarget(DRAG_ALPHA_TARGET).restart();
    } else {
      dragRef.current = { type: "pan", startClientX: e.clientX, startClientY: e.clientY, startView: view, moved: false };
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (dragRef.current) return;
    const { x, y } = screenToGraph(e.clientX, e.clientY);
    const hit = nodeAt(x, y);
    setHovered((prev) => {
      const next = hit ? hit.id : null;
      return prev === next ? prev : next;
    });
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 relative bg-[var(--bg-0)] overflow-hidden select-none"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 60% 50% at 50% 45%, rgba(var(--accent-rgb),0.05), transparent 70%), radial-gradient(circle, var(--border-soft) 1px, transparent 1px)",
        backgroundSize: `auto, ${26 * view.k}px ${26 * view.k}px`,
        backgroundPosition: `0 0, ${view.x}px ${view.y}px`,
        cursor: dragRef.current?.type === "pan" ? "grabbing" : dragRef.current?.type === "node" ? "grabbing" : hovered ? "pointer" : "grab",
      }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={() => setHovered(null)}
      />

      {mode === "type" && (
        <div className="absolute bottom-4 left-4 flex flex-wrap gap-1.5 bg-[var(--bg-1)]/90 backdrop-blur-sm border border-[var(--border-soft)] rounded-full px-3 py-2 shadow-[var(--shadow-md)]">
          {vault.types.map((t) => {
            const active = typeFilter === t;
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(active ? null : t)}
                className={`flex items-center gap-1.5 text-[11px] px-1.5 py-0.5 rounded-full transition-colors ${
                  active ? "bg-[var(--accent-soft)] text-[var(--accent-bright)]" : "text-[var(--text-1)] hover:text-[var(--text-0)]"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: colorForType(t, vault.types), boxShadow: `0 0 6px ${colorForType(t, vault.types)}80` }}
                />
                {t}
              </button>
            );
          })}
        </div>
      )}

      {mode === "agents" && (
        <div className="absolute bottom-4 left-4 w-80 max-h-64 overflow-y-auto flex flex-col gap-1 bg-[var(--bg-1)]/90 backdrop-blur-sm border border-[var(--border-soft)] rounded-[var(--radius-md)] p-2.5 shadow-[var(--shadow-md)]">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-1)] px-1 pb-1">
            <Radio size={11} className="text-[var(--accent-bright)]" />
            Live agent activity
          </div>
          {feed.length === 0 && (
            <div className="text-[11px] text-[var(--text-2)] px-1 py-2">
              Nothing yet. Connect an MCP client (Settings, MCP Server) and it'll light up here as it reads and writes.
            </div>
          )}
          {feed.map((ev) => {
            const Icon = TOOL_ICON[ev.tool] || FileSearch;
            const noteLabel =
              ev.paths.length === 1
                ? vault.notes.find((n) => n.path === ev.paths[0])?.title || ev.paths[0]
                : ev.paths.length > 1
                  ? `${ev.paths.length} notes`
                  : ev.detail || "vault";
            return (
              <div key={ev.id} className="flex items-center gap-2 px-1 py-1 rounded-md text-[12px]">
                <span
                  className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                    ev.kind === "write" ? "text-[var(--accent-bright)] bg-[var(--accent-soft)]" : "text-[#5ec8e0] bg-[#5ec8e01a]"
                  }`}
                >
                  <Icon size={11} />
                </span>
                <span className="truncate flex-1 text-[var(--text-0)]">
                  <span className="text-[var(--text-2)]">{ev.kind === "write" ? "wrote" : "read"}</span> {noteLabel}
                </span>
                <span className="shrink-0 text-[10.5px] text-[var(--text-2)] font-mono">{relativeTime(ev.timestamp)}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="absolute top-4 right-4 flex items-center gap-2">
        <span className="text-[11px] text-[var(--text-2)] bg-[var(--bg-1)]/90 backdrop-blur-sm border border-[var(--border-soft)] rounded-full px-3 py-1.5">
          {nodeMetas.length} notes · {linkCount} links
        </span>
        <button
          onClick={() => fitToView(simNodesRef.current, size.width, size.height)}
          title="Fit to view"
          className="p-1.5 rounded-full bg-[var(--bg-1)]/90 backdrop-blur-sm border border-[var(--border-soft)] text-[var(--text-1)] hover:text-[var(--text-0)] transition-colors"
        >
          <Maximize2 size={13} />
        </button>
        <button
          onClick={() => setLayoutVersion((v) => v + 1)}
          title="Re-run layout"
          className="p-1.5 rounded-full bg-[var(--bg-1)]/90 backdrop-blur-sm border border-[var(--border-soft)] text-[var(--text-1)] hover:text-[var(--text-0)] transition-colors"
        >
          <RotateCcw size={13} />
        </button>
      </div>
    </div>
  );
}
