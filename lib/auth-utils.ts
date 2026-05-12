
export type UserRole = 'admin' | 'user';

export interface User {
    id: string;
    email: string;
    role: UserRole;
}

export function canPerformAction(userRole: UserRole, requiredRole: UserRole): boolean {
    const roles: UserRole[] = ['user', 'admin'];
    return roles.indexOf(userRole) >= roles.indexOf(requiredRole);
}