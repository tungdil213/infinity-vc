import type { Meta, StoryObj } from '@storybook/react'
import { ConnectionStatusIndicator, type ConnectionStatusIndicatorProps } from '@tyfo.dev/ui/components/connection-status-indicator'

const meta: Meta<typeof ConnectionStatusIndicator> = {
  title: 'Status/ConnectionStatusIndicator',
  component: ConnectionStatusIndicator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta

type Story = StoryObj<typeof meta>

const baseArgs: ConnectionStatusIndicatorProps = {
  isConnected: true,
  labelConnected: 'Connected',
  labelDisconnected: 'Disconnected',
}

export const Connected: Story = {
  args: {
    ...baseArgs,
    isConnected: true,
  },
}

export const Disconnected: Story = {
  args: {
    ...baseArgs,
    isConnected: false,
  },
}

export const CustomLabels: Story = {
  args: {
    ...baseArgs,
    labelConnected: 'Online',
    labelDisconnected: 'Offline',
  },
}
