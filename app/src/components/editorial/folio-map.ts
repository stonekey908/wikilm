export type EditorialView = "dashboard" | "wiki" | "sources" | "jobs" | "graph" | "compose";

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
  jobs: { view: "jobs", num: "04", name: "THE DISPATCH", label: "Dispatch", path: "/jobs" },
  graph: { view: "graph", num: "05", name: "THE MAP", label: "Map", path: "/graph" },
  compose: { view: "compose", num: "06", name: "DICTATION", label: "Dictation", path: "/compose" },
};

export const VIEW_ORDER: EditorialView[] = ["dashboard", "wiki", "sources", "jobs", "graph", "compose"];

export function viewFromPath(pathname: string): EditorialView {
  if (pathname === "/" || pathname === "") return "dashboard";
  if (pathname.startsWith("/wiki")) return "wiki";
  if (pathname.startsWith("/sources")) return "sources";
  if (pathname.startsWith("/jobs")) return "jobs";
  if (pathname.startsWith("/graph")) return "graph";
  if (pathname.startsWith("/compose")) return "compose";
  return "dashboard";
}
