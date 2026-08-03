export interface User {
    id: string;
    staffId: string;
    email: string;
    username: string;
    firstName: string;
    middleInitial?: string;
    lastName: string;
    role?: string;
    adminLevel?: 'HIGH' | 'MEDIUM' | 'LOW' | null;
    status?: string;
    avatarUrl?: string;
    position?: string;
    suffix?: string;
    lastLogin?: string;
}

export interface MockUser {
    firstName: string;
    middleInitial?: string;
    lastName: string;
    email: string;
    username: string;
    password: string;
    suffix?: string;
    lastLogin?: string;
}

export type View = 'login' | 'signup' | 'forgotPassword' | 'resetPassword' | 'verifyEmail';