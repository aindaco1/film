export type CanonicalDocumentMarkdownUpdate = {
  id: string;
  projectId: string;
  markdownLength: number;
  markdownBytes: number;
  markdownSha256?: string;
  updatedAt: string;
};

type DocumentMarkdownUpdateResponse = {
  ok?: boolean;
  dryRun?: boolean;
  destructiveWrite?: boolean;
  persistence?: string;
  auditPersistence?: string;
  document?: CanonicalDocumentMarkdownUpdate;
  error?: string;
};

type Fetcher = typeof fetch;

export async function saveCanonicalDocumentMarkdown(
  workerUrl: string,
  csrfToken: string,
  request: {
    workspaceId: string;
    projectId: string;
    documentId: string;
    markdownSnapshot: string;
    expectedUpdatedAt: string;
  },
  fetcher: Fetcher = fetch,
): Promise<CanonicalDocumentMarkdownUpdate> {
  const response = await fetcher(`${workerUrl}/api/documents/markdown`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-film-csrf": csrfToken,
    },
    body: JSON.stringify(request),
  });
  const body = (await response.json()) as DocumentMarkdownUpdateResponse;
  if (!response.ok || !body.document) {
    throw new Error(body.error ?? "Document save failed");
  }
  return body.document;
}
