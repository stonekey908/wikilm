export type EditorialView =
  | "dashboard"
  | "wiki"
  | "sources"
  | "chat"
  | "lint"
  | "jobs"
  | "compose"
  | "settings";

export type FolioEntry = {
  view: EditorialView;
  num: string;
  name: string;
  label: string;
  path: string;
};

export const FOLIO: Record<EditorialView, FolioEntry> = {
  dashboard: { view: "dashboard", num: "01", name: "THE LEDGER", label: "Ledger", path: "/" },
  wiki: { view: "wiki", num: "02", name: "WIKI", label: "Wiki", path: "/wiki" },
  sources: { view: "sources", num: "03", name: "THE INTAKE", label: "Intake", path: "/sources" },
  chat: { view: "chat", num: "04", name: "THE SALON", label: "Chat", path: "/chat" },
  lint: { view: "lint", num: "05", name: "LINT · THE EDIT", label: "Lint", path: "/lint" },
  jobs: { view: "jobs", num: "06", name: "THE DISPATCH", label: "Dispatch", path: "/jobs" },
  compose: { view: "compose", num: "07", name: "DICTATION", label: "Dictation", path: "/compose" },
  settings: { view: "settings", num: "08", name: "THE PRESS", label: "Settings", path: "/settings" },
};

export const VIEW_ORDER: EditorialView[] = [
  "dashboard",
  "wiki",
  "sources",
  "chat",
  "lint",
  "jobs",
  "compose",
  "settings",
];

export function viewFromPath(pathname: string): EditorialView {
  if (pathname === "/" || pathname === "") return "dashboard";
  if (pathname.startsWith("/wiki")) return "wiki";
  if (pathname.startsWith("/sources")) return "sources";
  if (pathname.startsWith("/chat")) return "chat";
  if (pathname.startsWith("/lint")) return "lint";
  if (pathname.startsWith("/jobs")) return "jobs";
  if (pathname.startsWith("/compose")) return "compose";
  if (pathname.startsWith("/settings")) return "settings";
  return "dashboard";
}
