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
      agent_states: {
        Row: {
          agent_type: string
          case_id: string
          confidence_score: number | null
          created_at: string
          error_message: string | null
          hallucination_risk: boolean
          id: string
          last_output: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          agent_type: string
          case_id: string
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          hallucination_risk?: boolean
          id?: string
          last_output?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          agent_type?: string
          case_id?: string
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          hallucination_risk?: boolean
          id?: string
          last_output?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_states_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      agreement_documents: {
        Row: {
          case_id: string
          created_at: string
          doc_type: string
          file_path: string | null
          id: string
          metadata: Json
          signed_by: string[]
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          doc_type: string
          file_path?: string | null
          id?: string
          metadata?: Json
          signed_by?: string[]
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          doc_type?: string
          file_path?: string | null
          id?: string
          metadata?: Json
          signed_by?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agreement_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
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
          party_id: string | null
          question_order: number
          question_text: string
          updated_at: string
          user_id: string | null
          win_win_scenario: string | null
        }
        Insert: {
          answer_text?: string | null
          case_id: string
          created_at?: string
          detected_need?: string | null
          id?: string
          party_id?: string | null
          question_order?: number
          question_text: string
          updated_at?: string
          user_id?: string | null
          win_win_scenario?: string | null
        }
        Update: {
          answer_text?: string | null
          case_id?: string
          created_at?: string
          detected_need?: string | null
          id?: string
          party_id?: string | null
          question_order?: number
          question_text?: string
          updated_at?: string
          user_id?: string | null
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
          {
            foreignKeyName: "case_discovery_questions_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
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
          party_id: string | null
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
          party_id?: string | null
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
          party_id?: string | null
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
          {
            foreignKeyName: "case_documents_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      case_expert_assignments: {
        Row: {
          approvals: Json
          assigned_by: string
          case_id: string
          created_at: string
          expert_id: string
          id: string
          note: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approvals?: Json
          assigned_by: string
          case_id: string
          created_at?: string
          expert_id: string
          id?: string
          note?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approvals?: Json
          assigned_by?: string
          case_id?: string
          created_at?: string
          expert_id?: string
          id?: string
          note?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_expert_assignments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_expert_assignments_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
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
          contact_info: string | null
          created_at: string
          email: string | null
          first_name: string | null
          full_name: string | null
          gsm: string | null
          id: string
          invite_status: string
          invite_token: string | null
          is_individual: boolean
          last_name: string | null
          organization: string | null
          party_role: string | null
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
          contact_info?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          gsm?: string | null
          id?: string
          invite_status?: string
          invite_token?: string | null
          is_individual?: boolean
          last_name?: string | null
          organization?: string | null
          party_role?: string | null
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
          contact_info?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          gsm?: string | null
          id?: string
          invite_status?: string
          invite_token?: string | null
          is_individual?: boolean
          last_name?: string | null
          organization?: string | null
          party_role?: string | null
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
      case_party_invites: {
        Row: {
          accepted_at: string | null
          case_party_id: string
          created_at: string
          id: string
          invite_status: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          case_party_id: string
          created_at?: string
          id?: string
          invite_status?: string
          token: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          case_party_id?: string
          created_at?: string
          id?: string
          invite_status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_party_invites_case_party_id_fkey"
            columns: ["case_party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      case_sessions: {
        Row: {
          case_id: string
          created_at: string
          id: string
          invite_sent_at: string | null
          meeting_type: string
          notes: string | null
          participants: Json
          prep_notes_generated: boolean
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
          invite_sent_at?: string | null
          meeting_type?: string
          notes?: string | null
          participants?: Json
          prep_notes_generated?: boolean
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
          invite_sent_at?: string | null
          meeting_type?: string
          notes?: string | null
          participants?: Json
          prep_notes_generated?: boolean
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
          application_date: string
          application_no: string | null
          assigned_expert_id: string | null
          assigned_mediator_id: string | null
          attempted_resolution: string | null
          category: string | null
          created_at: string
          current_phase: number
          desired_outcome: string | null
          dispute_subtype: string | null
          dispute_type: string | null
          dispute_type_other: string | null
          id: string
          issue_description: string | null
          open_to_compromise: boolean | null
          other_party_name: string | null
          other_party_role: string | null
          priorities: string[] | null
          relationship: string | null
          round_number: number
          status: string
          timeline: string | null
          title: string | null
          updated_at: string
          user_id: string
          uyap_no: string | null
          your_name: string | null
          your_role: string | null
        }
        Insert: {
          additional_notes?: string | null
          ai_summary?: Json | null
          application_date?: string
          application_no?: string | null
          assigned_expert_id?: string | null
          assigned_mediator_id?: string | null
          attempted_resolution?: string | null
          category?: string | null
          created_at?: string
          current_phase?: number
          desired_outcome?: string | null
          dispute_subtype?: string | null
          dispute_type?: string | null
          dispute_type_other?: string | null
          id?: string
          issue_description?: string | null
          open_to_compromise?: boolean | null
          other_party_name?: string | null
          other_party_role?: string | null
          priorities?: string[] | null
          relationship?: string | null
          round_number?: number
          status?: string
          timeline?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          uyap_no?: string | null
          your_name?: string | null
          your_role?: string | null
        }
        Update: {
          additional_notes?: string | null
          ai_summary?: Json | null
          application_date?: string
          application_no?: string | null
          assigned_expert_id?: string | null
          assigned_mediator_id?: string | null
          attempted_resolution?: string | null
          category?: string | null
          created_at?: string
          current_phase?: number
          desired_outcome?: string | null
          dispute_subtype?: string | null
          dispute_type?: string | null
          dispute_type_other?: string | null
          id?: string
          issue_description?: string | null
          open_to_compromise?: boolean | null
          other_party_name?: string | null
          other_party_role?: string | null
          priorities?: string[] | null
          relationship?: string | null
          round_number?: number
          status?: string
          timeline?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          uyap_no?: string | null
          your_name?: string | null
          your_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_assigned_expert_id_fkey"
            columns: ["assigned_expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
        ]
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
      common_ground_reports: {
        Row: {
          case_id: string
          created_at: string
          id: string
          report: Json
          risk_ozeti: Json | null
          round_number: number
          strategy: Json
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          report?: Json
          risk_ozeti?: Json | null
          round_number?: number
          strategy?: Json
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          report?: Json
          risk_ozeti?: Json | null
          round_number?: number
          strategy?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "common_ground_reports_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      expert_assignment_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          assignment_id: string | null
          case_id: string
          created_at: string
          details: Json
          expert_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          assignment_id?: string | null
          case_id: string
          created_at?: string
          details?: Json
          expert_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          assignment_id?: string | null
          case_id?: string
          created_at?: string
          details?: Json
          expert_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expert_assignment_logs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      experts: {
        Row: {
          active: boolean
          bio: string | null
          city: string | null
          created_at: string
          email: string | null
          full_name: string
          hourly_rate: number | null
          id: string
          niche_area: string
          phone: string | null
          rating: number | null
          specialization: string
          title: string | null
          updated_at: string
          years_experience: number | null
        }
        Insert: {
          active?: boolean
          bio?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          hourly_rate?: number | null
          id?: string
          niche_area: string
          phone?: string | null
          rating?: number | null
          specialization: string
          title?: string | null
          updated_at?: string
          years_experience?: number | null
        }
        Update: {
          active?: boolean
          bio?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          hourly_rate?: number | null
          id?: string
          niche_area?: string
          phone?: string | null
          rating?: number | null
          specialization?: string
          title?: string | null
          updated_at?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      knowledge_base_chunks: {
        Row: {
          category: string
          chunk_index: number
          chunk_text: string
          created_at: string
          embedding: string | null
          id: string
          metadata: Json
          source_title: string
          source_url: string
        }
        Insert: {
          category?: string
          chunk_index?: number
          chunk_text: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          source_title: string
          source_url: string
        }
        Update: {
          category?: string
          chunk_index?: number
          chunk_text?: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          source_title?: string
          source_url?: string
        }
        Relationships: []
      }
      knowledge_base_jobs: {
        Row: {
          attempt_counts: Json
          book_progress: Json
          book_queue: Json | null
          current_book: string | null
          errors: Json
          finished_at: string | null
          id: string
          mode: string
          processed_books: number
          processed_urls: Json
          started_at: string
          status: string
          total_books: number
          total_chunks: number
          updated_at: string
        }
        Insert: {
          attempt_counts?: Json
          book_progress?: Json
          book_queue?: Json | null
          current_book?: string | null
          errors?: Json
          finished_at?: string | null
          id?: string
          mode?: string
          processed_books?: number
          processed_urls?: Json
          started_at?: string
          status?: string
          total_books?: number
          total_chunks?: number
          updated_at?: string
        }
        Update: {
          attempt_counts?: Json
          book_progress?: Json
          book_queue?: Json | null
          current_book?: string | null
          errors?: Json
          finished_at?: string | null
          id?: string
          mode?: string
          processed_books?: number
          processed_urls?: Json
          started_at?: string
          status?: string
          total_books?: number
          total_chunks?: number
          updated_at?: string
        }
        Relationships: []
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
      meeting_invite_logs: {
        Row: {
          attempt: number
          case_id: string
          created_at: string
          error_message: string | null
          id: string
          party_id: string | null
          recipient_email: string
          recipient_name: string | null
          resend_message_id: string | null
          session_id: string
          status: string
        }
        Insert: {
          attempt?: number
          case_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          party_id?: string | null
          recipient_email: string
          recipient_name?: string | null
          resend_message_id?: string | null
          session_id: string
          status: string
        }
        Update: {
          attempt?: number
          case_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          party_id?: string | null
          recipient_email?: string
          recipient_name?: string | null
          resend_message_id?: string | null
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_invite_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "case_sessions"
            referencedColumns: ["id"]
          },
        ]
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
      negotiation_rounds: {
        Row: {
          accepted_by: string[]
          case_id: string
          created_at: string
          id: string
          proposal: Json
          rejected_by: string[]
          round_no: number
          status: string
          updated_at: string
        }
        Insert: {
          accepted_by?: string[]
          case_id: string
          created_at?: string
          id?: string
          proposal?: Json
          rejected_by?: string[]
          round_no: number
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_by?: string[]
          case_id?: string
          created_at?: string
          id?: string
          proposal?: Json
          rejected_by?: string[]
          round_no?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "negotiation_rounds_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_expert_updates: boolean
          email_mediator_assignment: boolean
          email_negotiation_updates: boolean
          email_session_invite: boolean
          email_session_reminder: boolean
          id: string
          inapp_expert_updates: boolean
          inapp_mediator_assignment: boolean
          inapp_negotiation_updates: boolean
          inapp_session_invite: boolean
          inapp_session_reminder: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_expert_updates?: boolean
          email_mediator_assignment?: boolean
          email_negotiation_updates?: boolean
          email_session_invite?: boolean
          email_session_reminder?: boolean
          id?: string
          inapp_expert_updates?: boolean
          inapp_mediator_assignment?: boolean
          inapp_negotiation_updates?: boolean
          inapp_session_invite?: boolean
          inapp_session_reminder?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_expert_updates?: boolean
          email_mediator_assignment?: boolean
          email_negotiation_updates?: boolean
          email_session_invite?: boolean
          email_session_reminder?: boolean
          id?: string
          inapp_expert_updates?: boolean
          inapp_mediator_assignment?: boolean
          inapp_negotiation_updates?: boolean
          inapp_session_invite?: boolean
          inapp_session_reminder?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      party_analyses: {
        Row: {
          analysis: Json
          case_id: string
          created_at: string
          discovery_questions: Json
          id: string
          party_id: string
          prep_notes: Json
          risk_analizi: Json | null
          round_number: number
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis?: Json
          case_id: string
          created_at?: string
          discovery_questions?: Json
          id?: string
          party_id: string
          prep_notes?: Json
          risk_analizi?: Json | null
          round_number?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis?: Json
          case_id?: string
          created_at?: string
          discovery_questions?: Json
          id?: string
          party_id?: string
          prep_notes?: Json
          risk_analizi?: Json | null
          round_number?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_analyses_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_analyses_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
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
      generate_application_no: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_case_mediator: {
        Args: { _case_id: string; _user_id: string }
        Returns: boolean
      }
      is_case_owner_safe: {
        Args: { _case_id: string; _user_id: string }
        Returns: boolean
      }
      is_case_party: {
        Args: { _case_id: string; _user_id: string }
        Returns: boolean
      }
      list_experts_for_mediator: {
        Args: { filter_niche?: string }
        Returns: {
          active: boolean
          bio: string
          city: string
          full_name: string
          hourly_rate: number
          id: string
          niche_area: string
          rating: number
          specialization: string
          title: string
          years_experience: number
        }[]
      }
      match_cases: {
        Args: {
          filter_niche_area: string
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          anonymized_text: string
          id: string
          niche_area: string
          similarity: number
        }[]
      }
      match_knowledge_base: {
        Args: {
          filter_category?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          category: string
          chunk_text: string
          metadata: Json
          similarity: number
          source_title: string
          source_url: string
        }[]
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
