export interface NotionRichText {
  plain_text: string;
  href?: string | null;
}

export interface NotionProperty {
  type: string;
  title?: NotionRichText[];
  rich_text?: NotionRichText[];
  number?: number | null;
  select?: { name: string } | null;
  status?: { name: string } | null;
  checkbox?: boolean;
  relation?: Array<{ id: string }>;
  multi_select?: Array<{ name: string }>;
  last_edited_time?: string;
}

export interface NotionPage {
  object: "page";
  id: string;
  url?: string;
  in_trash?: boolean;
  last_edited_time: string;
  properties: Record<string, NotionProperty>;
}

export interface NotionDataSource {
  object: "data_source";
  id: string;
  parent: {
    type: string;
    database_id?: string;
  };
}

export interface NotionListResponse {
  results: Array<NotionPage | { object: string; id: string }>;
  has_more: boolean;
  next_cursor: string | null;
}

export interface NotionBlock {
  object: "block";
  id: string;
  type: string;
  has_children?: boolean;
  paragraph?: { rich_text: NotionRichText[] };
  heading_1?: { rich_text: NotionRichText[] };
  heading_2?: { rich_text: NotionRichText[] };
  heading_3?: { rich_text: NotionRichText[] };
  bulleted_list_item?: { rich_text: NotionRichText[] };
  numbered_list_item?: { rich_text: NotionRichText[] };
  quote?: { rich_text: NotionRichText[] };
  callout?: { rich_text: NotionRichText[] };
}

export interface NotionBlockListResponse {
  results: NotionBlock[];
  has_more: boolean;
  next_cursor: string | null;
}
