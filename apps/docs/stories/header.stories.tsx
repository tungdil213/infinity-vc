import type { Meta, StoryObj } from '@storybook/react'
import { Header } from '@tyfo.dev/ui'

// Mock functions for actions
const fn = () => () => {}

const meta: Meta<typeof Header> = {
  title: 'Layout/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    isConnected: {
      control: 'boolean',
      description: 'État de la connexion temps réel',
    },
  },
  args: {
    onCreateLobby: fn(),
    onJoinByCode: fn(),
    onGoToCurrentLobby: fn(),
    onGoToLobbies: fn(),
    onLogin: fn(),
    onRegister: fn(),
    onLogout: fn(),
    onProfile: fn(),
    onSettings: fn(),
  },
}

export default meta
type Story = StoryObj<typeof meta>

const mockUser = {
  uuid: 'user-123',
  fullName: 'Jean Dupont',
  email: 'jean.dupont@example.com',
}

const mockCurrentLobby = {
  uuid: 'lobby-456',
  name: 'Epic Battle Arena',
  status: 'WAITING',
  currentPlayers: 2,
  maxPlayers: 4,
}

/**
 * Header par défaut sans utilisateur connecté
 */
export const Default: Story = {
  args: {
    isConnected: false,
  },
}

/**
 * Header avec utilisateur connecté
 */
export const Authenticated: Story = {
  args: {
    user: mockUser,
    isConnected: true,
  },
}

/**
 * Header avec utilisateur dans un lobby
 */
export const WithCurrentLobby: Story = {
  args: {
    user: mockUser,
    currentLobby: mockCurrentLobby,
    isConnected: true,
  },
}

/**
 * Header déconnecté (temps réel inactif)
 */
export const Disconnected: Story = {
  args: {
    user: mockUser,
    currentLobby: mockCurrentLobby,
    isConnected: false,
  },
}

/**
 * Header avec lobby complet
 */
export const WithFullLobby: Story = {
  args: {
    user: mockUser,
    currentLobby: {
      ...mockCurrentLobby,
      currentPlayers: 4,
      maxPlayers: 4,
      status: 'FULL',
    },
    isConnected: true,
  },
}

/**
 * Header avec lobby en jeu
 */
export const WithLobbyInGame: Story = {
  args: {
    user: mockUser,
    currentLobby: {
      ...mockCurrentLobby,
      currentPlayers: 4,
      maxPlayers: 4,
      status: 'IN_GAME',
    },
    isConnected: true,
  },
}

/**
 * Header avec style personnalisé
 */
export const WithCustomClass: Story = {
  args: {
    user: mockUser,
    isConnected: true,
    className: 'bg-purple-600',
  },
}
