export interface ThemeGuideSuggestionResult {
  interest_summary: string;
  possible_paths: string[];
  conversation_starters: string[];
  model_name: string;
}

export interface GroupThemeGuideState {
  id: string | number;
  group_id: string;
  checks: boolean[];
  selected_category: string | null;
  selected_interest_tags: string[];
  draft_notes: string | null;
  ai_suggestions: ThemeGuideSuggestionResult | null;
  updated_by_profile_id: string | null;
  updated_by_name: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface UpsertGroupThemeGuideStateData {
  group_id: string;
  checks: boolean[];
  selected_category: string | null;
  selected_interest_tags: string[];
  draft_notes: string | null;
  ai_suggestions: ThemeGuideSuggestionResult | null;
  updated_by_profile_id: string | null;
  updated_by_name: string | null;
}
