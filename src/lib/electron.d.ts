export {};

declare global {
  interface Window {
    amber?: {
      isElectron: true;
      pickFolder: () => Promise<string | null>;
      revealInFolder: (absPath: string) => Promise<void>;
      windowControls?: {
        minimize: () => void;
        toggleMaximize: () => void;
        close: () => void;
        isMaximized: () => Promise<boolean>;
        onMaximizedChange: (callback: (maximized: boolean) => void) => () => void;
      };
    };
  }
}
