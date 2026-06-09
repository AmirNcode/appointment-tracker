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
      appointments: {
        Row: {
          confirmed_datetime: string | null
          cost: number | null
          created_at: string
          currency: string
          due_date: string
          duration_minutes: number
          ics_sequence: number
          id: string
          notes: string | null
          service_id: string
          spot_id: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          confirmed_datetime?: string | null
          cost?: number | null
          created_at?: string
          currency?: string
          due_date: string
          duration_minutes?: number
          ics_sequence?: number
          id?: string
          notes?: string | null
          service_id: string
          spot_id: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          confirmed_datetime?: string | null
          cost?: number | null
          created_at?: string
          currency?: string
          due_date?: string
          duration_minutes?: number
          ics_sequence?: number
          id?: string
          notes?: string | null
          service_id?: string
          spot_id?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          email_reminders_opt_in: boolean
          full_name: string | null
          id: string
          marketing_opt_in: boolean
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          email_reminders_opt_in?: boolean
          full_name?: string | null
          id: string
          marketing_opt_in?: boolean
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          email_reminders_opt_in?: boolean
          full_name?: string | null
          id?: string
          marketing_opt_in?: boolean
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          appointment_id: string
          channel: Database["public"]["Enums"]["reminder_channel"]
          created_at: string
          id: string
          last_error: string | null
          send_at: string
          sent: boolean
          sent_at: string | null
          type: Database["public"]["Enums"]["reminder_type"]
          user_id: string
        }
        Insert: {
          appointment_id: string
          channel?: Database["public"]["Enums"]["reminder_channel"]
          created_at?: string
          id?: string
          last_error?: string | null
          send_at: string
          sent?: boolean
          sent_at?: string | null
          type: Database["public"]["Enums"]["reminder_type"]
          user_id: string
        }
        Update: {
          appointment_id?: string
          channel?: Database["public"]["Enums"]["reminder_channel"]
          created_at?: string
          id?: string
          last_error?: string | null
          send_at?: string
          sent?: boolean
          sent_at?: string | null
          type?: Database["public"]["Enums"]["reminder_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          anchor_date: string | null
          created_at: string
          frequency_unit: Database["public"]["Enums"]["frequency_unit"]
          frequency_value: number
          id: string
          is_active: boolean
          name: string
          spot_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          anchor_date?: string | null
          created_at?: string
          frequency_unit: Database["public"]["Enums"]["frequency_unit"]
          frequency_value: number
          id?: string
          is_active?: boolean
          name: string
          spot_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          anchor_date?: string | null
          created_at?: string
          frequency_unit?: Database["public"]["Enums"]["frequency_unit"]
          frequency_value?: number
          id?: string
          is_active?: boolean
          name?: string
          spot_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spots: {
        Row: {
          booking_method: Database["public"]["Enums"]["booking_method"]
          booking_url: string | null
          created_at: string
          formatted_address: string | null
          google_maps_uri: string | null
          google_place_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          opening_hours: Json | null
          phone: string | null
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          booking_method?: Database["public"]["Enums"]["booking_method"]
          booking_url?: string | null
          created_at?: string
          formatted_address?: string | null
          google_maps_uri?: string | null
          google_place_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          opening_hours?: Json | null
          phone?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          booking_method?: Database["public"]["Enums"]["booking_method"]
          booking_url?: string | null
          created_at?: string
          formatted_address?: string | null
          google_maps_uri?: string | null
          google_place_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          opening_hours?: Json | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spots_user_id_fkey"
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
      [_ in never]: never
    }
    Enums: {
      appointment_status: "due" | "booked" | "completed" | "cancelled"
      booking_method: "phone" | "website" | "other"
      frequency_unit: "day" | "week" | "month"
      reminder_channel: "email" | "sms" | "push"
      reminder_type: "due_soon" | "pre_appointment"
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
      appointment_status: ["due", "booked", "completed", "cancelled"],
      booking_method: ["phone", "website", "other"],
      frequency_unit: ["day", "week", "month"],
      reminder_channel: ["email", "sms", "push"],
      reminder_type: ["due_soon", "pre_appointment"],
    },
  },
} as const
