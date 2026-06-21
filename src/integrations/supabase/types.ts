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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      case_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          case_id: string
          id: string
          mediator_id: string
          note: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          case_id: string
          id?: string
          mediator_id: string
          note?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          case_id?: string
          id?: string
          mediator_id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_assignments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_discovery_questions: {
        Row: {
          answer_text: string | null
          case_id: string
          created_at: string
          detected_need: string | null
          id: string
          question_order: number
          question_text: string
          updated_at: string
          win_win_scenario: string | null
        }
        Insert: {
          answer_text?: string | null
          case_id: string
          created_at?: string
          detected_need?: string | null
          id?: string
          question_order?: number
          question_text: string
          updated_at?: string
          win_win_scenario?: string | null
        }
        Update: {
          answer_text?: string | null
          case_id?: string
          created_at?: string
          detected_need?: string | null
          id?: string
          question_order?: number
          question_text?: string
          updated_at?: string
          win_win_scenario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_discovery_questions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_documents: {
        Row: {
          analysis_result: Json | null
          case_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          uploaded_by: string
        }
        Insert: {
          analysis_result?: Json | null
          case_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          uploaded_by: string
        }
        Update: {
          analysis_result?: Json | null
          case_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_parties: {
        Row: {
          address: string | null
          authorized_person: string | null
          birth_date: string | null
          case_id: string
          company_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_individual: boolean
          organization: string | null
          party_type: string
          phone: string | null
          role: string
          tax_number: string | null
          tax_office: string | null
          tc_kimlik: string | null
          trade_registry_no: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          authorized_person?: string | null
          birth_date?: string | null
          case_id: string
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_individual?: boolean
          organization?: string | null
          party_type?: string
          phone?: string | null
          role: string
          tax_number?: string | null
          tax_office?: string | null
          tc_kimlik?: string | null
          trade_registry_no?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          authorized_person?: string | null
          birth_date?: string | null
          case_id?: string
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_individual?: boolean
          organization?: string | null
          party_type?: string
          phone?: string | null
          role?: string
          tax_number?: string | null
          tax_office?: string | null
          tc_kimlik?: string | null
          trade_registry_no?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_parties_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_sessions: {
        Row: {
          case_id: string
          created_at: string
          id: string
          notes: string | null
          participants: Json
          scheduled_at: string | null
          session_type: string
          status: string
          updated_at: string
          video_link: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          notes?: string | null
          participants?: Json
          scheduled_at?: string | null
          session_type: string
          status?: string
          updated_at?: string
          video_link?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          participants?: Json
          scheduled_at?: string | null
          session_type?: string
          status?: string
          updated_at?: string
          video_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_sessions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          additional_notes: string | null
          ai_summary: Json | null
          assigned_mediator_id: string | null
          attempted_resolution: string | null
          category: string | null
          created_at: string
          desired_outcome: string | null
          dispute_type: string | null
          dispute_type_other: string | null
          id: string
          issue_description: string | null
          open_to_compromise: boolean | null
          other_party_name: string | null
          other_party_role: string | null
          priorities: string[] | null
          relationship: string | null
          status: string
          timeline: string | null
          title: string | null
          updated_at: string
          user_id: string
          your_name: string | null
          your_role: string | null
        }
        Insert: {
          additional_notes?: string | null
          ai_summary?: Json | null
          assigned_mediator_id?: string | null
          attempted_resolution?: string | null
          category?: string | null
          created_at?: string
          desired_outcome?: string | null
          dispute_type?: string | null
          dispute_type_other?: string | null
          id?: string
          issue_description?: string | null
          open_to_compromise?: boolean | null
          other_party_name?: string | null
          other_party_role?: string | null
          priorities?: string[] | null
          relationship?: string | null
          status?: string
          timeline?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          your_name?: string | null
          your_role?: string | null
        }
        Update: {
          additional_notes?: string | null
          ai_summary?: Json | null
          assigned_mediator_id?: string | null
          attempted_resolution?: string | null
          category?: string | null
          created_at?: string
          desired_outcome?: string | null
          dispute_type?: string | null
          dispute_type_other?: string | null
          id?: string
          issue_description?: string | null
          open_to_compromise?: boolean | null
          other_party_name?: string | null
          other_party_role?: string | null
          priorities?: string[] | null
          relationship?: string | null
          status?: string
          timeline?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          your_name?: string | null
          your_role?: string | null
        }
        Relationships: []
      }
      cases_private_keys: {
        Row: {
          case_id: string
          created_at: string
          encrypted_value: string
          field_type: string | null
          id: string
          mask_label: string
        }
        Insert: {
          case_id: string
          created_at?: string
          encrypted_value: string
          field_type?: string | null
          id?: string
          mask_label: string
        }
        Update: {
          case_id?: string
          created_at?: string
          encrypted_value?: string
          field_type?: string | null
          id?: string
          mask_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_private_keys_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases_vector_pool: {
        Row: {
          anonymized_text: string
          case_id: string
          created_at: string
          embedding: string | null
          id: string
          niche_area: string | null
        }
        Insert: {
          anonymized_text: string
          case_id: string
          created_at?: string
          embedding?: string | null
          id?: string
          niche_area?: string | null
        }
        Update: {
          anonymized_text?: string
          case_id?: string
          created_at?: string
          embedding?: string | null
          id?: string
          niche_area?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_vector_pool_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      mediator_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_recurring: boolean
          mediator_id: string
          specific_date: string | null
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_recurring?: boolean
          mediator_id: string
          specific_date?: string | null
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_recurring?: boolean
          mediator_id?: string
          specific_date?: string | null
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      mediator_blocked_dates: {
        Row: {
          created_at: string
          end_date: string
          id: string
          mediator_id: string
          reason: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          mediator_id: string
          reason?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          mediator_id?: string
          reason?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      mediator_requests: {
        Row: {
          case_id: string
          created_at: string
          id: string
          mediator_id: string | null
          notes: string | null
          preferred_dates: string[] | null
          preferred_time: string | null
          room_name: string | null
          room_url: string | null
          scheduled_date: string | null
          session_type: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          mediator_id?: string | null
          notes?: string | null
          preferred_dates?: string[] | null
          preferred_time?: string | null
          room_name?: string | null
          room_url?: string | null
          scheduled_date?: string | null
          session_type?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          mediator_id?: string | null
          notes?: string | null
          preferred_dates?: string[] | null
          preferred_time?: string | null
          room_name?: string | null
          room_url?: string | null
          scheduled_date?: string | null
          session_type?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mediator_requests_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      mediators: {
        Row: {
          avg_resolution_days: number
          bio: string | null
          city: string | null
          created_at: string
          full_name: string
          hourly_rate: number
          id: string
          is_available: boolean
          languages: string[]
          photo_url: string | null
          rating: number
          specializations: string[]
          success_rate: number
          total_cases: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avg_resolution_days?: number
          bio?: string | null
          city?: string | null
          created_at?: string
          full_name: string
          hourly_rate?: number
          id?: string
          is_available?: boolean
          languages?: string[]
          photo_url?: string | null
          rating?: number
          specializations?: string[]
          success_rate?: number
          total_cases?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avg_resolution_days?: number
          bio?: string | null
          city?: string | null
          created_at?: string
          full_name?: string
          hourly_rate?: number
          id?: string
          is_available?: boolean
          languages?: string[]
          photo_url?: string | null
          rating?: number
          specializations?: string[]
          success_rate?: number
          total_cases?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          case_id: string
          content: string
          created_at: string
          id: string
          sender_id: string
          sender_role: string | null
        }
        Insert: {
          case_id: string
          content: string
          created_at?: string
          id?: string
          sender_id: string
          sender_role?: string | null
        }
        Update: {
          case_id?: string
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
          sender_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          case_id: string | null
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          case_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          case_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_pool: {
        Row: {
          approved: boolean | null
          created_at: string
          id: string
          metadata: Json | null
          niche_area: string | null
          raw_content: string
          rejection_reason: string | null
          relevance_score: number | null
          source_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved?: boolean | null
          created_at?: string
          id?: string
          metadata?: Json | null
          niche_area?: string | null
          raw_content: string
          rejection_reason?: string | null
          relevance_score?: number | null
          source_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved?: boolean | null
          created_at?: string
          id?: string
          metadata?: Json | null
          niche_area?: string | null
          raw_content?: string
          rejection_reason?: string | null
          relevance_score?: number | null
          source_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reschedule_requests: {
        Row: {
          created_at: string
          id: string
          mediator_request_id: string
          proposed_date: string
          reason: string | null
          requested_by: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mediator_request_id: string
          proposed_date: string
          reason?: string | null
          requested_by: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mediator_request_id?: string
          proposed_date?: string
          reason?: string | null
          requested_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reschedule_requests_mediator_request_id_fkey"
            columns: ["mediator_request_id"]
            isOneToOne: false
            referencedRelation: "mediator_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      session_feedback: {
        Row: {
          comments: string | null
          created_at: string
          fairness_rating: number | null
          id: string
          mediator_rating: number | null
          mediator_request_id: string
          overall_rating: number
          user_id: string
          would_recommend: boolean | null
        }
        Insert: {
          comments?: string | null
          created_at?: string
          fairness_rating?: number | null
          id?: string
          mediator_rating?: number | null
          mediator_request_id: string
          overall_rating: number
          user_id: string
          would_recommend?: boolean | null
        }
        Update: {
          comments?: string | null
          created_at?: string
          fairness_rating?: number | null
          id?: string
          mediator_rating?: number | null
          mediator_request_id?: string
          overall_rating?: number
          user_id?: string
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "session_feedback_mediator_request_id_fkey"
            columns: ["mediator_request_id"]
            isOneToOne: false
            referencedRelation: "mediator_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          case_id: string
          created_at: string
          created_by: string
          duration_min: number | null
          id: string
          scheduled_for: string | null
          status: string
        }
        Insert: {
          case_id: string
          created_at?: string
          created_by: string
          duration_min?: number | null
          id?: string
          scheduled_for?: string | null
          status?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          created_by?: string
          duration_min?: number | null
          id?: string
          scheduled_for?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_case: {
        Args: { _case_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_realtime_topic: { Args: { _topic: string }; Returns: boolean }
      create_notification: {
        Args: {
          p_link?: string
          p_message: string
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "mediator" | "admin"
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
      app_role: ["user", "mediator", "admin"],
    },
  },
} as const
