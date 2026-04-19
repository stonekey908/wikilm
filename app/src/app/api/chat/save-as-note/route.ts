import { NextRequest } from "next/server";
import path from "path";
import fs from "fs";
import { db } from "@/db";
import { sources } from "@/db/schema";
import { getProject, projectRoot } from "@/lib/projects";
import { startJob } from "@/lib/claude-runner";
import { parseFrontmatter } from "@/lib/wiki-utils";

/**
 * POST /api/chat/save-as-note
 *
 * Body: { messages: Array<{ role, content }>, projectId }
 *
 * Summarises a chat thread into a structured pending note. Spawns a Claude
 * subprocess with a summariser prompt that writes directly to
 * `raw/chat-<slug>.md` in the project's raw dir. The onComplete hook reads
 * the file back, parses the frontmatter, and inserts a `sources` row with
 * `status: "pending"` so the note shows up in `/sources` for the user to
 * curate before ingest.
 *
 * Returns { jobId, rawRelPath } immediately. Clients poll /api/claude/job/:id.
 */

interface ChatMessage {
  role: "user" | "assistant" | string;
  content: string;
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "chat-note"
  );
}

function buildSummariserPrompt(
  messages: ChatMessage[],
  rawRelPath: string,
  dateIso: string
): string {
  const transcript = messages
    .map((m) => {
      const role = m.role === "assistant" ? "Assistant" : m.role === "user" ? "User" : m.role;
      return `### ${role}\n\n${m.content}`;
    })
    .join("\n\n");

  return [
    `Summarise this chat conversation as a WikiLM note and write it to \`${rawRelPath}\`.`,
    "",
    "Write the file with this exact structure:",
    "",
    "```",
    "---",
    'title: "<one specific phrase capturing the topic>"',
    `date: "${dateIso}"`,
    'tags: [<2-5 kebab-case tags>]',
    "---",
    "",
    "# <same title as frontmatter>",
    "",
    "## Overview",
    "",
    "<one-paragraph overview of what was discussed>",
    "",
    "## Key points",
    "",
    "- <bulleted key points, each tied to something actually said>",
    "",
    "## Open questions",
    "",
    "- <things discussed but not resolved>",
    "```",
    "",
    "The note will later be ingested and turned into concept/entity pages, so preserve anything worth linking verbatim — names, numbers, specific claims, quotes.",
    "",
    "Do not add commentary outside the file. Write the file and stop.",
    "",
    "--- BEGIN TRANSCRIPT ---",
    "",
    transcript,
    "",
    "--- END TRANSCRIPT ---",
  ].join("\n");
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
  const projectIdInput = typeof body?.projectId === "number" ? body.projectId : 1;

  if (messages.length < 2) {
    return Response.json(
      { error: "Need at least 2 messages to summarise" },
      { status: 400 }
    );
  }

  const project = getProject(projectIdInput) ?? getProject(1);
  if (!project) {
    return Response.json({ error: "No project found" }, { status: 404 });
  }

  // Derive a filename hint from the first user message; the subprocess
  // picks the actual title via frontmatter.
  const firstUserMsg = messages.find((m) => m.role === "user")?.content ?? "chat";
  const hhmm = new Date().toISOString().slice(11, 16).replace(":", "");
  const dateIso = new Date().toISOString().slice(0, 10);
  const slugBase = slugify(firstUserMsg.slice(0, 60));
  const filename = `chat-${dateIso}-${hhmm}-${slugBase}.md`;
  const rawRelPath = `raw/${filename}`;

  const projectCwd = projectRoot(project);
  const rawAbsPath = path.join(projectCwd, "raw", filename);
  fs.mkdirSync(path.dirname(rawAbsPath), { recursive: true });

  const prompt = buildSummariserPrompt(messages, rawRelPath, dateIso);

  const jobId = await startJob({
    prompt,
    projectCwd,
    projectId: project.id,
    type: "note-summary",
    title: `Summarise chat: ${firstUserMsg.slice(0, 40)}${firstUserMsg.length > 40 ? "…" : ""}`,
    onComplete: (status) => {
      if (status !== "completed") return;
      try {
        if (!fs.existsSync(rawAbsPath)) {
          console.error(`[chat-to-note] subprocess finished without writing ${rawAbsPath}`);
          return;
        }
        const raw = fs.readFileSync(rawAbsPath, "utf-8");
        const { meta } = parseFrontmatter(raw);
        const title =
          typeof meta.title === "string" && meta.title.trim().length > 0
            ? meta.title.trim()
            : `Chat note — ${dateIso}`;
        const tags = Array.isArray(meta.tags)
          ? meta.tags.filter((t): t is string => typeof t === "string")
          : [];

        db.insert(sources)
          .values({
            projectId: project.id,
            title,
            type: "note",
            filePath: rawRelPath,
            meta: JSON.stringify({ tags, programmatic: true, source: "chat-to-note" }),
            status: "pending",
          })
          .run();
      } catch (err) {
        console.error("[chat-to-note] post-job hook failed:", err);
      }
    },
  });

  return Response.json({ jobId, rawRelPath, projectId: project.id }, { status: 201 });
}
