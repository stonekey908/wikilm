"use client";

import { useProject } from "@/components/project-switcher";

interface Props {
  project: { slug: string; name?: string } | null;
}

/**
 * Breadcrumbs for nested projects. Renders "root › child › grand" on pages
 * inside a nested project, where each earlier segment is a clickable link
 * that switches the active project to that ancestor. Flat projects (slug
 * without `/`) render nothing.
 */
export function Breadcrumbs({ project }: Props) {
  const { projects, setActiveProject } = useProject();

  if (!project || !project.slug.includes("/")) return null;

  const segments = project.slug.split("/");
  const crumbs: { label: string; slug: string; exists: boolean }[] = [];
  for (let i = 0; i < segments.length; i++) {
    const ancestorSlug = segments.slice(0, i + 1).join("/");
    const match = projects.find((p) => p.slug === ancestorSlug);
    crumbs.push({
      label: match?.name ?? segments[i],
      slug: ancestorSlug,
      exists: !!match,
    });
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-[13px] text-[var(--text-3)] mb-4 flex-wrap"
    >
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={c.slug} className="flex items-center gap-1">
            {i > 0 && (
              <span className="text-[var(--text-4)]" aria-hidden="true">
                ›
              </span>
            )}
            {c.exists && !isLast ? (
              <button
                type="button"
                onClick={() => {
                  const proj = projects.find((p) => p.slug === c.slug);
                  if (proj) setActiveProject(proj);
                }}
                className="hover:text-[var(--text-1)] hover:underline underline-offset-2"
              >
                {c.label}
              </button>
            ) : (
              <span className={isLast ? "text-[var(--text-1)] font-[550]" : ""}>
                {c.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
