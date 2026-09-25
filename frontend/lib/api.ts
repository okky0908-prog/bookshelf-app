// Rails API の呼び出しをまとめる（docs/api.md）

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api";

/** api.md 3.2 のエラー形式 */
export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== "object" || value === null || !("error" in value)) return false;
  const error = (value as { error: unknown }).error;
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { code?: unknown }).code === "string" &&
    typeof (error as { message?: unknown }).message === "string"
  );
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Accept: "application/json", ...init.headers },
  });

  if (response.status === 204) return undefined as T;

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (isApiErrorBody(body)) {
      throw new ApiError(response.status, body.error.code, body.error.message, body.error.details);
    }
    throw new ApiError(
      response.status,
      "internal_error",
      "通信に失敗しました。時間をおいて再度お試しください",
    );
  }

  return body as T;
}
