import type { Meta, StoryObj } from "@storybook/react-vite";
import ImageCard from "@tyfo.dev/ui/primitives/image-card";

const meta: Meta<typeof ImageCard> = {
  title: "Primitives/ImageCard",
  component: ImageCard,
  tags: ["autodocs"],
  argTypes: {
    imageUrl: {
      control: "text",
      description: "URL of the image to display",
    },
    caption: {
      control: "text",
      description: "Caption text below the image",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
  },
};

export default meta;
type Story = StoryObj<typeof ImageCard>;

// Default image card
export const Default: Story = {
  args: {
    imageUrl: "https://picsum.photos/400/300",
    caption: "A beautiful landscape",
  },
};

// Multiple cards
export const Gallery: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <ImageCard
        imageUrl="https://picsum.photos/400/300?random=1"
        caption="Mountain View"
      />
      <ImageCard
        imageUrl="https://picsum.photos/400/300?random=2"
        caption="Ocean Sunset"
      />
      <ImageCard
        imageUrl="https://picsum.photos/400/300?random=3"
        caption="Forest Trail"
      />
    </div>
  ),
};

// With custom width
export const CustomSizes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4 items-start">
      <ImageCard
        imageUrl="https://picsum.photos/300/225?random=4"
        caption="Small Card"
        className="w-[200px]"
      />
      <ImageCard
        imageUrl="https://picsum.photos/400/300?random=5"
        caption="Default Card"
      />
      <ImageCard
        imageUrl="https://picsum.photos/500/375?random=6"
        caption="Large Card"
        className="w-[350px]"
      />
    </div>
  ),
};

// With long caption
export const LongCaption: Story = {
  args: {
    imageUrl: "https://picsum.photos/400/300?random=7",
    caption:
      "This is a much longer caption that demonstrates how the card handles text overflow and wrapping behavior in the figcaption element.",
  },
};

// Grid layout
export const GridLayout: Story = {
  render: () => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({ length: 6 }, (_, i) => (
        <ImageCard
          key={i}
          imageUrl={`https://picsum.photos/400/300?random=${i + 10}`}
          caption={`Image ${i + 1}`}
          className="w-full"
        />
      ))}
    </div>
  ),
};
