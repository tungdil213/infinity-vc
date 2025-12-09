import type { Meta, StoryObj } from '@storybook/react'
import { LobbyPlayersPanel, type LobbyPlayersPanelProps } from '@tyfo.dev/ui/components/lobby-players-panel'

const meta: Meta<typeof LobbyPlayersPanel> = {
  title: 'Lobby/LobbyPlayersPanel',
  component: LobbyPlayersPanel,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta

type Story = StoryObj<typeof meta>

const baseArgs: LobbyPlayersPanelProps = {
  players: [
    { uuid: 'player-1', nickName: 'Alice' },
    { uuid: 'player-2', nickName: 'Bob' },
    { uuid: 'player-3', nickName: 'Charlie' },
  ],
  currentUserUuid: 'player-2',
  creatorUuid: 'player-1',
  maxPlayers: 5,
  currentPlayers: 3,
  hasAvailableSlots: true,
  createdAt: '2025-01-01T10:00:00Z',
}

export const Default: Story = {
  args: {
    ...baseArgs,
  },
}

export const FullLobby: Story = {
  args: {
    ...baseArgs,
    currentPlayers: 5,
    hasAvailableSlots: false,
  },
}

export const SinglePlayer: Story = {
  args: {
    ...baseArgs,
    players: [baseArgs.players[0]],
    currentPlayers: 1,
    hasAvailableSlots: true,
  },
}
