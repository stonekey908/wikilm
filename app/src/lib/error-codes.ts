/**
 * Friendly UI messages for structured job failures.
 *
 * The jobs table stores an `errorCode` (nullable) alongside the raw `error`
 * string. UI surfaces (toast, /jobs page, dashboard) branch on `errorCode`
 * and use these helpers to render a message that tells the user what to do,
 * not just what happened.
 */

export type JobErrorCode =
  | "provider_unavailable"
  | "model_not_found"
  | "auth_failed"
  | "rate_limited"
  | "timeout"
  | "unknown";

export interface JobErrorMessage {
  title: string;
  description: string;
}

export function formatJobError(
  errorCode: string | null | undefined,
  rawError: string | null | undefined
): JobErrorMessage {
  const raw = rawError ?? "Job failed without a specific error.";
  switch (errorCode) {
    case "provider_unavailable":
      return { title: "Provider unavailable", description: raw };
    case "model_not_found":
      return { title: "Model not found", description: raw };
    case "auth_failed":
      return { title: "Authentication failed", description: raw };
    case "rate_limited":
      return { title: "Rate limited", description: raw };
    case "timeout":
      return { title: "Timed out", description: raw };
    default:
      return { title: "Job failed", description: raw };
  }
}

/** Minimal shape of what trigger endpoints should return alongside jobId. */
export interface JobTriggerState {
  jobId: number;
  status: string;
  error?: string | null;
  errorCode?: string | null;
}

export function isFailedInitialState(state: JobTriggerState): boolean {
  return state.status === "failed";
}
