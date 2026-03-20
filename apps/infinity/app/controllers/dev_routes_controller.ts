import { type HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import router from '@adonisjs/core/services/router'

type SerializedRoute = {
  methods: string[]
  pattern: string
  name?: string
}

type SerializedRoutesByDomain = Record<string, SerializedRoute[]>

export interface DevRoute {
  method: string
  path: string
  name: string
  description: string
}

export interface DevRouteGroup {
  group: string
  routes: DevRoute[]
}

const GROUP_ORDER = [
  'Public Routes',
  'Authentication Routes (Public)',
  'Authentication Routes (Protected)',
  'Lobbies Routes (Protected)',
  'Invitation Routes (Public)',
  'Games Routes (Protected)',
  'API Routes',
  'Admin API Routes',
  'Transmit Routes (Protected)',
  'Development Routes',
  'Other Routes',
] as const

function getGroupName(path: string): string {
  if (path === '/') {
    return 'Public Routes'
  }

  if (path.startsWith('/dev/')) {
    return 'Development Routes'
  }

  if (path === '/auth/logout') {
    return 'Authentication Routes (Protected)'
  }

  if (path.startsWith('/auth/')) {
    return 'Authentication Routes (Public)'
  }

  if (path.startsWith('/lobbies/join/')) {
    return 'Invitation Routes (Public)'
  }

  if (path === '/lobbies' || path.startsWith('/lobbies/')) {
    return 'Lobbies Routes (Protected)'
  }

  if (path.startsWith('/games/')) {
    return 'Games Routes (Protected)'
  }

  if (path.startsWith('/admin/api/')) {
    return 'Admin API Routes'
  }

  if (path.startsWith('/api/')) {
    return 'API Routes'
  }

  if (path.startsWith('/__transmit/')) {
    return 'Transmit Routes (Protected)'
  }

  return 'Other Routes'
}

function describeRoute(path: string): string {
  if (path === '/') {
    return 'Home page'
  }
  if (path.startsWith('/auth/')) {
    return 'Authentication endpoint'
  }
  if (path === '/lobbies' || path.startsWith('/lobbies/')) {
    return 'Lobby endpoint'
  }
  if (path.startsWith('/games/')) {
    return 'Game endpoint'
  }
  if (path.startsWith('/api/')) {
    return 'API endpoint'
  }
  if (path.startsWith('/admin/api/')) {
    return 'Admin API endpoint'
  }
  if (path.startsWith('/__transmit/')) {
    return 'Transmit endpoint'
  }
  if (path.startsWith('/dev/')) {
    return 'Development endpoint'
  }
  return 'Application endpoint'
}

export function buildDevRoutesSnapshot(routesByDomain: SerializedRoutesByDomain): DevRouteGroup[] {
  const groupedRoutes = new Map<string, DevRoute[]>()
  const seenRoutes = new Set<string>()

  for (const routes of Object.values(routesByDomain)) {
    for (const route of routes) {
      const filteredMethods = route.methods.filter((method) => method !== 'HEAD')
      const methods = filteredMethods.length > 0 ? filteredMethods : route.methods

      for (const method of methods) {
        const normalizedMethod = method.toUpperCase()
        const name = route.name || 'unnamed'
        const dedupeKey = `${normalizedMethod}:${route.pattern}:${name}`

        if (seenRoutes.has(dedupeKey)) {
          continue
        }
        seenRoutes.add(dedupeKey)

        const groupName = getGroupName(route.pattern)
        const routeEntry: DevRoute = {
          method: normalizedMethod,
          path: route.pattern,
          name,
          description: describeRoute(route.pattern),
        }

        const existingGroup = groupedRoutes.get(groupName)
        if (existingGroup) {
          existingGroup.push(routeEntry)
        } else {
          groupedRoutes.set(groupName, [routeEntry])
        }
      }
    }
  }

  const sortedGroups: DevRouteGroup[] = []
  for (const groupName of GROUP_ORDER) {
    const routes = groupedRoutes.get(groupName)
    if (!routes || routes.length === 0) {
      continue
    }

    routes.sort((left, right) => {
      if (left.path === right.path) {
        return left.method.localeCompare(right.method)
      }
      return left.path.localeCompare(right.path)
    })

    sortedGroups.push({
      group: groupName,
      routes,
    })
  }

  return sortedGroups
}

export default class DevRoutesController {
  /**
   * Show all available routes in development
   */
  async index({ inertia }: HttpContext) {
    // Only available in development
    if (!app.inDev) {
      return inertia.render('errors/not_found', {})
    }

    const routesByDomain = router?.toJSON?.() as SerializedRoutesByDomain | undefined
    const routes = buildDevRoutesSnapshot(routesByDomain ?? { root: [] })

    return inertia.render('dev/routes', { routes } as any)
  }
}
