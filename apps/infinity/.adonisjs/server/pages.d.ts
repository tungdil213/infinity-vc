import '@adonisjs/inertia/types'

import type React from 'react'
import type { Prettify } from '@adonisjs/core/types/common'

type ExtractProps<T> =
  T extends React.FC<infer Props>
    ? Prettify<Omit<Props, 'children'>>
    : T extends React.Component<infer Props>
      ? Prettify<Omit<Props, 'children'>>
      : never

declare module '@adonisjs/inertia/types' {
  export interface InertiaPages {
    'auth/login': ExtractProps<(typeof import('../../inertia/pages/auth/login.tsx'))['default']>
    'auth/register': ExtractProps<(typeof import('../../inertia/pages/auth/register.tsx'))['default']>
    'create-lobby': ExtractProps<(typeof import('../../inertia/pages/create-lobby.tsx'))['default']>
    'dev/routes': ExtractProps<(typeof import('../../inertia/pages/dev/routes.tsx'))['default']>
    'errors/not_found': ExtractProps<(typeof import('../../inertia/pages/errors/not_found.tsx'))['default']>
    'errors/server_error': ExtractProps<(typeof import('../../inertia/pages/errors/server_error.tsx'))['default']>
    'game': ExtractProps<(typeof import('../../inertia/pages/game.tsx'))['default']>
    'home': ExtractProps<(typeof import('../../inertia/pages/home.tsx'))['default']>
    'join-lobby': ExtractProps<(typeof import('../../inertia/pages/join-lobby.tsx'))['default']>
    'lobbies': ExtractProps<(typeof import('../../inertia/pages/lobbies.tsx'))['default']>
    'lobby': ExtractProps<(typeof import('../../inertia/pages/lobby.tsx'))['default']>
    'profile': ExtractProps<(typeof import('../../inertia/pages/profile.tsx'))['default']>
    'settings': ExtractProps<(typeof import('../../inertia/pages/settings.tsx'))['default']>
    'welcome': ExtractProps<(typeof import('../../inertia/pages/welcome.tsx'))['default']>
  }
}
