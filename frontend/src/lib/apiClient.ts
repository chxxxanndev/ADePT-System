import { supabase } from './supabaseClient';
import { API_ROOT } from '../config';

const API_BASE_URL = API_ROOT; 

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

        if (!token) {
            return new Promise(() => {}) as Promise<T>; 
        }
    }

    const res = await fetch(`${API_BASE_URL}${path}`, {
        ...rest,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...headers,
        },
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
    }

    return await res.json() as T;
}