import { HeroBlock } from "./HeroBlock";
import { ParagraphBlock } from "./ParagraphBlock";
import { CtaBlock } from "./CtaBlock";
import { HeadingBlock } from "./HeadingBlock";
import { ImageBlock } from "./ImageBlock";
import { FeaturesBlock } from "./FeaturesBlock";
import { FaqBlock } from "./FaqBlock";
import { InfoCardBlock } from "./InfoCardBlock";
import { CtaCardBlock } from "./CtaCardBlock";
import { AmenityItemBlock } from "./AmenityItemBlock";
import { NewsletterFormBlock } from "./NewsletterFormBlock";

export const blockRegistry: Record<string, React.FC<{ value: unknown; [key: string]: unknown }>> = {
  hero: HeroBlock as React.FC<{ value: unknown; [key: string]: unknown }>,
  paragraph: ParagraphBlock as React.FC<{ value: unknown; [key: string]: unknown }>,
  cta: CtaBlock as React.FC<{ value: unknown; [key: string]: unknown }>,
  heading: HeadingBlock as React.FC<{ value: unknown; [key: string]: unknown }>,
  image: ImageBlock as React.FC<{ value: unknown; [key: string]: unknown }>,
  features: FeaturesBlock as React.FC<{ value: unknown; [key: string]: unknown }>,
  faq: FaqBlock as React.FC<{ value: unknown; [key: string]: unknown }>,
  info_card: InfoCardBlock as React.FC<{ value: unknown; [key: string]: unknown }>,
  cta_card: CtaCardBlock as React.FC<{ value: unknown; [key: string]: unknown }>,
  amenity_item: AmenityItemBlock as React.FC<{ value: unknown; [key: string]: unknown }>,
  newsletter: NewsletterFormBlock as React.FC<{ value: unknown; [key: string]: unknown }>,
};

interface BlockRendererProps {
  blocks: Array<{ type: string; value: unknown }>;
}

export function BlockRenderer({ blocks }: BlockRendererProps) {
  return (
    <>
      {blocks.map((block, i) => {
        const Component = blockRegistry[block.type];
        if (!Component) {
          if (process.env.NODE_ENV === "development") {
            console.warn(`Unknown block type: ${block.type}`);
          }
          return null;
        }
        return <Component key={i} value={block.value} />;
      })}
    </>
  );
}
