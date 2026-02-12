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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          reason: string | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          likes_count: number | null
          parent_id: string | null
          post_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          parent_id?: string | null
          post_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          parent_id?: string | null
          post_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_flags: {
        Row: {
          action_notes: string | null
          action_taken: Database["public"]["Enums"]["moderation_action"] | null
          ai_category: string | null
          ai_confidence: number | null
          comment_id: string | null
          created_at: string
          description: string | null
          flagged_by: string | null
          id: string
          post_id: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reviewed_at: string | null
          reviewed_by: string | null
          source: Database["public"]["Enums"]["flag_source"]
          status: Database["public"]["Enums"]["moderation_status"]
          urgency_level: number | null
          user_id: string | null
        }
        Insert: {
          action_notes?: string | null
          action_taken?: Database["public"]["Enums"]["moderation_action"] | null
          ai_category?: string | null
          ai_confidence?: number | null
          comment_id?: string | null
          created_at?: string
          description?: string | null
          flagged_by?: string | null
          id?: string
          post_id?: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          source: Database["public"]["Enums"]["flag_source"]
          status?: Database["public"]["Enums"]["moderation_status"]
          urgency_level?: number | null
          user_id?: string | null
        }
        Update: {
          action_notes?: string | null
          action_taken?: Database["public"]["Enums"]["moderation_action"] | null
          ai_category?: string | null
          ai_confidence?: number | null
          comment_id?: string | null
          created_at?: string
          description?: string | null
          flagged_by?: string | null
          id?: string
          post_id?: string | null
          reason?: Database["public"]["Enums"]["report_reason"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: Database["public"]["Enums"]["flag_source"]
          status?: Database["public"]["Enums"]["moderation_status"]
          urgency_level?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_flags_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_flags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      content_views: {
        Row: {
          counted_at: string | null
          created_at: string
          id: string
          ip_hash: string | null
          is_counted: boolean
          post_id: string
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          watch_duration_seconds: number
        }
        Insert: {
          counted_at?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          is_counted?: boolean
          post_id: string
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          watch_duration_seconds?: number
        }
        Update: {
          counted_at?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          is_counted?: boolean
          post_id?: string
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          watch_duration_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          participant_one: string
          participant_two: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_one: string
          participant_two: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_one?: string
          participant_two?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_participant_one_fkey"
            columns: ["participant_one"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_two_fkey"
            columns: ["participant_two"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_subscriptions: {
        Row: {
          amount: number
          auto_renew: boolean
          cancelled_at: string | null
          created_at: string
          creator_id: string
          currency: string
          expires_at: string | null
          id: string
          started_at: string
          status: string
          subscriber_id: string
        }
        Insert: {
          amount: number
          auto_renew?: boolean
          cancelled_at?: string | null
          created_at?: string
          creator_id: string
          currency?: string
          expires_at?: string | null
          id?: string
          started_at?: string
          status?: string
          subscriber_id: string
        }
        Update: {
          amount?: number
          auto_renew?: boolean
          cancelled_at?: string | null
          created_at?: string
          creator_id?: string
          currency?: string
          expires_at?: string | null
          id?: string
          started_at?: string
          status?: string
          subscriber_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_queue: {
        Row: {
          conversation_id: string
          created_at: string
          encrypted_content: string
          encrypted_key_receiver: string
          encrypted_key_sender: string
          id: string
          nonce: string
          processed_at: string | null
          retry_count: number
          status: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          encrypted_content: string
          encrypted_key_receiver: string
          encrypted_key_sender: string
          id?: string
          nonce: string
          processed_at?: string | null
          retry_count?: number
          status?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          encrypted_content?: string
          encrypted_key_receiver?: string
          encrypted_key_sender?: string
          id?: string
          nonce?: string
          processed_at?: string | null
          retry_count?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_queue_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          conversation_id: string
          created_at: string
          delivered_at: string | null
          encrypted_content: string
          encrypted_key_receiver: string
          encrypted_key_sender: string
          id: string
          is_read: boolean
          message_type: string
          nonce: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          delivered_at?: string | null
          encrypted_content: string
          encrypted_key_receiver: string
          encrypted_key_sender: string
          id?: string
          is_read?: boolean
          message_type?: string
          nonce: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          delivered_at?: string | null
          encrypted_content?: string
          encrypted_key_receiver?: string
          encrypted_key_sender?: string
          id?: string
          is_read?: boolean
          message_type?: string
          nonce?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          comment_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          post_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          comment_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          post_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          comment_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          post_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      point_claims: {
        Row: {
          created_at: string
          id: string
          kes_amount: number
          points_claimed: number
          processed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kes_amount: number
          points_claimed: number
          processed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kes_amount?: number
          points_claimed?: number
          processed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          caption: string | null
          comments_count: number | null
          created_at: string | null
          hashtags: string[] | null
          id: string
          is_private: boolean | null
          likes_count: number | null
          media_url: string | null
          shares_count: number | null
          thumbnail_url: string | null
          type: Database["public"]["Enums"]["post_type"]
          updated_at: string | null
          user_id: string
          views_count: number | null
        }
        Insert: {
          caption?: string | null
          comments_count?: number | null
          created_at?: string | null
          hashtags?: string[] | null
          id?: string
          is_private?: boolean | null
          likes_count?: number | null
          media_url?: string | null
          shares_count?: number | null
          thumbnail_url?: string | null
          type: Database["public"]["Enums"]["post_type"]
          updated_at?: string | null
          user_id: string
          views_count?: number | null
        }
        Update: {
          caption?: string | null
          comments_count?: number | null
          created_at?: string | null
          hashtags?: string[] | null
          id?: string
          is_private?: boolean | null
          likes_count?: number | null
          media_url?: string | null
          shares_count?: number | null
          thumbnail_url?: string | null
          type?: Database["public"]["Enums"]["post_type"]
          updated_at?: string | null
          user_id?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email_verified: boolean
          email_verified_at: string | null
          external_links: Json | null
          followers_count: number | null
          following_count: number | null
          full_name: string | null
          id: string
          last_otp_request: string | null
          last_profile_update: string | null
          likes_received: number | null
          otp_attempts: number
          otp_expires_at: string | null
          otp_hash: string | null
          phone_number: string | null
          posts_count: number | null
          referral_code: string | null
          reset_token_expires_at: string | null
          reset_token_hash: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email_verified?: boolean
          email_verified_at?: string | null
          external_links?: Json | null
          followers_count?: number | null
          following_count?: number | null
          full_name?: string | null
          id: string
          last_otp_request?: string | null
          last_profile_update?: string | null
          likes_received?: number | null
          otp_attempts?: number
          otp_expires_at?: string | null
          otp_hash?: string | null
          phone_number?: string | null
          posts_count?: number | null
          referral_code?: string | null
          reset_token_expires_at?: string | null
          reset_token_hash?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email_verified?: boolean
          email_verified_at?: string | null
          external_links?: Json | null
          followers_count?: number | null
          following_count?: number | null
          full_name?: string | null
          id?: string
          last_otp_request?: string | null
          last_profile_update?: string | null
          likes_received?: number | null
          otp_attempts?: number
          otp_expires_at?: string | null
          otp_hash?: string | null
          phone_number?: string | null
          posts_count?: number | null
          referral_code?: string | null
          reset_token_expires_at?: string | null
          reset_token_hash?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_type: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_type?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_type?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action_count: number
          action_type: string
          created_at: string
          id: string
          user_id: string
          window_start: string
        }
        Insert: {
          action_count?: number
          action_type: string
          created_at?: string
          id?: string
          user_id: string
          window_start?: string
        }
        Update: {
          action_count?: number
          action_type?: string
          created_at?: string
          id?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          created_device_fingerprint: string | null
          created_ip_address: string | null
          device_fingerprint: string | null
          id: string
          ip_address: string | null
          points_awarded: number
          referral_code: string
          referred_id: string
          referrer_id: string
          status: string
          validated_at: string | null
        }
        Insert: {
          created_at?: string
          created_device_fingerprint?: string | null
          created_ip_address?: string | null
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          points_awarded?: number
          referral_code: string
          referred_id: string
          referrer_id: string
          status?: string
          validated_at?: string | null
        }
        Update: {
          created_at?: string
          created_device_fingerprint?: string | null
          created_ip_address?: string | null
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          points_awarded?: number
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          status?: string
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_posts: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          metadata: Json | null
          net_amount: number
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_reference: string | null
          platform_fee: number
          post_id: string | null
          receiver_id: string | null
          sender_id: string | null
          status: Database["public"]["Enums"]["wallet_transaction_status"]
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          net_amount: number
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_reference?: string | null
          platform_fee?: number
          post_id?: string | null
          receiver_id?: string | null
          sender_id?: string | null
          status?: Database["public"]["Enums"]["wallet_transaction_status"]
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          net_amount?: number
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_reference?: string | null
          platform_fee?: number
          post_id?: string | null
          receiver_id?: string | null
          sender_id?: string | null
          status?: Database["public"]["Enums"]["wallet_transaction_status"]
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_encryption_keys: {
        Row: {
          created_at: string
          encrypted_private_key: string
          id: string
          key_salt: string
          public_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_private_key: string
          id?: string
          key_salt: string
          public_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_private_key?: string
          id?: string
          key_salt?: string
          public_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_encryption_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_moderation: {
        Row: {
          banned_at: string | null
          banned_by: string | null
          banned_reason: string | null
          created_at: string
          id: string
          is_banned: boolean
          is_suspended: boolean
          last_warning_at: string | null
          suspended_by: string | null
          suspended_until: string | null
          suspension_reason: string | null
          updated_at: string
          user_id: string
          warning_count: number
        }
        Insert: {
          banned_at?: string | null
          banned_by?: string | null
          banned_reason?: string | null
          created_at?: string
          id?: string
          is_banned?: boolean
          is_suspended?: boolean
          last_warning_at?: string | null
          suspended_by?: string | null
          suspended_until?: string | null
          suspension_reason?: string | null
          updated_at?: string
          user_id: string
          warning_count?: number
        }
        Update: {
          banned_at?: string | null
          banned_by?: string | null
          banned_reason?: string | null
          created_at?: string
          id?: string
          is_banned?: boolean
          is_suspended?: boolean
          last_warning_at?: string | null
          suspended_by?: string | null
          suspended_until?: string | null
          suspension_reason?: string | null
          updated_at?: string
          user_id?: string
          warning_count?: number
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          content_flag_id: string | null
          created_at: string
          description: string | null
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reported_comment_id: string | null
          reported_post_id: string | null
          reported_user_id: string | null
          reporter_id: string
          status: Database["public"]["Enums"]["moderation_status"]
        }
        Insert: {
          content_flag_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          reported_comment_id?: string | null
          reported_post_id?: string | null
          reported_user_id?: string | null
          reporter_id: string
          status?: Database["public"]["Enums"]["moderation_status"]
        }
        Update: {
          content_flag_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reported_comment_id?: string | null
          reported_post_id?: string | null
          reported_user_id?: string | null
          reporter_id?: string
          status?: Database["public"]["Enums"]["moderation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "user_reports_content_flag_id_fkey"
            columns: ["content_flag_id"]
            isOneToOne: false
            referencedRelation: "content_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reported_comment_id_fkey"
            columns: ["reported_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reported_post_id_fkey"
            columns: ["reported_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          available_balance: number
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          created_at: string
          currency: string
          earnings_locked_until: string | null
          frozen_at: string | null
          frozen_by: string | null
          frozen_reason: string | null
          id: string
          is_frozen: boolean
          is_verified: boolean
          lifetime_earnings: number
          mpesa_phone: string | null
          pending_balance: number
          pending_points: number
          total_points_claimed: number
          updated_at: string
          user_id: string
          vibe_points: number
        }
        Insert: {
          available_balance?: number
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          currency?: string
          earnings_locked_until?: string | null
          frozen_at?: string | null
          frozen_by?: string | null
          frozen_reason?: string | null
          id?: string
          is_frozen?: boolean
          is_verified?: boolean
          lifetime_earnings?: number
          mpesa_phone?: string | null
          pending_balance?: number
          pending_points?: number
          total_points_claimed?: number
          updated_at?: string
          user_id: string
          vibe_points?: number
        }
        Update: {
          available_balance?: number
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          currency?: string
          earnings_locked_until?: string | null
          frozen_at?: string | null
          frozen_by?: string | null
          frozen_reason?: string | null
          id?: string
          is_frozen?: boolean
          is_verified?: boolean
          lifetime_earnings?: number
          mpesa_phone?: string | null
          pending_balance?: number
          pending_points?: number
          total_points_claimed?: number
          updated_at?: string
          user_id?: string
          vibe_points?: number
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          created_at: string
          currency: string
          failure_reason: string | null
          id: string
          payment_details: Json
          payment_method: Database["public"]["Enums"]["payment_method"]
          processed_at: string | null
          processed_by: string | null
          status: Database["public"]["Enums"]["wallet_transaction_status"]
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          payment_details?: Json
          payment_method: Database["public"]["Enums"]["payment_method"]
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["wallet_transaction_status"]
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          payment_details?: Json
          payment_method?: Database["public"]["Enums"]["payment_method"]
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["wallet_transaction_status"]
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_earnings_unlocked: { Args: { p_user_id: string }; Returns: boolean }
      check_otp_rate_limit: { Args: { p_user_id: string }; Returns: boolean }
      check_rate_limit: {
        Args: {
          p_action_type: string
          p_max_actions: number
          p_user_id: string
          p_window_hours?: number
        }
        Returns: boolean
      }
      check_referral_abuse: {
        Args: {
          p_device_fingerprint: string
          p_ip_address: string
          p_referrer_id: string
        }
        Returns: boolean
      }
      check_wallet_balance: {
        Args: { p_amount: number; p_user_id: string }
        Returns: boolean
      }
      claim_points: {
        Args: { p_points: number; p_user_id: string }
        Returns: string
      }
      get_or_create_conversation: {
        Args: { p_user_one: string; p_user_two: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_otp_attempts: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      increment_rate_limit: {
        Args: { p_action_type: string; p_user_id: string }
        Returns: undefined
      }
      increment_view_count: { Args: { post_id: string }; Returns: undefined }
      process_transfer: {
        Args: {
          p_amount: number
          p_description?: string
          p_post_id?: string
          p_receiver_id: string
          p_sender_id: string
          p_transaction_type?: Database["public"]["Enums"]["transaction_type"]
        }
        Returns: string
      }
      record_content_view: {
        Args: {
          p_post_id: string
          p_session_id?: string
          p_user_id?: string
          p_watch_duration?: number
        }
        Returns: boolean
      }
      validate_referral: { Args: { p_referred_id: string }; Returns: boolean }
      verify_otp: {
        Args: { p_otp_hash: string; p_user_id: string }
        Returns: boolean
      }
      verify_reset_token: {
        Args: { p_email: string; p_token_hash: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      flag_source: "ai_moderation" | "user_report" | "admin_flag"
      moderation_action:
        | "warning"
        | "content_removal"
        | "temporary_suspension"
        | "permanent_ban"
        | "wallet_freeze"
        | "wallet_unfreeze"
        | "none"
      moderation_status: "pending" | "reviewed" | "actioned" | "dismissed"
      payment_method: "mpesa" | "bank_transfer" | "paypal" | "stripe"
      post_type: "video" | "image" | "audio" | "text"
      report_reason:
        | "nudity"
        | "violence"
        | "harassment"
        | "hate_speech"
        | "scam_fraud"
        | "spam"
        | "misinformation"
        | "other"
      transaction_type:
        | "tip"
        | "subscription"
        | "content_purchase"
        | "withdrawal"
        | "platform_fee"
        | "earnings"
      wallet_transaction_status:
        | "pending"
        | "completed"
        | "failed"
        | "cancelled"
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
      app_role: ["admin", "moderator", "user"],
      flag_source: ["ai_moderation", "user_report", "admin_flag"],
      moderation_action: [
        "warning",
        "content_removal",
        "temporary_suspension",
        "permanent_ban",
        "wallet_freeze",
        "wallet_unfreeze",
        "none",
      ],
      moderation_status: ["pending", "reviewed", "actioned", "dismissed"],
      payment_method: ["mpesa", "bank_transfer", "paypal", "stripe"],
      post_type: ["video", "image", "audio", "text"],
      report_reason: [
        "nudity",
        "violence",
        "harassment",
        "hate_speech",
        "scam_fraud",
        "spam",
        "misinformation",
        "other",
      ],
      transaction_type: [
        "tip",
        "subscription",
        "content_purchase",
        "withdrawal",
        "platform_fee",
        "earnings",
      ],
      wallet_transaction_status: [
        "pending",
        "completed",
        "failed",
        "cancelled",
      ],
    },
  },
} as const
