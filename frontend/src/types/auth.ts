export type View = 'login' | 'signup' | 'forgot';

export interface User {
    firstName: string;
    lastName: string;
    email: string;
    username: string;
}

export interface MockUser extends User {
    password?: string;
}