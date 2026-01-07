/**
 * Convert role level to display label
 * Level 1/2 → SM (Site Manager)
 * Level 3/4 → SPV (Supervisor)
 */
export function getRoleDisplayLabel(role: string): string {
  if (role === 'Level 1' || role === 'Level 2') {
    return 'SM'
  }
  if (role === 'Level 3' || role === 'Level 4') {
    return 'SPV'
  }
  // Return original if no match
  return role
}

/**
 * Check if role is SM (Site Manager)
 */
export function isSiteManager(role: string): boolean {
  return role === 'Level 1' || role === 'Level 2'
}

/**
 * Check if role is SPV (Supervisor)
 */
export function isSupervisor(role: string): boolean {
  return role === 'Level 3' || role === 'Level 4'
}



