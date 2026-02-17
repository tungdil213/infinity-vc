import type { Meta, StoryObj } from "@storybook/react";
import { Header } from "@infinity.dev/ui/components/header";

const meta: Meta<typeof Header> = {
  title: "Layout/Header",
  component: Header,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    user: {
      control: "object",
      description: "Current logged-in user",
    },
    currentLobby: {
      control: "object",
      description: "Current lobby the user is in",
    },
    isConnected: {
      control: "boolean",
      description: "WebSocket connection status",
    },
    logoText: {
      control: "text",
      description: "Logo text displayed in header",
    },
    logoHref: {
      control: "text",
      description: "Logo link destination",
    },
    onCreateLobby: { action: "create-lobby" },
    onJoinByCode: { action: "join-by-code" },
    onGoToCurrentLobby: { action: "go-to-current-lobby" },
    onGoToLobbies: { action: "go-to-lobbies" },
    onLogin: { action: "login" },
    onRegister: { action: "register" },
    onLogout: { action: "logout" },
    onProfile: { action: "profile" },
    onSettings: { action: "settings" },
  },
};

export default meta;
type Story = StoryObj<typeof Header>;

// Logged out state
export const LoggedOut: Story = {
  args: {
    user: undefined,
    isConnected: true,
  },
};

// Logged in state
export const LoggedIn: Story = {
  args: {
    user: {
      uuid: "user-123",
      fullName: "John Doe",
      email: "john@example.com",
    },
    isConnected: true,
  },
};

// With current lobby
export const WithCurrentLobby: Story = {
  args: {
    user: {
      uuid: "user-123",
      fullName: "John Doe",
      email: "john@example.com",
    },
    currentLobby: {
      uuid: "lobby-456",
      name: "Game Night",
      status: "waiting",
      currentPlayers: 3,
      maxPlayers: 4,
    },
    isConnected: true,
  },
};

// Disconnected state
export const Disconnected: Story = {
  args: {
    user: {
      uuid: "user-123",
      fullName: "John Doe",
      email: "john@example.com",
    },
    isConnected: false,
  },
};

// Playing state
export const InGame: Story = {
  args: {
    user: {
      uuid: "user-123",
      fullName: "John Doe",
      email: "john@example.com",
    },
    currentLobby: {
      uuid: "lobby-789",
      name: "Love Letter Tournament",
      status: "playing",
      currentPlayers: 4,
      maxPlayers: 4,
    },
    isConnected: true,
  },
};

// Custom branding
export const CustomBranding: Story = {
  args: {
    user: {
      uuid: "user-123",
      fullName: "Alice Smith",
      email: "alice@example.com",
    },
    logoText: "🎮 My Game Platform",
    logoHref: "/home",
    isConnected: true,
  },
};

// Mobile view (responsive)
export const MobileView: Story = {
  args: {
    user: {
      uuid: "user-123",
      fullName: "John Doe",
      email: "john@example.com",
    },
    currentLobby: {
      uuid: "lobby-456",
      name: "Quick Game",
      status: "waiting",
      currentPlayers: 2,
      maxPlayers: 4,
    },
    isConnected: true,
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
};
