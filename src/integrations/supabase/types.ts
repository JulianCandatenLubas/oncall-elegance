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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      absences: {
        Row: {
          collaborator_id: string
          created_at: string
          end_date: string
          id: string
          notes: string | null
          start_date: string
          type: Database["public"]["Enums"]["absence_type"]
          updated_at: string
        }
        Insert: {
          collaborator_id: string
          created_at?: string
          end_date: string
          id?: string
          notes?: string | null
          start_date: string
          type: Database["public"]["Enums"]["absence_type"]
          updated_at?: string
        }
        Update: {
          collaborator_id?: string
          created_at?: string
          end_date?: string
          id?: string
          notes?: string | null
          start_date?: string
          type?: Database["public"]["Enums"]["absence_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "absences_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          reason: string | null
          record_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          reason?: string | null
          record_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          reason?: string | null
          record_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      collaborators: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          status: Database["public"]["Enums"]["collaborator_status"]
          team: Database["public"]["Enums"]["team"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          status?: Database["public"]["Enums"]["collaborator_status"]
          team: Database["public"]["Enums"]["team"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          status?: Database["public"]["Enums"]["collaborator_status"]
          team?: Database["public"]["Enums"]["team"]
          updated_at?: string
        }
        Relationships: []
      }
      holidays: {
        Row: {
          day: number
          id: string
          is_national: boolean
          month: number | null
          name: string
          year: number
        }
        Insert: {
          day: number
          id?: string
          is_national?: boolean
          month?: number | null
          name: string
          year: number
        }
        Update: {
          day?: number
          id?: string
          is_national?: boolean
          month?: number | null
          name?: string
          year?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      schedule_shifts: {
        Row: {
          atendimento_collaborator_id: string | null
          created_at: string
          day_type: Database["public"]["Enums"]["day_type"]
          end_time: string
          id: string
          infra_collaborator_id: string | null
          schedule_id: string
          shift_date: string
          shift_type: Database["public"]["Enums"]["shift_type"]
          sre_collaborator_id: string | null
          start_time: string
          updated_at: string
        }
        Insert: {
          atendimento_collaborator_id?: string | null
          created_at?: string
          day_type: Database["public"]["Enums"]["day_type"]
          end_time: string
          id?: string
          infra_collaborator_id?: string | null
          schedule_id: string
          shift_date: string
          shift_type: Database["public"]["Enums"]["shift_type"]
          sre_collaborator_id?: string | null
          start_time: string
          updated_at?: string
        }
        Update: {
          atendimento_collaborator_id?: string | null
          created_at?: string
          day_type?: Database["public"]["Enums"]["day_type"]
          end_time?: string
          id?: string
          infra_collaborator_id?: string | null
          schedule_id?: string
          shift_date?: string
          shift_type?: Database["public"]["Enums"]["shift_type"]
          sre_collaborator_id?: string | null
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_shifts_atendimento_collaborator_id_fkey"
            columns: ["atendimento_collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_shifts_infra_collaborator_id_fkey"
            columns: ["infra_collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_shifts_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_shifts_sre_collaborator_id_fkey"
            columns: ["sre_collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          start_date: string
          status: Database["public"]["Enums"]["schedule_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          start_date: string
          status?: Database["public"]["Enums"]["schedule_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["schedule_status"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_app_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_gestor: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      absence_type:
        | "ferias"
        | "atestado_medico"
        | "licenca_medica"
        | "licenca_maternidade"
        | "licenca_paternidade"
        | "folga_programada"
        | "outros"
      app_role: "admin" | "gestor" | "visualizador"
      collaborator_status: "active" | "inactive"
      day_type: "dia_util" | "fim_de_semana" | "feriado"
      schedule_status: "draft" | "published"
      shift_type: "diurno" | "noturno"
      team: "infra" | "sre" | "atendimento"
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
      absence_type: [
        "ferias",
        "atestado_medico",
        "licenca_medica",
        "licenca_maternidade",
        "licenca_paternidade",
        "folga_programada",
        "outros",
      ],
      app_role: ["admin", "gestor", "visualizador"],
      collaborator_status: ["active", "inactive"],
      day_type: ["dia_util", "fim_de_semana", "feriado"],
      schedule_status: ["draft", "published"],
      shift_type: ["diurno", "noturno"],
      team: ["infra", "sre", "atendimento"],
    },
  },
} as const
