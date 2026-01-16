export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      artifacts: {
        Row: {
          artifact_type: string | null
          content: Json | null
          conversation_id: string | null
          created_at: string
          edited_text: string | null
          enhanced_text: string | null
          id: string
          is_edited: boolean | null
          practitioner_id: string
          raw_content: string | null
          raw_text: string | null
          recording_id: string
          references: Json | null
          skill_id: string | null
          source_input_id: string | null
          status: string | null
          suggestions: Json | null
          summary: string | null
          title: string | null
          updated_at: string
          version: number | null
        }
        Insert: {
          artifact_type?: string | null
          content?: Json | null
          conversation_id?: string | null
          created_at?: string
          edited_text?: string | null
          enhanced_text?: string | null
          id?: string
          is_edited?: boolean | null
          practitioner_id: string
          raw_content?: string | null
          raw_text?: string | null
          recording_id: string
          references?: Json | null
          skill_id?: string | null
          source_input_id?: string | null
          status?: string | null
          suggestions?: Json | null
          summary?: string | null
          title?: string | null
          updated_at?: string
          version?: number | null
        }
        Update: {
          artifact_type?: string | null
          content?: Json | null
          conversation_id?: string | null
          created_at?: string
          edited_text?: string | null
          enhanced_text?: string | null
          id?: string
          is_edited?: boolean | null
          practitioner_id?: string
          raw_content?: string | null
          raw_text?: string | null
          recording_id?: string
          references?: Json | null
          skill_id?: string | null
          source_input_id?: string | null
          status?: string | null
          suggestions?: Json | null
          summary?: string | null
          title?: string | null
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "artifacts_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artifacts_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_artifacts_source_input"
            columns: ["source_input_id"]
            isOneToOne: false
            referencedRelation: "user_inputs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcripts_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          id: string
          message_type: string
          metadata: Json
          participant_type: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          message_type: string
          metadata?: Json
          participant_type: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          message_type?: string
          metadata?: Json
          participant_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          is_archived: boolean
          practitioner_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_archived?: boolean
          practitioner_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_archived?: boolean
          practitioner_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          artifact_id: string | null
          balance_after: number
          created_at: string
          id: string
          notes: string | null
          practitioner_id: string
          recording_id: string | null
          skill_id: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          type: string
          user_input_id: string | null
        }
        Insert: {
          amount: number
          artifact_id?: string | null
          balance_after: number
          created_at?: string
          id?: string
          notes?: string | null
          practitioner_id: string
          recording_id?: string | null
          skill_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          type: string
          user_input_id?: string | null
        }
        Update: {
          amount?: number
          artifact_id?: string | null
          balance_after?: number
          created_at?: string
          id?: string
          notes?: string | null
          practitioner_id?: string
          recording_id?: string | null
          skill_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          type?: string
          user_input_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_user_input_id_fkey"
            columns: ["user_input_id"]
            isOneToOne: false
            referencedRelation: "user_inputs"
            referencedColumns: ["id"]
          },
        ]
      }
      practitioners: {
        Row: {
          avatar_url: string | null
          created_at: string
          credits: number
          email: string
          full_name: string | null
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      recordings: {
        Row: {
          audio_path: string
          conversation_id: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          practitioner_id: string
          status: string
          storage_path: string | null
        }
        Insert: {
          audio_path: string
          conversation_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          practitioner_id: string
          status?: string
          storage_path?: string | null
        }
        Update: {
          audio_path?: string
          conversation_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          practitioner_id?: string
          status?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recordings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
        ]
      }
      user_inputs: {
        Row: {
          classification: Json | null
          conversation_id: string
          created_at: string
          error_message: string | null
          id: string
          input_type: string
          practitioner_id: string
          raw_content: string | null
          recording_id: string | null
          status: string
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          classification?: Json | null
          conversation_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          input_type: string
          practitioner_id: string
          raw_content?: string | null
          recording_id?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          classification?: Json | null
          conversation_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          input_type?: string
          practitioner_id?: string
          raw_content?: string | null
          recording_id?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_inputs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_inputs_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_inputs_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      vocabulary: {
        Row: {
          corrected_term: string
          created_at: string
          frequency: number
          id: string
          original_term: string
          practitioner_id: string
        }
        Insert: {
          corrected_term: string
          created_at?: string
          frequency?: number
          id?: string
          original_term: string
          practitioner_id: string
        }
        Update: {
          corrected_term?: string
          created_at?: string
          frequency?: number
          id?: string
          original_term?: string
          practitioner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocabulary_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
        ]
      }
      web_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          practitioner_id: string | null
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          practitioner_id?: string | null
          status?: string
          token: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          practitioner_id?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "web_sessions_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_credits: {
        Args: {
          p_amount: number
          p_practitioner_id: string
          p_skill_id?: string
          p_stripe_session_id?: string
          p_type: string
          p_user_input_id?: string
        }
        Returns: number
      }
      refund_credit: {
        Args: { p_practitioner_id: string; p_recording_id: string }
        Returns: number
      }
      refund_skill_credits: {
        Args: {
          p_credit_amount?: number
          p_practitioner_id: string
          p_skill_id: string
          p_user_input_id: string
        }
        Returns: number
      }
      use_credit: {
        Args: { p_practitioner_id: string; p_recording_id: string }
        Returns: boolean
      }
      use_skill_credits: {
        Args: {
          p_credit_cost?: number
          p_practitioner_id: string
          p_skill_id: string
          p_user_input_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  __InternalSupabase: {
    PostgrestVersion: "12"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

