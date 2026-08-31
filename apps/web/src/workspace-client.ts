import type { CanonicalWorkspaceSnapshot } from "@film/schema";
import type { Fetcher } from "./worker-client";

type WorkspaceSnapshotResponse = {
  ok?: boolean;
  snapshot?: CanonicalWorkspaceSnapshot;
  error?: string;
};

export async function readCanonicalWorkspaceSnapshot(
  workerUrl: string,
  csrfToken: string,
  workspaceId: string,
  fetcher: Fetcher = fetch,
): Promise<CanonicalWorkspaceSnapshot> {
  const response = await fetcher(`${workerUrl}/api/workspaces/current/snapshot`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-film-csrf": csrfToken,
    },
    body: JSON.stringify({ workspaceId }),
  });
  const body = (await response.json()) as WorkspaceSnapshotResponse;
  if (!response.ok || !body.snapshot) {
    throw new Error(body.error ?? "Workspace snapshot failed");
  }
  return body.snapshot;
}
