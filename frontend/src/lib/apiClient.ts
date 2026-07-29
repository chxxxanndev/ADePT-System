import { supabase } from '../lib/supabaseClient';

const API_BASE_URL = "http://localhost:5000";

interface ApiFetchOptions extends RequestInit {
    skipAuth?: boolean;
}

export async function apiFetch<T = unknown>(
    path: string,
    options: ApiFetchOptions = {}
): Promise<T> {
    const { skipAuth, headers, ...rest } = options;

    let token: string | null = null;
    if (!skipAuth) {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token ?? null;
    }

    const res = await fetch(`${API_BASE_URL}${path}`, {
        ...rest,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...headers,
        },
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(body.error ?? `Request failed (${res.status})`);
    }

    return body as T;
}