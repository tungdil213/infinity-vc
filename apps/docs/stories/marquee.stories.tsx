import type { Meta, StoryObj } from "@storybook/react-vite";
import Marquee from "@tyfo.dev/ui/primitives/marquee";

const meta: Meta<typeof Marquee> = {
  title: "Primitives/Marquee",
  component: Marquee,
  tags: ["autodocs"],
  argTypes: {
    items: {
      control: "object",
      description: "Array of strings to display in the marquee",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Marquee>;

// Default marquee
export const Default: Story = {
  args: {
    items: ["Welcome", "to", "the", "Marquee", "Component"],
  },
};

// Tech stack
export const TechStack: Story = {
  args: {
    items: [
      "React",
      "TypeScript",
      "TailwindCSS",
      "AdonisJS",
      "PostgreSQL",
      "Docker",
    ],
  },
};

// Emojis
export const WithEmojis: Story = {
  args: {
    items: ["🚀", "⭐", "🎉", "💡", "🔥", "✨", "🎯", "💪"],
  },
};

// Features list
export const FeaturesList: Story = {
  args: {
    items: [
      "Fast Performance",
      "Modern Design",
      "Type Safe",
      "Responsive",
      "Accessible",
      "Customizable",
    ],
  },
};

// Single item repeated
export const SingleItem: Story = {
  args: {
    items: ["NEOBRUTALISM"],
  },
};

// Long text items
export const LongItems: Story = {
  args: {
    items: [
      "Build amazing user interfaces",
      "Create stunning experiences",
      "Design with purpose",
    ],
  },
};

// Numbers
export const Statistics: Story = {
  args: {
    items: ["10K+ Users", "500+ Projects", "99.9% Uptime", "24/7 Support"],
  },
};
