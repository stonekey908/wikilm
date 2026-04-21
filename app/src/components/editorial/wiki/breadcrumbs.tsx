"use client";

import { useProject } from "@/components/project-switcher";
import { useRouter } from "next/navigation";

type Props = {
  showBack?: boolean;
  tail?: string;
};

export function EditorialBreadcrumbs({ showBack, tail }: Props) {
  const router = useRouter();
  const { activeProject, projects, setActiveProject } = useProject();

  if (!activeProject) return null;
  const segments = activeProject.slug.split("/");

  const crumbs = segments.map((seg, i) => {
    const ancestorSlug = segments.slice(0, i + 1).join("/");
    const match = projects.find((p) => p.slug === ancestorSlug);
    return { label: match?.name ?? seg, slug: ancestorSlug, exists: !!match };
  });

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {showBack && (
        <button
          type="button"
          className="crumb-back"
          onClick={() => router.push("/wiki")}
          title="Back to index"
        >
          ← Index
        </button>
      )}
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        const canClick = c.exists && !isLast;
        return (
          <span key={c.slug} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {i > 0 && <span className="crumb-sep">›</span>}
            {canClick ? (
              <button
                type="button"
                onClick={() => {
                  const p = projects.find((x) => x.slug === c.slug);
                  if (p) setActiveProject(p);
                }}
              >
                {c.label}
              </button>
            ) : (
              <span className={isLast ? "crumb-cur" : undefined}>{c.label}</span>
            )}
          </span>
        );
      })}
      {tail && (
        <>
          <span className="crumb-sep">›</span>
          <span className="crumb-cur">{tail}</span>
        </>
      )}
    </nav>
  );
}
