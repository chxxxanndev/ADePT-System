export interface User {
    id: string;          // Added this
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    role?: string;       // Added this (optional)
    status?: string;
    avatarUrl?: string;
}

export interface MockUser {
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    password: string;
}


export type View = 'login' | 'signup' | 'forgotPassword' | 'resetPassword';