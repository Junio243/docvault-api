export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string
          title: string
          owner_id: string
          file_url: string
          file_path: string
          file_hash: string | null
          status: string
          version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          owner_id: string
          file_url: string
          file_path: string
          file_hash?: string | null
          status?: string
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          owner_id?: string
          file_url?: string
          file_path?: string
          file_hash?: string | null
          status?: string
          version?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      document_versions: {
        Row: {
          id: string
          document_id: string
          version: number
          file_url: string
          file_path: string
          file_hash: string | null
          created_by: string
          created_at: string
          change_notes: string | null
        }
        Insert: {
          id?: string
          document_id: string
          version: number
          file_url: string
          file_path: string
          file_hash?: string | null
          created_by: string
          created_at?: string
          change_notes?: string | null
        }
        Update: {
          id?: string
          document_id?: string
          version?: number
          file_url?: string
          file_path?: string
          file_hash?: string | null
          created_by?: string
          created_at?: string
          change_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type Insertable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type Updatable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']