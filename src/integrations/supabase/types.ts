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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          address: string | null
          business_hours: string | null
          cash_on_pickup: boolean
          cin: string | null
          city: string | null
          company_name: string
          company_type: string | null
          description: string | null
          facebook_url: string | null
          footer_text: string | null
          gstin: string | null
          hero_image_url: string | null
          hub_commission_percent: number
          icon_url: string | null
          id: boolean
          instagram_url: string | null
          intl_markup_flat: number
          intl_markup_percent: number
          linkedin_url: string | null
          logo_url: string | null
          maintenance_message: string | null
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          og_image_url: string | null
          pan: string | null
          pay_account_name: string | null
          pay_account_no: string | null
          pay_bank_name: string | null
          pay_ifsc: string | null
          pay_instructions: string | null
          pay_upi_id: string | null
          pay_upi_name: string | null
          pincode: string | null
          show_phone_tab_bar: boolean
          site_live: boolean
          state: string | null
          support_email: string | null
          support_phone: string | null
          support_whatsapp: string | null
          tagline: string | null
          updated_at: string
          x_url: string | null
          youtube_url: string | null
        }
        Insert: {
          address?: string | null
          business_hours?: string | null
          cash_on_pickup?: boolean
          cin?: string | null
          city?: string | null
          company_name?: string
          company_type?: string | null
          description?: string | null
          facebook_url?: string | null
          footer_text?: string | null
          gstin?: string | null
          hero_image_url?: string | null
          hub_commission_percent?: number
          icon_url?: string | null
          id?: boolean
          instagram_url?: string | null
          intl_markup_flat?: number
          intl_markup_percent?: number
          linkedin_url?: string | null
          logo_url?: string | null
          maintenance_message?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          pan?: string | null
          pay_account_name?: string | null
          pay_account_no?: string | null
          pay_bank_name?: string | null
          pay_ifsc?: string | null
          pay_instructions?: string | null
          pay_upi_id?: string | null
          pay_upi_name?: string | null
          pincode?: string | null
          show_phone_tab_bar?: boolean
          site_live?: boolean
          state?: string | null
          support_email?: string | null
          support_phone?: string | null
          support_whatsapp?: string | null
          tagline?: string | null
          updated_at?: string
          x_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          address?: string | null
          business_hours?: string | null
          cash_on_pickup?: boolean
          cin?: string | null
          city?: string | null
          company_name?: string
          company_type?: string | null
          description?: string | null
          facebook_url?: string | null
          footer_text?: string | null
          gstin?: string | null
          hero_image_url?: string | null
          hub_commission_percent?: number
          icon_url?: string | null
          id?: boolean
          instagram_url?: string | null
          intl_markup_flat?: number
          intl_markup_percent?: number
          linkedin_url?: string | null
          logo_url?: string | null
          maintenance_message?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          pan?: string | null
          pay_account_name?: string | null
          pay_account_no?: string | null
          pay_bank_name?: string | null
          pay_ifsc?: string | null
          pay_instructions?: string | null
          pay_upi_id?: string | null
          pay_upi_name?: string | null
          pincode?: string | null
          show_phone_tab_bar?: boolean
          site_live?: boolean
          state?: string | null
          support_email?: string | null
          support_phone?: string | null
          support_whatsapp?: string | null
          tagline?: string | null
          updated_at?: string
          x_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          meta: Json
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          meta?: Json
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          meta?: Json
        }
        Relationships: []
      }
      bag_items: {
        Row: {
          added_by: string
          bag_id: string
          created_at: string
          id: string
          piece_id: string
        }
        Insert: {
          added_by: string
          bag_id: string
          created_at?: string
          id?: string
          piece_id: string
        }
        Update: {
          added_by?: string
          bag_id?: string
          created_at?: string
          id?: string
          piece_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bag_items_bag_id_fkey"
            columns: ["bag_id"]
            isOneToOne: false
            referencedRelation: "bags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bag_items_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "shipment_pieces"
            referencedColumns: ["id"]
          },
        ]
      }
      bags: {
        Row: {
          bag_code: string
          created_at: string
          created_by: string
          destination: string
          id: string
          manifest_id: string | null
          plastic_bag_code: string | null
          seal_no: string | null
          sealed_at: string | null
          status: string
        }
        Insert: {
          bag_code: string
          created_at?: string
          created_by?: string
          destination: string
          id?: string
          manifest_id?: string | null
          plastic_bag_code?: string | null
          seal_no?: string | null
          sealed_at?: string | null
          status?: string
        }
        Update: {
          bag_code?: string
          created_at?: string
          created_by?: string
          destination?: string
          id?: string
          manifest_id?: string | null
          plastic_bag_code?: string | null
          seal_no?: string | null
          sealed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bags_manifest_id_fkey"
            columns: ["manifest_id"]
            isOneToOne: false
            referencedRelation: "manifests"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          created_at: string
          discount: number
          id: string
          shipment_id: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          discount: number
          id?: string
          shipment_id: string
          user_id?: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          discount?: number
          id?: string
          shipment_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_private_reward: boolean
          max_discount: number | null
          max_uses: number | null
          min_order: number
          per_user_limit: number
          show_on_site: boolean
          starts_at: string
          used_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_private_reward?: boolean
          max_discount?: number | null
          max_uses?: number | null
          min_order?: number
          per_user_limit?: number
          show_on_site?: boolean
          starts_at?: string
          used_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_private_reward?: boolean
          max_discount?: number | null
          max_uses?: number | null
          min_order?: number
          per_user_limit?: number
          show_on_site?: boolean
          starts_at?: string
          used_count?: number
        }
        Relationships: []
      }
      courier_provider_settings: {
        Row: {
          account_label: string | null
          enabled: boolean
          environment: string
          provider: string
          updated_at: string
        }
        Insert: {
          account_label?: string | null
          enabled?: boolean
          environment?: string
          provider: string
          updated_at?: string
        }
        Update: {
          account_label?: string | null
          enabled?: boolean
          environment?: string
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          status: string
          subject: string | null
          template_key: string | null
          to_email: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          status: string
          subject?: string | null
          template_key?: string | null
          to_email: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          status?: string
          subject?: string | null
          template_key?: string | null
          to_email?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string
          enabled: boolean
          image_url: string | null
          key: string
          kind: string
          name: string
          subject: string
          updated_at: string
        }
        Insert: {
          body: string
          enabled?: boolean
          image_url?: string | null
          key: string
          kind?: string
          name: string
          subject: string
          updated_at?: string
        }
        Update: {
          body?: string
          enabled?: boolean
          image_url?: string | null
          key?: string
          kind?: string
          name?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      first_order_rewards: {
        Row: {
          coupon_id: string | null
          created_at: string
          user_id: string
        }
        Insert: {
          coupon_id?: string | null
          created_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string | null
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "first_order_rewards_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_order_rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gateway_configs: {
        Row: {
          category: string
          config: Json
          enabled: boolean
          live_mode: boolean
          provider: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: string
          config?: Json
          enabled?: boolean
          live_mode?: boolean
          provider: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          config?: Json
          enabled?: boolean
          live_mode?: boolean
          provider?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      health_checks: {
        Row: {
          checked_at: string
          details: Json
          id: string
          latency_ms: number | null
          status: string
        }
        Insert: {
          checked_at?: string
          details?: Json
          id?: string
          latency_ms?: number | null
          status: string
        }
        Update: {
          checked_at?: string
          details?: Json
          id?: string
          latency_ms?: number | null
          status?: string
        }
        Relationships: []
      }
      hub_routes: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          from_location: string
          id: string
          owner_user_id: string | null
          pincodes: string[]
          to_location: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          from_location: string
          id?: string
          owner_user_id?: string | null
          pincodes?: string[]
          to_location: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          from_location?: string
          id?: string
          owner_user_id?: string | null
          pincodes?: string[]
          to_location?: string
        }
        Relationships: []
      }
      integration_settings: {
        Row: {
          admin_alert_email: string | null
          alert_on_application: boolean
          alert_on_booking: boolean
          api_enabled: boolean
          id: boolean
          otp_provider: string
          otp_sender_id: string | null
          payment_key_id: string | null
          payment_live: boolean
          payment_provider: string
          smtp_from: string | null
          smtp_host: string | null
          smtp_port: number | null
          smtp_provider: string
          smtp_user: string | null
          updated_at: string
          webhook_url: string | null
          whatsapp_enabled: boolean
          whatsapp_number: string | null
        }
        Insert: {
          admin_alert_email?: string | null
          alert_on_application?: boolean
          alert_on_booking?: boolean
          api_enabled?: boolean
          id?: boolean
          otp_provider?: string
          otp_sender_id?: string | null
          payment_key_id?: string | null
          payment_live?: boolean
          payment_provider?: string
          smtp_from?: string | null
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_provider?: string
          smtp_user?: string | null
          updated_at?: string
          webhook_url?: string | null
          whatsapp_enabled?: boolean
          whatsapp_number?: string | null
        }
        Update: {
          admin_alert_email?: string | null
          alert_on_application?: boolean
          alert_on_booking?: boolean
          api_enabled?: boolean
          id?: boolean
          otp_provider?: string
          otp_sender_id?: string | null
          payment_key_id?: string | null
          payment_live?: boolean
          payment_provider?: string
          smtp_from?: string | null
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_provider?: string
          smtp_user?: string | null
          updated_at?: string
          webhook_url?: string | null
          whatsapp_enabled?: boolean
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      international_quote_requests: {
        Row: {
          booked_at: string | null
          booking: Json | null
          carrier_awb: string | null
          contents: string
          created_at: string
          declared_value: number
          history: Json
          id: string
          quoted_price: number | null
          receiver: Json
          reference: string
          sender: Json
          service_name: string | null
          status: string
          updated_at: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          booked_at?: string | null
          booking?: Json | null
          carrier_awb?: string | null
          contents: string
          created_at?: string
          declared_value?: number
          history?: Json
          id?: string
          quoted_price?: number | null
          receiver: Json
          reference?: string
          sender: Json
          service_name?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          weight_kg: number
        }
        Update: {
          booked_at?: string | null
          booking?: Json | null
          carrier_awb?: string | null
          contents?: string
          created_at?: string
          declared_value?: number
          history?: Json
          id?: string
          quoted_price?: number | null
          receiver?: Json
          reference?: string
          sender?: Json
          service_name?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "international_quote_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      label_prints: {
        Row: {
          created_at: string
          id: string
          piece_id: string
          printed_by: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          piece_id: string
          printed_by: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          piece_id?: string
          printed_by?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "label_prints_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "shipment_pieces"
            referencedColumns: ["id"]
          },
        ]
      }
      login_otps: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          phone: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          phone: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
        }
        Relationships: []
      }
      manifests: {
        Row: {
          created_at: string
          created_by: string
          from_location: string
          id: string
          manifest_code: string
          received_at: string | null
          received_by: string | null
          status: string
          to_location: string
          vehicle_no: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string
          from_location: string
          id?: string
          manifest_code: string
          received_at?: string | null
          received_by?: string | null
          status?: string
          to_location: string
          vehicle_no?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          from_location?: string
          id?: string
          manifest_code?: string
          received_at?: string | null
          received_by?: string | null
          status?: string
          to_location?: string
          vehicle_no?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          channel: string
          created_at: string
          error: string | null
          id: string
          kind: string
          meta: Json
          recipient: string | null
          sent_at: string | null
          status: string
          subject: string
          user_id: string | null
        }
        Insert: {
          body: string
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          kind: string
          meta?: Json
          recipient?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          user_id?: string | null
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          meta?: Json
          recipient?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: []
      }
      parcel_presets: {
        Row: {
          active: boolean
          code: string | null
          fee: number
          h: number
          id: string
          kind: string
          l: number
          label: string
          label_hi: string | null
          max_kg: number
          sort: number
          updated_at: string
          w: number
        }
        Insert: {
          active?: boolean
          code?: string | null
          fee?: number
          h?: number
          id?: string
          kind?: string
          l?: number
          label: string
          label_hi?: string | null
          max_kg?: number
          sort?: number
          updated_at?: string
          w?: number
        }
        Update: {
          active?: boolean
          code?: string | null
          fee?: number
          h?: number
          id?: string
          kind?: string
          l?: number
          label?: string
          label_hi?: string | null
          max_kg?: number
          sort?: number
          updated_at?: string
          w?: number
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string | null
          mode: string
          provider: string
          provider_ref: string | null
          shipment_id: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string | null
          mode?: string
          provider?: string
          provider_ref?: string | null
          shipment_id: string
          status?: string
          user_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string | null
          mode?: string
          provider?: string
          provider_ref?: string | null
          shipment_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_otps: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          phone: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          user_id?: string
        }
        Relationships: []
      }
      pincode_allocations: {
        Row: {
          area: string | null
          assigned_by: string
          created_at: string
          effective_from: string
          effective_to: string | null
          holder_role: Database["public"]["Enums"]["app_role"]
          holder_user_id: string
          id: string
          note: string | null
          pincode: string
          status: string
        }
        Insert: {
          area?: string | null
          assigned_by?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          holder_role: Database["public"]["Enums"]["app_role"]
          holder_user_id: string
          id?: string
          note?: string | null
          pincode: string
          status?: string
        }
        Update: {
          area?: string | null
          assigned_by?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          holder_role?: Database["public"]["Enums"]["app_role"]
          holder_user_id?: string
          id?: string
          note?: string | null
          pincode?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pincode_allocations_pincode_fkey"
            columns: ["pincode"]
            isOneToOne: false
            referencedRelation: "pincodes"
            referencedColumns: ["pincode"]
          },
        ]
      }
      pincodes: {
        Row: {
          active: boolean
          area: string | null
          city: string
          hub_name: string | null
          pincode: string
          state: string
          tier: string | null
          zone: string | null
        }
        Insert: {
          active?: boolean
          area?: string | null
          city: string
          hub_name?: string | null
          pincode: string
          state: string
          tier?: string | null
          zone?: string | null
        }
        Update: {
          active?: boolean
          area?: string | null
          city?: string
          hub_name?: string | null
          pincode?: string
          state?: string
          tier?: string | null
          zone?: string | null
        }
        Relationships: []
      }
      point_applications: {
        Row: {
          address: string
          address_line2: string | null
          age: number | null
          business_name: string
          business_type: string
          city: string
          created_at: string
          daily_capacity: number | null
          district: string | null
          email: string
          full_name: string
          gender: string | null
          id: string
          message: string | null
          phone: string
          pincode: string
          reference: string
          space_sqft: number | null
          state: string
          status: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          address: string
          address_line2?: string | null
          age?: number | null
          business_name: string
          business_type: string
          city: string
          created_at?: string
          daily_capacity?: number | null
          district?: string | null
          email: string
          full_name: string
          gender?: string | null
          id?: string
          message?: string | null
          phone: string
          pincode: string
          reference?: string
          space_sqft?: number | null
          state: string
          status?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string
          address_line2?: string | null
          age?: number | null
          business_name?: string
          business_type?: string
          city?: string
          created_at?: string
          daily_capacity?: number | null
          district?: string | null
          email?: string
          full_name?: string
          gender?: string | null
          id?: string
          message?: string | null
          phone?: string
          pincode?: string
          reference?: string
          space_sqft?: number | null
          state?: string
          status?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      point_commissions: {
        Row: {
          amount: number
          created_at: string
          id: string
          point_user_id: string
          rate: number
          settled_at: string | null
          settled_by: string | null
          shipment_id: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          point_user_id: string
          rate: number
          settled_at?: string | null
          settled_by?: string | null
          shipment_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          point_user_id?: string
          rate?: number
          settled_at?: string | null
          settled_by?: string | null
          shipment_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_commissions_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string
          address: string | null
          age: number | null
          avatar_url: string | null
          business_name: string | null
          city: string | null
          contact_email: string | null
          created_at: string
          district: string | null
          first_name: string | null
          full_name: string | null
          gender: string | null
          id: string
          last_name: string | null
          last_seen_at: string | null
          lat: number | null
          lng: number | null
          onboarded_at: string | null
          phone: string | null
          phone_verified: boolean
          pincode: string | null
          state: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          account_type?: string
          address?: string | null
          age?: number | null
          avatar_url?: string | null
          business_name?: string | null
          city?: string | null
          contact_email?: string | null
          created_at?: string
          district?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          last_name?: string | null
          last_seen_at?: string | null
          lat?: number | null
          lng?: number | null
          onboarded_at?: string | null
          phone?: string | null
          phone_verified?: boolean
          pincode?: string | null
          state?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          account_type?: string
          address?: string | null
          age?: number | null
          avatar_url?: string | null
          business_name?: string | null
          city?: string | null
          contact_email?: string | null
          created_at?: string
          district?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          last_seen_at?: string | null
          lat?: number | null
          lng?: number | null
          onboarded_at?: string | null
          phone?: string | null
          phone_verified?: boolean
          pincode?: string | null
          state?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      returns: {
        Row: {
          created_at: string
          id: string
          kind: string
          pickup_at: string | null
          reason: string
          requested_by: string
          restocking_status: string
          return_awb: string | null
          shipment_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          pickup_at?: string | null
          reason: string
          requested_by: string
          restocking_status?: string
          return_awb?: string | null
          shipment_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          pickup_at?: string | null
          reason?: string
          requested_by?: string
          restocking_status?: string
          return_awb?: string | null
          shipment_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      seal_codes: {
        Row: {
          batch_id: string
          code: string
          created_at: string
          created_by: string
          kind: string
          used_bag_id: string | null
        }
        Insert: {
          batch_id: string
          code: string
          created_at?: string
          created_by?: string
          kind: string
          used_bag_id?: string | null
        }
        Update: {
          batch_id?: string
          code?: string
          created_at?: string
          created_by?: string
          kind?: string
          used_bag_id?: string | null
        }
        Relationships: []
      }
      service_rates: {
        Row: {
          active: boolean
          base: number
          per_kg: number
          service: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          base?: number
          per_kg?: number
          service: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          base?: number
          per_kg?: number
          service?: string
          updated_at?: string
        }
        Relationships: []
      }
      shipment_pieces: {
        Row: {
          box_preset: string | null
          contents: string | null
          created_at: string
          dims: Json | null
          id: string
          piece_code: string
          seq_no: number
          shipment_id: string
          total: number
          weight_kg: number | null
        }
        Insert: {
          box_preset?: string | null
          contents?: string | null
          created_at?: string
          dims?: Json | null
          id?: string
          piece_code: string
          seq_no: number
          shipment_id: string
          total: number
          weight_kg?: number | null
        }
        Update: {
          box_preset?: string | null
          contents?: string | null
          created_at?: string
          dims?: Json | null
          id?: string
          piece_code?: string
          seq_no?: number
          shipment_id?: string
          total?: number
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_pieces_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          contents: string | null
          coupon_code: string | null
          created_at: string
          declared_value: number | null
          dims: Json | null
          discount: number
          handling_fee: number
          has_electronics: boolean
          id: string
          is_fragile: boolean
          origin_point_id: string | null
          parcel_photos: string[]
          payment_method: string
          payment_status: string
          pickup_lat: number | null
          pickup_lng: number | null
          pieces_count: number
          policy_accepted_at: string | null
          price: number
          receiver_address: string
          receiver_city: string
          receiver_district: string | null
          receiver_email: string | null
          receiver_name: string
          receiver_phone: string
          receiver_pincode: string
          receiver_state: string | null
          routing_snapshot: Json
          sender_address: string
          sender_city: string
          sender_district: string | null
          sender_email: string | null
          sender_name: string
          sender_phone: string
          sender_pincode: string
          sender_state: string | null
          service: string
          status: string
          tracking_number: string
          updated_at: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          contents?: string | null
          coupon_code?: string | null
          created_at?: string
          declared_value?: number | null
          dims?: Json | null
          discount?: number
          handling_fee?: number
          has_electronics?: boolean
          id?: string
          is_fragile?: boolean
          origin_point_id?: string | null
          parcel_photos?: string[]
          payment_method?: string
          payment_status?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pieces_count?: number
          policy_accepted_at?: string | null
          price: number
          receiver_address: string
          receiver_city: string
          receiver_district?: string | null
          receiver_email?: string | null
          receiver_name: string
          receiver_phone: string
          receiver_pincode: string
          receiver_state?: string | null
          routing_snapshot?: Json
          sender_address: string
          sender_city: string
          sender_district?: string | null
          sender_email?: string | null
          sender_name: string
          sender_phone: string
          sender_pincode: string
          sender_state?: string | null
          service?: string
          status?: string
          tracking_number: string
          updated_at?: string
          user_id?: string
          weight_kg: number
        }
        Update: {
          contents?: string | null
          coupon_code?: string | null
          created_at?: string
          declared_value?: number | null
          dims?: Json | null
          discount?: number
          handling_fee?: number
          has_electronics?: boolean
          id?: string
          is_fragile?: boolean
          origin_point_id?: string | null
          parcel_photos?: string[]
          payment_method?: string
          payment_status?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pieces_count?: number
          policy_accepted_at?: string | null
          price?: number
          receiver_address?: string
          receiver_city?: string
          receiver_district?: string | null
          receiver_email?: string | null
          receiver_name?: string
          receiver_phone?: string
          receiver_pincode?: string
          receiver_state?: string | null
          routing_snapshot?: Json
          sender_address?: string
          sender_city?: string
          sender_district?: string | null
          sender_email?: string | null
          sender_name?: string
          sender_phone?: string
          sender_pincode?: string
          sender_state?: string | null
          service?: string
          status?: string
          tracking_number?: string
          updated_at?: string
          user_id?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "shipments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      smtp_settings: {
        Row: {
          enabled: boolean
          from_email: string | null
          from_name: string | null
          host: string
          id: boolean
          port: number
          provider: string
          secure: string
          updated_at: string
          username: string | null
        }
        Insert: {
          enabled?: boolean
          from_email?: string | null
          from_name?: string | null
          host?: string
          id?: boolean
          port?: number
          provider?: string
          secure?: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          enabled?: boolean
          from_email?: string | null
          from_name?: string | null
          host?: string
          id?: boolean
          port?: number
          provider?: string
          secure?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      staff_scopes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          point_id: string | null
          revoked_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          state: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          point_id?: string | null
          revoked_at?: string | null
          role: Database["public"]["Enums"]["app_role"]
          state?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          point_id?: string | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          state?: string | null
          user_id?: string
        }
        Relationships: []
      }
      state_rates: {
        Row: {
          active: boolean
          base: number
          per_kg: number
          service: string
          set_by: string | null
          state: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          base: number
          per_kg: number
          service: string
          set_by?: string | null
          state: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          base?: number
          per_kg?: number
          service?: string
          set_by?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          ai_answer: string | null
          created_at: string
          id: string
          message: string
          staff_reply: string | null
          status: string
          subject: string
          tracking_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_answer?: string | null
          created_at?: string
          id?: string
          message: string
          staff_reply?: string | null
          status?: string
          subject: string
          tracking_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_answer?: string | null
          created_at?: string
          id?: string
          message?: string
          staff_reply?: string | null
          status?: string
          subject?: string
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_events: {
        Row: {
          created_at: string
          id: string
          location: string | null
          note: string | null
          piece_id: string | null
          shipment_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          note?: string | null
          piece_id?: string | null
          shipment_id: string
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          note?: string | null
          piece_id?: string | null
          shipment_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_deposits: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          method: string
          proof_path: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
          utr: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          method?: string
          proof_path?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
          utr: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          method?: string
          proof_path?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
          utr?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: string
          note: string | null
          ref: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kind: string
          note?: string | null
          ref?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          ref?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wallet_withdrawals: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          payout_details: string
          payout_method: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          payout_details: string
          payout_method: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          payout_details?: string
          payout_method?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_settings: {
        Row: {
          api_key: string | null
          base_url: string
          enabled: boolean
          id: boolean
          instance_id: string | null
          notify_bookings: boolean
          otp_template: string
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          api_key?: string | null
          base_url?: string
          enabled?: boolean
          id?: boolean
          instance_id?: string | null
          notify_bookings?: boolean
          otp_template?: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          api_key?: string | null
          base_url?: string
          enabled?: boolean
          id?: boolean
          instance_id?: string | null
          notify_bookings?: boolean
          otp_template?: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          body: string
          enabled: boolean
          event: string
          key: string
          link_url: string | null
          media_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          body: string
          enabled?: boolean
          event?: string
          key: string
          link_url?: string | null
          media_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          body?: string
          enabled?: boolean
          event?: string
          key?: string
          link_url?: string | null
          media_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_piece_to_bag: {
        Args: { _bag_id: string; _code: string }
        Returns: Json
      }
      admin_exists: { Args: never; Returns: boolean }
      admin_update_profile: {
        Args: { _id: string; _patch: Json }
        Returns: undefined
      }
      admin_users: {
        Args: never
        Returns: {
          city: string
          created_at: string
          full_name: string
          last_seen_at: string
          phone: string
          roles: string[]
          user_id: string
        }[]
      }
      admin_wallet_adjust: {
        Args: { _amount: number; _note: string; _user: string }
        Returns: number
      }
      allocate_pincode: {
        Args: {
          _holder: string
          _holder_role: Database["public"]["Enums"]["app_role"]
          _note?: string
          _pincode: string
        }
        Returns: string
      }
      book_international_quote: {
        Args: { _booking: Json; _ref: string; _service?: string }
        Returns: Json
      }
      can_access_bag: { Args: { _bag: string }; Returns: boolean }
      can_access_pincode: {
        Args: { _pin: string; _user: string }
        Returns: boolean
      }
      claim_first_admin: { Args: never; Returns: boolean }
      create_bag: { Args: { _destination: string }; Returns: Json }
      create_manifest: {
        Args: {
          _bag_ids: string[]
          _from: string
          _to: string
          _vehicle: string
        }
        Returns: Json
      }
      create_return: {
        Args: { _awb: string; _kind: string; _reason: string }
        Returns: Json
      }
      dashboard_summary: { Args: never; Returns: Json }
      deposit_instructions: { Args: never; Returns: Json }
      find_user_by_phone: {
        Args: { _phone: string }
        Returns: {
          full_name: string
          phone: string
          roles: string[]
          user_id: string
        }[]
      }
      generate_seal_codes: {
        Args: { _count: number; _kind: string }
        Returns: {
          batch_id: string
          code: string
        }[]
      }
      grant_staff_role: {
        Args: {
          _point_id?: string
          _role: Database["public"]["Enums"]["app_role"]
          _state?: string
          _user_id: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_pincodes: { Args: { _rows: Json }; Returns: number }
      is_staff: { Args: { _u: string }; Returns: boolean }
      manage_staff_assignment: {
        Args: {
          _area?: string
          _enabled: boolean
          _pin?: string
          _role: Database["public"]["Enums"]["app_role"]
          _state?: string
          _user: string
        }
        Returns: undefined
      }
      manages_state: {
        Args: { _state: string; _user: string }
        Returns: boolean
      }
      next_awb: { Args: never; Returns: string }
      next_piece_code: { Args: never; Returns: string }
      otp_channel: { Args: never; Returns: string }
      public_company: { Args: never; Returns: Json }
      public_offers: { Args: never; Returns: Json }
      public_ui_flags: { Args: never; Returns: Json }
      receive_manifest: { Args: { _manifest_id: string }; Returns: undefined }
      release_pincode: { Args: { _allocation_id: string }; Returns: undefined }
      reward_stats: { Args: never; Returns: Json }
      route_connected: {
        Args: { _from: string; _to: string }
        Returns: boolean
      }
      scan_bag_code: { Args: { _code: string }; Returns: Json }
      scan_piece: {
        Args: {
          _code: string
          _location?: string
          _note?: string
          _status: string
        }
        Returns: Json
      }
      seal_bag: { Args: { _bag_id: string; _seal: string }; Returns: undefined }
      set_plastic_bag: {
        Args: { _bag_id: string; _code: string }
        Returns: undefined
      }
      settle_commissions: { Args: { _ids: string[] }; Returns: number }
      staff_directory: {
        Args: never
        Returns: {
          full_name: string
          phone: string
          roles: string[]
          states: string[]
          user_id: string
        }[]
      }
      touch_last_seen: { Args: never; Returns: undefined }
      track_quote: { Args: { _ref: string }; Returns: Json }
      track_shipment: { Args: { _tracking: string }; Returns: Json }
      transfer_pincode: {
        Args: { _allocation_id: string; _new_holder: string; _note?: string }
        Returns: string
      }
      update_quote_status: {
        Args: {
          _awb?: string
          _id: string
          _note?: string
          _price?: number
          _status: string
        }
        Returns: undefined
      }
      update_return_status: {
        Args: { _return_id: string; _status: string }
        Returns: undefined
      }
      wallet_balance: { Args: { _user?: string }; Returns: number }
      wallet_topup: {
        Args: { _amount: number; _ref?: string }
        Returns: number
      }
      whatsapp_ready: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "point"
        | "network"
        | "state_director"
        | "state_manager"
        | "area_manager"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
        "admin",
        "point",
        "network",
        "state_director",
        "state_manager",
        "area_manager",
      ],
    },
  },
} as const
