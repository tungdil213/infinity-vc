import type { Meta, StoryObj } from '@storybook/react'
import { Footer } from '@tyfo.dev/ui'

const meta: Meta<typeof Footer> = {
  title: 'Layout/Footer',
  component: Footer,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    className: {
      control: 'text',
      description: 'Classes CSS additionnelles',
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

/**
 * Footer par défaut
 */
export const Default: Story = {
  args: {},
}

/**
 * Footer avec style personnalisé
 */
export const WithCustomClass: Story = {
  args: {
    className: 'bg-gray-100',
  },
}

/**
 * Footer dans un conteneur réduit
 */
export const Compact: Story = {
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '800px' }}>
        <Story />
      </div>
    ),
  ],
}

/**
 * Footer en mode sombre (si le thème le supporte)
 */
export const Dark: Story = {
  args: {
    className: 'bg-gray-900 text-white',
  },
}
