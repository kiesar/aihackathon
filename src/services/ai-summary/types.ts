import { AISummaryRequest, AISummaryResponse } from "../../types";

export type { AISummaryRequest, AISummaryResponse };

/**
 * AI Summary Service interface — designed with a clean boundary
 * so the mock can be replaced by a real LLM call without touching
 * the UI or surrounding components.
 */
export interface AISummaryService {
  getSummary(request: AISummaryRequest): Promise<AISummaryResponse>;
}
