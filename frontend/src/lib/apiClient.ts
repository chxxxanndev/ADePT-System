const API_BASE_URL = "http://localhost:5000";

interface ApiFetchOptions extends RequestInit {
    skipAuth?: boolean;
}

/**
 * fetch wrapper that automatically attaches the adept_token (if present)
 * and throws a normalized Error on non-2xx responses.
 */
export async function apiFetch<T = unknown>(
    path: string,
    options: ApiFetchOptions = {}
): Promise<T> {
    const { skipAuth, headers, ...rest } = options;

    const token = localStorage.getItem("adept_token");

    const res = await fetch(`${API_BASE_URL}${path}`, {
        ...rest,
        headers: {
            "Content-Type": "application/json",
            ...(token && !skipAuth ? { Authorization: `Bearer ${token}` } : {}),
            ...headers,
        },
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(body.error ?? `Request failed (${res.status})`);
    }

    return body as T;
}