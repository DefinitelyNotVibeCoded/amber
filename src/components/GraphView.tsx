"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from "d3-force";
import type { VaultData } from "@/lib/types";
import { colorForType, isReservedFilename } from "@/lib/okfClient";

interface SimNode {
  id: string;
  title: string;
  type?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}
interface SimLink {
  source: string | SimNode;
  target: string | SimNode;
}

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

  useEffect(() => {
    const simNodes: SimNode[] = graphNotes.map((n) => ({
      id: n.path,
      title: n.title,
      type: n.frontmatter.type,
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
          .distance(90)
          .strength(0.5)
      )
      .force("charge", forceManyBody().strength(-220))
      .force("center", forceCenter(size.width / 2, size.height / 2))
      .force("collide", forceCollide(28))
      .stop();

    for (let i = 0; i < 300; i++) sim.tick();

    setNodes([...simNodes]);
    setLinks(simLinks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphNotes, size.width, size.height]);

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const neighborIds = useMemo(() => {
    const active = hovered || focusPath;
    if (!active) return null;
    const set = new Set<string>([active]);
    for (const l of links) {
      const s = typeof l.source === "string" ? l.source : l.source.id;
      const t = typeof l.target === "string" ? l.target : l.target.id;
      if (s === active) set.add(t);
      if (t === active) set.add(s);
    }
    return set;
  }, [hovered, focusPath, links]);

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 relative bg-[var(--bg-0)] overflow-hidden"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 60% 50% at 50% 45%, rgba(227,170,74,0.06), transparent 70%), radial-gradient(circle, var(--border-soft) 1px, transparent 1px)",
        backgroundSize: "auto, 26px 26px",
      }}
    >
      <svg width={size.width} height={size.height} className="absolute inset-0">
        <defs>
          <filter id="nodeShadow" x="-100%" y="-100%" width="300%" height="300%">
            <feDropShadow dx="0" dy="1" stdDeviation="2.5" floodColor="#000" floodOpacity="0.45" />
          </filter>
        </defs>
        <g>
          {links.map((l, i) => {
            const s = typeof l.source === "string" ? nodeById.get(l.source) : (l.source as SimNode);
            const t = typeof l.target === "string" ? nodeById.get(l.target) : (l.target as SimNode);
            if (!s || !t) return null;
            const dim = neighborIds && (!neighborIds.has(s.id) || !neighborIds.has(t.id));
            return (
              <line
                key={i}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke={dim ? "var(--border)" : "var(--accent-dim)"}
                strokeOpacity={dim ? 0.3 : 0.85}
                strokeWidth={1}
                style={{ transition: "stroke-opacity 0.2s ease" }}
              />
            );
          })}
        </g>
        <g>
          {nodes.map((n) => {
            const dim = neighborIds && !neighborIds.has(n.id);
            const isFocus = n.id === focusPath;
            const isHovered = hovered === n.id;
            const r = isFocus ? 8 : isHovered ? 7.5 : 6;
            return (
              <g
                key={n.id}
                transform={`translate(${n.x},${n.y})`}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSelect(n.id)}
                className="cursor-pointer"
                opacity={dim ? 0.3 : 1}
                style={{ transition: "opacity 0.2s ease" }}
              >
                {/* generous invisible hit area, easier to click than the visible dot */}
                <circle r={14} fill="transparent" />
                <circle
                  r={r}
                  fill={colorForType(n.type, vault.types)}
                  stroke="var(--bg-0)"
                  strokeWidth={2}
                  filter="url(#nodeShadow)"
                  style={{ transition: "r 0.15s ease" }}
                />
                <text
                  x={11}
                  y={4}
                  fontSize={11.5}
                  fontWeight={isFocus || isHovered ? 600 : 400}
                  fill={isFocus || isHovered ? "var(--text-0)" : "var(--text-1)"}
                  style={{ pointerEvents: "none", userSelect: "none", transition: "fill 0.15s ease" }}
                >
                  {n.title}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <div className="absolute bottom-4 left-4 flex flex-wrap gap-3 bg-[var(--bg-1)]/90 backdrop-blur-sm border border-[var(--border-soft)] rounded-full px-3.5 py-2 shadow-[var(--shadow-md)]">
        {vault.types.map((t) => (
          <div key={t} className="flex items-center gap-1.5 text-[11px] text-[var(--text-1)]">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: colorForType(t, vault.types), boxShadow: `0 0 6px ${colorForType(t, vault.types)}80` }}
            />
            {t}
          </div>
        ))}
      </div>

      <div className="absolute top-4 right-4 text-[11px] text-[var(--text-2)] bg-[var(--bg-1)]/90 backdrop-blur-sm border border-[var(--border-soft)] rounded-full px-3 py-1.5">
        {nodes.length} notes · {links.length} links
      </div>
    </div>
  );
}
