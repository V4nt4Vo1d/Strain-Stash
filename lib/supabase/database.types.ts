export type StrainType = "indica" | "sativa" | "hybrid"
export type SourceType = "leafly" | "levels" | "other"
export type RatingStatus = "liked" | "disliked" | "want_to_try"
export type FriendColor =
  | "emerald"
  | "amber"
  | "sky"
  | "rose"
  | "violet"
  | "orange"
  | "teal"
  | "lime"

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
      friends: {
        Row: {
          id: string
          name: string
          color: FriendColor
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          color: FriendColor
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          color?: FriendColor
          created_at?: string
        }
        Relationships: []
      }
      strains: {
        Row: {
          id: string
          name: string
          strain_type: StrainType
          thc: number | null
          cbd: number | null
          effects: string[]
          flavors: string[]
          notes: string | null
          source_url: string | null
          source_type: SourceType
          image_url: string | null
          added_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          strain_type: StrainType
          thc?: number | null
          cbd?: number | null
          effects?: string[]
          flavors?: string[]
          notes?: string | null
          source_url?: string | null
          source_type?: SourceType
          image_url?: string | null
          added_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          strain_type?: StrainType
          thc?: number | null
          cbd?: number | null
          effects?: string[]
          flavors?: string[]
          notes?: string | null
          source_url?: string | null
          source_type?: SourceType
          image_url?: string | null
          added_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "strains_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "friends"
            referencedColumns: ["id"]
          },
        ]
      }
      strain_ratings: {
        Row: {
          id: string
          strain_id: string
          friend_id: string
          status: RatingStatus | null
          favorite: boolean
          score: number | null
          updated_at: string
        }
        Insert: {
          id?: string
          strain_id: string
          friend_id: string
          status?: RatingStatus | null
          favorite?: boolean
          score?: number | null
          updated_at?: string
        }
        Update: {
          id?: string
          strain_id?: string
          friend_id?: string
          status?: RatingStatus | null
          favorite?: boolean
          score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "strain_ratings_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strain_ratings_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "friends"
            referencedColumns: ["id"]
          },
        ]
      }
      strain_personalizations: {
        Row: {
          id: string
          strain_id: string
          friend_id: string
          personal_notes: string | null
          strain_type_override: StrainType | null
          effects_override: string[] | null
          flavors_override: string[] | null
          updated_at: string
        }
        Insert: {
          id?: string
          strain_id: string
          friend_id: string
          personal_notes?: string | null
          strain_type_override?: StrainType | null
          effects_override?: string[] | null
          flavors_override?: string[] | null
          updated_at?: string
        }
        Update: {
          id?: string
          strain_id?: string
          friend_id?: string
          personal_notes?: string | null
          strain_type_override?: StrainType | null
          effects_override?: string[] | null
          flavors_override?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "strain_personalizations_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strain_personalizations_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "friends"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
