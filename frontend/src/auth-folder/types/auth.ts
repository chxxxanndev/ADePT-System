export interface User {
    id: string;         
      staffId: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    role?: string;      
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

export interface User {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    role?: string;
    adminLevel?: 'HIGH' | 'MEDIUM' | 'LOW' | null; // ← new
    status?: string;
    avatarUrl?: string;
}