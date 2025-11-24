import type { Meta, StoryObj } from '@storybook/react'
import { LobbyPrivacyBadge } from '@tyfo.dev/ui'

const meta: Meta<typeof LobbyPrivacyBadge> = {
  title: 'Lobby/LobbyPrivacyBadge',
  component: LobbyPrivacyBadge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    isPrivate: { control: 'boolean' },
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
    isPrivate: false,
  },
}

export const Public: Story = {
  args: {
    isPrivate: false,
  },
}

export const Private: Story = {
  args: {
    isPrivate: true,
  },
}

export const Comparison: Story = {
  render: () => (
    <div className="flex gap-4">
      <LobbyPrivacyBadge isPrivate={false} />
      <LobbyPrivacyBadge isPrivate={true} />
    </div>
  ),
}

export const Variants: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Public</h3>
        <div className="flex gap-2">
          <LobbyPrivacyBadge isPrivate={false} variant="default" />
          <LobbyPrivacyBadge isPrivate={false} variant="outline" />
          <LobbyPrivacyBadge isPrivate={false} variant="secondary" />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Private</h3>
        <div className="flex gap-2">
          <LobbyPrivacyBadge isPrivate={true} variant="default" />
          <LobbyPrivacyBadge isPrivate={true} variant="outline" />
          <LobbyPrivacyBadge isPrivate={true} variant="secondary" />
        </div>
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
          <LobbyPrivacyBadge isPrivate={false} size="sm" />
          <LobbyPrivacyBadge isPrivate={true} size="sm" />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Medium</h3>
        <div className="flex gap-2">
          <LobbyPrivacyBadge isPrivate={false} size="md" />
          <LobbyPrivacyBadge isPrivate={true} size="md" />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Large</h3>
        <div className="flex gap-2">
          <LobbyPrivacyBadge isPrivate={false} size="lg" />
          <LobbyPrivacyBadge isPrivate={true} size="lg" />
        </div>
      </div>
    </div>
  ),
}
