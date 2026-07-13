export {};

declare global {
  interface Window {
    amber?: {
      isElectron: true;
      pickFolder: () => Promise<string | null>;
      revealInFolder: (absPath: string) => Promise<void>;
    };
  }
}
