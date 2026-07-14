"use client";

import { useEffect, useState } from "react";
import { Minus, Square, X, Copy } from "lucide-react";

export default function WindowControls() {
  const [available, setAvailable] = useState(false);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const controls = window.amber?.windowControls;
    if (!controls) return;
    setAvailable(true);
    controls.isMaximized().then(setMaximized).catch(() => {});
    return controls.onMaximizedChange(setMaximized);
  }, []);

  if (!available) return null;

  const controls = window.amber!.windowControls!;

  return (
    <div className="app-no-drag flex items-stretch self-stretch -mr-4 ml-1">
      <button
        onClick={() => controls.minimize()}
        title="Minimize"
        className="w-11 flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-0)] hover:bg-[var(--bg-2)]"
      >
        <Minus size={14} />
      </button>
      <button
        onClick={() => controls.toggleMaximize()}
        title={maximized ? "Restore" : "Maximize"}
        className="w-11 flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-0)] hover:bg-[var(--bg-2)]"
      >
        {maximized ? <Copy size={12} className="-scale-x-100" /> : <Square size={11} />}
      </button>
      <button
        onClick={() => controls.close()}
        title="Close"
        className="w-11 flex items-center justify-center text-[var(--text-2)] hover:text-white hover:bg-[#e14a3f]"
      >
        <X size={15} />
      </button>
    </div>
  );
}
