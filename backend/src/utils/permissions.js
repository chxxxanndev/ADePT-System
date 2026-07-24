const LEVEL_RANK = { HIGH: 3, MEDIUM: 2, LOW: 1 };

/**
 * Checks whether an acting staff member meets a minimum admin level.
 * Super Admin always passes. Office Staff never passes.
 * @param {{ roleCode: string, adminLevel?: string }} actingStaff
 * @param {'HIGH'|'MEDIUM'|'LOW'} minLevel
 */
export function hasAdminLevel(actingStaff, minLevel) {
    if (actingStaff.roleCode === 'SUPER_ADMIN') return true;
    if (actingStaff.roleCode !== 'ADMIN') return false;
    if (!actingStaff.adminLevel) return false;
    return LEVEL_RANK[actingStaff.adminLevel] >= LEVEL_RANK[minLevel];
}

export function isSuperAdmin(actingStaff) {
    return actingStaff.roleCode === 'SUPER_ADMIN';
}