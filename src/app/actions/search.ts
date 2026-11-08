"use server";

import { getDb } from "@/db/client";
import { searchEntities, type SearchResult } from "@/db/search";

export async function quickSearch(query: string): Promise<SearchResult[]> {
  return searchEntities(getDb(), query.slice(0, 200));
}
