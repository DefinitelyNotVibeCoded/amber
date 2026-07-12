export interface OkfFrontmatter {
  type: string;
  title?: string;
  description?: string;
  resource?: string;
  tags?: string[];
  timestamp?: string;
  [key: string]: unknown;
}

export interface OkfLink {
  text: string;
  target: string; // resolved bundle-relative path, e.g. /concepts/okf.md
  raw: string; // raw href as written
}

export interface OkfNote {
  path: string; // bundle-relative path, e.g. /concepts/okf.md
  filename: string;
  dir: string;
  frontmatter: OkfFrontmatter;
  title: string;
  body: string;
  links: OkfLink[]; // outgoing links resolved to other notes in the bundle
  backlinks: string[]; // paths of notes linking to this one
  wordCount: number;
}

export interface OkfTreeNode {
  name: string;
  path: string; // bundle-relative path (dir or file)
  isDir: boolean;
  type?: string; // frontmatter type, files only
  children?: OkfTreeNode[];
}

export interface VaultData {
  root: string; // absolute filesystem path of the vault
  notes: OkfNote[];
  tree: OkfTreeNode[];
  tags: string[];
  types: string[];
}
