import type { Preview } from "@storybook/react-vite";
import React from 'react';
import "@tyfo.dev/ui/styles";

// Mock pour Inertia si nécessaire
const InertiaDecorator = (Story: any) => {
  return <Story />;
};

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
  decorators: [InertiaDecorator],
  tags: ["autodocs"]
};

export default preview;
