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
      admin_creation_sessions: {
        Row: {
          created_at: string | null
          email: string
          error_details: string | null
          id: string
          ip_address: unknown | null
          state: string
          step: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          error_details?: string | null
          id?: string
          ip_address?: unknown | null
          state?: string
          step?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          error_details?: string | null
          id?: string
          ip_address?: unknown | null
          state?: string
          step?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_insights: {
        Row: {
          actionable_recommendations: Json | null
          confidence_score: number | null
          content: string
          created_at: string
          data_fingerprint: string
          expires_at: string | null
          id: string
          insight_type: string
          is_user_requested: boolean | null
          metrics_data: Json | null
          organization_id: string
          priority: string | null
          related_kpis: string[] | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          actionable_recommendations?: Json | null
          confidence_score?: number | null
          content: string
          created_at?: string
          data_fingerprint: string
          expires_at?: string | null
          id?: string
          insight_type: string
          is_user_requested?: boolean | null
          metrics_data?: Json | null
          organization_id: string
          priority?: string | null
          related_kpis?: string[] | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          actionable_recommendations?: Json | null
          confidence_score?: number | null
          content?: string
          created_at?: string
          data_fingerprint?: string
          expires_at?: string | null
          id?: string
          insight_type?: string
          is_user_requested?: boolean | null
          metrics_data?: Json | null
          organization_id?: string
          priority?: string | null
          related_kpis?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
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
          bundle_id: string | null
          category: string | null
          created_at: string
          created_by: string | null
          developer_name: string | null
          id: string
          intelligence_metadata: Json | null
          is_active: boolean | null
          organization_id: string
          platform: string
          settings: Json | null
          updated_at: string
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
          bundle_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          developer_name?: string | null
          id?: string
          intelligence_metadata?: Json | null
          is_active?: boolean | null
          organization_id: string
          platform: string
          settings?: Json | null
          updated_at?: string
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
          bundle_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          developer_name?: string | null
          id?: string
          intelligence_metadata?: Json | null
          is_active?: boolean | null
          organization_id?: string
          platform?: string
          settings?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apps_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apps_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profile_with_role"
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
      aso_metrics: {
        Row: {
          app_id: string
          conversion_rate: number | null
          country: string | null
          created_at: string
          data_source: string | null
          date: string
          downloads: number
          id: string
          impressions: number
          organization_id: string
          product_page_views: number
          raw_data: Json | null
          revenue: number | null
          sessions: number | null
        }
        Insert: {
          app_id: string
          conversion_rate?: number | null
          country?: string | null
          created_at?: string
          data_source?: string | null
          date: string
          downloads?: number
          id?: string
          impressions?: number
          organization_id: string
          product_page_views?: number
          raw_data?: Json | null
          revenue?: number | null
          sessions?: number | null
        }
        Update: {
          app_id?: string
          conversion_rate?: number | null
          country?: string | null
          created_at?: string
          data_source?: string | null
          date?: string
          downloads?: number
          id?: string
          impressions?: number
          organization_id?: string
          product_page_views?: number
          raw_data?: Json | null
          revenue?: number | null
          sessions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "aso_metrics_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown | null
          organization_id: string | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          organization_id?: string | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          organization_id?: string | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
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
      bulk_keyword_operations: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_count: number | null
          estimated_completion: string | null
          id: string
          keywords_count: number | null
          operation_params: Json | null
          operation_type: string
          organization_id: string
          processed_count: number | null
          results_summary: Json | null
          started_at: string | null
          status: string
          success_count: number | null
          target_app_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_count?: number | null
          estimated_completion?: string | null
          id?: string
          keywords_count?: number | null
          operation_params?: Json | null
          operation_type: string
          organization_id: string
          processed_count?: number | null
          results_summary?: Json | null
          started_at?: string | null
          status?: string
          success_count?: number | null
          target_app_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_count?: number | null
          estimated_completion?: string | null
          id?: string
          keywords_count?: number | null
          operation_params?: Json | null
          operation_type?: string
          organization_id?: string
          processed_count?: number | null
          results_summary?: Json | null
          started_at?: string | null
          status?: string
          success_count?: number | null
          target_app_id?: string
        }
        Relationships: []
      }
      chatgpt_audit_runs: {
        Row: {
          app_id: string
          audit_type: string | null
          completed_at: string | null
          completed_queries: number | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          processing_metadata: Json | null
          started_at: string | null
          status: string
          topic_data: Json | null
          total_queries: number | null
          updated_at: string
        }
        Insert: {
          app_id: string
          audit_type?: string | null
          completed_at?: string | null
          completed_queries?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          processing_metadata?: Json | null
          started_at?: string | null
          status?: string
          topic_data?: Json | null
          total_queries?: number | null
          updated_at?: string
        }
        Update: {
          app_id?: string
          audit_type?: string | null
          completed_at?: string | null
          completed_queries?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          processing_metadata?: Json | null
          started_at?: string | null
          status?: string
          topic_data?: Json | null
          total_queries?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      chatgpt_queries: {
        Row: {
          audit_run_id: string | null
          created_at: string
          id: string
          organization_id: string
          priority: number | null
          processed_at: string | null
          query_category: string | null
          query_text: string
          query_type: string | null
          status: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          audit_run_id?: string | null
          created_at?: string
          id?: string
          organization_id: string
          priority?: number | null
          processed_at?: string | null
          query_category?: string | null
          query_text: string
          query_type?: string | null
          status?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          audit_run_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          priority?: number | null
          processed_at?: string | null
          query_category?: string | null
          query_text?: string
          query_type?: string | null
          status?: string
          updated_at?: string | null
          variables?: Json | null
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
          competitors_mentioned: string[] | null
          cost_cents: number | null
          created_at: string
          entity_analysis: Json | null
          id: string
          mention_context: string | null
          mention_excerpts: Json | null
          mention_position: number | null
          organization_id: string
          processing_metadata: Json | null
          query_id: string
          ranking_context: Json | null
          raw_response: Json | null
          recommendation_strength: number | null
          response_text: string | null
          sentiment_score: number | null
          tokens_used: number | null
          total_entities_in_response: number | null
          visibility_score: number | null
        }
        Insert: {
          analysis_type?: string | null
          app_mentioned?: boolean | null
          audit_run_id: string
          competitors_mentioned?: string[] | null
          cost_cents?: number | null
          created_at?: string
          entity_analysis?: Json | null
          id?: string
          mention_context?: string | null
          mention_excerpts?: Json | null
          mention_position?: number | null
          organization_id: string
          processing_metadata?: Json | null
          query_id: string
          ranking_context?: Json | null
          raw_response?: Json | null
          recommendation_strength?: number | null
          response_text?: string | null
          sentiment_score?: number | null
          tokens_used?: number | null
          total_entities_in_response?: number | null
          visibility_score?: number | null
        }
        Update: {
          analysis_type?: string | null
          app_mentioned?: boolean | null
          audit_run_id?: string
          competitors_mentioned?: string[] | null
          cost_cents?: number | null
          created_at?: string
          entity_analysis?: Json | null
          id?: string
          mention_context?: string | null
          mention_excerpts?: Json | null
          mention_position?: number | null
          organization_id?: string
          processing_metadata?: Json | null
          query_id?: string
          ranking_context?: Json | null
          raw_response?: Json | null
          recommendation_strength?: number | null
          response_text?: string | null
          sentiment_score?: number | null
          tokens_used?: number | null
          total_entities_in_response?: number | null
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
          competitors: Json | null
          created_at: string | null
          entity_name: string
          id: string
          organization_id: string
          position: number | null
          query_id: string
          ranking_context: string | null
          ranking_type: string | null
          total_positions: number | null
        }
        Insert: {
          audit_run_id: string
          competitors?: Json | null
          created_at?: string | null
          entity_name: string
          id?: string
          organization_id: string
          position?: number | null
          query_id: string
          ranking_context?: string | null
          ranking_type?: string | null
          total_positions?: number | null
        }
        Update: {
          audit_run_id?: string
          competitors?: Json | null
          created_at?: string | null
          entity_name?: string
          id?: string
          organization_id?: string
          position?: number | null
          query_id?: string
          ranking_context?: string | null
          ranking_type?: string | null
          total_positions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_ranking_audit_run"
            columns: ["audit_run_id"]
            isOneToOne: false
            referencedRelation: "chatgpt_audit_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ranking_query"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "chatgpt_queries"
            referencedColumns: ["id"]
          },
        ]
      }
      chatgpt_visibility_scores: {
        Row: {
          app_id: string
          audit_run_id: string
          avg_position: number | null
          calculated_at: string
          category_scores: Json | null
          id: string
          mention_rate: number | null
          negative_mentions: number | null
          neutral_mentions: number | null
          organization_id: string
          overall_score: number | null
          positive_mentions: number | null
          top_competitors: Json | null
        }
        Insert: {
          app_id: string
          audit_run_id: string
          avg_position?: number | null
          calculated_at?: string
          category_scores?: Json | null
          id?: string
          mention_rate?: number | null
          negative_mentions?: number | null
          neutral_mentions?: number | null
          organization_id: string
          overall_score?: number | null
          positive_mentions?: number | null
          top_competitors?: Json | null
        }
        Update: {
          app_id?: string
          audit_run_id?: string
          avg_position?: number | null
          calculated_at?: string
          category_scores?: Json | null
          id?: string
          mention_rate?: number | null
          negative_mentions?: number | null
          neutral_mentions?: number | null
          organization_id?: string
          overall_score?: number | null
          positive_mentions?: number | null
          top_competitors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chatgpt_visibility_scores_audit_run_id_fkey"
            columns: ["audit_run_id"]
            isOneToOne: false
            referencedRelation: "chatgpt_audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      competitive_trends: {
        Row: {
          avg_rating: number | null
          created_at: string | null
          declining_keywords: string[] | null
          emerging_keywords: string[] | null
          id: string
          market_saturation_score: number | null
          organization_id: string
          search_term: string
          total_competitors: number | null
          trend_date: string | null
          trending_keywords: string[] | null
        }
        Insert: {
          avg_rating?: number | null
          created_at?: string | null
          declining_keywords?: string[] | null
          emerging_keywords?: string[] | null
          id?: string
          market_saturation_score?: number | null
          organization_id: string
          search_term: string
          total_competitors?: number | null
          trend_date?: string | null
          trending_keywords?: string[] | null
        }
        Update: {
          avg_rating?: number | null
          created_at?: string | null
          declining_keywords?: string[] | null
          emerging_keywords?: string[] | null
          id?: string
          market_saturation_score?: number | null
          organization_id?: string
          search_term?: string
          total_competitors?: number | null
          trend_date?: string | null
          trending_keywords?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "competitive_trends_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "competitive_trends_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_analysis: {
        Row: {
          ai_summary: string | null
          analysis_date: string | null
          analysis_status: string | null
          created_at: string | null
          id: string
          insights: Json | null
          organization_id: string
          search_term: string
          search_type: string
          total_apps_analyzed: number | null
          updated_at: string | null
        }
        Insert: {
          ai_summary?: string | null
          analysis_date?: string | null
          analysis_status?: string | null
          created_at?: string | null
          id?: string
          insights?: Json | null
          organization_id: string
          search_term: string
          search_type: string
          total_apps_analyzed?: number | null
          updated_at?: string | null
        }
        Update: {
          ai_summary?: string | null
          analysis_date?: string | null
          analysis_status?: string | null
          created_at?: string | null
          id?: string
          insights?: Json | null
          organization_id?: string
          search_term?: string
          search_type?: string
          total_apps_analyzed?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_analysis_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "competitor_analysis_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_app_rankings: {
        Row: {
          competition_strength: number | null
          competitor_app_id: string
          competitor_developer: string | null
          competitor_name: string
          competitor_rank: number | null
          created_at: string
          discovery_source: string | null
          id: string
          keyword: string
          market_share_percent: number | null
          organization_id: string
          search_volume: number | null
          snapshot_date: string
          target_app_id: string
          target_app_rank: number | null
        }
        Insert: {
          competition_strength?: number | null
          competitor_app_id: string
          competitor_developer?: string | null
          competitor_name: string
          competitor_rank?: number | null
          created_at?: string
          discovery_source?: string | null
          id?: string
          keyword: string
          market_share_percent?: number | null
          organization_id: string
          search_volume?: number | null
          snapshot_date?: string
          target_app_id: string
          target_app_rank?: number | null
        }
        Update: {
          competition_strength?: number | null
          competitor_app_id?: string
          competitor_developer?: string | null
          competitor_name?: string
          competitor_rank?: number | null
          created_at?: string
          discovery_source?: string | null
          id?: string
          keyword?: string
          market_share_percent?: number | null
          organization_id?: string
          search_volume?: number | null
          snapshot_date?: string
          target_app_id?: string
          target_app_rank?: number | null
        }
        Relationships: []
      }
      competitor_apps: {
        Row: {
          ai_keyword_analysis: Json | null
          analysis_id: string | null
          app_id: string
          app_name: string
          category: string | null
          competitive_strengths: string | null
          created_at: string | null
          description_keywords: string[] | null
          developer_name: string | null
          id: string
          organization_id: string
          platform: string
          positioning_summary: string | null
          price: number | null
          ranking_position: number | null
          rating_count: number | null
          rating_score: number | null
          subtitle_keywords: string[] | null
          title_keywords: string[] | null
        }
        Insert: {
          ai_keyword_analysis?: Json | null
          analysis_id?: string | null
          app_id: string
          app_name: string
          category?: string | null
          competitive_strengths?: string | null
          created_at?: string | null
          description_keywords?: string[] | null
          developer_name?: string | null
          id?: string
          organization_id: string
          platform?: string
          positioning_summary?: string | null
          price?: number | null
          ranking_position?: number | null
          rating_count?: number | null
          rating_score?: number | null
          subtitle_keywords?: string[] | null
          title_keywords?: string[] | null
        }
        Update: {
          ai_keyword_analysis?: Json | null
          analysis_id?: string | null
          app_id?: string
          app_name?: string
          category?: string | null
          competitive_strengths?: string | null
          created_at?: string | null
          description_keywords?: string[] | null
          developer_name?: string | null
          id?: string
          organization_id?: string
          platform?: string
          positioning_summary?: string | null
          price?: number | null
          ranking_position?: number | null
          rating_count?: number | null
          rating_score?: number | null
          subtitle_keywords?: string[] | null
          title_keywords?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_apps_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "competitor_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_apps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "competitor_apps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_keyword_intelligence: {
        Row: {
          competitor_app_id: string | null
          created_at: string | null
          frequency_score: number | null
          id: string
          keyword: string
          keyword_source: string | null
          organization_id: string
          relevance_score: number | null
        }
        Insert: {
          competitor_app_id?: string | null
          created_at?: string | null
          frequency_score?: number | null
          id?: string
          keyword: string
          keyword_source?: string | null
          organization_id: string
          relevance_score?: number | null
        }
        Update: {
          competitor_app_id?: string | null
          created_at?: string | null
          frequency_score?: number | null
          id?: string
          keyword?: string
          keyword_source?: string | null
          organization_id?: string
          relevance_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_keyword_intelligence_competitor_app_id_fkey"
            columns: ["competitor_app_id"]
            isOneToOne: false
            referencedRelation: "competitor_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_keyword_intelligence_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "competitor_keyword_intelligence_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_keywords: {
        Row: {
          analyzed_at: string
          competitor_app_id: string
          competitor_rank: number | null
          created_at: string
          gap_opportunity: string | null
          id: string
          keyword: string
          keyword_difficulty: number | null
          organization_id: string
          search_volume: number | null
          target_app_id: string
          target_rank: number | null
        }
        Insert: {
          analyzed_at?: string
          competitor_app_id: string
          competitor_rank?: number | null
          created_at?: string
          gap_opportunity?: string | null
          id?: string
          keyword: string
          keyword_difficulty?: number | null
          organization_id: string
          search_volume?: number | null
          target_app_id: string
          target_rank?: number | null
        }
        Update: {
          analyzed_at?: string
          competitor_app_id?: string
          competitor_rank?: number | null
          created_at?: string
          gap_opportunity?: string | null
          id?: string
          keyword?: string
          keyword_difficulty?: number | null
          organization_id?: string
          search_volume?: number | null
          target_app_id?: string
          target_rank?: number | null
        }
        Relationships: []
      }
      conversion_benchmarks: {
        Row: {
          category: string
          created_at: string | null
          data_source: string | null
          id: string
          impressions_to_installs: number | null
          impressions_to_page_views: number | null
          page_views_to_installs: number | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          data_source?: string | null
          id?: string
          impressions_to_installs?: number | null
          impressions_to_page_views?: number | null
          page_views_to_installs?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          data_source?: string | null
          id?: string
          impressions_to_installs?: number | null
          impressions_to_page_views?: number | null
          page_views_to_installs?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      creative_analysis_sessions: {
        Row: {
          analysis_status: string
          created_at: string
          created_by: string | null
          id: string
          keyword: string
          organization_id: string | null
          search_type: string
          total_apps: number
          updated_at: string
        }
        Insert: {
          analysis_status?: string
          created_at?: string
          created_by?: string | null
          id?: string
          keyword: string
          organization_id?: string | null
          search_type: string
          total_apps?: number
          updated_at?: string
        }
        Update: {
          analysis_status?: string
          created_at?: string
          created_by?: string | null
          id?: string
          keyword?: string
          organization_id?: string | null
          search_type?: string
          total_apps?: number
          updated_at?: string
        }
        Relationships: []
      }
      data_cache: {
        Row: {
          cache_key: string
          created_at: string
          data: Json
          expires_at: string
          id: string
        }
        Insert: {
          cache_key: string
          created_at?: string
          data: Json
          expires_at: string
          id?: string
        }
        Update: {
          cache_key?: string
          created_at?: string
          data?: Json
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      enhanced_keyword_rankings: {
        Row: {
          app_id: string
          confidence_level: string | null
          created_at: string
          data_source: string | null
          difficulty_score: number | null
          id: string
          keyword: string
          organization_id: string
          previous_rank: number | null
          rank_change: number | null
          rank_position: number | null
          search_volume: number | null
          snapshot_date: string
          tracking_frequency: string | null
          volume_change_percent: number | null
        }
        Insert: {
          app_id: string
          confidence_level?: string | null
          created_at?: string
          data_source?: string | null
          difficulty_score?: number | null
          id?: string
          keyword: string
          organization_id: string
          previous_rank?: number | null
          rank_change?: number | null
          rank_position?: number | null
          search_volume?: number | null
          snapshot_date?: string
          tracking_frequency?: string | null
          volume_change_percent?: number | null
        }
        Update: {
          app_id?: string
          confidence_level?: string | null
          created_at?: string
          data_source?: string | null
          difficulty_score?: number | null
          id?: string
          keyword?: string
          organization_id?: string
          previous_rank?: number | null
          rank_change?: number | null
          rank_position?: number | null
          search_volume?: number | null
          snapshot_date?: string
          tracking_frequency?: string | null
          volume_change_percent?: number | null
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          api_endpoint: string | null
          context: Json | null
          created_at: string | null
          error_code: string | null
          error_message: string | null
          error_type: string
          id: string
          ip_address: unknown | null
          organization_id: string | null
          request_data: Json | null
          resolved: boolean | null
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          api_endpoint?: string | null
          context?: Json | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          error_type: string
          id?: string
          ip_address?: unknown | null
          organization_id?: string | null
          request_data?: Json | null
          resolved?: boolean | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          api_endpoint?: string | null
          context?: Json | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          error_type?: string
          id?: string
          ip_address?: unknown | null
          organization_id?: string | null
          request_data?: Json | null
          resolved?: boolean | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "error_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_usage_logs: {
        Row: {
          created_at: string
          feature_key: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          organization_id: string
          usage_type: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_key: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          organization_id: string
          usage_type?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          feature_key?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          organization_id?: string
          usage_type?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      keyword_clusters: {
        Row: {
          avg_difficulty: number | null
          cluster_name: string
          cluster_type: string | null
          created_at: string
          id: string
          opportunity_score: number | null
          organization_id: string
          primary_keyword: string
          related_keywords: string[]
          total_search_volume: number | null
          updated_at: string
        }
        Insert: {
          avg_difficulty?: number | null
          cluster_name: string
          cluster_type?: string | null
          created_at?: string
          id?: string
          opportunity_score?: number | null
          organization_id: string
          primary_keyword: string
          related_keywords: string[]
          total_search_volume?: number | null
          updated_at?: string
        }
        Update: {
          avg_difficulty?: number | null
          cluster_name?: string
          cluster_type?: string | null
          created_at?: string
          id?: string
          opportunity_score?: number | null
          organization_id?: string
          primary_keyword?: string
          related_keywords?: string[]
          total_search_volume?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      keyword_collection_jobs: {
        Row: {
          app_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          job_type: string | null
          keywords_collected: number | null
          organization_id: string
          progress: Json | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          app_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          job_type?: string | null
          keywords_collected?: number | null
          organization_id: string
          progress?: Json | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          app_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          job_type?: string | null
          keywords_collected?: number | null
          organization_id?: string
          progress?: Json | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      keyword_difficulty_scores: {
        Row: {
          calculated_at: string
          calculation_method: string | null
          competition_level: string | null
          country: string
          difficulty_score: number
          expires_at: string
          id: string
          keyword: string
          organization_id: string
          search_volume: number | null
          top_apps_strength: number | null
        }
        Insert: {
          calculated_at?: string
          calculation_method?: string | null
          competition_level?: string | null
          country?: string
          difficulty_score: number
          expires_at?: string
          id?: string
          keyword: string
          organization_id: string
          search_volume?: number | null
          top_apps_strength?: number | null
        }
        Update: {
          calculated_at?: string
          calculation_method?: string | null
          competition_level?: string | null
          country?: string
          difficulty_score?: number
          expires_at?: string
          id?: string
          keyword?: string
          organization_id?: string
          search_volume?: number | null
          top_apps_strength?: number | null
        }
        Relationships: []
      }
      keyword_discovery_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          discovered_keywords: number | null
          discovery_params: Json
          error_message: string | null
          id: string
          job_type: string
          organization_id: string
          processing_metadata: Json | null
          progress: Json
          started_at: string | null
          status: string
          target_app_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          discovered_keywords?: number | null
          discovery_params?: Json
          error_message?: string | null
          id?: string
          job_type?: string
          organization_id: string
          processing_metadata?: Json | null
          progress?: Json
          started_at?: string | null
          status?: string
          target_app_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          discovered_keywords?: number | null
          discovery_params?: Json
          error_message?: string | null
          id?: string
          job_type?: string
          organization_id?: string
          processing_metadata?: Json | null
          progress?: Json
          started_at?: string | null
          status?: string
          target_app_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      keyword_pools: {
        Row: {
          created_at: string
          id: string
          keywords: string[]
          metadata: Json | null
          organization_id: string
          pool_name: string
          pool_type: string | null
          total_keywords: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          keywords: string[]
          metadata?: Json | null
          organization_id: string
          pool_name: string
          pool_type?: string | null
          total_keywords?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          keywords?: string[]
          metadata?: Json | null
          organization_id?: string
          pool_name?: string
          pool_type?: string | null
          total_keywords?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      keyword_rank_distributions: {
        Row: {
          analysis_date: string
          app_id: string
          avg_rank: number | null
          created_at: string
          id: string
          median_rank: number | null
          organization_id: string
          top_1_keywords: number | null
          top_10_keywords: number | null
          top_100_keywords: number | null
          top_20_keywords: number | null
          top_3_keywords: number | null
          top_5_keywords: number | null
          top_50_keywords: number | null
          total_keywords: number | null
          visibility_score: number | null
        }
        Insert: {
          analysis_date?: string
          app_id: string
          avg_rank?: number | null
          created_at?: string
          id?: string
          median_rank?: number | null
          organization_id: string
          top_1_keywords?: number | null
          top_10_keywords?: number | null
          top_100_keywords?: number | null
          top_20_keywords?: number | null
          top_3_keywords?: number | null
          top_5_keywords?: number | null
          top_50_keywords?: number | null
          total_keywords?: number | null
          visibility_score?: number | null
        }
        Update: {
          analysis_date?: string
          app_id?: string
          avg_rank?: number | null
          created_at?: string
          id?: string
          median_rank?: number | null
          organization_id?: string
          top_1_keywords?: number | null
          top_10_keywords?: number | null
          top_100_keywords?: number | null
          top_20_keywords?: number | null
          top_3_keywords?: number | null
          top_5_keywords?: number | null
          top_50_keywords?: number | null
          total_keywords?: number | null
          visibility_score?: number | null
        }
        Relationships: []
      }
      keyword_ranking_history: {
        Row: {
          app_id: string
          confidence: string | null
          created_at: string
          created_by: string | null
          id: string
          keyword: string
          metadata: Json | null
          organization_id: string
          position: number | null
          search_results: number | null
          trend: string | null
          volume: string | null
        }
        Insert: {
          app_id: string
          confidence?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          keyword: string
          metadata?: Json | null
          organization_id: string
          position?: number | null
          search_results?: number | null
          trend?: string | null
          volume?: string | null
        }
        Update: {
          app_id?: string
          confidence?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          keyword?: string
          metadata?: Json | null
          organization_id?: string
          position?: number | null
          search_results?: number | null
          trend?: string | null
          volume?: string | null
        }
        Relationships: []
      }
      keyword_ranking_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          input_data: Json
          job_type: string
          organization_id: string
          priority: number | null
          result_data: Json | null
          scheduled_at: string
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          input_data: Json
          job_type: string
          organization_id: string
          priority?: number | null
          result_data?: Json | null
          scheduled_at?: string
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          input_data?: Json
          job_type?: string
          organization_id?: string
          priority?: number | null
          result_data?: Json | null
          scheduled_at?: string
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      keyword_ranking_snapshots: {
        Row: {
          app_id: string
          created_at: string
          data_source: string | null
          difficulty_score: number | null
          id: string
          keyword: string
          organization_id: string
          rank_change: number | null
          rank_position: number | null
          search_volume: number | null
          snapshot_date: string
          volume_change: number | null
          volume_trend: string | null
        }
        Insert: {
          app_id: string
          created_at?: string
          data_source?: string | null
          difficulty_score?: number | null
          id?: string
          keyword: string
          organization_id: string
          rank_change?: number | null
          rank_position?: number | null
          search_volume?: number | null
          snapshot_date?: string
          volume_change?: number | null
          volume_trend?: string | null
        }
        Update: {
          app_id?: string
          created_at?: string
          data_source?: string | null
          difficulty_score?: number | null
          id?: string
          keyword?: string
          organization_id?: string
          rank_change?: number | null
          rank_position?: number | null
          search_volume?: number | null
          snapshot_date?: string
          volume_change?: number | null
          volume_trend?: string | null
        }
        Relationships: []
      }
      keyword_rankings: {
        Row: {
          app_store_id: string
          checked_at: string
          country: string
          id: number
          keyword: string
          organization_id: string
          rank: number | null
        }
        Insert: {
          app_store_id: string
          checked_at?: string
          country: string
          id?: number
          keyword: string
          organization_id: string
          rank?: number | null
        }
        Update: {
          app_store_id?: string
          checked_at?: string
          country?: string
          id?: number
          keyword?: string
          organization_id?: string
          rank?: number | null
        }
        Relationships: []
      }
      keyword_service_metrics: {
        Row: {
          id: string
          metric_name: string
          metric_unit: string
          metric_value: number
          organization_id: string
          recorded_at: string
          tags: Json | null
        }
        Insert: {
          id?: string
          metric_name: string
          metric_unit: string
          metric_value: number
          organization_id: string
          recorded_at?: string
          tags?: Json | null
        }
        Update: {
          id?: string
          metric_name?: string
          metric_unit?: string
          metric_value?: number
          organization_id?: string
          recorded_at?: string
          tags?: Json | null
        }
        Relationships: []
      }
      keyword_suggestion_pools: {
        Row: {
          created_at: string
          discovery_date: string
          discovery_method: string
          id: string
          keyword_metadata: Json | null
          keywords: string[]
          organization_id: string
          pool_name: string
          quality_score: number | null
          target_app_id: string | null
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          created_at?: string
          discovery_date?: string
          discovery_method: string
          id?: string
          keyword_metadata?: Json | null
          keywords: string[]
          organization_id: string
          pool_name: string
          quality_score?: number | null
          target_app_id?: string | null
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          created_at?: string
          discovery_date?: string
          discovery_method?: string
          id?: string
          keyword_metadata?: Json | null
          keywords?: string[]
          organization_id?: string
          pool_name?: string
          quality_score?: number | null
          target_app_id?: string | null
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      keyword_volume_history: {
        Row: {
          country: string
          created_at: string
          data_source: string | null
          id: string
          keyword: string
          organization_id: string
          popularity_score: number | null
          recorded_date: string
          search_volume: number | null
          search_volume_trend: string | null
        }
        Insert: {
          country?: string
          created_at?: string
          data_source?: string | null
          id?: string
          keyword: string
          organization_id: string
          popularity_score?: number | null
          recorded_date?: string
          search_volume?: number | null
          search_volume_trend?: string | null
        }
        Update: {
          country?: string
          created_at?: string
          data_source?: string | null
          id?: string
          keyword?: string
          organization_id?: string
          popularity_score?: number | null
          recorded_date?: string
          search_volume?: number | null
          search_volume_trend?: string | null
        }
        Relationships: []
      }
      markets: {
        Row: {
          country_code: string
          country_name: string
          created_at: string | null
          currency_code: string | null
          data_source: string | null
          id: string
          is_available: boolean | null
          metadata: Json | null
          priority_order: number | null
          region: string
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          country_code: string
          country_name: string
          created_at?: string | null
          currency_code?: string | null
          data_source?: string | null
          id?: string
          is_available?: boolean | null
          metadata?: Json | null
          priority_order?: number | null
          region: string
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          country_code?: string
          country_name?: string
          created_at?: string | null
          currency_code?: string | null
          data_source?: string | null
          id?: string
          is_available?: boolean | null
          metadata?: Json | null
          priority_order?: number | null
          region?: string
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      metadata_versions: {
        Row: {
          app_store_id: string
          created_at: string
          created_by: string | null
          id: string
          is_live: boolean
          keywords: string
          long_description: string | null
          notes: string | null
          organization_id: string
          score: Json | null
          subtitle: string
          title: string
        }
        Insert: {
          app_store_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_live?: boolean
          keywords: string
          long_description?: string | null
          notes?: string | null
          organization_id: string
          score?: Json | null
          subtitle: string
          title: string
        }
        Update: {
          app_store_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_live?: boolean
          keywords?: string
          long_description?: string | null
          notes?: string | null
          organization_id?: string
          score?: Json | null
          subtitle?: string
          title?: string
        }
        Relationships: []
      }
      org_feature_entitlements: {
        Row: {
          created_at: string | null
          expires_at: string | null
          feature_key: string
          granted_at: string | null
          granted_by: string | null
          id: string
          is_enabled: boolean
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          feature_key: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_enabled?: boolean
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          feature_key?: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_enabled?: boolean
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      organization_apps: {
        Row: {
          app_identifier: string
          app_metadata: Json | null
          app_name: string | null
          approval_status: string | null
          approved_by: string | null
          approved_date: string | null
          created_at: string | null
          data_source: string | null
          discovered_date: string | null
          id: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          app_identifier: string
          app_metadata?: Json | null
          app_name?: string | null
          approval_status?: string | null
          approved_by?: string | null
          approved_date?: string | null
          created_at?: string | null
          data_source?: string | null
          discovered_date?: string | null
          id?: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          app_identifier?: string
          app_metadata?: Json | null
          app_name?: string | null
          approval_status?: string | null
          approved_by?: string | null
          approved_date?: string | null
          created_at?: string | null
          data_source?: string | null
          discovered_date?: string | null
          id?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_apps_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_apps_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profile_with_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_apps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_apps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_branding: {
        Row: {
          branding_template: string | null
          created_at: string | null
          custom_message: string | null
          id: string
          is_enabled: boolean | null
          logo_url: string | null
          organization_id: string
          position: string | null
          style_config: Json | null
          updated_at: string | null
        }
        Insert: {
          branding_template?: string | null
          created_at?: string | null
          custom_message?: string | null
          id?: string
          is_enabled?: boolean | null
          logo_url?: string | null
          organization_id: string
          position?: string | null
          style_config?: Json | null
          updated_at?: string | null
        }
        Update: {
          branding_template?: string | null
          created_at?: string | null
          custom_message?: string | null
          id?: string
          is_enabled?: boolean | null
          logo_url?: string | null
          organization_id?: string
          position?: string | null
          style_config?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_branding_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_branding_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_client_access: {
        Row: {
          access_level: string | null
          bigquery_client_name: string
          created_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          organization_id: string
        }
        Insert: {
          access_level?: string | null
          bigquery_client_name: string
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          organization_id: string
        }
        Update: {
          access_level?: string | null
          bigquery_client_name?: string
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_client_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_client_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "user_profile_with_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_client_access_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_client_access_organization_id_fkey"
            columns: ["organization_id"]
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
          is_enabled: boolean
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          feature_key: string
          is_enabled?: boolean
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          feature_key?: string
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
      organization_keyword_usage: {
        Row: {
          api_calls_made: number | null
          created_at: string
          id: string
          keywords_processed: number | null
          month_year: string
          organization_id: string
          overage_keywords: number | null
          storage_used_mb: number | null
          tier_limit: number | null
          updated_at: string
        }
        Insert: {
          api_calls_made?: number | null
          created_at?: string
          id?: string
          keywords_processed?: number | null
          month_year: string
          organization_id: string
          overage_keywords?: number | null
          storage_used_mb?: number | null
          tier_limit?: number | null
          updated_at?: string
        }
        Update: {
          api_calls_made?: number | null
          created_at?: string
          id?: string
          keywords_processed?: number | null
          month_year?: string
          organization_id?: string
          overage_keywords?: number | null
          storage_used_mb?: number | null
          tier_limit?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          api_limits: Json | null
          app_limit: number | null
          app_limit_enforced: boolean | null
          billing_email: string | null
          created_at: string
          deleted_at: string | null
          domain: string | null
          features: Json | null
          id: string
          name: string
          settings: Json | null
          slug: string
          subscription_status: string | null
          subscription_tier: string | null
          updated_at: string
        }
        Insert: {
          api_limits?: Json | null
          app_limit?: number | null
          app_limit_enforced?: boolean | null
          billing_email?: string | null
          created_at?: string
          deleted_at?: string | null
          domain?: string | null
          features?: Json | null
          id?: string
          name: string
          settings?: Json | null
          slug: string
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string
        }
        Update: {
          api_limits?: Json | null
          app_limit?: number | null
          app_limit_enforced?: boolean | null
          billing_email?: string | null
          created_at?: string
          deleted_at?: string | null
          domain?: string | null
          features?: Json | null
          id?: string
          name?: string
          settings?: Json | null
          slug?: string
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pattern_analyses: {
        Row: {
          created_at: string
          id: string
          insights: string[] | null
          organization_id: string | null
          patterns_data: Json
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          insights?: string[] | null
          organization_id?: string | null
          patterns_data?: Json
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          insights?: string[] | null
          organization_id?: string | null
          patterns_data?: Json
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pattern_analyses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "creative_analysis_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string
          description: string | null
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          name?: string
        }
        Relationships: []
      }
      platform_features: {
        Row: {
          category: Database["public"]["Enums"]["feature_category"]
          created_at: string
          description: string | null
          feature_key: string
          feature_name: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["feature_category"]
          created_at?: string
          description?: string | null
          feature_key: string
          feature_name: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["feature_category"]
          created_at?: string
          description?: string | null
          feature_key?: string
          feature_name?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          organization_id: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          organization_id?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          organization_id?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
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
      rate_limits: {
        Row: {
          daily_ai_calls: number | null
          daily_metadata_generations: number | null
          hourly_ai_calls: number | null
          last_daily_reset: string | null
          last_hourly_reset: string | null
          last_monthly_reset: string | null
          monthly_ai_calls: number | null
          organization_id: string | null
          updated_at: string | null
          user_id: string
          user_tier: string | null
        }
        Insert: {
          daily_ai_calls?: number | null
          daily_metadata_generations?: number | null
          hourly_ai_calls?: number | null
          last_daily_reset?: string | null
          last_hourly_reset?: string | null
          last_monthly_reset?: string | null
          monthly_ai_calls?: number | null
          organization_id?: string | null
          updated_at?: string | null
          user_id: string
          user_tier?: string | null
        }
        Update: {
          daily_ai_calls?: number | null
          daily_metadata_generations?: number | null
          hourly_ai_calls?: number | null
          last_daily_reset?: string | null
          last_hourly_reset?: string | null
          last_monthly_reset?: string | null
          monthly_ai_calls?: number | null
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string
          user_tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rate_limits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "rate_limits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          permission_name: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          permission_name: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          permission_name?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_name_fkey"
            columns: ["permission_name"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["name"]
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
      screenshot_analyses: {
        Row: {
          analysis_data: Json
          app_id: string
          app_name: string
          confidence_score: number | null
          created_at: string
          id: string
          organization_id: string | null
          screenshot_url: string
          session_id: string
        }
        Insert: {
          analysis_data?: Json
          app_id: string
          app_name: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          organization_id?: string | null
          screenshot_url: string
          session_id: string
        }
        Update: {
          analysis_data?: Json
          app_id?: string
          app_name?: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          organization_id?: string | null
          screenshot_url?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screenshot_analyses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "creative_analysis_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_sources: {
        Row: {
          created_at: string
          display_name: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      ui_access_logs: {
        Row: {
          access_granted: boolean
          context: Json | null
          created_at: string | null
          id: string
          ip_address: unknown | null
          organization_id: string | null
          permission_key: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          access_granted: boolean
          context?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          organization_id?: string | null
          permission_key: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          access_granted?: boolean
          context?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          organization_id?: string | null
          permission_key?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_feature_overrides: {
        Row: {
          created_at: string
          expires_at: string | null
          feature_key: string
          granted_at: string
          granted_by: string | null
          id: string
          is_enabled: boolean
          organization_id: string
          reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          feature_key: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_enabled: boolean
          organization_id: string
          reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          feature_key?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_enabled?: boolean
          organization_id?: string
          reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_feature_overrides_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "platform_features"
            referencedColumns: ["feature_key"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
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
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      user_usage: {
        Row: {
          action_type: string
          ai_calls_used: number | null
          api_endpoint: string | null
          created_at: string | null
          id: string
          metadata_generated: Json | null
          organization_id: string | null
          processing_time_ms: number | null
          success: boolean | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          ai_calls_used?: number | null
          api_endpoint?: string | null
          created_at?: string | null
          id?: string
          metadata_generated?: Json | null
          organization_id?: string | null
          processing_time_ms?: number | null
          success?: boolean | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          ai_calls_used?: number | null
          api_endpoint?: string | null
          created_at?: string | null
          id?: string
          metadata_generated?: Json | null
          organization_id?: string | null
          processing_time_ms?: number | null
          success?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_usage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_app_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "user_usage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
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
      user_profile_with_role: {
        Row: {
          created_at: string | null
          effective_organization_id: string | null
          effective_role: string | null
          email: string | null
          first_name: string | null
          id: string | null
          is_super_admin: boolean | null
          last_name: string | null
          legacy_role: string | null
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          effective_organization_id?: never
          effective_role?: never
          email?: string | null
          first_name?: string | null
          id?: string | null
          is_super_admin?: never
          last_name?: string | null
          legacy_role?: string | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          effective_organization_id?: never
          effective_role?: never
          email?: string | null
          first_name?: string | null
          id?: string | null
          is_super_admin?: never
          last_name?: string | null
          legacy_role?: string | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
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
    }
    Functions: {
      assign_super_admin_role: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      calculate_rank_distribution: {
        Args: {
          p_analysis_date?: string
          p_app_id: string
          p_organization_id: string
        }
        Returns: {
          avg_rank: number
          top_1: number
          top_10: number
          top_100: number
          top_20: number
          top_3: number
          top_5: number
          top_50: number
          total_tracked: number
          visibility_score: number
        }[]
      }
      can_add_app: {
        Args: { org_id: string }
        Returns: boolean
      }
      check_user_permission: {
        Args: { permission_to_check: string; target_organization_id?: string }
        Returns: boolean
      }
      clean_expired_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_ai_insights: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_keyword_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_keyword_metrics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_organization_and_assign_admin: {
        Args: { org_name: string; org_slug: string }
        Returns: string
      }
      get_approved_apps: {
        Args: { p_organization_id: string }
        Returns: {
          app_identifier: string
        }[]
      }
      get_competitor_keyword_overlap: {
        Args: {
          p_competitor_app_id: string
          p_organization_id: string
          p_target_app_id: string
        }
        Returns: {
          competitor_rank: number
          keyword: string
          opportunity_score: number
          rank_gap: number
          search_volume: number
          target_rank: number
        }[]
      }
      get_current_user_organization_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_organization_id_enhanced: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_keyword_gap_analysis: {
        Args: {
          p_limit?: number
          p_organization_id: string
          p_target_app_id: string
        }
        Returns: {
          best_competitor_rank: number
          difficulty_score: number
          gap_opportunity: string
          keyword: string
          search_volume: number
          target_rank: number
        }[]
      }
      get_keyword_trends: {
        Args: {
          p_app_id: string
          p_days_back?: number
          p_organization_id: string
        }
        Returns: {
          current_rank: number
          current_volume: number
          keyword: string
          previous_rank: number
          rank_change: number
          trend_direction: string
          volume_change_pct: number
        }[]
      }
      get_keyword_volume_trends: {
        Args: {
          p_days_back?: number
          p_keyword: string
          p_organization_id: string
        }
        Returns: {
          popularity_score: number
          recorded_date: string
          search_volume: number
          trend_direction: string
        }[]
      }
      get_pending_app_discoveries: {
        Args: { p_organization_id: string }
        Returns: {
          app_identifier: string
          app_name: string
          days_with_data: number
          discovered_date: string
          first_seen: string
          id: string
          last_seen: string
          record_count: number
        }[]
      }
      get_top_keywords_for_app: {
        Args: { p_app_id: string; p_limit?: number; p_organization_id: string }
        Returns: {
          confidence_level: string
          keyword: string
          last_updated: string
          rank_position: number
          search_volume: number
        }[]
      }
      get_user_frontend_permissions: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_user_organization_with_fallback: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_super_admin: {
        Args: { user_id?: string }
        Returns: boolean
      }
      lock_platform_admin_creation: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      log_scraper_request: {
        Args: {
          p_ip_address?: unknown
          p_organization_id: string
          p_search_term: string
          p_user_agent?: string
        }
        Returns: boolean
      }
      start_keyword_discovery_job: {
        Args: {
          p_job_type?: string
          p_organization_id: string
          p_params?: Json
          p_target_app_id: string
        }
        Returns: string
      }
      unlock_platform_admin_creation: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_app_approval_status: {
        Args: { p_app_id: string; p_approved_by?: string; p_status: string }
        Returns: boolean
      }
      update_keyword_usage: {
        Args: {
          p_api_calls?: number
          p_keywords_processed?: number
          p_organization_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "SUPER_ADMIN"
        | "ORGANIZATION_ADMIN"
        | "MANAGER"
        | "ANALYST"
        | "VIEWER"
        | "ASO_MANAGER"
        | "CLIENT"
      feature_category:
        | "performance_intelligence"
        | "ai_command_center"
        | "growth_accelerators"
        | "control_center"
        | "account"
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
        "ORGANIZATION_ADMIN",
        "MANAGER",
        "ANALYST",
        "VIEWER",
        "ASO_MANAGER",
        "CLIENT",
      ],
      feature_category: [
        "performance_intelligence",
        "ai_command_center",
        "growth_accelerators",
        "control_center",
        "account",
      ],
    },
  },
} as const
