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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown | null
          organization_id: string | null
          resource_id: string | null
          resource_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          organization_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          organization_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chatgpt_audit_runs: {
        Row: {
          audit_type: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          organization_id: string
          status: string | null
          topic_data: Json
        }
        Insert: {
          audit_type?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          organization_id: string
          status?: string | null
          topic_data: Json
        }
        Update: {
          audit_type?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          organization_id?: string
          status?: string | null
          topic_data?: Json
        }
        Relationships: [
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
          query_text: string
          query_type: string | null
          status: string | null
        }
        Insert: {
          audit_run_id: string
          created_at?: string | null
          id?: string
          priority?: number | null
          query_text: string
          query_type?: string | null
          status?: string | null
        }
        Update: {
          audit_run_id?: string
          created_at?: string | null
          id?: string
          priority?: number | null
          query_text?: string
          query_type?: string | null
          status?: string | null
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
          cost_cents: number | null
          created_at: string | null
          entity_analysis: Json | null
          id: string
          mention_position: number | null
          organization_id: string
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
          cost_cents?: number | null
          created_at?: string | null
          entity_analysis?: Json | null
          id?: string
          mention_position?: number | null
          organization_id: string
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
          cost_cents?: number | null
          created_at?: string | null
          entity_analysis?: Json | null
          id?: string
          mention_position?: number | null
          organization_id?: string
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
      chatgpt_visibility_scores: {
        Row: {
          audit_run_id: string
          average_position: number | null
          created_at: string | null
          entity_name: string
          id: string
          mention_count: number | null
          organization_id: string
          sentiment_score: number | null
          visibility_score: number | null
        }
        Insert: {
          audit_run_id: string
          average_position?: number | null
          created_at?: string | null
          entity_name: string
          id?: string
          mention_count?: number | null
          organization_id: string
          sentiment_score?: number | null
          visibility_score?: number | null
        }
        Update: {
          audit_run_id?: string
          average_position?: number | null
          created_at?: string | null
          entity_name?: string
          id?: string
          mention_count?: number | null
          organization_id?: string
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      metadata_versions: {
        Row: {
          ai_generated: boolean | null
          app_id: string
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
          id: string
          organization_id: string
        }
        Insert: {
          app_id: string
          attached_at?: string | null
          created_at?: string | null
          detached_at?: string | null
          id?: string
          organization_id: string
        }
        Update: {
          app_id?: string
          attached_at?: string | null
          created_at?: string | null
          detached_at?: string | null
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_app_access_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          deleted_at: string | null
          domain: string | null
          id: string
          name: string
          slug: string
          subscription_tier: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          domain?: string | null
          id?: string
          name: string
          slug: string
          subscription_tier?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          domain?: string | null
          id?: string
          name?: string
          slug?: string
          subscription_tier?: string | null
          updated_at?: string
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
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_cache: {
        Row: {
          data: Json | null
          error: string | null
          expires_at: string
          id: string
          scraped_at: string
          status: string
          url: string
        }
        Insert: {
          data?: Json | null
          error?: string | null
          expires_at: string
          id?: string
          scraped_at?: string
          status: string
          url: string
        }
        Update: {
          data?: Json | null
          error?: string | null
          expires_at?: string
          id?: string
          scraped_at?: string
          status?: string
          url?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_organization_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_super_admin: {
        Args: { check_user_id?: string }
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
      ],
    },
  },
} as const
