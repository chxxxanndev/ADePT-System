// users/hooks/permissions.ts  (or wherever shared frontend utils live — adjust path)
import type { User } from '../auth-folder/types/auth';

type AdminLevel = 'HIGH' | 'MEDIUM' | 'LOW';

const LEVEL_RANK: Record<AdminLevel, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

/**
 * Mirrors the backend's hasAdminLevel() check, for UI purposes only.
 * The backend is the real gatekeeper — this just controls what renders.
 */
export function hasAdminLevel(user: User | null | undefined, minLevel: AdminLevel): boolean {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    if (user.role !== 'ADMIN') return false;
    if (!user.adminLevel) return false;
    return LEVEL_RANK[user.adminLevel] >= LEVEL_RANK[minLevel];
}

export function isSuperAdmin(user: User | null | undefined): boolean {
    return user?.role === 'SUPER_ADMIN';
}

export function isAdminOrAbove(user: User | null | undefined): boolean {
    return user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
}

export function adminLevelLabel(level?: AdminLevel | null): string {
    if (!level) return '';
    return level.charAt(0) + level.slice(1).toLowerCase(); // 'HIGH' -> 'High'
}