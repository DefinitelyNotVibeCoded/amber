"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VaultData } from "@/lib/types";
import { makePluginContext, loadPlugin, type PluginCommand } from "@/lib/pluginHost";

export interface PluginNotice {
  id: string;
  message: string;
}

/** Loads every enabled plugin once per app session and wires their context callbacks into React
 * state: registered commands feed the command palette, note-open subscriptions fire from
 * notifyNoteOpen(), and notices render as a toast stack. Plugins are not reloaded when the vault
 * refreshes - their vault.* accessors read live data on every call instead (see pluginHost.ts). */
export function usePlugins(vault: VaultData | null) {
  const [commands, setCommands] = useState<PluginCommand[]>([]);
  const [notices, setNotices] = useState<PluginNotice[]>([]);
  const vaultRef = useRef<VaultData | null>(vault);
  vaultRef.current = vault;
  const noteOpenListenersRef = useRef<Set<(path: string) => void>>(new Set());
  const startedRef = useRef(false);

  const showNotice = useCallback((message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setNotices((prev) => [...prev, { id, message }]);
    setTimeout(() => setNotices((prev) => prev.filter((n) => n.id !== id)), 6000);
  }, []);

  const dismissNotice = useCallback((id: string) => {
    setNotices((prev) => prev.filter((n) => n.id !== id));
  }, []);

  useEffect(() => {
    if (!vault || startedRef.current) return;
    startedRef.current = true;

    (async () => {
      let plugins: { filename: string; enabled: boolean }[] = [];
      try {
        const res = await fetch("/api/plugins");
        const data = await res.json();
        plugins = data.plugins || [];
      } catch {
        return; // no plugins folder, or the request failed - nothing to load
      }

      for (const p of plugins.filter((p) => p.enabled)) {
        const ctx = makePluginContext(() => vaultRef.current!, {
          onRegisterCommand: (cmd) => setCommands((prev) => [...prev.filter((c) => c.id !== cmd.id), cmd]),
          onSubscribeNoteOpen: (cb) => {
            noteOpenListenersRef.current.add(cb);
            return () => noteOpenListenersRef.current.delete(cb);
          },
          onShowNotice: showNotice,
        });
        await loadPlugin(p.filename, ctx);
      }
    })();
  }, [vault, showNotice]);

  const notifyNoteOpen = useCallback(
    (path: string) => {
      for (const cb of noteOpenListenersRef.current) {
        try {
          cb(path);
        } catch (err) {
          showNotice(`A plugin's note-open handler threw: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    },
    [showNotice]
  );

  return { commands, notices, dismissNotice, notifyNoteOpen };
}
