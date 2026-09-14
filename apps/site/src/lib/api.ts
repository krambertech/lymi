export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Which public page someone joined from. */
export type BetaSource = "landing" | "join" | "languages" | "estonian";

export async function joinBeta(
  email: string,
  source: BetaSource = "landing",
): Promise<{ alreadyOn: boolean }> {
  const response = await fetch("/api/beta", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, source }),
  });
  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {}
    throw new ApiError(response.status, message);
  }
  return response.json();
}
