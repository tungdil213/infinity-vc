export const USER_ROLES = {
  PLAYER: 'PLAYER',
  MODERATOR: 'MODERATOR',
  ADMIN: 'ADMIN',
} as const

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]

const ROLE_RANK: Record<UserRole, number> = {
  [USER_ROLES.PLAYER]: 1,
  [USER_ROLES.MODERATOR]: 2,
  [USER_ROLES.ADMIN]: 3,
}

const VALID_ROLES = new Set<UserRole>(Object.values(USER_ROLES))

export function normalizeUserRole(role: unknown): UserRole {
  if (typeof role !== 'string') {
    return USER_ROLES.PLAYER
  }

  const normalized = role.trim().toUpperCase()
  if (VALID_ROLES.has(normalized as UserRole)) {
    return normalized as UserRole
  }

  return USER_ROLES.PLAYER
}

export function hasRequiredRole(userRole: unknown, requiredRole: UserRole): boolean {
  const normalizedUserRole = normalizeUserRole(userRole)
  return ROLE_RANK[normalizedUserRole] >= ROLE_RANK[requiredRole]
}

export function hasAnyRole(userRole: unknown, allowedRoles: readonly UserRole[]): boolean {
  const normalizedUserRole = normalizeUserRole(userRole)
  return allowedRoles.includes(normalizedUserRole)
}

export function canModerateLobbies(userRole: unknown): boolean {
  return hasRequiredRole(userRole, USER_ROLES.MODERATOR)
}
