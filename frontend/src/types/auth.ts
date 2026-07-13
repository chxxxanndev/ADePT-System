export interface User {
    id: string;          // Added this
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    role?: string;       // Added this (optional)
    status?: string;
}

export interface MockUser {
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    password: string;
}

// If you have a View type in this file, keep it
export type View = 'login' | 'signup' | 'forgot';


