"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, type Simulation } from "d3-force";
import { Maximize2, RotateCcw } from "lucide-react";
import type { VaultData } from "@/lib/types";
import { colorForType, isReservedFilename } from "@/lib/okfClient";

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

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const DRAG_THRESHOLD = 4;
const MIN_RADIUS = 6;
const MAX_RADIUS = 20;
const IDLE_ALPHA_TARGET = 0;
const DRAG_ALPHA_TARGET = 0.35;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function radiusForDegree(degree: number) {
  return clamp(MIN_RADIUS + Math.sqrt(degree) * 3.4, MIN_RADIUS, MAX_RADIUS);
}

type DragState =
  | { type: "pan"; startClientX: number; startClientY: number; startView: ViewTransform; moved: boolean }
  | { type: "node"; id: string; startClientX: number; startClientY: number; moved: boolean };

export default function GraphView({
  vault,
  onSelect,
  focusPath,
}: {
  vault: VaultData;
  onSelect: (path: string) => void;
  focusPath: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [nodeMetas, setNodeMetas] = useState<NodeMeta[]>([]);
  const [linkMetas, setLinkMetas] = useState<LinkMeta[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [view, setView] = useState<ViewTransform>({ x: 0, y: 0, k: 1 });
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [linkCount, setLinkCount] = useState(0);

  const dragRef = useRef<DragState | null>(null);
  const viewRef = useRef<ViewTransform>(view);
  viewRef.current = view;

  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null);
  const simNodesRef = useRef<SimNode[]>([]);
  const simLinksRef = useRef<SimLink[]>([]);
  const nodeElRefs = useRef<Map<string, SVGGElement>>(new Map());
  const linkElRefs = useRef<Map<number, SVGPathElement>>(new Map());

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

  const graphNotes = useMemo(() => vault.notes.filter((n) => !isReservedFilename(n.filename)), [vault.notes]);

  const fitToView = useCallback((nodeList: { x: number; y: number }[], width: number, height: number) => {
    if (nodeList.length === 0) {
      setView({ x: width / 2, y: height / 2, k: 1 });
      return;
    }
    const xs = nodeList.map((n) => n.x);
    const ys = nodeList.map((n) => n.y);
    // Extra padding on the right accounts for labels extending past each node.
    const minX = Math.min(...xs) - 40;
    const maxX = Math.max(...xs) + 130;
    const minY = Math.min(...ys) - 40;
    const maxY = Math.max(...ys) + 40;
    const spanX = Math.max(maxX - minX, 1);
    const spanY = Math.max(maxY - minY, 1);
    const k = clamp(Math.min(width / spanX, height / spanY) * 0.92, MIN_ZOOM, MAX_ZOOM);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setView({ x: width / 2 - cx * k, y: height / 2 - cy * k, k });
  }, []);

  // Render one animation frame: push current d3 node/link positions straight to the DOM,
  // bypassing React state so the simulation can run continuously at 60fps.
  const renderFrame = useCallback(() => {
    for (const n of simNodesRef.current) {
      const el = nodeElRefs.current.get(n.id);
      if (el) el.setAttribute("transform", `translate(${n.x},${n.y})`);
    }
    for (let i = 0; i < simLinksRef.current.length; i++) {
      const l = simLinksRef.current[i];
      const s = l.source as SimNode;
      const t = l.target as SimNode;
      const el = linkElRefs.current.get(i);
      if (!el || typeof s !== "object" || typeof t !== "object") continue;
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.hypot(dx, dy) || 1;
      const bow = Math.min(dist * 0.14, 26) * (s.id < t.id ? 1 : -1);
      const mx = (s.x + t.x) / 2 - (dy / dist) * bow;
      const my = (s.y + t.y) / 2 + (dx / dist) * bow;
      el.setAttribute("d", `M ${s.x} ${s.y} Q ${mx} ${my} ${t.x} ${t.y}`);
    }
  }, []);

  // Build the simulation whenever the vault's link graph changes, and let it run continuously
  // (settles gracefully on load, reheats and ripples through neighbors when a node is dragged)
  // instead of the old "tick 400 times then freeze" snapshot.
  useEffect(() => {
    const degree = new Map<string, number>();
    const validIds = new Set(graphNotes.map((n) => n.path));
    const rawLinks: LinkMeta[] = [];
    for (const n of graphNotes) {
      for (const l of n.links) {
        if (validIds.has(l.target) && l.target !== n.path) {
          rawLinks.push({ source: n.path, target: l.target });
          degree.set(n.path, (degree.get(n.path) || 0) + 1);
          degree.set(l.target, (degree.get(l.target) || 0) + 1);
        }
      }
    }

    const angleStep = (Math.PI * 2) / Math.max(graphNotes.length, 1);
    const simNodes: SimNode[] = graphNotes.map((n, i) => {
      const r = 60 + (i % 5) * 30;
      return {
        id: n.path,
        title: n.title,
        type: n.frontmatter.type,
        degree: degree.get(n.path) || 0,
        x: Math.cos(i * angleStep) * r,
        y: Math.sin(i * angleStep) * r,
        vx: 0,
        vy: 0,
      };
    });
    const simLinks: SimLink[] = rawLinks.map((l) => ({ source: l.source, target: l.target }));

    simNodesRef.current = simNodes;
    simLinksRef.current = simLinks;
    setNodeMetas(simNodes.map((n) => ({ id: n.id, title: n.title, type: n.type, degree: n.degree })));
    setLinkMetas(rawLinks);
    setLinkCount(rawLinks.length);
    nodeElRefs.current.clear();
    linkElRefs.current.clear();

    simRef.current?.stop();
    const sim = forceSimulation(simNodes)
      .force(
        "link",
        forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance(170)
          .strength(0.22)
      )
      .force("charge", forceManyBody().strength(-520))
      .force("center", forceCenter(0, 0))
      .force(
        "collide",
        forceCollide<SimNode>().radius((d) => radiusForDegree(d.degree) + 14)
      )
      .alphaDecay(0.018)
      .velocityDecay(0.38)
      .on("tick", renderFrame);
    simRef.current = sim;

    let raf = requestAnimationFrame(function loop() {
      renderFrame();
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
  }, [graphNotes, layoutVersion, renderFrame]);

  // Re-fit only on first size measurement (avoid re-fitting on every resize once user has interacted)
  const didInitialFit = useRef(false);
  useEffect(() => {
    if (!didInitialFit.current && simNodesRef.current.length > 0 && size.width > 0) {
      didInitialFit.current = true;
      fitToView(simNodesRef.current, size.width, size.height);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height, nodeMetas.length]);

  const screenToGraph = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const v = viewRef.current;
    return {
      x: (clientX - rect.left - v.x) / v.k,
      y: (clientY - rect.top - v.y) / v.k,
    };
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

  const startNodeDrag = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    dragRef.current = { type: "node", id, startClientX: e.clientX, startClientY: e.clientY, moved: false };
    const n = simNodesRef.current.find((n) => n.id === id);
    if (n) {
      n.fx = n.x;
      n.fy = n.y;
    }
    // Reheat the whole simulation so connected neighbors ripple with the drag instead of moving in isolation.
    simRef.current?.alphaTarget(DRAG_ALPHA_TARGET).restart();
  };

  const neighborIds = useMemo(() => {
    const active = hovered || focusPath;
    const knownIds = new Set(nodeMetas.map((n) => n.id));
    if (typeFilter || !active || !knownIds.has(active)) return null;
    const set = new Set<string>([active]);
    for (const l of linkMetas) {
      if (l.source === active) set.add(l.target);
      if (l.target === active) set.add(l.source);
    }
    return set;
  }, [hovered, focusPath, linkMetas, typeFilter, nodeMetas]);

  const isDimmed = (node: NodeMeta) => {
    if (typeFilter) return node.type !== typeFilter;
    return neighborIds ? !neighborIds.has(node.id) : false;
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 relative bg-[var(--bg-0)] overflow-hidden select-none"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 60% 50% at 50% 45%, rgba(var(--accent-rgb),0.06), transparent 70%), radial-gradient(circle, var(--border-soft) 1px, transparent 1px)",
        backgroundSize: `auto, ${26 * view.k}px ${26 * view.k}px`,
        backgroundPosition: `0 0, ${view.x}px ${view.y}px`,
        cursor: dragRef.current?.type === "pan" ? "grabbing" : "grab",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget || (e.target as Element).tagName === "svg") {
          dragRef.current = { type: "pan", startClientX: e.clientX, startClientY: e.clientY, startView: view, moved: false };
        }
      }}
    >
      <svg
        width={size.width}
        height={size.height}
        className="absolute inset-0"
        onMouseDown={(e) => {
          if (e.currentTarget === e.target) {
            dragRef.current = { type: "pan", startClientX: e.clientX, startClientY: e.clientY, startView: view, moved: false };
          }
        }}
      >
        <defs>
          <filter id="nodeShadow" x="-100%" y="-100%" width="300%" height="300%">
            <feDropShadow dx="0" dy="1" stdDeviation="2.5" floodColor="#000" floodOpacity="0.45" />
          </filter>
        </defs>
        <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
          <g fill="none">
            {linkMetas.map((l, i) => {
              const s = nodeMetas.find((n) => n.id === l.source);
              const t = nodeMetas.find((n) => n.id === l.target);
              if (!s || !t) return null;
              const dim = isDimmed(s) || isDimmed(t);
              return (
                <path
                  key={i}
                  ref={(el) => {
                    if (el) linkElRefs.current.set(i, el);
                    else linkElRefs.current.delete(i);
                  }}
                  stroke={dim ? "var(--text-2)" : "var(--accent-dim)"}
                  strokeOpacity={dim ? 0.3 : 0.8}
                  strokeWidth={1.3 / view.k}
                  style={{ transition: "stroke-opacity 0.2s ease" }}
                />
              );
            })}
          </g>
          <g>
            {nodeMetas.map((n) => {
              const dim = isDimmed(n);
              const isFocus = n.id === focusPath;
              const isHovered = hovered === n.id;
              const baseR = radiusForDegree(n.degree);
              const r = (isFocus ? baseR + 2.5 : isHovered ? baseR + 2 : baseR) / view.k;
              return (
                <g
                  key={n.id}
                  ref={(el) => {
                    if (el) nodeElRefs.current.set(n.id, el);
                    else nodeElRefs.current.delete(n.id);
                  }}
                  onMouseEnter={() => setHovered(n.id)}
                  onMouseLeave={() => setHovered(null)}
                  onMouseDown={(e) => startNodeDrag(e, n.id)}
                  className="cursor-pointer"
                  opacity={dim ? 0.45 : 1}
                  style={{ transition: "opacity 0.2s ease" }}
                >
                  <circle r={(baseR + 8) / view.k} fill="transparent" />
                  <circle
                    r={r}
                    fill={colorForType(n.type, vault.types)}
                    stroke="var(--bg-0)"
                    strokeWidth={2 / view.k}
                    filter="url(#nodeShadow)"
                    style={{ transition: "r 0.15s ease" }}
                  />
                  <text
                    x={(baseR + 6) / view.k}
                    y={4 / view.k}
                    fontSize={12 / view.k}
                    fontWeight={isFocus || isHovered ? 600 : 500}
                    fill={isFocus || isHovered ? "var(--text-0)" : "var(--text-1)"}
                    stroke="var(--bg-0)"
                    strokeWidth={3 / view.k}
                    strokeOpacity={0.85}
                    style={{
                      pointerEvents: "none",
                      userSelect: "none",
                      transition: "fill 0.15s ease",
                      paintOrder: "stroke",
                    }}
                  >
                    {n.title}
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>

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
