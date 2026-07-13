"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from "d3-force";
import { Maximize2, RotateCcw } from "lucide-react";
import type { VaultData } from "@/lib/types";
import { colorForType, isReservedFilename } from "@/lib/okfClient";

interface SimNode {
  id: string;
  title: string;
  type?: string;
  x: number;
  y: number;
}
interface SimLink {
  source: string;
  target: string;
}
interface RawSimNode extends SimNode {
  fx?: number | null;
  fy?: number | null;
}
interface ViewTransform {
  x: number;
  y: number;
  k: number;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const DRAG_THRESHOLD = 4;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
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
  const [nodes, setNodes] = useState<SimNode[]>([]);
  const [links, setLinks] = useState<SimLink[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [view, setView] = useState<ViewTransform>({ x: 0, y: 0, k: 1 });
  const [layoutVersion, setLayoutVersion] = useState(0);

  const dragRef = useRef<DragState | null>(null);
  const nodesRef = useRef<SimNode[]>([]);
  nodesRef.current = nodes;
  const viewRef = useRef<ViewTransform>(view);
  viewRef.current = view;

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

  const fitToView = useCallback((nodeList: SimNode[], width: number, height: number) => {
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

  useEffect(() => {
    const simNodes: RawSimNode[] = graphNotes.map((n) => ({
      id: n.path,
      title: n.title,
      type: n.frontmatter.type,
      x: 0,
      y: 0,
    }));
    const validIds = new Set(simNodes.map((n) => n.id));
    const simLinks: SimLink[] = [];
    for (const n of graphNotes) {
      for (const l of n.links) {
        if (validIds.has(l.target) && l.target !== n.path) {
          simLinks.push({ source: n.path, target: l.target });
        }
      }
    }

    const sim = forceSimulation(simNodes as any)
      .force(
        "link",
        forceLink(simLinks as any)
          .id((d: any) => d.id)
          .distance(170)
          .strength(0.22)
      )
      .force("charge", forceManyBody().strength(-520))
      .force("center", forceCenter(0, 0))
      .force("collide", forceCollide(62))
      .stop();

    for (let i = 0; i < 400; i++) sim.tick();

    const finalNodes = simNodes.map((n) => ({ id: n.id, title: n.title, type: n.type, x: n.x, y: n.y }));
    // d3-force mutates link.source/target from id strings into node object references while ticking; normalize back to ids.
    const finalLinks: SimLink[] = simLinks.map((l: any) => ({
      source: typeof l.source === "string" ? l.source : l.source.id,
      target: typeof l.target === "string" ? l.target : l.target.id,
    }));
    setNodes(finalNodes);
    setLinks(finalLinks);
    fitToView(finalNodes, size.width, size.height);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphNotes, layoutVersion]);

  // Re-fit only on first size measurement (avoid re-fitting on every resize once user has interacted)
  const didInitialFit = useRef(false);
  useEffect(() => {
    if (!didInitialFit.current && nodes.length > 0 && size.width > 0) {
      didInitialFit.current = true;
      fitToView(nodes, size.width, size.height);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height, nodes.length]);

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
        setNodes((prev) => prev.map((n) => (n.id === drag.id ? { ...n, x, y } : n)));
      }
    }
    function onMouseUp(e: MouseEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      if (drag.type === "node" && !drag.moved) {
        onSelect(drag.id);
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

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const neighborIds = useMemo(() => {
    const active = hovered || focusPath;
    if (typeFilter || !active || !nodeById.has(active)) return null;
    const set = new Set<string>([active]);
    for (const l of links) {
      if (l.source === active) set.add(l.target);
      if (l.target === active) set.add(l.source);
    }
    return set;
  }, [hovered, focusPath, links, typeFilter, nodes]);

  const isDimmed = (node: SimNode) => {
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
            {links.map((l, i) => {
              const s = nodeById.get(l.source);
              const t = nodeById.get(l.target);
              if (!s || !t) return null;
              const dim = isDimmed(s) || isDimmed(t);
              const dx = t.x - s.x;
              const dy = t.y - s.y;
              const dist = Math.hypot(dx, dy) || 1;
              // Gentle arc so crossing edges stay visually distinguishable instead of a flat spiderweb.
              const bow = Math.min(dist * 0.14, 26) * (l.source < l.target ? 1 : -1);
              const mx = (s.x + t.x) / 2 - (dy / dist) * bow;
              const my = (s.y + t.y) / 2 + (dx / dist) * bow;
              return (
                <path
                  key={i}
                  d={`M ${s.x} ${s.y} Q ${mx} ${my} ${t.x} ${t.y}`}
                  stroke={dim ? "var(--text-2)" : "var(--accent-dim)"}
                  strokeOpacity={dim ? 0.3 : 0.8}
                  strokeWidth={1.3 / view.k}
                  style={{ transition: "stroke-opacity 0.2s ease" }}
                />
              );
            })}
          </g>
          <g>
            {nodes.map((n) => {
              const dim = isDimmed(n);
              const isFocus = n.id === focusPath;
              const isHovered = hovered === n.id;
              const r = (isFocus ? 9.5 : isHovered ? 9 : 7) / view.k;
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x},${n.y})`}
                  onMouseEnter={() => setHovered(n.id)}
                  onMouseLeave={() => setHovered(null)}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    dragRef.current = { type: "node", id: n.id, startClientX: e.clientX, startClientY: e.clientY, moved: false };
                  }}
                  className="cursor-pointer"
                  opacity={dim ? 0.45 : 1}
                  style={{ transition: "opacity 0.2s ease" }}
                >
                  <circle r={14 / view.k} fill="transparent" />
                  <circle
                    r={r}
                    fill={colorForType(n.type, vault.types)}
                    stroke="var(--bg-0)"
                    strokeWidth={2 / view.k}
                    filter="url(#nodeShadow)"
                    style={{ transition: "r 0.15s ease" }}
                  />
                  <text
                    x={13 / view.k}
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
          {nodes.length} notes · {links.length} links
        </span>
        <button
          onClick={() => fitToView(nodesRef.current, size.width, size.height)}
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
