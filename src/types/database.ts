export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          username: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          username?: string
          avatar_url?: string | null
        }
      }
      clubs: {
        Row: {
          id: string
          name: string
          description: string | null
          cover_url: string | null
          invite_code: string
          owner_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          cover_url?: string | null
          invite_code?: string
          owner_id: string
          created_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          cover_url?: string | null
        }
      }
      club_members: {
        Row: {
          id: string
          club_id: string
          user_id: string
          role: 'owner' | 'member'
          joined_at: string
        }
        Insert: {
          id?: string
          club_id: string
          user_id: string
          role?: 'owner' | 'member'
          joined_at?: string
        }
        Update: {
          role?: 'owner' | 'member'
        }
      }
      sessions: {
        Row: {
          id: string
          club_id: string
          status: 'open' | 'closed' | 'watched'
          ends_at: string | null
          winner_tmdb_id: number | null
          watched_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          club_id: string
          status?: 'open' | 'closed' | 'watched'
          ends_at?: string | null
          winner_tmdb_id?: number | null
          watched_at?: string | null
          created_at?: string
        }
        Update: {
          status?: 'open' | 'closed' | 'watched'
          ends_at?: string | null
          winner_tmdb_id?: number | null
          watched_at?: string | null
        }
      }
      nominations: {
        Row: {
          id: string
          session_id: string
          user_id: string
          tmdb_movie_id: number
          title: string
          poster_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          tmdb_movie_id: number
          title: string
          poster_url?: string | null
          created_at?: string
        }
        Update: never
      }
      votes: {
        Row: {
          id: string
          session_id: string
          nomination_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          nomination_id: string
          user_id: string
          created_at?: string
        }
        Update: never
      }
      session_ratings: {
        Row: {
          id: string
          session_id: string
          user_id: string
          rating: number
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          rating: number
          created_at?: string
        }
        Update: {
          rating?: number
        }
      }
    }
    Views: {
      nomination_vote_counts: {
        Row: {
          nomination_id: string
          session_id: string
          tmdb_movie_id: number
          title: string
          poster_url: string | null
          nominated_by: string
          vote_count: number
        }
      }
    }
  }
}

// Tipos de conveniencia
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Club = Database['public']['Tables']['clubs']['Row']
export type ClubMember = Database['public']['Tables']['club_members']['Row']
export type Session = Database['public']['Tables']['sessions']['Row']
export type Nomination = Database['public']['Tables']['nominations']['Row']
export type Vote = Database['public']['Tables']['votes']['Row']
export type NominationWithVotes = Database['public']['Views']['nomination_vote_counts']['Row']
export type SessionRating = Database['public']['Tables']['session_ratings']['Row']
