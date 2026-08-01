export interface AuthUser {
    id: number;
    name: string;
    username: string;
    roles: string[];
    permissions: string[];
}

export interface SharedProps {
    auth: {
        user: AuthUser | null;
    };
    [key: string]: unknown;
}
