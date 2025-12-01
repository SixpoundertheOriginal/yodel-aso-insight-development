export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      agency_clients: {
        Row: {
          agency_org_id: string
          client_org_id: string
          created_at: string | null
          is_active: boolean | null
        }
        Insert: {
          agency_org_id: string
          client_org_id: string
          created_at?: string | null
          is_active?: boolean | null
        }
        Update: {
          agency_org_id?: string
          client_org_id?: string
          created_at?: string | null
          is_active?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_clients_agency_org_id_fkey"
            columns: ["agency_org_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "agency_clients_agency_org_id_fkey"
            columns: ["agency_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_clients_client_org_id_fkey"
            columns: ["client_org_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "agency_clients_client_org_id_fkey"
            columns: ["client_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      app_competitors: {
        Row: {
          audit_count: number | null
          audit_status:
            | Database["public"]["Enums"]["competitor_audit_status"]
            | null
          comparison_context: string | null
          comparison_summary: Json | null
          competitor_app_icon: string | null
          competitor_app_name: string
          competitor_app_store_id: string
          competitor_bundle_id: string | null
          competitor_category: string | null
          competitor_developer: string | null
          competitor_rating: number | null
          competitor_review_count: number | null
          country: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          is_audit_stale: boolean | null
          last_audit_at: string | null
          last_audit_id: string | null
          last_audit_score: number | null
          last_compared_at: string | null
          metadata_changed_count: number | null
          organization_id: string
          priority: number | null
          target_app_id: string
        }
        Insert: {
          audit_count?: number | null
          audit_status?:
            | Database["public"]["Enums"]["competitor_audit_status"]
            | null
          comparison_context?: string | null
          comparison_summary?: Json | null
          competitor_app_icon?: string | null
          competitor_app_name: string
          competitor_app_store_id: string
          competitor_bundle_id?: string | null
          competitor_category?: string | null
          competitor_developer?: string | null
          competitor_rating?: number | null
          competitor_review_count?: number | null
          country: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_audit_stale?: boolean | null
          last_audit_at?: string | null
          last_audit_id?: string | null
          last_audit_score?: number | null
          last_compared_at?: string | null
          metadata_changed_count?: number | null
          organization_id: string
          priority?: number | null
          target_app_id: string
        }
        Update: {
          audit_count?: number | null
          audit_status?:
            | Database["public"]["Enums"]["competitor_audit_status"]
            | null
          comparison_context?: string | null
          comparison_summary?: Json | null
          competitor_app_icon?: string | null
          competitor_app_name?: string
          competitor_app_store_id?: string
          competitor_bundle_id?: string | null
          competitor_category?: string | null
          competitor_developer?: string | null
          competitor_rating?: number | null
          competitor_review_count?: number | null
          country?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_audit_stale?: boolean | null
          last_audit_at?: string | null
          last_audit_id?: string | null
          last_audit_score?: number | null
          last_compared_at?: string | null
          metadata_changed_count?: number | null
          organization_id?: string
          priority?: number | null
          target_app_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_competitors_last_audit_id_fkey"
            columns: ["last_audit_id"]
            isOneToOne: false
            referencedRelation: "competitor_audit_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_competitors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "app_competitors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_competitors_target_app_id_fkey"
            columns: ["target_app_id"]
            isOneToOne: false
            referencedRelation: "monitored_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      app_metadata_cache: {
        Row: {
          _metadata_source: string | null
          app_icon_url: string | null
          app_id: string
          app_json: Json | null
          created_at: string
          description: string | null
          developer_name: string | null
          feature_cards: Json | null
          fetched_at: string
          id: string
          locale: string
          organization_id: string
          platform: string
          preview_analysis: Json | null
          screenshot_captions: Json | null
          screenshots: Json | null
          subtitle: string | null
          title: string | null
          updated_at: string
          version_hash: string
        }
        Insert: {
          _metadata_source?: string | null
          app_icon_url?: string | null
          app_id: string
          app_json?: Json | null
          created_at?: string
          description?: string | null
          developer_name?: string | null
          feature_cards?: Json | null
          fetched_at?: string
          id?: string
          locale?: string
          organization_id: string
          platform?: string
          preview_analysis?: Json | null
          screenshot_captions?: Json | null
          screenshots?: Json | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          version_hash: string
        }
        Update: {
          _metadata_source?: string | null
          app_icon_url?: string | null
          app_id?: string
          app_json?: Json | null
          created_at?: string
          description?: string | null
          developer_name?: string | null
          feature_cards?: Json | null
          fetched_at?: string
          id?: string
          locale?: string
          organization_id?: string
          platform?: string
          preview_analysis?: Json | null
          screenshot_captions?: Json | null
          screenshots?: Json | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          version_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_metadata_cache_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "app_metadata_cache_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      app_metadata_kpi_snapshots: {
        Row: {
          app_id: string
          bundle_id: string | null
          created_at: string
          id: string
          kpi_json: Json
          kpi_vector: number[]
          market: string
          metadata_version: string
          organization_id: string
          platform: string
          score_families: Json
          score_overall: number
          subtitle: string | null
          title: string | null
        }
        Insert: {
          app_id: string
          bundle_id?: string | null
          created_at?: string
          id?: string
          kpi_json: Json
          kpi_vector: number[]
          market?: string
          metadata_version: string
          organization_id: string
          platform: string
          score_families: Json
          score_overall: number
          subtitle?: string | null
          title?: string | null
        }
        Update: {
          app_id?: string
          bundle_id?: string | null
          created_at?: string
          id?: string
          kpi_json?: Json
          kpi_vector?: number[]
          market?: string
          metadata_version?: string
          organization_id?: string
          platform?: string
          score_families?: Json
          score_overall?: number
          subtitle?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_metadata_kpi_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "app_metadata_kpi_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      apps: {
        Row: {
          app_description: string | null
          app_icon_url: string | null
          app_name: string
          app_rating: number | null
          app_reviews: number | null
          app_store_category: string | null
          app_store_id: string | null
          app_subtitle: string | null
          approved_at: string | null
          auto_discovery_enabled: boolean | null
          bundle_id: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          developer_name: string | null
          id: string
          intelligence_metadata: Json | null
          is_active: boolean | null
          keyword_tracking_enabled: boolean | null
          last_auto_discovery_at: string | null
          org_id: string
          organization_id: string
          platform: string
          updated_at: string | null
        }
        Insert: {
          app_description?: string | null
          app_icon_url?: string | null
          app_name: string
          app_rating?: number | null
          app_reviews?: number | null
          app_store_category?: string | null
          app_store_id?: string | null
          app_subtitle?: string | null
          approved_at?: string | null
          auto_discovery_enabled?: boolean | null
          bundle_id?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          developer_name?: string | null
          id?: string
          intelligence_metadata?: Json | null
          is_active?: boolean | null
          keyword_tracking_enabled?: boolean | null
          last_auto_discovery_at?: string | null
          org_id: string
          organization_id: string
          platform: string
          updated_at?: string | null
        }
        Update: {
          app_description?: string | null
          app_icon_url?: string | null
          app_name?: string
          app_rating?: number | null
          app_reviews?: number | null
          app_store_category?: string | null
          app_store_id?: string | null
          app_subtitle?: string | null
          approved_at?: string | null
          auto_discovery_enabled?: boolean | null
          bundle_id?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          developer_name?: string | null
          id?: string
          intelligence_metadata?: Json | null
          is_active?: boolean | null
          keyword_tracking_enabled?: boolean | null
          last_auto_discovery_at?: string | null
          org_id?: string
          organization_id?: string
          platform?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apps_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "apps_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "apps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      apps_catalog: {
        Row: {
          app_id: string
          app_store_id: string | null
          bundle_id: string | null
          category: string | null
          created_at: string
          developer_name: string | null
          display_name: string
          id: string
          is_active: boolean
          metadata: Json | null
          platform: string | null
          updated_at: string
        }
        Insert: {
          app_id: string
          app_store_id?: string | null
          bundle_id?: string | null
          category?: string | null
          created_at?: string
          developer_name?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          platform?: string | null
          updated_at?: string
        }
        Update: {
          app_id?: string
          app_store_id?: string | null
          bundle_id?: string | null
          category?: string | null
          created_at?: string
          developer_name?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          platform?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      aso_audit_diffs: {
        Row: {
          change_summary: Json
          combo_count_delta: number | null
          created_at: string
          description_changed: boolean
          from_snapshot_id: string
          id: string
          keyword_count_delta: number | null
          keywords_added: string[] | null
          keywords_removed: string[] | null
          kpi_family_deltas: Json | null
          kpi_overall_score_delta: number | null
          monitored_app_id: string
          new_critical_issues: number | null
          new_recommendations: number | null
          organization_id: string
          overall_score_delta: number
          resolved_critical_issues: number | null
          subtitle_changed: boolean
          subtitle_diff: string | null
          title_changed: boolean
          title_diff: string | null
          to_snapshot_id: string
        }
        Insert: {
          change_summary: Json
          combo_count_delta?: number | null
          created_at?: string
          description_changed?: boolean
          from_snapshot_id: string
          id?: string
          keyword_count_delta?: number | null
          keywords_added?: string[] | null
          keywords_removed?: string[] | null
          kpi_family_deltas?: Json | null
          kpi_overall_score_delta?: number | null
          monitored_app_id: string
          new_critical_issues?: number | null
          new_recommendations?: number | null
          organization_id: string
          overall_score_delta: number
          resolved_critical_issues?: number | null
          subtitle_changed?: boolean
          subtitle_diff?: string | null
          title_changed?: boolean
          title_diff?: string | null
          to_snapshot_id: string
        }
        Update: {
          change_summary?: Json
          combo_count_delta?: number | null
          created_at?: string
          description_changed?: boolean
          from_snapshot_id?: string
          id?: string
          keyword_count_delta?: number | null
          keywords_added?: string[] | null
          keywords_removed?: string[] | null
          kpi_family_deltas?: Json | null
          kpi_overall_score_delta?: number | null
          monitored_app_id?: string
          new_critical_issues?: number | null
          new_recommendations?: number | null
          organization_id?: string
          overall_score_delta?: number
          resolved_critical_issues?: number | null
          subtitle_changed?: boolean
          subtitle_diff?: string | null
          title_changed?: boolean
          title_diff?: string | null
          to_snapshot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aso_audit_diffs_from_snapshot_id_fkey"
            columns: ["from_snapshot_id"]
            isOneToOne: false
            referencedRelation: "aso_audit_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aso_audit_diffs_monitored_app_id_fkey"
            columns: ["monitored_app_id"]
            isOneToOne: false
            referencedRelation: "monitored_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aso_audit_diffs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "aso_audit_diffs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aso_audit_diffs_to_snapshot_id_fkey"
            columns: ["to_snapshot_id"]
            isOneToOne: false
            referencedRelation: "aso_audit_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      aso_audit_snapshots: {
        Row: {
          app_id: string
          audit_hash: string | null
          audit_result: Json
          audit_version: string
          bible_metadata: Json | null
          created_at: string
          description: string | null
          id: string
          kpi_family_scores: Json | null
          kpi_overall_score: number | null
          kpi_result: Json | null
          kpi_version: string | null
          locale: string
          metadata_version_hash: string | null
          monitored_app_id: string
          monitored_app_market_id: string | null
          organization_id: string
          overall_score: number
          platform: string
          source: string
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          app_id: string
          audit_hash?: string | null
          audit_result: Json
          audit_version?: string
          bible_metadata?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          kpi_family_scores?: Json | null
          kpi_overall_score?: number | null
          kpi_result?: Json | null
          kpi_version?: string | null
          locale?: string
          metadata_version_hash?: string | null
          monitored_app_id: string
          monitored_app_market_id?: string | null
          organization_id: string
          overall_score: number
          platform: string
          source?: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          app_id?: string
          audit_hash?: string | null
          audit_result?: Json
          audit_version?: string
          bible_metadata?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          kpi_family_scores?: Json | null
          kpi_overall_score?: number | null
          kpi_result?: Json | null
          kpi_version?: string | null
          locale?: string
          metadata_version_hash?: string | null
          monitored_app_id?: string
          monitored_app_market_id?: string | null
          organization_id?: string
          overall_score?: number
          platform?: string
          source?: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aso_audit_snapshots_monitored_app_id_fkey"
            columns: ["monitored_app_id"]
            isOneToOne: false
            referencedRelation: "monitored_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aso_audit_snapshots_monitored_app_market_id_fkey"
            columns: ["monitored_app_market_id"]
            isOneToOne: false
            referencedRelation: "monitored_app_markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aso_audit_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "aso_audit_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      aso_engine_diagnostics: {
        Row: {
          app_id: string
          audit_timestamp: string | null
          category_confidence: string | null
          category_source: string | null
          category_template_loaded: boolean | null
          created_at: string | null
          detected_category_id: string | null
          detected_category_name: string | null
          detected_vertical_id: string | null
          detection_time_ms: number | null
          has_category_vertical_mismatch: boolean | null
          id: string
          metadata: Json | null
          mismatch_reason: string | null
          primary_genre_id: number | null
          primary_genre_name: string | null
          template_load_time_ms: number | null
          vertical_confidence: number | null
          vertical_template_loaded: boolean | null
        }
        Insert: {
          app_id: string
          audit_timestamp?: string | null
          category_confidence?: string | null
          category_source?: string | null
          category_template_loaded?: boolean | null
          created_at?: string | null
          detected_category_id?: string | null
          detected_category_name?: string | null
          detected_vertical_id?: string | null
          detection_time_ms?: number | null
          has_category_vertical_mismatch?: boolean | null
          id?: string
          metadata?: Json | null
          mismatch_reason?: string | null
          primary_genre_id?: number | null
          primary_genre_name?: string | null
          template_load_time_ms?: number | null
          vertical_confidence?: number | null
          vertical_template_loaded?: boolean | null
        }
        Update: {
          app_id?: string
          audit_timestamp?: string | null
          category_confidence?: string | null
          category_source?: string | null
          category_template_loaded?: boolean | null
          created_at?: string | null
          detected_category_id?: string | null
          detected_category_name?: string | null
          detected_vertical_id?: string | null
          detection_time_ms?: number | null
          has_category_vertical_mismatch?: boolean | null
          id?: string
          metadata?: Json | null
          mismatch_reason?: string | null
          primary_genre_id?: number | null
          primary_genre_name?: string | null
          template_load_time_ms?: number | null
          vertical_confidence?: number | null
          vertical_template_loaded?: boolean | null
        }
        Relationships: []
      }
      aso_formula_overrides: {
        Row: {
          created_at: string
          formula_id: string
          id: string
          is_active: boolean
          market: string | null
          notes: string | null
          organization_id: string | null
          override_payload: Json
          scope: Database["public"]["Enums"]["aso_ruleset_scope"]
          updated_at: string
          version: number
          vertical: string | null
        }
        Insert: {
          created_at?: string
          formula_id: string
          id?: string
          is_active?: boolean
          market?: string | null
          notes?: string | null
          organization_id?: string | null
          override_payload: Json
          scope: Database["public"]["Enums"]["aso_ruleset_scope"]
          updated_at?: string
          version?: number
          vertical?: string | null
        }
        Update: {
          created_at?: string
          formula_id?: string
          id?: string
          is_active?: boolean
          market?: string | null
          notes?: string | null
          organization_id?: string | null
          override_payload?: Json
          scope?: Database["public"]["Enums"]["aso_ruleset_scope"]
          updated_at?: string
          version?: number
          vertical?: string | null
        }
        Relationships: []
      }
      aso_hook_pattern_overrides: {
        Row: {
          created_at: string
          hook_category: string
          id: string
          is_active: boolean
          keywords: string[] | null
          market: string | null
          notes: string | null
          organization_id: string | null
          scope: Database["public"]["Enums"]["aso_ruleset_scope"]
          updated_at: string
          version: number
          vertical: string | null
          weight_multiplier: number
        }
        Insert: {
          created_at?: string
          hook_category: string
          id?: string
          is_active?: boolean
          keywords?: string[] | null
          market?: string | null
          notes?: string | null
          organization_id?: string | null
          scope: Database["public"]["Enums"]["aso_ruleset_scope"]
          updated_at?: string
          version?: number
          vertical?: string | null
          weight_multiplier?: number
        }
        Update: {
          created_at?: string
          hook_category?: string
          id?: string
          is_active?: boolean
          keywords?: string[] | null
          market?: string | null
          notes?: string | null
          organization_id?: string | null
          scope?: Database["public"]["Enums"]["aso_ruleset_scope"]
          updated_at?: string
          version?: number
          vertical?: string | null
          weight_multiplier?: number
        }
        Relationships: []
      }
      aso_intent_keyword_examples: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          created_by: string | null
          display_order: number | null
          example_phrase: string
          id: string
          intent_type: string
          is_active: boolean | null
          language: string | null
          market: string | null
          organization_id: string | null
          updated_at: string | null
          updated_by: string | null
          usage_context: string | null
          vertical: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          example_phrase: string
          id?: string
          intent_type: string
          is_active?: boolean | null
          language?: string | null
          market?: string | null
          organization_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          usage_context?: string | null
          vertical: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          example_phrase?: string
          id?: string
          intent_type?: string
          is_active?: boolean | null
          language?: string | null
          market?: string | null
          organization_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          usage_context?: string | null
          vertical?: string
        }
        Relationships: [
          {
            foreignKeyName: "aso_intent_keyword_examples_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "aso_intent_keyword_examples_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      aso_intent_pattern_overrides: {
        Row: {
          app_id: string | null
          base_pattern_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          market: string | null
          organization_id: string | null
          priority_override: number | null
          scope: string
          updated_at: string | null
          updated_by: string | null
          vertical: string | null
          weight_multiplier: number | null
        }
        Insert: {
          app_id?: string | null
          base_pattern_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          market?: string | null
          organization_id?: string | null
          priority_override?: number | null
          scope: string
          updated_at?: string | null
          updated_by?: string | null
          vertical?: string | null
          weight_multiplier?: number | null
        }
        Update: {
          app_id?: string | null
          base_pattern_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          market?: string | null
          organization_id?: string | null
          priority_override?: number | null
          scope?: string
          updated_at?: string | null
          updated_by?: string | null
          vertical?: string | null
          weight_multiplier?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "aso_intent_pattern_overrides_base_pattern_id_fkey"
            columns: ["base_pattern_id"]
            isOneToOne: false
            referencedRelation: "aso_intent_patterns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aso_intent_pattern_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "aso_intent_pattern_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      aso_intent_patterns: {
        Row: {
          admin_tags: string[] | null
          app_id: string | null
          case_sensitive: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          example: string | null
          id: string
          intent_type: string
          is_active: boolean | null
          is_regex: boolean | null
          market: string | null
          notes: string | null
          organization_id: string | null
          pattern: string
          priority: number | null
          scope: string
          updated_at: string | null
          updated_by: string | null
          version: number | null
          vertical: string | null
          weight: number | null
          word_boundary: boolean | null
        }
        Insert: {
          admin_tags?: string[] | null
          app_id?: string | null
          case_sensitive?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          example?: string | null
          id?: string
          intent_type: string
          is_active?: boolean | null
          is_regex?: boolean | null
          market?: string | null
          notes?: string | null
          organization_id?: string | null
          pattern: string
          priority?: number | null
          scope?: string
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
          vertical?: string | null
          weight?: number | null
          word_boundary?: boolean | null
        }
        Update: {
          admin_tags?: string[] | null
          app_id?: string | null
          case_sensitive?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          example?: string | null
          id?: string
          intent_type?: string
          is_active?: boolean | null
          is_regex?: boolean | null
          market?: string | null
          notes?: string | null
          organization_id?: string | null
          pattern?: string
          priority?: number | null
          scope?: string
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
          vertical?: string | null
          weight?: number | null
          word_boundary?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "aso_intent_patterns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "aso_intent_patterns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      aso_keyword_mapping: {
        Row: {
          created_at: string
          id: string
          insight_id: string
          keyword: string
          keyword_difficulty: number | null
          keyword_volume: number | null
          mapping_type: string | null
          organization_id: string
          priority: string | null
          recommendation: string | null
          relevance_score: number
        }
        Insert: {
          created_at?: string
          id?: string
          insight_id: string
          keyword: string
          keyword_difficulty?: number | null
          keyword_volume?: number | null
          mapping_type?: string | null
          organization_id: string
          priority?: string | null
          recommendation?: string | null
          relevance_score: number
        }
        Update: {
          created_at?: string
          id?: string
          insight_id?: string
          keyword?: string
          keyword_difficulty?: number | null
          keyword_volume?: number | null
          mapping_type?: string | null
          organization_id?: string
          priority?: string | null
          recommendation?: string | null
          relevance_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "aso_keyword_mapping_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "semantic_insights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aso_keyword_mapping_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "aso_keyword_mapping_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      aso_kpi_weight_overrides: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          kpi_id: string
          market: string | null
          notes: string | null
          organization_id: string | null
          scope: Database["public"]["Enums"]["aso_ruleset_scope"]
          updated_at: string
          version: number
          vertical: string | null
          weight_multiplier: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          kpi_id: string
          market?: string | null
          notes?: string | null
          organization_id?: string | null
          scope: Database["public"]["Enums"]["aso_ruleset_scope"]
          updated_at?: string
          version?: number
          vertical?: string | null
          weight_multiplier: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          kpi_id?: string
          market?: string | null
          notes?: string | null
          organization_id?: string | null
          scope?: Database["public"]["Enums"]["aso_ruleset_scope"]
          updated_at?: string
          version?: number
          vertical?: string | null
          weight_multiplier?: number
        }
        Relationships: []
      }
      aso_metrics: {
        Row: {
          app_id: string
          conversion_rate: number | null
          created_at: string | null
          downloads: number | null
          id: string
          impressions: number | null
          metric_date: string
          organization_id: string
          product_page_views: number | null
          traffic_source: string | null
        }
        Insert: {
          app_id: string
          conversion_rate?: number | null
          created_at?: string | null
          downloads?: number | null
          id?: string
          impressions?: number | null
          metric_date: string
          organization_id: string
          product_page_views?: number | null
          traffic_source?: string | null
        }
        Update: {
          app_id?: string
          conversion_rate?: number | null
          created_at?: string | null
          downloads?: number | null
          id?: string
          impressions?: number | null
          metric_date?: string
          organization_id?: string
          product_page_views?: number | null
          traffic_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aso_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "aso_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      aso_recommendation_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          market: string | null
          message: string
          notes: string | null
          organization_id: string | null
          recommendation_id: string
          scope: Database["public"]["Enums"]["aso_ruleset_scope"]
          updated_at: string
          version: number
          vertical: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          market?: string | null
          message: string
          notes?: string | null
          organization_id?: string | null
          recommendation_id: string
          scope: Database["public"]["Enums"]["aso_ruleset_scope"]
          updated_at?: string
          version?: number
          vertical?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          market?: string | null
          message?: string
          notes?: string | null
          organization_id?: string | null
          recommendation_id?: string
          scope?: Database["public"]["Enums"]["aso_ruleset_scope"]
          updated_at?: string
          version?: number
          vertical?: string | null
        }
        Relationships: []
      }
      aso_rule_admin_metadata: {
        Row: {
          admin_description: string | null
          admin_group: string | null
          admin_label: string | null
          created_at: string
          display_order: number | null
          example_values: string | null
          id: string
          is_editable: boolean
          is_visible: boolean
          min_tier: string | null
          override_id: string
          override_type: Database["public"]["Enums"]["aso_override_type"]
          requires_feature_flag: string | null
          updated_at: string
        }
        Insert: {
          admin_description?: string | null
          admin_group?: string | null
          admin_label?: string | null
          created_at?: string
          display_order?: number | null
          example_values?: string | null
          id?: string
          is_editable?: boolean
          is_visible?: boolean
          min_tier?: string | null
          override_id: string
          override_type: Database["public"]["Enums"]["aso_override_type"]
          requires_feature_flag?: string | null
          updated_at?: string
        }
        Update: {
          admin_description?: string | null
          admin_group?: string | null
          admin_label?: string | null
          created_at?: string
          display_order?: number | null
          example_values?: string | null
          id?: string
          is_editable?: boolean
          is_visible?: boolean
          min_tier?: string | null
          override_id?: string
          override_type?: Database["public"]["Enums"]["aso_override_type"]
          requires_feature_flag?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      aso_rule_evaluator_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          market: string | null
          notes: string | null
          organization_id: string | null
          rule_id: string
          scope: string
          severity_override: string | null
          threshold_high_override: number | null
          threshold_low_override: number | null
          updated_at: string
          updated_by: string | null
          version: number
          vertical: string | null
          weight_multiplier: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          market?: string | null
          notes?: string | null
          organization_id?: string | null
          rule_id: string
          scope?: string
          severity_override?: string | null
          threshold_high_override?: number | null
          threshold_low_override?: number | null
          updated_at?: string
          updated_by?: string | null
          version?: number
          vertical?: string | null
          weight_multiplier?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          market?: string | null
          notes?: string | null
          organization_id?: string | null
          rule_id?: string
          scope?: string
          severity_override?: string | null
          threshold_high_override?: number | null
          threshold_low_override?: number | null
          updated_at?: string
          updated_by?: string | null
          version?: number
          vertical?: string | null
          weight_multiplier?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "aso_rule_evaluator_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "aso_rule_evaluator_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aso_rule_evaluator_overrides_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "aso_rule_evaluators"
            referencedColumns: ["rule_id"]
          },
        ]
      }
      aso_rule_evaluators: {
        Row: {
          created_at: string
          created_by: string | null
          deprecated_reason: string | null
          description: string | null
          family: string
          formula_id: string | null
          help_text: string | null
          id: string
          is_active: boolean
          is_deprecated: boolean
          kpi_ids: string[] | null
          name: string
          notes: string | null
          rule_id: string
          scope: string
          severity_default: string
          tags: string[] | null
          threshold_high: number | null
          threshold_low: number | null
          updated_at: string
          updated_by: string | null
          weight_default: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deprecated_reason?: string | null
          description?: string | null
          family: string
          formula_id?: string | null
          help_text?: string | null
          id?: string
          is_active?: boolean
          is_deprecated?: boolean
          kpi_ids?: string[] | null
          name: string
          notes?: string | null
          rule_id: string
          scope: string
          severity_default?: string
          tags?: string[] | null
          threshold_high?: number | null
          threshold_low?: number | null
          updated_at?: string
          updated_by?: string | null
          weight_default?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deprecated_reason?: string | null
          description?: string | null
          family?: string
          formula_id?: string | null
          help_text?: string | null
          id?: string
          is_active?: boolean
          is_deprecated?: boolean
          kpi_ids?: string[] | null
          name?: string
          notes?: string | null
          rule_id?: string
          scope?: string
          severity_default?: string
          tags?: string[] | null
          threshold_high?: number | null
          threshold_low?: number | null
          updated_at?: string
          updated_by?: string | null
          weight_default?: number
        }
        Relationships: []
      }
      aso_ruleset_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          actor_role: string | null
          change_reason: string | null
          created_at: string
          diff: Json | null
          id: string
          ip_address: unknown
          market: string | null
          new_value: Json | null
          old_value: Json | null
          organization_id: string | null
          override_id: string
          override_type: Database["public"]["Enums"]["aso_override_type"]
          scope: Database["public"]["Enums"]["aso_ruleset_scope"]
          user_agent: string | null
          vertical: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          change_reason?: string | null
          created_at?: string
          diff?: Json | null
          id?: string
          ip_address?: unknown
          market?: string | null
          new_value?: Json | null
          old_value?: Json | null
          organization_id?: string | null
          override_id: string
          override_type: Database["public"]["Enums"]["aso_override_type"]
          scope: Database["public"]["Enums"]["aso_ruleset_scope"]
          user_agent?: string | null
          vertical?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          change_reason?: string | null
          created_at?: string
          diff?: Json | null
          id?: string
          ip_address?: unknown
          market?: string | null
          new_value?: Json | null
          old_value?: Json | null
          organization_id?: string | null
          override_id?: string
          override_type?: Database["public"]["Enums"]["aso_override_type"]
          scope?: Database["public"]["Enums"]["aso_ruleset_scope"]
          user_agent?: string | null
          vertical?: string | null
        }
        Relationships: []
      }
      aso_ruleset_category: {
        Row: {
          category_id: string
          category_name: string
          created_at: string | null
          description: string | null
          genre_id: number | null
          id: string
          parent_categories: string[] | null
          updated_at: string | null
          vertical_template_meta: Json | null
        }
        Insert: {
          category_id: string
          category_name: string
          created_at?: string | null
          description?: string | null
          genre_id?: number | null
          id?: string
          parent_categories?: string[] | null
          updated_at?: string | null
          vertical_template_meta?: Json | null
        }
        Update: {
          category_id?: string
          category_name?: string
          created_at?: string | null
          description?: string | null
          genre_id?: number | null
          id?: string
          parent_categories?: string[] | null
          updated_at?: string | null
          vertical_template_meta?: Json | null
        }
        Relationships: []
      }
      aso_ruleset_client: {
        Row: {
          app_id: string | null
          client_template_meta: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          inherit_from_market: string | null
          inherit_from_vertical: string | null
          is_active: boolean
          label: string
          organization_id: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          app_id?: string | null
          client_template_meta?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          inherit_from_market?: string | null
          inherit_from_vertical?: string | null
          is_active?: boolean
          label: string
          organization_id: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          app_id?: string | null
          client_template_meta?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          inherit_from_market?: string | null
          inherit_from_vertical?: string | null
          is_active?: boolean
          label?: string
          organization_id?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      aso_ruleset_market: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          label: string
          locale: string
          market: string
          market_template_meta: Json | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          locale: string
          market: string
          market_template_meta?: Json | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          locale?: string
          market?: string
          market_template_meta?: Json | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      aso_ruleset_versions: {
        Row: {
          app_id: string | null
          client_version: number | null
          created_at: string
          created_by: string | null
          formula_schema_version: string
          id: string
          kpi_schema_version: string
          market: string | null
          market_version: number | null
          organization_id: string | null
          ruleset_snapshot: Json
          ruleset_version: number
          vertical: string | null
          vertical_version: number | null
        }
        Insert: {
          app_id?: string | null
          client_version?: number | null
          created_at?: string
          created_by?: string | null
          formula_schema_version: string
          id?: string
          kpi_schema_version: string
          market?: string | null
          market_version?: number | null
          organization_id?: string | null
          ruleset_snapshot: Json
          ruleset_version: number
          vertical?: string | null
          vertical_version?: number | null
        }
        Update: {
          app_id?: string | null
          client_version?: number | null
          created_at?: string
          created_by?: string | null
          formula_schema_version?: string
          id?: string
          kpi_schema_version?: string
          market?: string | null
          market_version?: number | null
          organization_id?: string | null
          ruleset_snapshot?: Json
          ruleset_version?: number
          vertical?: string | null
          vertical_version?: number | null
        }
        Relationships: []
      }
      aso_ruleset_vertical: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          label: string
          updated_at: string
          updated_by: string | null
          version: number
          vertical: string
          vertical_template_meta: Json | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          vertical: string
          vertical_template_meta?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          vertical?: string
          vertical_template_meta?: Json | null
        }
        Relationships: []
      }
      aso_stopword_overrides: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          market: string | null
          notes: string | null
          organization_id: string | null
          scope: Database["public"]["Enums"]["aso_ruleset_scope"]
          stopwords: string[]
          updated_at: string
          version: number
          vertical: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          market?: string | null
          notes?: string | null
          organization_id?: string | null
          scope: Database["public"]["Enums"]["aso_ruleset_scope"]
          stopwords: string[]
          updated_at?: string
          version?: number
          vertical?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          market?: string | null
          notes?: string | null
          organization_id?: string | null
          scope?: Database["public"]["Enums"]["aso_ruleset_scope"]
          stopwords?: string[]
          updated_at?: string
          version?: number
          vertical?: string | null
        }
        Relationships: []
      }
      aso_token_relevance_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          market: string | null
          notes: string | null
          organization_id: string | null
          relevance: number
          scope: Database["public"]["Enums"]["aso_ruleset_scope"]
          token: string
          updated_at: string
          version: number
          vertical: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          market?: string | null
          notes?: string | null
          organization_id?: string | null
          relevance: number
          scope: Database["public"]["Enums"]["aso_ruleset_scope"]
          token: string
          updated_at?: string
          version?: number
          vertical?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          market?: string | null
          notes?: string | null
          organization_id?: string | null
          relevance?: number
          scope?: Database["public"]["Enums"]["aso_ruleset_scope"]
          token?: string
          updated_at?: string
          version?: number
          vertical?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          error_message: string | null
          id: string
          ip_address: unknown
          organization_id: string | null
          request_path: string | null
          resource_id: string | null
          resource_type: string | null
          status: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          organization_id?: string | null
          request_path?: string | null
          resource_id?: string | null
          resource_type?: string | null
          status?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          organization_id?: string | null
          request_path?: string | null
          resource_id?: string | null
          resource_type?: string | null
          status?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_snapshots: {
        Row: {
          app_id: string
          audit_score: number | null
          combinations: Json | null
          competitor_overlap: Json | null
          created_at: string
          deprecated: boolean | null
          id: string
          insights: Json | null
          locale: string
          metadata_health: Json | null
          metadata_source: string | null
          metadata_version: string | null
          metadata_version_hash: string
          metrics: Json | null
          organization_id: string
          platform: string
          subtitle: string | null
          title: string | null
        }
        Insert: {
          app_id: string
          audit_score?: number | null
          combinations?: Json | null
          competitor_overlap?: Json | null
          created_at?: string
          deprecated?: boolean | null
          id?: string
          insights?: Json | null
          locale?: string
          metadata_health?: Json | null
          metadata_source?: string | null
          metadata_version?: string | null
          metadata_version_hash: string
          metrics?: Json | null
          organization_id: string
          platform?: string
          subtitle?: string | null
          title?: string | null
        }
        Update: {
          app_id?: string
          audit_score?: number | null
          combinations?: Json | null
          competitor_overlap?: Json | null
          created_at?: string
          deprecated?: boolean | null
          id?: string
          insights?: Json | null
          locale?: string
          metadata_health?: Json | null
          metadata_source?: string | null
          metadata_version?: string | null
          metadata_version_hash?: string
          metrics?: Json | null
          organization_id?: string
          platform?: string
          subtitle?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "audit_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      autocomplete_intelligence_cache: {
        Row: {
          api_status: string | null
          cached_at: string | null
          created_at: string | null
          error_message: string | null
          expires_at: string
          id: string
          platform: string
          query: string
          raw_response: Json
          region: string
          request_source: string | null
          suggestions_count: number | null
        }
        Insert: {
          api_status?: string | null
          cached_at?: string | null
          created_at?: string | null
          error_message?: string | null
          expires_at: string
          id?: string
          platform: string
          query: string
          raw_response: Json
          region?: string
          request_source?: string | null
          suggestions_count?: number | null
        }
        Update: {
          api_status?: string | null
          cached_at?: string | null
          created_at?: string | null
          error_message?: string | null
          expires_at?: string
          id?: string
          platform?: string
          query?: string
          raw_response?: Json
          region?: string
          request_source?: string | null
          suggestions_count?: number | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content_encrypted: string
          created_at: string
          encryption_version: number
          id: string
          model: string | null
          organization_id: string
          role: string
          session_id: string
          token_count: number | null
        }
        Insert: {
          content_encrypted: string
          created_at?: string
          encryption_version?: number
          id?: string
          model?: string | null
          organization_id: string
          role: string
          session_id: string
          token_count?: number | null
        }
        Update: {
          content_encrypted?: string
          created_at?: string
          encryption_version?: number
          id?: string
          model?: string | null
          organization_id?: string
          role?: string
          session_id?: string
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "chat_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rate_limits: {
        Row: {
          created_at: string
          id: string
          max_active_sessions_per_user: number
          messages_per_user_per_day: number
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_active_sessions_per_user?: number
          messages_per_user_per_day?: number
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_active_sessions_per_user?: number
          messages_per_user_per_day?: number
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_rate_limits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "chat_rate_limits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          context_snapshot: Json | null
          context_type: string
          created_at: string
          expires_at: string
          id: string
          is_pinned: boolean
          organization_id: string
          pinned_at: string | null
          pinned_by: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          context_snapshot?: Json | null
          context_type?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_pinned?: boolean
          organization_id: string
          pinned_at?: string | null
          pinned_by?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          context_snapshot?: Json | null
          context_type?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_pinned?: boolean
          organization_id?: string
          pinned_at?: string | null
          pinned_by?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "chat_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chatgpt_audit_runs: {
        Row: {
          app_id: string | null
          audit_type: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          name: string | null
          organization_id: string
          status: string | null
          topic_data: Json
          total_queries: number | null
        }
        Insert: {
          app_id?: string | null
          audit_type?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          name?: string | null
          organization_id: string
          status?: string | null
          topic_data: Json
          total_queries?: number | null
        }
        Update: {
          app_id?: string | null
          audit_type?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          name?: string | null
          organization_id?: string
          status?: string | null
          topic_data?: Json
          total_queries?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chatgpt_audit_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "chatgpt_audit_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chatgpt_position_history: {
        Row: {
          audit_run_id: string | null
          average_position: number | null
          competitor_mentions: Json | null
          created_at: string | null
          entity_name: string
          entity_type: string
          id: string
          market_share_estimate: number | null
          mention_count: number | null
          organization_id: string
          sentiment_score: number | null
          snapshot_date: string
          topic_context: string
          visibility_score: number | null
        }
        Insert: {
          audit_run_id?: string | null
          average_position?: number | null
          competitor_mentions?: Json | null
          created_at?: string | null
          entity_name: string
          entity_type: string
          id?: string
          market_share_estimate?: number | null
          mention_count?: number | null
          organization_id: string
          sentiment_score?: number | null
          snapshot_date?: string
          topic_context: string
          visibility_score?: number | null
        }
        Update: {
          audit_run_id?: string | null
          average_position?: number | null
          competitor_mentions?: Json | null
          created_at?: string | null
          entity_name?: string
          entity_type?: string
          id?: string
          market_share_estimate?: number | null
          mention_count?: number | null
          organization_id?: string
          sentiment_score?: number | null
          snapshot_date?: string
          topic_context?: string
          visibility_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chatgpt_position_history_audit_run_id_fkey"
            columns: ["audit_run_id"]
            isOneToOne: false
            referencedRelation: "chatgpt_audit_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatgpt_position_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "chatgpt_position_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chatgpt_queries: {
        Row: {
          audit_run_id: string
          created_at: string | null
          id: string
          priority: number | null
          processed_at: string | null
          query_category: string | null
          query_text: string
          query_type: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          audit_run_id: string
          created_at?: string | null
          id?: string
          priority?: number | null
          processed_at?: string | null
          query_category?: string | null
          query_text: string
          query_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          audit_run_id?: string
          created_at?: string | null
          id?: string
          priority?: number | null
          processed_at?: string | null
          query_category?: string | null
          query_text?: string
          query_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatgpt_queries_audit_run_id_fkey"
            columns: ["audit_run_id"]
            isOneToOne: false
            referencedRelation: "chatgpt_audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      chatgpt_query_results: {
        Row: {
          analysis_type: string | null
          app_mentioned: boolean | null
          audit_run_id: string
          chatgpt_response: string
          competitive_context: Json | null
          competitors_mentioned: string[] | null
          cost_cents: number | null
          created_at: string | null
          entity_analysis: Json | null
          id: string
          mention_context: string | null
          mention_position: number | null
          organization_id: string
          processing_metadata: Json | null
          query_id: string
          response_text_length: number | null
          sentiment_score: number | null
          tokens_used: number | null
          visibility_score: number | null
        }
        Insert: {
          analysis_type?: string | null
          app_mentioned?: boolean | null
          audit_run_id: string
          chatgpt_response: string
          competitive_context?: Json | null
          competitors_mentioned?: string[] | null
          cost_cents?: number | null
          created_at?: string | null
          entity_analysis?: Json | null
          id?: string
          mention_context?: string | null
          mention_position?: number | null
          organization_id: string
          processing_metadata?: Json | null
          query_id: string
          response_text_length?: number | null
          sentiment_score?: number | null
          tokens_used?: number | null
          visibility_score?: number | null
        }
        Update: {
          analysis_type?: string | null
          app_mentioned?: boolean | null
          audit_run_id?: string
          chatgpt_response?: string
          competitive_context?: Json | null
          competitors_mentioned?: string[] | null
          cost_cents?: number | null
          created_at?: string | null
          entity_analysis?: Json | null
          id?: string
          mention_context?: string | null
          mention_position?: number | null
          organization_id?: string
          processing_metadata?: Json | null
          query_id?: string
          response_text_length?: number | null
          sentiment_score?: number | null
          tokens_used?: number | null
          visibility_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chatgpt_query_results_audit_run_id_fkey"
            columns: ["audit_run_id"]
            isOneToOne: false
            referencedRelation: "chatgpt_audit_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatgpt_query_results_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "chatgpt_query_results_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatgpt_query_results_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "chatgpt_queries"
            referencedColumns: ["id"]
          },
        ]
      }
      chatgpt_ranking_snapshots: {
        Row: {
          audit_run_id: string
          avg_position: number | null
          created_at: string | null
          entity_name: string
          id: string
          mention_count: number | null
          organization_id: string
          ranking_position: number | null
          sentiment_score: number | null
          snapshot_date: string
          visibility_score: number | null
        }
        Insert: {
          audit_run_id: string
          avg_position?: number | null
          created_at?: string | null
          entity_name: string
          id?: string
          mention_count?: number | null
          organization_id: string
          ranking_position?: number | null
          sentiment_score?: number | null
          snapshot_date?: string
          visibility_score?: number | null
        }
        Update: {
          audit_run_id?: string
          avg_position?: number | null
          created_at?: string | null
          entity_name?: string
          id?: string
          mention_count?: number | null
          organization_id?: string
          ranking_position?: number | null
          sentiment_score?: number | null
          snapshot_date?: string
          visibility_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chatgpt_ranking_snapshots_audit_run_id_fkey"
            columns: ["audit_run_id"]
            isOneToOne: false
            referencedRelation: "chatgpt_audit_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatgpt_ranking_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "chatgpt_ranking_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chatgpt_visibility_scores: {
        Row: {
          audit_run_id: string
          average_position: number | null
          avg_position: number | null
          calculated_at: string | null
          created_at: string | null
          entity_name: string
          id: string
          mention_count: number | null
          mention_rate: number | null
          organization_id: string
          overall_score: number | null
          sentiment_score: number | null
          visibility_score: number | null
        }
        Insert: {
          audit_run_id: string
          average_position?: number | null
          avg_position?: number | null
          calculated_at?: string | null
          created_at?: string | null
          entity_name: string
          id?: string
          mention_count?: number | null
          mention_rate?: number | null
          organization_id: string
          overall_score?: number | null
          sentiment_score?: number | null
          visibility_score?: number | null
        }
        Update: {
          audit_run_id?: string
          average_position?: number | null
          avg_position?: number | null
          calculated_at?: string | null
          created_at?: string | null
          entity_name?: string
          id?: string
          mention_count?: number | null
          mention_rate?: number | null
          organization_id?: string
          overall_score?: number | null
          sentiment_score?: number | null
          visibility_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chatgpt_visibility_scores_audit_run_id_fkey"
            columns: ["audit_run_id"]
            isOneToOne: false
            referencedRelation: "chatgpt_audit_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatgpt_visibility_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "chatgpt_visibility_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_org_map: {
        Row: {
          client: string
          org_id: string
          organization_id: string | null
        }
        Insert: {
          client: string
          org_id: string
          organization_id?: string | null
        }
        Update: {
          client?: string
          org_id?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_org_map_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "client_org_map_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_org_map_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "client_org_map_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      combo_rankings_cache: {
        Row: {
          app_store_id: string
          checked_at: string
          combo: string
          country: string
          created_at: string
          id: string
          is_ranking: boolean
          organization_id: string
          platform: string
          position: number | null
          position_change: number | null
          snapshot_date: string
          total_results: number | null
          trend: string | null
          updated_at: string
        }
        Insert: {
          app_store_id: string
          checked_at?: string
          combo: string
          country?: string
          created_at?: string
          id?: string
          is_ranking?: boolean
          organization_id: string
          platform?: string
          position?: number | null
          position_change?: number | null
          snapshot_date?: string
          total_results?: number | null
          trend?: string | null
          updated_at?: string
        }
        Update: {
          app_store_id?: string
          checked_at?: string
          combo?: string
          country?: string
          created_at?: string
          id?: string
          is_ranking?: boolean
          organization_id?: string
          platform?: string
          position?: number | null
          position_change?: number | null
          snapshot_date?: string
          total_results?: number | null
          trend?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      competitor_analysis_cache: {
        Row: {
          analysis_duration_ms: number | null
          competitor_app_ids: string[]
          country: string
          created_at: string
          expires_at: string
          id: string
          intelligence: Json
          organization_id: string
          primary_app_id: string
          total_reviews_analyzed: number
        }
        Insert: {
          analysis_duration_ms?: number | null
          competitor_app_ids: string[]
          country: string
          created_at?: string
          expires_at?: string
          id?: string
          intelligence: Json
          organization_id: string
          primary_app_id: string
          total_reviews_analyzed?: number
        }
        Update: {
          analysis_duration_ms?: number | null
          competitor_app_ids?: string[]
          country?: string
          created_at?: string
          expires_at?: string
          id?: string
          intelligence?: Json
          organization_id?: string
          primary_app_id?: string
          total_reviews_analyzed?: number
        }
        Relationships: [
          {
            foreignKeyName: "competitor_analysis_cache_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "competitor_analysis_cache_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_audit_snapshots: {
        Row: {
          audit_data: Json
          combo_coverage_percent: number | null
          competitor_id: string
          created_at: string
          description_char_count: number | null
          description_score: number | null
          discovery_brand_count: number | null
          discovery_learning_count: number | null
          discovery_noise_count: number | null
          discovery_outcome_count: number | null
          error_message: string | null
          existing_combos: number | null
          id: string
          intent_coverage_commercial: number | null
          intent_coverage_informational: number | null
          intent_coverage_navigational: number | null
          intent_coverage_transactional: number | null
          metadata: Json
          missing_combos: number | null
          organization_id: string
          overall_score: number | null
          rule_config: Json | null
          status: string | null
          subtitle_char_count: number | null
          subtitle_score: number | null
          target_app_id: string
          title_char_count: number | null
          title_score: number | null
          total_combos: number | null
          updated_at: string
        }
        Insert: {
          audit_data: Json
          combo_coverage_percent?: number | null
          competitor_id: string
          created_at?: string
          description_char_count?: number | null
          description_score?: number | null
          discovery_brand_count?: number | null
          discovery_learning_count?: number | null
          discovery_noise_count?: number | null
          discovery_outcome_count?: number | null
          error_message?: string | null
          existing_combos?: number | null
          id?: string
          intent_coverage_commercial?: number | null
          intent_coverage_informational?: number | null
          intent_coverage_navigational?: number | null
          intent_coverage_transactional?: number | null
          metadata: Json
          missing_combos?: number | null
          organization_id: string
          overall_score?: number | null
          rule_config?: Json | null
          status?: string | null
          subtitle_char_count?: number | null
          subtitle_score?: number | null
          target_app_id: string
          title_char_count?: number | null
          title_score?: number | null
          total_combos?: number | null
          updated_at?: string
        }
        Update: {
          audit_data?: Json
          combo_coverage_percent?: number | null
          competitor_id?: string
          created_at?: string
          description_char_count?: number | null
          description_score?: number | null
          discovery_brand_count?: number | null
          discovery_learning_count?: number | null
          discovery_noise_count?: number | null
          discovery_outcome_count?: number | null
          error_message?: string | null
          existing_combos?: number | null
          id?: string
          intent_coverage_commercial?: number | null
          intent_coverage_informational?: number | null
          intent_coverage_navigational?: number | null
          intent_coverage_transactional?: number | null
          metadata?: Json
          missing_combos?: number | null
          organization_id?: string
          overall_score?: number | null
          rule_config?: Json | null
          status?: string | null
          subtitle_char_count?: number | null
          subtitle_score?: number | null
          target_app_id?: string
          title_char_count?: number | null
          title_score?: number | null
          total_combos?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_audit_snapshots_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "app_competitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_audit_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "competitor_audit_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_audit_snapshots_target_app_id_fkey"
            columns: ["target_app_id"]
            isOneToOne: false
            referencedRelation: "monitored_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_comparison_cache: {
        Row: {
          cache_key: string
          comparison_config: Json
          comparison_data: Json
          computation_time_ms: number | null
          created_at: string
          expires_at: string | null
          id: string
          is_stale: boolean | null
          organization_id: string
          source_audit_ids: Json
          target_app_id: string
          updated_at: string
        }
        Insert: {
          cache_key: string
          comparison_config?: Json
          comparison_data: Json
          computation_time_ms?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_stale?: boolean | null
          organization_id: string
          source_audit_ids: Json
          target_app_id: string
          updated_at?: string
        }
        Update: {
          cache_key?: string
          comparison_config?: Json
          comparison_data?: Json
          computation_time_ms?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_stale?: boolean | null
          organization_id?: string
          source_audit_ids?: Json
          target_app_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_comparison_cache_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "competitor_comparison_cache_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_comparison_cache_target_app_id_fkey"
            columns: ["target_app_id"]
            isOneToOne: false
            referencedRelation: "monitored_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_keywords: {
        Row: {
          competitor_app_id: string
          competitor_app_name: string
          competitor_position: number
          created_at: string | null
          id: string
          keyword_id: string
          snapshot_date: string
        }
        Insert: {
          competitor_app_id: string
          competitor_app_name: string
          competitor_position: number
          created_at?: string | null
          id?: string
          keyword_id: string
          snapshot_date: string
        }
        Update: {
          competitor_app_id?: string
          competitor_app_name?: string
          competitor_position?: number
          created_at?: string | null
          id?: string
          keyword_id?: string
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_keywords_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "combo_rankings_latest"
            referencedColumns: ["keyword_id"]
          },
          {
            foreignKeyName: "competitor_keywords_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "keywords"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_metrics_snapshots: {
        Row: {
          avg_sentiment_score: number | null
          competitor_app_store_id: string
          country: string
          created_at: string
          id: string
          issue_frequency_per_100: number | null
          organization_id: string
          rating: number | null
          review_count: number | null
          review_velocity_30d: number | null
          review_velocity_7d: number | null
          sentiment_negative_pct: number | null
          sentiment_neutral_pct: number | null
          sentiment_positive_pct: number | null
          snapshot_date: string
          target_app_id: string
          top_issues: Json | null
        }
        Insert: {
          avg_sentiment_score?: number | null
          competitor_app_store_id: string
          country: string
          created_at?: string
          id?: string
          issue_frequency_per_100?: number | null
          organization_id: string
          rating?: number | null
          review_count?: number | null
          review_velocity_30d?: number | null
          review_velocity_7d?: number | null
          sentiment_negative_pct?: number | null
          sentiment_neutral_pct?: number | null
          sentiment_positive_pct?: number | null
          snapshot_date?: string
          target_app_id: string
          top_issues?: Json | null
        }
        Update: {
          avg_sentiment_score?: number | null
          competitor_app_store_id?: string
          country?: string
          created_at?: string
          id?: string
          issue_frequency_per_100?: number | null
          organization_id?: string
          rating?: number | null
          review_count?: number | null
          review_velocity_30d?: number | null
          review_velocity_7d?: number | null
          sentiment_negative_pct?: number | null
          sentiment_neutral_pct?: number | null
          sentiment_positive_pct?: number | null
          snapshot_date?: string
          target_app_id?: string
          top_issues?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_metrics_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "competitor_metrics_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_metrics_snapshots_target_app_id_fkey"
            columns: ["target_app_id"]
            isOneToOne: false
            referencedRelation: "monitored_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_keywords: {
        Row: {
          added_at: string
          added_by: string | null
          app_id: string
          id: string
          keyword: string
          platform: string
          updated_at: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          app_id: string
          id?: string
          keyword: string
          platform?: string
          updated_at?: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          app_id?: string
          id?: string
          keyword?: string
          platform?: string
          updated_at?: string
        }
        Relationships: []
      }
      feature_sentiment_analysis: {
        Row: {
          analyzed_at: string
          app_name: string
          app_store_id: string
          avg_competitor_sentiment: number | null
          comparison_id: string | null
          competitors_with_feature: string[] | null
          country: string
          demand_level: string | null
          demand_score: number | null
          feature_category: string | null
          feature_name: string
          id: string
          is_gap: boolean | null
          mention_count: number
          negative_mentions: number | null
          neutral_mentions: number | null
          organization_id: string
          positive_mentions: number | null
          sample_reviews: Json | null
          sentiment_score: number | null
        }
        Insert: {
          analyzed_at?: string
          app_name: string
          app_store_id: string
          avg_competitor_sentiment?: number | null
          comparison_id?: string | null
          competitors_with_feature?: string[] | null
          country: string
          demand_level?: string | null
          demand_score?: number | null
          feature_category?: string | null
          feature_name: string
          id?: string
          is_gap?: boolean | null
          mention_count?: number
          negative_mentions?: number | null
          neutral_mentions?: number | null
          organization_id: string
          positive_mentions?: number | null
          sample_reviews?: Json | null
          sentiment_score?: number | null
        }
        Update: {
          analyzed_at?: string
          app_name?: string
          app_store_id?: string
          avg_competitor_sentiment?: number | null
          comparison_id?: string | null
          competitors_with_feature?: string[] | null
          country?: string
          demand_level?: string | null
          demand_score?: number | null
          feature_category?: string | null
          feature_name?: string
          id?: string
          is_gap?: boolean | null
          mention_count?: number
          negative_mentions?: number | null
          neutral_mentions?: number | null
          organization_id?: string
          positive_mentions?: number | null
          sample_reviews?: Json | null
          sentiment_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_sentiment_analysis_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "feature_sentiment_analysis_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      insight_classifications: {
        Row: {
          category: string
          classification_confidence: number | null
          created_at: string
          id: string
          insight_type: string
          related_topics: string[] | null
          subcategory: string | null
          synonyms: string[] | null
          topic_id: string
          updated_at: string
        }
        Insert: {
          category: string
          classification_confidence?: number | null
          created_at?: string
          id?: string
          insight_type: string
          related_topics?: string[] | null
          subcategory?: string | null
          synonyms?: string[] | null
          topic_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          classification_confidence?: number | null
          created_at?: string
          id?: string
          insight_type?: string
          related_topics?: string[] | null
          subcategory?: string | null
          synonyms?: string[] | null
          topic_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      insight_examples: {
        Row: {
          created_at: string
          id: string
          insight_id: string
          matched_phrase: string | null
          relevance_score: number | null
          review_date: string | null
          review_id: string
          review_rating: number | null
          review_text: string
          surrounding_context: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          insight_id: string
          matched_phrase?: string | null
          relevance_score?: number | null
          review_date?: string | null
          review_id: string
          review_rating?: number | null
          review_text: string
          surrounding_context?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          insight_id?: string
          matched_phrase?: string | null
          relevance_score?: number | null
          review_date?: string | null
          review_id?: string
          review_rating?: number | null
          review_text?: string
          surrounding_context?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insight_examples_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "semantic_insights"
            referencedColumns: ["id"]
          },
        ]
      }
      insight_trends: {
        Row: {
          app_store_id: string
          country: string
          created_at: string
          id: string
          impact_score: number | null
          mention_count: number
          mentions_delta: number | null
          organization_id: string
          sentiment_delta: number | null
          sentiment_score: number | null
          snapshot_date: string
          topic_id: string
        }
        Insert: {
          app_store_id: string
          country: string
          created_at?: string
          id?: string
          impact_score?: number | null
          mention_count: number
          mentions_delta?: number | null
          organization_id: string
          sentiment_delta?: number | null
          sentiment_score?: number | null
          snapshot_date?: string
          topic_id: string
        }
        Update: {
          app_store_id?: string
          country?: string
          created_at?: string
          id?: string
          impact_score?: number | null
          mention_count?: number
          mentions_delta?: number | null
          organization_id?: string
          sentiment_delta?: number | null
          sentiment_score?: number | null
          snapshot_date?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insight_trends_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "insight_trends_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      keyword_popularity_scores: {
        Row: {
          autocomplete_appears: boolean | null
          autocomplete_rank: number | null
          autocomplete_score: number | null
          combo_participation_count: number | null
          created_at: string
          data_quality: string | null
          fetch_errors: Json | null
          id: string
          intent_score: number | null
          keyword: string
          last_checked_at: string
          length_prior: number | null
          locale: string
          platform: string
          popularity_score: number
          scoring_version: string | null
          updated_at: string
          word_count: number | null
        }
        Insert: {
          autocomplete_appears?: boolean | null
          autocomplete_rank?: number | null
          autocomplete_score?: number | null
          combo_participation_count?: number | null
          created_at?: string
          data_quality?: string | null
          fetch_errors?: Json | null
          id?: string
          intent_score?: number | null
          keyword: string
          last_checked_at?: string
          length_prior?: number | null
          locale?: string
          platform?: string
          popularity_score: number
          scoring_version?: string | null
          updated_at?: string
          word_count?: number | null
        }
        Update: {
          autocomplete_appears?: boolean | null
          autocomplete_rank?: number | null
          autocomplete_score?: number | null
          combo_participation_count?: number | null
          created_at?: string
          data_quality?: string | null
          fetch_errors?: Json | null
          id?: string
          intent_score?: number | null
          keyword?: string
          last_checked_at?: string
          length_prior?: number | null
          locale?: string
          platform?: string
          popularity_score?: number
          scoring_version?: string | null
          updated_at?: string
          word_count?: number | null
        }
        Relationships: []
      }
      keyword_ranking_snapshots: {
        Row: {
          app_id: string
          created_at: string | null
          difficulty_score: number | null
          id: string
          keyword: string
          organization_id: string
          rank: number | null
          search_volume: number | null
          snapshot_date: string | null
        }
        Insert: {
          app_id: string
          created_at?: string | null
          difficulty_score?: number | null
          id?: string
          keyword: string
          organization_id: string
          rank?: number | null
          search_volume?: number | null
          snapshot_date?: string | null
        }
        Update: {
          app_id?: string
          created_at?: string | null
          difficulty_score?: number | null
          id?: string
          keyword?: string
          organization_id?: string
          rank?: number | null
          search_volume?: number | null
          snapshot_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "keyword_ranking_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "keyword_ranking_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      keyword_rankings: {
        Row: {
          created_at: string | null
          estimated_search_volume: number | null
          estimated_traffic: number | null
          id: string
          is_ranking: boolean | null
          keyword_id: string
          position: number | null
          position_change: number | null
          serp_snapshot: Json | null
          snapshot_date: string
          trend: string | null
          visibility_score: number | null
        }
        Insert: {
          created_at?: string | null
          estimated_search_volume?: number | null
          estimated_traffic?: number | null
          id?: string
          is_ranking?: boolean | null
          keyword_id: string
          position?: number | null
          position_change?: number | null
          serp_snapshot?: Json | null
          snapshot_date: string
          trend?: string | null
          visibility_score?: number | null
        }
        Update: {
          created_at?: string | null
          estimated_search_volume?: number | null
          estimated_traffic?: number | null
          id?: string
          is_ranking?: boolean | null
          keyword_id?: string
          position?: number | null
          position_change?: number | null
          serp_snapshot?: Json | null
          snapshot_date?: string
          trend?: string | null
          visibility_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "keyword_rankings_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "combo_rankings_latest"
            referencedColumns: ["keyword_id"]
          },
          {
            foreignKeyName: "keyword_rankings_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "keywords"
            referencedColumns: ["id"]
          },
        ]
      }
      keyword_refresh_queue: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          keyword_id: string
          last_error_at: string | null
          max_retries: number | null
          priority: number | null
          retry_count: number | null
          scheduled_at: string
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          keyword_id: string
          last_error_at?: string | null
          max_retries?: number | null
          priority?: number | null
          retry_count?: number | null
          scheduled_at: string
          started_at?: string | null
          status: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          keyword_id?: string
          last_error_at?: string | null
          max_retries?: number | null
          priority?: number | null
          retry_count?: number | null
          scheduled_at?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "keyword_refresh_queue_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "combo_rankings_latest"
            referencedColumns: ["keyword_id"]
          },
          {
            foreignKeyName: "keyword_refresh_queue_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "keywords"
            referencedColumns: ["id"]
          },
        ]
      }
      keyword_search_volumes: {
        Row: {
          competition_level: string | null
          data_source: string | null
          estimated_monthly_searches: number | null
          id: string
          keyword: string
          last_updated_at: string | null
          platform: string
          popularity_score: number | null
          region: string
        }
        Insert: {
          competition_level?: string | null
          data_source?: string | null
          estimated_monthly_searches?: number | null
          id?: string
          keyword: string
          last_updated_at?: string | null
          platform: string
          popularity_score?: number | null
          region: string
        }
        Update: {
          competition_level?: string | null
          data_source?: string | null
          estimated_monthly_searches?: number | null
          id?: string
          keyword?: string
          last_updated_at?: string | null
          platform?: string
          popularity_score?: number | null
          region?: string
        }
        Relationships: []
      }
      keywords: {
        Row: {
          app_id: string
          created_at: string | null
          discovery_method: string | null
          id: string
          is_tracked: boolean | null
          keyword: string
          keyword_type: string | null
          last_tracked_at: string | null
          organization_id: string
          platform: string
          region: string
          updated_at: string | null
          word_count: number
        }
        Insert: {
          app_id: string
          created_at?: string | null
          discovery_method?: string | null
          id?: string
          is_tracked?: boolean | null
          keyword: string
          keyword_type?: string | null
          last_tracked_at?: string | null
          organization_id: string
          platform: string
          region?: string
          updated_at?: string | null
          word_count: number
        }
        Update: {
          app_id?: string
          created_at?: string | null
          discovery_method?: string | null
          id?: string
          is_tracked?: boolean | null
          keyword?: string
          keyword_type?: string | null
          last_tracked_at?: string | null
          organization_id?: string
          platform?: string
          region?: string
          updated_at?: string | null
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "keywords_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keywords_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "keywords_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_description_snapshots: {
        Row: {
          analysis_id: string | null
          created_at: string
          created_by: string | null
          description_text: string
          id: string
          is_active: boolean
          monitored_app_id: string
          organization_id: string
          overall_score: number | null
          source: string
        }
        Insert: {
          analysis_id?: string | null
          created_at?: string
          created_by?: string | null
          description_text: string
          id?: string
          is_active?: boolean
          monitored_app_id: string
          organization_id: string
          overall_score?: number | null
          source: string
        }
        Update: {
          analysis_id?: string | null
          created_at?: string
          created_by?: string | null
          description_text?: string
          id?: string
          is_active?: boolean
          monitored_app_id?: string
          organization_id?: string
          overall_score?: number | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "llm_description_snapshots_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "llm_visibility_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llm_description_snapshots_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "llm_visibility_latest_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llm_description_snapshots_monitored_app_id_fkey"
            columns: ["monitored_app_id"]
            isOneToOne: false
            referencedRelation: "monitored_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llm_description_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "llm_description_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_visibility_analysis: {
        Row: {
          analysis_duration_ms: number
          app_store_id: string | null
          cache_hit: boolean
          cluster_coverage_json: Json
          created_at: string
          description_hash: string
          description_length: number
          factual_grounding_score: number
          findings_json: Json
          id: string
          intent_coverage_json: Json
          intent_coverage_score: number
          market_id: string | null
          monitored_app_id: string | null
          organization_id: string
          overall_score: number
          rules_scope: string
          rules_version: string
          safety_credibility_score: number
          semantic_clusters_score: number
          snippet_quality_score: number
          snippets_json: Json
          source_snapshot_id: string | null
          structure_metrics_json: Json
          structure_readability_score: number
          updated_at: string
          vertical_id: string | null
        }
        Insert: {
          analysis_duration_ms: number
          app_store_id?: string | null
          cache_hit?: boolean
          cluster_coverage_json?: Json
          created_at?: string
          description_hash: string
          description_length: number
          factual_grounding_score: number
          findings_json?: Json
          id?: string
          intent_coverage_json?: Json
          intent_coverage_score: number
          market_id?: string | null
          monitored_app_id?: string | null
          organization_id: string
          overall_score: number
          rules_scope?: string
          rules_version?: string
          safety_credibility_score: number
          semantic_clusters_score: number
          snippet_quality_score: number
          snippets_json?: Json
          source_snapshot_id?: string | null
          structure_metrics_json?: Json
          structure_readability_score: number
          updated_at?: string
          vertical_id?: string | null
        }
        Update: {
          analysis_duration_ms?: number
          app_store_id?: string | null
          cache_hit?: boolean
          cluster_coverage_json?: Json
          created_at?: string
          description_hash?: string
          description_length?: number
          factual_grounding_score?: number
          findings_json?: Json
          id?: string
          intent_coverage_json?: Json
          intent_coverage_score?: number
          market_id?: string | null
          monitored_app_id?: string | null
          organization_id?: string
          overall_score?: number
          rules_scope?: string
          rules_version?: string
          safety_credibility_score?: number
          semantic_clusters_score?: number
          snippet_quality_score?: number
          snippets_json?: Json
          source_snapshot_id?: string | null
          structure_metrics_json?: Json
          structure_readability_score?: number
          updated_at?: string
          vertical_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "llm_visibility_analysis_monitored_app_id_fkey"
            columns: ["monitored_app_id"]
            isOneToOne: false
            referencedRelation: "monitored_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llm_visibility_analysis_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "llm_visibility_analysis_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llm_visibility_analysis_source_snapshot_id_fkey"
            columns: ["source_snapshot_id"]
            isOneToOne: false
            referencedRelation: "aso_audit_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_visibility_rule_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          market: string | null
          monitored_app_id: string | null
          notes: string | null
          organization_id: string | null
          rules_override: Json
          scope: string
          updated_at: string
          version: number
          vertical: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          market?: string | null
          monitored_app_id?: string | null
          notes?: string | null
          organization_id?: string | null
          rules_override: Json
          scope: string
          updated_at?: string
          version?: number
          vertical?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          market?: string | null
          monitored_app_id?: string | null
          notes?: string | null
          organization_id?: string | null
          rules_override?: Json
          scope?: string
          updated_at?: string
          version?: number
          vertical?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "llm_visibility_rule_overrides_monitored_app_id_fkey"
            columns: ["monitored_app_id"]
            isOneToOne: false
            referencedRelation: "monitored_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llm_visibility_rule_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "llm_visibility_rule_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      metadata_versions: {
        Row: {
          ai_generated: boolean | null
          app_id: string
          app_store_id: string | null
          created_at: string | null
          description: string | null
          generation_model: string | null
          generation_prompt: string | null
          id: string
          is_active: boolean | null
          is_published: boolean | null
          keywords: string | null
          organization_id: string
          platform: string
          promotional_text: string | null
          published_at: string | null
          subtitle: string | null
          title: string | null
          updated_at: string | null
          version_number: number
        }
        Insert: {
          ai_generated?: boolean | null
          app_id: string
          app_store_id?: string | null
          created_at?: string | null
          description?: string | null
          generation_model?: string | null
          generation_prompt?: string | null
          id?: string
          is_active?: boolean | null
          is_published?: boolean | null
          keywords?: string | null
          organization_id: string
          platform: string
          promotional_text?: string | null
          published_at?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
          version_number: number
        }
        Update: {
          ai_generated?: boolean | null
          app_id?: string
          app_store_id?: string | null
          created_at?: string | null
          description?: string | null
          generation_model?: string | null
          generation_prompt?: string | null
          id?: string
          is_active?: boolean | null
          is_published?: boolean | null
          keywords?: string | null
          organization_id?: string
          platform?: string
          promotional_text?: string | null
          published_at?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "metadata_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "metadata_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_enforcement: {
        Row: {
          created_at: string
          grace_period_ends_at: string | null
          last_reminded_at: string | null
          mfa_enabled_at: string | null
          mfa_required: boolean
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          grace_period_ends_at?: string | null
          last_reminded_at?: string | null
          mfa_enabled_at?: string | null
          mfa_required?: boolean
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          grace_period_ends_at?: string | null
          last_reminded_at?: string | null
          mfa_enabled_at?: string | null
          mfa_required?: boolean
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      monitored_app_markets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_available: boolean
          keywords: string | null
          last_fetched_at: string | null
          market_code: string
          monitored_app_id: string
          organization_id: string
          price_amount: number | null
          price_currency: string | null
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_available?: boolean
          keywords?: string | null
          last_fetched_at?: string | null
          market_code: string
          monitored_app_id: string
          organization_id: string
          price_amount?: number | null
          price_currency?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_available?: boolean
          keywords?: string | null
          last_fetched_at?: string | null
          market_code?: string
          monitored_app_id?: string
          organization_id?: string
          price_amount?: number | null
          price_currency?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitored_app_markets_monitored_app_id_fkey"
            columns: ["monitored_app_id"]
            isOneToOne: false
            referencedRelation: "monitored_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitored_app_markets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "monitored_app_markets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      monitored_app_reviews: {
        Row: {
          app_store_id: string
          app_version_name: string | null
          author: string | null
          business_impact: string | null
          country: string
          created_at: string
          developer_reply: string | null
          developer_reply_date: string | null
          enhanced_sentiment: Json | null
          extracted_themes: string[] | null
          fetched_at: string
          id: string
          identified_issues: string[] | null
          mentioned_features: string[] | null
          monitored_app_id: string
          organization_id: string
          platform: string
          processed_at: string
          processing_version: string | null
          rating: number
          review_date: string
          review_id: string
          reviewer_language: string | null
          text: string
          thumbs_up_count: number | null
          title: string | null
          updated_at: string
          version: string | null
        }
        Insert: {
          app_store_id: string
          app_version_name?: string | null
          author?: string | null
          business_impact?: string | null
          country: string
          created_at?: string
          developer_reply?: string | null
          developer_reply_date?: string | null
          enhanced_sentiment?: Json | null
          extracted_themes?: string[] | null
          fetched_at?: string
          id?: string
          identified_issues?: string[] | null
          mentioned_features?: string[] | null
          monitored_app_id: string
          organization_id: string
          platform?: string
          processed_at?: string
          processing_version?: string | null
          rating: number
          review_date: string
          review_id: string
          reviewer_language?: string | null
          text: string
          thumbs_up_count?: number | null
          title?: string | null
          updated_at?: string
          version?: string | null
        }
        Update: {
          app_store_id?: string
          app_version_name?: string | null
          author?: string | null
          business_impact?: string | null
          country?: string
          created_at?: string
          developer_reply?: string | null
          developer_reply_date?: string | null
          enhanced_sentiment?: Json | null
          extracted_themes?: string[] | null
          fetched_at?: string
          id?: string
          identified_issues?: string[] | null
          mentioned_features?: string[] | null
          monitored_app_id?: string
          organization_id?: string
          platform?: string
          processed_at?: string
          processing_version?: string | null
          rating?: number
          review_date?: string
          review_id?: string
          reviewer_language?: string | null
          text?: string
          thumbs_up_count?: number | null
          title?: string | null
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monitored_app_reviews_monitored_app_id_fkey"
            columns: ["monitored_app_id"]
            isOneToOne: false
            referencedRelation: "monitored_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitored_app_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "monitored_app_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      monitored_apps: {
        Row: {
          app_icon_url: string | null
          app_id: string
          app_name: string
          audit_enabled: boolean | null
          brand_keywords: string[] | null
          bundle_id: string | null
          category: string | null
          created_at: string
          created_by: string | null
          developer_name: string | null
          id: string
          last_checked_at: string | null
          latest_audit_at: string | null
          latest_audit_score: number | null
          locale: string
          metadata_last_refreshed_at: string | null
          monitor_type: string
          notes: string | null
          organization_id: string
          platform: string
          play_store_package_id: string | null
          play_store_url: string | null
          primary_country: string
          snapshot_rating: number | null
          snapshot_review_count: number | null
          snapshot_taken_at: string | null
          tags: string[] | null
          updated_at: string
          validated_at: string | null
          validated_state: Database["public"]["Enums"]["monitored_app_validated_state"]
          validation_error: string | null
        }
        Insert: {
          app_icon_url?: string | null
          app_id: string
          app_name: string
          audit_enabled?: boolean | null
          brand_keywords?: string[] | null
          bundle_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          developer_name?: string | null
          id?: string
          last_checked_at?: string | null
          latest_audit_at?: string | null
          latest_audit_score?: number | null
          locale?: string
          metadata_last_refreshed_at?: string | null
          monitor_type?: string
          notes?: string | null
          organization_id: string
          platform?: string
          play_store_package_id?: string | null
          play_store_url?: string | null
          primary_country: string
          snapshot_rating?: number | null
          snapshot_review_count?: number | null
          snapshot_taken_at?: string | null
          tags?: string[] | null
          updated_at?: string
          validated_at?: string | null
          validated_state?: Database["public"]["Enums"]["monitored_app_validated_state"]
          validation_error?: string | null
        }
        Update: {
          app_icon_url?: string | null
          app_id?: string
          app_name?: string
          audit_enabled?: boolean | null
          brand_keywords?: string[] | null
          bundle_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          developer_name?: string | null
          id?: string
          last_checked_at?: string | null
          latest_audit_at?: string | null
          latest_audit_score?: number | null
          locale?: string
          metadata_last_refreshed_at?: string | null
          monitor_type?: string
          notes?: string | null
          organization_id?: string
          platform?: string
          play_store_package_id?: string | null
          play_store_url?: string | null
          primary_country?: string
          snapshot_rating?: number | null
          snapshot_review_count?: number | null
          snapshot_taken_at?: string | null
          tags?: string[] | null
          updated_at?: string
          validated_at?: string | null
          validated_state?: Database["public"]["Enums"]["monitored_app_validated_state"]
          validation_error?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monitored_apps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "monitored_apps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_app_access: {
        Row: {
          app_id: string
          attached_at: string | null
          created_at: string | null
          detached_at: string | null
          granted_by: string | null
          id: string
          org_id: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          app_id: string
          attached_at?: string | null
          created_at?: string | null
          detached_at?: string | null
          granted_by?: string | null
          id?: string
          org_id: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          app_id?: string
          attached_at?: string | null
          created_at?: string | null
          detached_at?: string | null
          granted_by?: string | null
          id?: string
          org_id?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_org_app_access_app_id"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps_catalog"
            referencedColumns: ["app_id"]
          },
          {
            foreignKeyName: "org_app_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_app_access_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "org_app_access_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_app_access_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "org_app_access_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_app_access_audit: {
        Row: {
          action: string
          app_id: string
          changed_at: string | null
          changed_by: string | null
          id: string
          metadata: Json | null
          organization_id: string
        }
        Insert: {
          action: string
          app_id: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
        }
        Update: {
          action?: string
          app_id?: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_app_access_audit_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_app_access_audit_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "org_app_access_audit_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_feature_entitlements: {
        Row: {
          created_at: string | null
          feature_key: string
          granted_at: string | null
          granted_by: string | null
          id: string
          is_enabled: boolean | null
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          feature_key: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_enabled?: boolean | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          feature_key?: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_enabled?: boolean | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_feature_entitlements_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "platform_features"
            referencedColumns: ["feature_key"]
          },
          {
            foreignKeyName: "org_feature_entitlements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "org_feature_entitlements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_users_backup: {
        Row: {
          created_at: string | null
          id: string | null
          org_id: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          org_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          org_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      org_users_deprecated: {
        Row: {
          created_at: string | null
          id: string
          org_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          org_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          org_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "org_users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_features: {
        Row: {
          created_at: string | null
          feature_key: string
          id: string
          is_enabled: boolean
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          feature_key: string
          id?: string
          is_enabled?: boolean
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          feature_key?: string
          id?: string
          is_enabled?: boolean
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_features_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_features_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          access_level: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          domain: string | null
          id: string
          is_active: boolean | null
          max_apps: number | null
          name: string
          settings: Json | null
          slug: string
          subscription_tier: string | null
          tier: string | null
          updated_at: string
        }
        Insert: {
          access_level?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          domain?: string | null
          id?: string
          is_active?: boolean | null
          max_apps?: number | null
          name: string
          settings?: Json | null
          slug: string
          subscription_tier?: string | null
          tier?: string | null
          updated_at?: string
        }
        Update: {
          access_level?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          domain?: string | null
          id?: string
          is_active?: boolean | null
          max_apps?: number | null
          name?: string
          settings?: Json | null
          slug?: string
          subscription_tier?: string | null
          tier?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_features: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          feature_key: string
          feature_name: string
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          feature_key: string
          feature_name: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          feature_key?: string
          feature_name?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          org_id: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          org_id: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          org_id?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      review_fetch_log: {
        Row: {
          cache_age_seconds: number | null
          cache_hit: boolean | null
          created_at: string
          error_message: string | null
          fetch_duration_ms: number | null
          fetched_at: string
          id: string
          ip_address: unknown
          itunes_api_status: number | null
          monitored_app_id: string
          organization_id: string
          platform: string
          reviews_fetched: number | null
          reviews_updated: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          cache_age_seconds?: number | null
          cache_hit?: boolean | null
          created_at?: string
          error_message?: string | null
          fetch_duration_ms?: number | null
          fetched_at?: string
          id?: string
          ip_address?: unknown
          itunes_api_status?: number | null
          monitored_app_id: string
          organization_id: string
          platform?: string
          reviews_fetched?: number | null
          reviews_updated?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          cache_age_seconds?: number | null
          cache_hit?: boolean | null
          created_at?: string
          error_message?: string | null
          fetch_duration_ms?: number | null
          fetched_at?: string
          id?: string
          ip_address?: unknown
          itunes_api_status?: number | null
          monitored_app_id?: string
          organization_id?: string
          platform?: string
          reviews_fetched?: number | null
          reviews_updated?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_fetch_log_monitored_app_id_fkey"
            columns: ["monitored_app_id"]
            isOneToOne: false
            referencedRelation: "monitored_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_fetch_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "review_fetch_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      review_intelligence_snapshots: {
        Row: {
          actionable_insights: Json | null
          average_rating: number | null
          created_at: string
          date_range_end: string | null
          date_range_start: string | null
          id: string
          intelligence: Json
          intelligence_version: string | null
          monitored_app_id: string
          organization_id: string
          platform: string
          reviews_analyzed: number
          sentiment_distribution: Json | null
          snapshot_date: string
          total_reviews: number
        }
        Insert: {
          actionable_insights?: Json | null
          average_rating?: number | null
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          id?: string
          intelligence: Json
          intelligence_version?: string | null
          monitored_app_id: string
          organization_id: string
          platform?: string
          reviews_analyzed: number
          sentiment_distribution?: Json | null
          snapshot_date?: string
          total_reviews: number
        }
        Update: {
          actionable_insights?: Json | null
          average_rating?: number | null
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          id?: string
          intelligence?: Json
          intelligence_version?: string | null
          monitored_app_id?: string
          organization_id?: string
          platform?: string
          reviews_analyzed?: number
          sentiment_distribution?: Json | null
          snapshot_date?: string
          total_reviews?: number
        }
        Relationships: [
          {
            foreignKeyName: "review_intelligence_snapshots_monitored_app_id_fkey"
            columns: ["monitored_app_id"]
            isOneToOne: false
            referencedRelation: "monitored_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_intelligence_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "review_intelligence_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      role_feature_permissions: {
        Row: {
          created_at: string | null
          description: string | null
          feature_key: string
          id: string
          is_allowed: boolean | null
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          feature_key: string
          id?: string
          is_allowed?: boolean | null
          role: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          feature_key?: string
          id?: string
          is_allowed?: boolean | null
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_feature_key"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "platform_features"
            referencedColumns: ["feature_key"]
          },
        ]
      }
      scrape_cache: {
        Row: {
          data: Json | null
          error: string | null
          expires_at: string
          id: string
          organization_id: string | null
          scraped_at: string
          status: string
          url: string
        }
        Insert: {
          data?: Json | null
          error?: string | null
          expires_at: string
          id?: string
          organization_id?: string | null
          scraped_at?: string
          status: string
          url: string
        }
        Update: {
          data?: Json | null
          error?: string | null
          expires_at?: string
          id?: string
          organization_id?: string | null
          scraped_at?: string
          status?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "scrape_cache_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "scrape_cache_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      search_intent_registry: {
        Row: {
          autocomplete_rank: number | null
          autocomplete_suggestions: Json | null
          autocomplete_volume_estimate: number | null
          created_at: string | null
          data_source: string | null
          id: string
          intent_confidence: number | null
          intent_type: string
          keyword: string
          last_refreshed_at: string | null
          platform: string
          region: string
          updated_at: string | null
        }
        Insert: {
          autocomplete_rank?: number | null
          autocomplete_suggestions?: Json | null
          autocomplete_volume_estimate?: number | null
          created_at?: string | null
          data_source?: string | null
          id?: string
          intent_confidence?: number | null
          intent_type: string
          keyword: string
          last_refreshed_at?: string | null
          platform: string
          region?: string
          updated_at?: string | null
        }
        Update: {
          autocomplete_rank?: number | null
          autocomplete_suggestions?: Json | null
          autocomplete_volume_estimate?: number | null
          created_at?: string | null
          data_source?: string | null
          id?: string
          intent_confidence?: number | null
          intent_type?: string
          keyword?: string
          last_refreshed_at?: string | null
          platform?: string
          region?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      semantic_insights: {
        Row: {
          analyzed_at: string
          app_name: string
          app_store_id: string
          aso_keywords: string[] | null
          aso_relevance_score: number | null
          category: string | null
          context_phrase: string
          country: string
          created_at: string
          demand_level: string | null
          expires_at: string
          exploitability: string | null
          first_seen: string | null
          id: string
          impact_score: number | null
          insight_type: string
          last_seen: string | null
          mention_count: number
          noun: string | null
          organization_id: string
          sentiment_negative_pct: number | null
          sentiment_positive_pct: number | null
          sentiment_score: number | null
          subcategory: string | null
          topic_display: string
          topic_id: string
          trend_direction: string | null
          trend_mom_pct: number | null
          updated_at: string
          verb: string | null
        }
        Insert: {
          analyzed_at?: string
          app_name: string
          app_store_id: string
          aso_keywords?: string[] | null
          aso_relevance_score?: number | null
          category?: string | null
          context_phrase: string
          country: string
          created_at?: string
          demand_level?: string | null
          expires_at?: string
          exploitability?: string | null
          first_seen?: string | null
          id?: string
          impact_score?: number | null
          insight_type: string
          last_seen?: string | null
          mention_count?: number
          noun?: string | null
          organization_id: string
          sentiment_negative_pct?: number | null
          sentiment_positive_pct?: number | null
          sentiment_score?: number | null
          subcategory?: string | null
          topic_display: string
          topic_id: string
          trend_direction?: string | null
          trend_mom_pct?: number | null
          updated_at?: string
          verb?: string | null
        }
        Update: {
          analyzed_at?: string
          app_name?: string
          app_store_id?: string
          aso_keywords?: string[] | null
          aso_relevance_score?: number | null
          category?: string | null
          context_phrase?: string
          country?: string
          created_at?: string
          demand_level?: string | null
          expires_at?: string
          exploitability?: string | null
          first_seen?: string | null
          id?: string
          impact_score?: number | null
          insight_type?: string
          last_seen?: string | null
          mention_count?: number
          noun?: string | null
          organization_id?: string
          sentiment_negative_pct?: number | null
          sentiment_positive_pct?: number | null
          sentiment_score?: number | null
          subcategory?: string | null
          topic_display?: string
          topic_id?: string
          trend_direction?: string | null
          trend_mom_pct?: number | null
          updated_at?: string
          verb?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "semantic_insights_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "semantic_insights_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      theme_impact_scores: {
        Row: {
          affected_user_estimate: number | null
          affected_versions: string[] | null
          analysis_date: string
          avg_sentiment: number | null
          created_at: string
          estimated_effort: string | null
          example_reviews: Json | null
          first_seen_date: string | null
          id: string
          impact_level: string | null
          impact_score: number
          last_seen_date: string | null
          mention_count: number
          monitored_app_id: string
          negative_mentions: number | null
          neutral_mentions: number | null
          organization_id: string
          period_days: number
          positive_mentions: number | null
          potential_rating_impact: number | null
          recommended_action: string | null
          related_features: string[] | null
          related_issues: string[] | null
          sentiment_intensity: string | null
          theme: string
          theme_category: string | null
          trend_direction: string | null
          unique_reviews: number
          updated_at: string
          urgency: string | null
          user_impact_level: string | null
          week_over_week_change: number | null
        }
        Insert: {
          affected_user_estimate?: number | null
          affected_versions?: string[] | null
          analysis_date?: string
          avg_sentiment?: number | null
          created_at?: string
          estimated_effort?: string | null
          example_reviews?: Json | null
          first_seen_date?: string | null
          id?: string
          impact_level?: string | null
          impact_score: number
          last_seen_date?: string | null
          mention_count?: number
          monitored_app_id: string
          negative_mentions?: number | null
          neutral_mentions?: number | null
          organization_id: string
          period_days?: number
          positive_mentions?: number | null
          potential_rating_impact?: number | null
          recommended_action?: string | null
          related_features?: string[] | null
          related_issues?: string[] | null
          sentiment_intensity?: string | null
          theme: string
          theme_category?: string | null
          trend_direction?: string | null
          unique_reviews?: number
          updated_at?: string
          urgency?: string | null
          user_impact_level?: string | null
          week_over_week_change?: number | null
        }
        Update: {
          affected_user_estimate?: number | null
          affected_versions?: string[] | null
          analysis_date?: string
          avg_sentiment?: number | null
          created_at?: string
          estimated_effort?: string | null
          example_reviews?: Json | null
          first_seen_date?: string | null
          id?: string
          impact_level?: string | null
          impact_score?: number
          last_seen_date?: string | null
          mention_count?: number
          monitored_app_id?: string
          negative_mentions?: number | null
          neutral_mentions?: number | null
          organization_id?: string
          period_days?: number
          positive_mentions?: number | null
          potential_rating_impact?: number | null
          recommended_action?: string | null
          related_features?: string[] | null
          related_issues?: string[] | null
          sentiment_intensity?: string | null
          theme?: string
          theme_category?: string | null
          trend_direction?: string | null
          unique_reviews?: number
          updated_at?: string
          urgency?: string | null
          user_impact_level?: string | null
          week_over_week_change?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "theme_impact_scores_monitored_app_id_fkey"
            columns: ["monitored_app_id"]
            isOneToOne: false
            referencedRelation: "monitored_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "theme_impact_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "theme_impact_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      theme_score_history: {
        Row: {
          avg_sentiment: number | null
          created_at: string
          id: string
          impact_score: number
          mention_count: number
          monitored_app_id: string
          organization_id: string
          snapshot_date: string
          theme_score_id: string
          trend_direction: string | null
        }
        Insert: {
          avg_sentiment?: number | null
          created_at?: string
          id?: string
          impact_score: number
          mention_count: number
          monitored_app_id: string
          organization_id: string
          snapshot_date: string
          theme_score_id: string
          trend_direction?: string | null
        }
        Update: {
          avg_sentiment?: number | null
          created_at?: string
          id?: string
          impact_score?: number
          mention_count?: number
          monitored_app_id?: string
          organization_id?: string
          snapshot_date?: string
          theme_score_id?: string
          trend_direction?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "theme_score_history_monitored_app_id_fkey"
            columns: ["monitored_app_id"]
            isOneToOne: false
            referencedRelation: "monitored_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "theme_score_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "theme_score_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "theme_score_history_theme_score_id_fkey"
            columns: ["theme_score_id"]
            isOneToOne: false
            referencedRelation: "theme_impact_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "theme_score_history_theme_score_id_fkey"
            columns: ["theme_score_id"]
            isOneToOne: false
            referencedRelation: "vw_critical_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          org_id: string | null
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          org_id?: string | null
          organization_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          org_id?: string | null
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "user_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles_backup: {
        Row: {
          created_at: string | null
          id: string | null
          org_id: string | null
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          org_id?: string | null
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          org_id?: string | null
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      audit_logs_recent: {
        Row: {
          action: string | null
          created_at: string | null
          id: string | null
          ip_address: unknown
          organization_name: string | null
          resource_type: string | null
          status: string | null
          status_display: string | null
          user_email: string | null
        }
        Relationships: []
      }
      chatgpt_visibility_scores_unified: {
        Row: {
          audit_run_id: string | null
          average_position: number | null
          avg_position: number | null
          calculated_at: string | null
          created_at: string | null
          entity_name: string | null
          id: string | null
          mention_count: number | null
          mention_rate: number | null
          organization_id: string | null
          overall_score: number | null
          position: number | null
          sentiment_score: number | null
          visibility_score: number | null
        }
        Insert: {
          audit_run_id?: string | null
          average_position?: number | null
          avg_position?: number | null
          calculated_at?: string | null
          created_at?: string | null
          entity_name?: string | null
          id?: string | null
          mention_count?: number | null
          mention_rate?: number | null
          organization_id?: string | null
          overall_score?: number | null
          position?: never
          sentiment_score?: number | null
          visibility_score?: number | null
        }
        Update: {
          audit_run_id?: string | null
          average_position?: number | null
          avg_position?: number | null
          calculated_at?: string | null
          created_at?: string | null
          entity_name?: string | null
          id?: string | null
          mention_count?: number | null
          mention_rate?: number | null
          organization_id?: string | null
          overall_score?: number | null
          position?: never
          sentiment_score?: number | null
          visibility_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chatgpt_visibility_scores_audit_run_id_fkey"
            columns: ["audit_run_id"]
            isOneToOne: false
            referencedRelation: "chatgpt_audit_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatgpt_visibility_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "chatgpt_visibility_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      combo_rankings_latest: {
        Row: {
          app_id: string | null
          combo: string | null
          is_ranking: boolean | null
          is_stale: boolean | null
          keyword_id: string | null
          last_tracked_at: string | null
          organization_id: string | null
          platform: string | null
          position: number | null
          position_change: number | null
          region: string | null
          snapshot_date: string | null
          trend: string | null
          visibility_score: number | null
          word_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "keywords_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keywords_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "keywords_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_visibility_latest_analysis: {
        Row: {
          created_at: string | null
          description_hash: string | null
          factual_grounding_score: number | null
          id: string | null
          intent_coverage_score: number | null
          monitored_app_id: string | null
          organization_id: string | null
          overall_score: number | null
          rules_version: string | null
          safety_credibility_score: number | null
          semantic_clusters_score: number | null
          snippet_quality_score: number | null
          structure_readability_score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "llm_visibility_analysis_monitored_app_id_fkey"
            columns: ["monitored_app_id"]
            isOneToOne: false
            referencedRelation: "monitored_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llm_visibility_analysis_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "llm_visibility_analysis_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_app_access_active: {
        Row: {
          app_id: string | null
          attached_at: string | null
          granted_by: string | null
          organization_id: string | null
        }
        Insert: {
          app_id?: string | null
          attached_at?: string | null
          granted_by?: string | null
          organization_id?: string | null
        }
        Update: {
          app_id?: string | null
          attached_at?: string | null
          granted_by?: string | null
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_org_app_access_app_id"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps_catalog"
            referencedColumns: ["app_id"]
          },
          {
            foreignKeyName: "org_app_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_app_access_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "org_app_access_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_app_access_audit_with_users: {
        Row: {
          action: string | null
          app_id: string | null
          changed_at: string | null
          changed_by_email: string | null
          id: string | null
          metadata: Json | null
          organization_id: string | null
          organization_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_app_access_audit_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "org_app_access_audit_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_app_usage: {
        Row: {
          active_apps: number | null
          app_limit: number | null
          app_limit_enforced: boolean | null
          current_app_count: number | null
          inactive_apps: number | null
          organization_id: string | null
          organization_name: string | null
          remaining_apps: number | null
          subscription_tier: string | null
          usage_percentage: number | null
        }
        Relationships: []
      }
      organization_features_view: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          feature_key: string | null
          feature_name: string | null
          id: string | null
          is_enabled: boolean | null
          organization_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_feature_entitlements_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "platform_features"
            referencedColumns: ["feature_key"]
          },
          {
            foreignKeyName: "org_feature_entitlements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "org_feature_entitlements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions_unified: {
        Row: {
          effective_role: string | null
          is_org_admin: boolean | null
          is_org_scoped_role: boolean | null
          is_platform_role: boolean | null
          is_super_admin: boolean | null
          org_id: string | null
          org_name: string | null
          org_slug: string | null
          resolved_at: string | null
          role: string | null
          role_source: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_role_permissions: {
        Row: {
          category: string | null
          description: string | null
          feature_key: string | null
          feature_name: string | null
          is_allowed: boolean | null
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_feature_key"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "platform_features"
            referencedColumns: ["feature_key"]
          },
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_competitor_benchmark_matrix: {
        Row: {
          avg_sentiment_score: number | null
          competitor_app_name: string | null
          competitor_app_store_id: string | null
          country: string | null
          created_at: string | null
          issue_frequency_per_100: number | null
          organization_id: string | null
          rating: number | null
          rating_percentile: number | null
          review_count: number | null
          review_velocity_30d: number | null
          review_velocity_7d: number | null
          sentiment_percentile: number | null
          sentiment_positive_pct: number | null
          snapshot_date: string | null
          target_app_id: string | null
          target_app_name: string | null
          velocity_percentile: number | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_metrics_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "competitor_metrics_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_metrics_snapshots_target_app_id_fkey"
            columns: ["target_app_id"]
            isOneToOne: false
            referencedRelation: "monitored_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_critical_themes: {
        Row: {
          analysis_date: string | null
          app_name: string | null
          avg_sentiment: number | null
          id: string | null
          impact_level: string | null
          impact_score: number | null
          last_seen_date: string | null
          mention_count: number | null
          monitored_app_id: string | null
          organization_id: string | null
          potential_rating_impact: number | null
          recommended_action: string | null
          theme: string | null
          theme_category: string | null
          trend_direction: string | null
          urgency: string | null
          week_over_week_change: number | null
        }
        Relationships: [
          {
            foreignKeyName: "theme_impact_scores_monitored_app_id_fkey"
            columns: ["monitored_app_id"]
            isOneToOne: false
            referencedRelation: "monitored_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "theme_impact_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "theme_impact_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_feature_gap_opportunities: {
        Row: {
          analyzed_at: string | null
          avg_competitor_sentiment: number | null
          competitor_count: number | null
          country: string | null
          demand_level: string | null
          demand_score: number | null
          feature_category: string | null
          feature_name: string | null
          mention_count: number | null
          opportunity_score: number | null
          organization_id: string | null
          sample_reviews: Json | null
          sentiment_score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_sentiment_analysis_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "feature_sentiment_analysis_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      are_apps_linked_as_competitors: {
        Args: {
          p_competitor_app_id: string
          p_org_id: string
          p_target_app_id: string
        }
        Returns: boolean
      }
      calculate_refresh_priority: {
        Args: {
          p_is_ranking: boolean
          p_keyword_type: string
          p_last_tracked_at: string
        }
        Returns: number
      }
      calculate_theme_impact_score: {
        Args: {
          p_avg_sentiment: number
          p_days_since_first_seen: number
          p_mention_count: number
          p_trend_direction: string
          p_unique_reviews: number
        }
        Returns: number
      }
      calculate_token_intent_scores: {
        Args: { p_locale?: string; p_platform?: string }
        Returns: {
          combo_count: number
          intent_score: number
          token: string
        }[]
      }
      calculate_visibility_score: {
        Args: { p_position: number; p_search_volume: number }
        Returns: number
      }
      calculate_word_count: { Args: { text_input: string }; Returns: number }
      can_access_organization: {
        Args: { target_org_id: string; user_id?: string }
        Returns: boolean
      }
      can_add_app: {
        Args: { check_organization_id?: string }
        Returns: boolean
      }
      check_mfa_required: { Args: { p_user_id: string }; Returns: Json }
      check_org_access: { Args: { target_org_id: string }; Returns: boolean }
      check_rls_policies: {
        Args: { table_name: string }
        Returns: {
          command_type: string
          policy_name: string
          using_expression: string
          with_check_expression: string
        }[]
      }
      cleanup_expired_comparison_cache: { Args: never; Returns: number }
      cleanup_expired_competitor_cache: { Args: never; Returns: number }
      cleanup_expired_semantic_insights: { Args: never; Returns: number }
      cleanup_old_refresh_queue_entries: { Args: never; Returns: undefined }
      count_active_markets: { Args: { app_id: string }; Returns: number }
      create_organization_user: {
        Args: {
          p_email: string
          p_organization_id: string
          p_password: string
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_metadata?: Json
        }
        Returns: Json
      }
      deactivate_user: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: Json
      }
      generate_comparison_cache_key: {
        Args: {
          p_competitor_ids: string[]
          p_config_hash?: string
          p_target_app_id: string
        }
        Returns: string
      }
      generate_competitive_summary: {
        Args: { p_country?: string; p_target_app_id: string }
        Returns: Json
      }
      get_accessible_organizations: {
        Args: { input_user_id?: string }
        Returns: {
          access_type: string
          org_id: string
          org_name: string
          org_slug: string
          tier: string
        }[]
      }
      get_active_markets: {
        Args: { app_id: string }
        Returns: {
          is_available: boolean
          last_fetched_at: string
          market_code: string
          title: string
        }[]
      }
      get_app_combo_rankings: {
        Args: { p_app_id: string; p_platform?: string; p_region?: string }
        Returns: {
          combo: string
          is_ranking: boolean
          is_stale: boolean
          keyword_id: string
          position: number
          snapshot_date: string
          trend: string
          visibility_score: number
          word_count: number
        }[]
      }
      get_cache_age_seconds: {
        Args: { p_monitored_app_id: string }
        Returns: number
      }
      get_combo_ranking_history: {
        Args: {
          p_app_id: string
          p_combo: string
          p_days?: number
          p_platform?: string
          p_region?: string
        }
        Returns: {
          is_ranking: boolean
          position: number
          position_change: number
          snapshot_date: string
          trend: string
          visibility_score: number
        }[]
      }
      get_comparison_cache: {
        Args: {
          p_allow_stale?: boolean
          p_competitor_ids: string[]
          p_config_hash?: string
          p_target_app_id: string
        }
        Returns: {
          cache_key: string
          comparison_config: Json
          comparison_data: Json
          computation_time_ms: number | null
          created_at: string
          expires_at: string | null
          id: string
          is_stale: boolean | null
          organization_id: string
          source_audit_ids: Json
          target_app_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "competitor_comparison_cache"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_competitor_audit_summary: {
        Args: { p_target_app_id: string }
        Returns: {
          audited_competitors: number
          avg_score: number
          failed_audits: number
          last_audit_time: string
          never_audited: number
          stale_audits: number
          total_competitors: number
        }[]
      }
      get_competitor_cache_age: {
        Args: {
          p_competitor_app_ids: string[]
          p_country: string
          p_organization_id: string
          p_primary_app_id: string
        }
        Returns: {
          cache_age_seconds: number
          cache_exists: boolean
          is_fresh: boolean
        }[]
      }
      get_competitors_needing_audit: {
        Args: { p_max_age_hours?: number; p_target_app_id: string }
        Returns: {
          audit_count: number | null
          audit_status:
            | Database["public"]["Enums"]["competitor_audit_status"]
            | null
          comparison_context: string | null
          comparison_summary: Json | null
          competitor_app_icon: string | null
          competitor_app_name: string
          competitor_app_store_id: string
          competitor_bundle_id: string | null
          competitor_category: string | null
          competitor_developer: string | null
          competitor_rating: number | null
          competitor_review_count: number | null
          country: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          is_audit_stale: boolean | null
          last_audit_at: string | null
          last_audit_id: string | null
          last_audit_score: number | null
          last_compared_at: string | null
          metadata_changed_count: number | null
          organization_id: string
          priority: number | null
          target_app_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "app_competitors"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_current_user_organization_id: { Args: never; Returns: string }
      get_effective_intent_patterns: {
        Args: {
          p_app_id?: string
          p_market?: string
          p_organization_id?: string
          p_vertical?: string
        }
        Returns: {
          effective_weight: number
          example: string
          has_override: boolean
          intent_type: string
          is_active: boolean
          override_source: string
          pattern: string
          pattern_id: string
          priority: number
        }[]
      }
      get_effective_rule_config: {
        Args: {
          p_market?: string
          p_organization_id?: string
          p_rule_id: string
          p_vertical?: string
        }
        Returns: Json
      }
      get_impact_level: { Args: { p_score: number }; Returns: string }
      get_keyword_stats: {
        Args: { p_app_id: string }
        Returns: {
          avg_position: number
          top_10_count: number
          top_30_count: number
          top_50_count: number
          total_estimated_traffic: number
          total_keywords: number
        }[]
      }
      get_latest_combo_ranking: {
        Args: {
          p_app_id: string
          p_combo: string
          p_platform?: string
          p_region?: string
        }
        Returns: {
          is_ranking: boolean
          position: number
          position_change: number
          serp_snapshot: Json
          snapshot_date: string
          trend: string
          visibility_score: number
        }[]
      }
      get_latest_competitor_audit: {
        Args: { p_competitor_id: string }
        Returns: {
          audit_data: Json
          combo_coverage_percent: number | null
          competitor_id: string
          created_at: string
          description_char_count: number | null
          description_score: number | null
          discovery_brand_count: number | null
          discovery_learning_count: number | null
          discovery_noise_count: number | null
          discovery_outcome_count: number | null
          error_message: string | null
          existing_combos: number | null
          id: string
          intent_coverage_commercial: number | null
          intent_coverage_informational: number | null
          intent_coverage_navigational: number | null
          intent_coverage_transactional: number | null
          metadata: Json
          missing_combos: number | null
          organization_id: string
          overall_score: number | null
          rule_config: Json | null
          status: string | null
          subtitle_char_count: number | null
          subtitle_score: number | null
          target_app_id: string
          title_char_count: number | null
          title_score: number | null
          total_combos: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "competitor_audit_snapshots"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_latest_competitor_audits_for_app: {
        Args: { p_target_app_id: string }
        Returns: {
          audit_data: Json
          combo_coverage_percent: number | null
          competitor_id: string
          created_at: string
          description_char_count: number | null
          description_score: number | null
          discovery_brand_count: number | null
          discovery_learning_count: number | null
          discovery_noise_count: number | null
          discovery_outcome_count: number | null
          error_message: string | null
          existing_combos: number | null
          id: string
          intent_coverage_commercial: number | null
          intent_coverage_informational: number | null
          intent_coverage_navigational: number | null
          intent_coverage_transactional: number | null
          metadata: Json
          missing_combos: number | null
          organization_id: string
          overall_score: number | null
          rule_config: Json | null
          status: string | null
          subtitle_char_count: number | null
          subtitle_score: number | null
          target_app_id: string
          title_char_count: number | null
          title_score: number | null
          total_combos: number | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "competitor_audit_snapshots"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_latest_llm_visibility_score: {
        Args: { app_id: string }
        Returns: number
      }
      get_org_apps_with_display_names: {
        Args: { target_org_id: string }
        Returns: {
          app_id: string
          attached_at: string
          category: string
          display_name: string
          is_active: boolean
          platform: string
        }[]
      }
      get_pending_app_discoveries: {
        Args: { p_organization_id?: string }
        Returns: Json
      }
      get_stale_keywords: {
        Args: { batch_size?: number; max_age_hours?: number }
        Returns: {
          keyword: string
          locale: string
          platform: string
        }[]
      }
      get_target_app_competitors: {
        Args: { p_include_inactive?: boolean; p_target_app_id: string }
        Returns: {
          comparison_context: string
          competitor_app_icon: string
          competitor_app_name: string
          competitor_app_store_id: string
          competitor_category: string
          competitor_developer: string
          competitor_id: string
          competitor_rating: number
          competitor_review_count: number
          country: string
          last_compared_at: string
          priority: number
        }[]
      }
      get_user_active_session_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_highest_privilege: {
        Args: { input_user_id?: string }
        Returns: {
          highest_role: string
          is_platform_super_admin: boolean
          primary_org_id: string
          primary_org_name: string
          total_orgs_access: number
          user_id: string
        }[]
      }
      get_user_message_count_today: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_organization_id: { Args: never; Returns: string }
      grant_org_app_access: {
        Args: {
          p_app_id: string
          p_granted_by?: string
          p_organization_id: string
        }
        Returns: boolean
      }
      invalidate_comparison_cache: {
        Args: { p_target_app_id: string }
        Returns: number
      }
      is_cache_fresh: {
        Args: { p_monitored_app_id: string; p_ttl_hours?: number }
        Returns: boolean
      }
      is_competitor_audit_stale: {
        Args: { p_competitor_id: string; p_max_age_hours?: number }
        Returns: boolean
      }
      is_internal_yodel_user: { Args: never; Returns: boolean }
      is_super_admin: { Args: { check_user_id?: string }; Returns: boolean }
      is_super_admin_db: { Args: never; Returns: boolean }
      list_organization_users: {
        Args: { p_organization_id?: string }
        Returns: {
          created_at: string
          email: string
          is_active: boolean
          organization_id: string
          organization_name: string
          role: string
          user_id: string
        }[]
      }
      llm_description_changed: {
        Args: { app_id: string; new_description: string; new_hash: string }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_details?: Json
          p_error_message?: string
          p_ip_address?: unknown
          p_organization_id: string
          p_request_path?: string
          p_resource_id?: string
          p_resource_type?: string
          p_status?: string
          p_user_agent?: string
          p_user_email: string
          p_user_id: string
        }
        Returns: string
      }
      mark_competitor_audits_stale: { Args: never; Returns: number }
      refresh_llm_visibility_cache: { Args: never; Returns: undefined }
      resolve_app_names_to_ids: {
        Args: { app_names: string[]; target_org_id?: string }
        Returns: {
          display_name: string
          input_name: string
          resolution_method: string
          resolved_app_id: string
        }[]
      }
      revoke_org_app_access: {
        Args: {
          p_app_id: string
          p_organization_id: string
          p_revoked_by?: string
        }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      test_bigquery_connection: { Args: never; Returns: Json }
      update_app_approval_status: {
        Args: { p_app_id: string; p_status: string }
        Returns: {
          app_description: string | null
          app_icon_url: string | null
          app_name: string
          app_rating: number | null
          app_reviews: number | null
          app_store_category: string | null
          app_store_id: string | null
          app_subtitle: string | null
          approved_at: string | null
          auto_discovery_enabled: boolean | null
          bundle_id: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          developer_name: string | null
          id: string
          intelligence_metadata: Json | null
          is_active: boolean | null
          keyword_tracking_enabled: boolean | null
          last_auto_discovery_at: string | null
          org_id: string
          organization_id: string
          platform: string
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "apps"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_user_role: {
        Args: {
          p_new_organization_id?: string
          p_new_role?: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: Json
      }
      user_belongs_to_organization: {
        Args: { org_id: string }
        Returns: boolean
      }
      user_has_role_permission: {
        Args: { check_feature_key: string; check_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "SUPER_ADMIN"
        | "ORG_ADMIN"
        | "ASO_MANAGER"
        | "ANALYST"
        | "VIEWER"
        | "super_admin"
        | "org_admin"
      aso_override_type:
        | "token_relevance"
        | "intent_pattern"
        | "hook_pattern"
        | "stopword"
        | "kpi_weight"
        | "formula"
        | "recommendation"
      aso_ruleset_scope: "vertical" | "market" | "client"
      competitor_audit_status:
        | "never_audited"
        | "pending"
        | "completed"
        | "failed"
        | "stale"
      monitored_app_validated_state: "valid" | "stale" | "invalid" | "unknown"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "SUPER_ADMIN",
        "ORG_ADMIN",
        "ASO_MANAGER",
        "ANALYST",
        "VIEWER",
        "super_admin",
        "org_admin",
      ],
      aso_override_type: [
        "token_relevance",
        "intent_pattern",
        "hook_pattern",
        "stopword",
        "kpi_weight",
        "formula",
        "recommendation",
      ],
      aso_ruleset_scope: ["vertical", "market", "client"],
      competitor_audit_status: [
        "never_audited",
        "pending",
        "completed",
        "failed",
        "stale",
      ],
      monitored_app_validated_state: ["valid", "stale", "invalid", "unknown"],
    },
  },
} as const
