function parseEmailList(rawValue: string | undefined): Set<string> {
  if (!rawValue) {
    return new Set()
  }

  return new Set(
    rawValue
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0)
  )
}

export function getConfiguredAdminEmails(): Set<string> {
  return parseEmailList(process.env.ADMIN_EMAILS)
}

export function getConfiguredModeratorEmails(): Set<string> {
  return parseEmailList(process.env.MODERATOR_EMAILS)
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false
  }

  const configuredAdmins = getConfiguredAdminEmails()
  return configuredAdmins.has(email.toLowerCase())
}

export function isModeratorEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false
  }

  const normalizedEmail = email.toLowerCase()
  const configuredModerators = getConfiguredModeratorEmails()
  return configuredModerators.has(normalizedEmail) || isAdminEmail(normalizedEmail)
}
