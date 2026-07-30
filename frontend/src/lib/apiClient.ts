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
        // 1. Get the session
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token ?? null;

        // 2. If we are NOT logged in yet, we stop the request
        if (!token) {
            // We throw a special 'loading' promise that tells React to wait
            // or we return a neutral value. To stop the 401 error, we must 
            // NOT call the fetch below.
            return new Promise(() => {}) as Promise<T>; 
        }
    }

    // 3. Only if we have a token (or skipAuth is true) do we actually call the server
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