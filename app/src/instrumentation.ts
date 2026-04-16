export async function register() {
  // Only run on the server (not edge)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { cleanupOrphanedJobs } = await import("@/lib/claude-runner");
    cleanupOrphanedJobs();
  }
}
