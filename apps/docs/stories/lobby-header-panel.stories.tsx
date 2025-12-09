import type { Meta, StoryObj } from '@storybook/react'
import { LobbyHeaderPanel, type LobbyHeaderPanelProps } from '@tyfo.dev/ui/components/lobby-header-panel'

const meta: Meta<typeof LobbyHeaderPanel> = {
  title: 'Lobby/LobbyHeaderPanel',
  component: LobbyHeaderPanel,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta

type Story = StoryObj<typeof meta>

const baseArgs: LobbyHeaderPanelProps = {
  name: 'Test Lobby',
  status: 'WAITING',
  currentPlayers: 2,
  maxPlayers: 4,
  isPrivate: false,
  isUserInLobby: true,
  canJoinLobby: true,
  canStartGame: false,
  isJoiningLobby: false,
  isStartingGame: false,
  isLeavingLobby: false,
  onJoinLobby: () => {},
  onStartGame: () => {},
  onLeaveLobby: () => {},
}

export const Default: Story = {
  args: {
    ...baseArgs,
  },
}

export const ReadyToStart: Story = {
  args: {
    ...baseArgs,
    status: 'READY',
    canStartGame: true,
  },
}

export const FullLobby: Story = {
  args: {
    ...baseArgs,
    status: 'FULL',
    currentPlayers: 4,
    canJoinLobby: false,
  },
}

export const PrivateLobby: Story = {
  args: {
    ...baseArgs,
    isPrivate: true,
  },
}

export const JoiningAndStarting: Story = {
  args: {
    ...baseArgs,
    isJoiningLobby: true,
    isStartingGame: true,
  },
}
