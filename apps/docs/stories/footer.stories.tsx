import type { Meta, StoryObj } from "@storybook/react";
import { Footer } from "@tyfo.dev/ui/components/footer";

const meta: Meta<typeof Footer> = {
  title: "Layout/Footer",
  component: Footer,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    logoText: {
      control: "text",
      description: "Logo text displayed in footer",
    },
    logoHref: {
      control: "text",
      description: "Logo link destination",
    },
    description: {
      control: "text",
      description: "Description text below logo",
    },
    copyright: {
      control: "text",
      description: "Copyright text at bottom",
    },
    sections: {
      control: "object",
      description: "Footer link sections",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Footer>;

// Default footer
export const Default: Story = {
  args: {},
};

// Custom branding
export const CustomBranding: Story = {
  args: {
    logoText: "🎮 My Game Platform",
    logoHref: "/home",
    description: "The best gaming platform for multiplayer experiences.",
    copyright: "© 2026 My Game Platform. All rights reserved.",
  },
};

// Custom sections
export const CustomSections: Story = {
  args: {
    sections: [
      {
        title: "Product",
        links: [
          { href: "/features", label: "Features" },
          { href: "/pricing", label: "Pricing" },
          { href: "/download", label: "Download" },
        ],
      },
      {
        title: "Company",
        links: [
          { href: "/about", label: "About Us" },
          { href: "/careers", label: "Careers" },
          { href: "/blog", label: "Blog" },
        ],
      },
      {
        title: "Legal",
        links: [
          { href: "/privacy", label: "Privacy Policy" },
          { href: "/terms", label: "Terms of Service" },
          { href: "/cookies", label: "Cookie Policy" },
        ],
      },
    ],
  },
};

// Minimal footer
export const Minimal: Story = {
  args: {
    logoText: "GameHub",
    description: "Play together.",
    sections: [
      {
        title: "Links",
        links: [
          { href: "/", label: "Home" },
          { href: "/games", label: "Games" },
        ],
      },
    ],
    copyright: "© 2026 GameHub",
  },
};

// With click handlers
export const WithClickHandlers: Story = {
  args: {
    sections: [
      {
        title: "Actions",
        links: [
          { href: "#", label: "Open Modal", onClick: () => alert("Modal opened!") },
          { href: "#", label: "Show Toast", onClick: () => alert("Toast shown!") },
        ],
      },
    ],
  },
};
