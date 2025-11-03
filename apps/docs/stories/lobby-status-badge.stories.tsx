import type { Meta, StoryObj } from '@storybook/react'
import { LobbyStatusBadge } from '@tyfo.dev/ui'

const meta: Meta<typeof LobbyStatusBadge> = {
  title: 'Lobby/LobbyStatusBadge',
  component: LobbyStatusBadge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: { type: 'select' },
      options: ['WAITING', 'READY', 'FULL', 'IN_GAME', 'PAUSED', 'ENDED'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    variant: {
      control: { type: 'select' },
      options: ['default', 'outline', 'secondary'],
    },
    showIcon: { control: 'boolean' },
    showTooltip: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    status: 'WAITING',
  },
}

export const AllStatuses: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <LobbyStatusBadge status="WAITING" />
        <LobbyStatusBadge status="READY" />
        <LobbyStatusBadge status="FULL" />
        <LobbyStatusBadge status="IN_GAME" />
        <LobbyStatusBadge status="PAUSED" />
        <LobbyStatusBadge status="ENDED" />
      </div>
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Small</h3>
        <div className="flex gap-2">
          <LobbyStatusBadge status="WAITING" size="sm" />
          <LobbyStatusBadge status="READY" size="sm" />
          <LobbyStatusBadge status="IN_GAME" size="sm" />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Medium</h3>
        <div className="flex gap-2">
          <LobbyStatusBadge status="WAITING" size="md" />
          <LobbyStatusBadge status="READY" size="md" />
          <LobbyStatusBadge status="IN_GAME" size="md" />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Large</h3>
        <div className="flex gap-2">
          <LobbyStatusBadge status="WAITING" size="lg" />
          <LobbyStatusBadge status="READY" size="lg" />
          <LobbyStatusBadge status="IN_GAME" size="lg" />
        </div>
      </div>
    </div>
  ),
}

export const Variants: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Default</h3>
        <div className="flex gap-2">
          <LobbyStatusBadge status="WAITING" variant="default" />
          <LobbyStatusBadge status="READY" variant="default" />
          <LobbyStatusBadge status="IN_GAME" variant="default" />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Outline</h3>
        <div className="flex gap-2">
          <LobbyStatusBadge status="WAITING" variant="outline" />
          <LobbyStatusBadge status="READY" variant="outline" />
          <LobbyStatusBadge status="IN_GAME" variant="outline" />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Secondary</h3>
        <div className="flex gap-2">
          <LobbyStatusBadge status="WAITING" variant="secondary" />
          <LobbyStatusBadge status="READY" variant="secondary" />
          <LobbyStatusBadge status="IN_GAME" variant="secondary" />
        </div>
      </div>
    </div>
  ),
}

export const WithoutIcon: Story = {
  args: {
    status: 'READY',
    showIcon: false,
  },
}

export const WithoutTooltip: Story = {
  args: {
    status: 'READY',
    showTooltip: false,
  },
}
