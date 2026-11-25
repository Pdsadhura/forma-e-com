import { API_URL, type ApiErrorBody } from "./types";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: Array<{ path: string; message: string }>;

  constructor(message: string, status: number, code?: string, details?: Array<{ path: string; message: string }>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new ApiError("The store API is unreachable. Check that the backend is running and NEXT_PUBLIC_API_URL is correct.", 0);
  }
  if (response.status === 204) return undefined as T;
  const payload = (await response.json().catch(() => null)) as (ApiErrorBody & T) | null;
  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message || "Something went wrong",
      response.status,
      payload?.error?.code,
      payload?.error?.details,
    );
  }
  return payload as T;
}

export async function serverGet<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_URL}${path}`, { next: { revalidate: 30 } });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
