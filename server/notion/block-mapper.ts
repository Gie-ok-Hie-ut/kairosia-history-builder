import type { TimelineSource } from "@/domain/timeline/types";
import { richText } from "./mapper";
import type { NotionBlock } from "./types";

export function buildPageBlocks(detail: string, sources: TimelineSource[]) {
  const blocks: Array<Record<string, unknown>> = [];
  if (detail.trim()) {
    blocks.push(headingBlock("상세"));
    for (const paragraph of splitText(detail, 1_900)) {
      blocks.push(paragraphBlock(paragraph));
    }
  }
  if (sources.length) {
    blocks.push(headingBlock("출처"));
    for (const source of sources) blocks.push(sourceBlock(source));
  }
  return blocks;
}

export function blocksToPlainText(blocks: NotionBlock[]) {
  const detailHeadingIndex = blocks.findIndex(
    (block) => block.type === "heading_2" && blockText(block) === "상세",
  );
  const sourceHeadingIndex = blocks.findIndex(
    (block) => block.type === "heading_2" && blockText(block) === "출처",
  );
  const start = detailHeadingIndex >= 0 ? detailHeadingIndex + 1 : 0;
  const end = sourceHeadingIndex >= 0 ? sourceHeadingIndex : blocks.length;

  return blocks
    .slice(start, end)
    .map((block) => blockText(block))
    .filter(Boolean)
    .join("\n\n");
}

export function blocksToSources(blocks: NotionBlock[]): TimelineSource[] {
  const headingIndex = blocks.findIndex(
    (block) => block.type === "heading_2" && blockText(block) === "출처",
  );
  if (headingIndex < 0) return [];

  const sourceSection = blocks.slice(headingIndex + 1);
  const nextHeadingIndex = sourceSection.findIndex((block) =>
    block.type.startsWith("heading_"),
  );
  const sourceBlocks =
    nextHeadingIndex >= 0
      ? sourceSection.slice(0, nextHeadingIndex)
      : sourceSection;

  return sourceBlocks
    .filter((block) => block.type === "bulleted_list_item")
    .map((block) => ({
      type: "reference" as const,
      title: blockText(block),
      url: block.bulleted_list_item?.rich_text.find((text) => text.href)?.href,
    }));
}

function headingBlock(value: string) {
  return {
    object: "block",
    type: "heading_2",
    heading_2: { rich_text: richText(value) },
  };
}

function paragraphBlock(value: string) {
  return {
    object: "block",
    type: "paragraph",
    paragraph: { rich_text: richText(value) },
  };
}

function sourceBlock(source: TimelineSource) {
  const label = [
    source.title,
    source.author,
    source.publishedYear,
    source.locator,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    object: "block",
    type: "bulleted_list_item",
    bulleted_list_item: {
      rich_text: source.url
        ? [
            {
              type: "text",
              text: { content: label.slice(0, 1_900), link: { url: source.url } },
            },
          ]
        : richText(label),
    },
  };
}

function blockText(block: NotionBlock): string {
  const content =
    block.paragraph ??
    block.heading_1 ??
    block.heading_2 ??
    block.heading_3 ??
    block.bulleted_list_item ??
    block.numbered_list_item ??
    block.quote ??
    block.callout;
  return content?.rich_text.map((entry) => entry.plain_text).join("") ?? "";
}

function splitText(value: string, size: number): string[] {
  const paragraphs = value
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  return paragraphs.flatMap((paragraph) => {
    const chunks: string[] = [];
    for (let index = 0; index < paragraph.length; index += size) {
      chunks.push(paragraph.slice(index, index + size));
    }
    return chunks;
  });
}
