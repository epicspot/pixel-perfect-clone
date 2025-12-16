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
      agencies: {
        Row: {
          address: string | null
          city: string | null
          code: string | null
          created_at: string
          email: string | null
          id: number
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          code?: string | null
          created_at?: string
          email?: string | null
          id?: number
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string | null
          created_at?: string
          email?: string | null
          id?: number
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          description: string | null
          id: number
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          agency_id: number | null
          created_at: string
          description: string | null
          entity_id: number | null
          entity_type: string | null
          id: number
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          agency_id?: number | null
          created_at?: string
          description?: string | null
          entity_id?: number | null
          entity_type?: string | null
          id?: number
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          agency_id?: number | null
          created_at?: string
          description?: string | null
          entity_id?: number | null
          entity_type?: string | null
          id?: number
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_closures: {
        Row: {
          agency_id: number | null
          closure_date: string
          created_at: string
          difference: number | null
          from_datetime: string
          id: number
          status: Database["public"]["Enums"]["cash_closure_status"]
          to_datetime: string
          total_card_sales: number
          total_cash_sales: number
          total_mobile_money_sales: number
          total_tickets_count: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agency_id?: number | null
          closure_date?: string
          created_at?: string
          difference?: number | null
          from_datetime: string
          id?: number
          status?: Database["public"]["Enums"]["cash_closure_status"]
          to_datetime: string
          total_card_sales?: number
          total_cash_sales?: number
          total_mobile_money_sales?: number
          total_tickets_count?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agency_id?: number | null
          closure_date?: string
          created_at?: string
          difference?: number | null
          from_datetime?: string
          id?: number
          status?: Database["public"]["Enums"]["cash_closure_status"]
          to_datetime?: string
          total_card_sales?: number
          total_cash_sales?: number
          total_mobile_money_sales?: number
          total_tickets_count?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_closures_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_discrepancy_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          agency_id: number | null
          created_at: string
          difference: number
          id: number
          session_id: number
          threshold: number
          user_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          agency_id?: number | null
          created_at?: string
          difference: number
          id?: number
          session_id: number
          threshold: number
          user_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          agency_id?: number | null
          created_at?: string
          difference?: number
          id?: number
          session_id?: number
          threshold?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_discrepancy_alerts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_discrepancy_alerts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "counter_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address: string | null
          company_name: string
          created_at: string
          email: string | null
          id: number
          ifu: string | null
          logo_url: string | null
          phone: string | null
          rccm: string | null
          slogan: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_name?: string
          created_at?: string
          email?: string | null
          id?: number
          ifu?: string | null
          logo_url?: string | null
          phone?: string | null
          rccm?: string | null
          slogan?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_name?: string
          created_at?: string
          email?: string | null
          id?: number
          ifu?: string | null
          logo_url?: string | null
          phone?: string | null
          rccm?: string | null
          slogan?: string
          updated_at?: string
        }
        Relationships: []
      }
      counter_sessions: {
        Row: {
          agency_id: number
          closed_at: string | null
          closing_cash_declared: number | null
          closing_cash_expected: number | null
          closing_notes: string | null
          counter_id: number
          created_at: string
          difference: number | null
          id: number
          opened_at: string
          opening_cash: number
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agency_id: number
          closed_at?: string | null
          closing_cash_declared?: number | null
          closing_cash_expected?: number | null
          closing_notes?: string | null
          counter_id: number
          created_at?: string
          difference?: number | null
          id?: number
          opened_at?: string
          opening_cash?: number
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agency_id?: number
          closed_at?: string | null
          closing_cash_declared?: number | null
          closing_cash_expected?: number | null
          closing_notes?: string | null
          counter_id?: number
          created_at?: string
          difference?: number | null
          id?: number
          opened_at?: string
          opening_cash?: number
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "counter_sessions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counter_sessions_counter_id_fkey"
            columns: ["counter_id"]
            isOneToOne: false
            referencedRelation: "ticket_counters"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          code: string
          created_at: string
          id: number
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: number
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: number
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          agency_id: number | null
          amount: number
          category_id: number | null
          created_at: string
          description: string | null
          expense_date: string
          id: number
          recorded_by: string | null
          staff_id: number | null
          supporting_document_path: string | null
          updated_at: string
          vehicle_id: number | null
        }
        Insert: {
          agency_id?: number | null
          amount: number
          category_id?: number | null
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: number
          recorded_by?: string | null
          staff_id?: number | null
          supporting_document_path?: string | null
          updated_at?: string
          vehicle_id?: number | null
        }
        Update: {
          agency_id?: number | null
          amount?: number
          category_id?: number | null
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: number
          recorded_by?: string | null
          staff_id?: number | null
          supporting_document_path?: string | null
          updated_at?: string
          vehicle_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_entries: {
        Row: {
          agency_id: number | null
          created_at: string
          created_by: string | null
          filled_at: string
          id: number
          liters: number
          note: string | null
          odometer_km: number | null
          price_per_liter: number
          supplier_id: number | null
          total_amount: number
          vehicle_id: number | null
        }
        Insert: {
          agency_id?: number | null
          created_at?: string
          created_by?: string | null
          filled_at?: string
          id?: number
          liters?: number
          note?: string | null
          odometer_km?: number | null
          price_per_liter?: number
          supplier_id?: number | null
          total_amount?: number
          vehicle_id?: number | null
        }
        Update: {
          agency_id?: number | null
          created_at?: string
          created_by?: string | null
          filled_at?: string
          id?: number
          liters?: number
          note?: string | null
          odometer_km?: number | null
          price_per_liter?: number
          supplier_id?: number | null
          total_amount?: number
          vehicle_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_entries_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_entries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "fuel_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_entries_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_suppliers: {
        Row: {
          contact: string | null
          created_at: string
          id: number
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          contact?: string | null
          created_at?: string
          id?: number
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          contact?: string | null
          created_at?: string
          id?: number
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      maintenance_items: {
        Row: {
          created_at: string
          description: string
          id: number
          maintenance_order_id: number | null
          quantity: number
          total_cost: number
          unit_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: number
          maintenance_order_id?: number | null
          quantity?: number
          total_cost?: number
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: number
          maintenance_order_id?: number | null
          quantity?: number
          total_cost?: number
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_items_maintenance_order_id_fkey"
            columns: ["maintenance_order_id"]
            isOneToOne: false
            referencedRelation: "maintenance_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_orders: {
        Row: {
          agency_id: number | null
          closed_at: string | null
          created_at: string
          description: string | null
          id: number
          odometer_km: number | null
          opened_at: string
          reported_by: string | null
          reported_by_staff: number | null
          status: string
          title: string
          total_cost: number | null
          type: string
          updated_at: string
          validated_by: string | null
          vehicle_id: number | null
        }
        Insert: {
          agency_id?: number | null
          closed_at?: string | null
          created_at?: string
          description?: string | null
          id?: number
          odometer_km?: number | null
          opened_at?: string
          reported_by?: string | null
          reported_by_staff?: number | null
          status?: string
          title: string
          total_cost?: number | null
          type?: string
          updated_at?: string
          validated_by?: string | null
          vehicle_id?: number | null
        }
        Update: {
          agency_id?: number | null
          closed_at?: string | null
          created_at?: string
          description?: string | null
          id?: number
          odometer_km?: number | null
          opened_at?: string
          reported_by?: string | null
          reported_by_staff?: number | null
          status?: string
          title?: string
          total_cost?: number | null
          type?: string
          updated_at?: string
          validated_by?: string | null
          vehicle_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_orders_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_orders_reported_by_staff_fkey"
            columns: ["reported_by_staff"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_orders_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_entries: {
        Row: {
          allowances: number
          base_salary: number
          bonuses: number
          created_at: string
          deductions: number
          id: number
          net_salary: number
          paid_at: string | null
          payment_method: string | null
          payroll_period_id: number | null
          staff_id: number | null
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          allowances?: number
          base_salary?: number
          bonuses?: number
          created_at?: string
          deductions?: number
          id?: number
          net_salary?: number
          paid_at?: string | null
          payment_method?: string | null
          payroll_period_id?: number | null
          staff_id?: number | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          allowances?: number
          base_salary?: number
          bonuses?: number
          created_at?: string
          deductions?: number
          id?: number
          net_salary?: number
          paid_at?: string | null
          payment_method?: string | null
          payroll_period_id?: number | null
          staff_id?: number | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_entries_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_entries_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_periods: {
        Row: {
          created_at: string
          end_date: string
          id: number
          label: string
          start_date: string
          status: Database["public"]["Enums"]["payroll_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: number
          label: string
          start_date: string
          status?: Database["public"]["Enums"]["payroll_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: number
          label?: string
          start_date?: string
          status?: Database["public"]["Enums"]["payroll_status"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          agency_id: number | null
          created_at: string
          email: string
          id: string
          name: string
          role: string
          updated_at: string
        }
        Insert: {
          agency_id?: number | null
          created_at?: string
          email: string
          id: string
          name: string
          role?: string
          updated_at?: string
        }
        Update: {
          agency_id?: number | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: number
          module: string
          role: string
          updated_at: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: number
          module: string
          role: string
          updated_at?: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: number
          module?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      routes: {
        Row: {
          arrival_agency_id: number | null
          base_price: number
          created_at: string
          departure_agency_id: number | null
          distance_km: number | null
          id: number
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          arrival_agency_id?: number | null
          base_price?: number
          created_at?: string
          departure_agency_id?: number | null
          distance_km?: number | null
          id?: number
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          arrival_agency_id?: number | null
          base_price?: number
          created_at?: string
          departure_agency_id?: number | null
          distance_km?: number | null
          id?: number
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_arrival_agency_id_fkey"
            columns: ["arrival_agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_departure_agency_id_fkey"
            columns: ["departure_agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_pricing: {
        Row: {
          base_price: number
          created_at: string
          description: string | null
          id: number
          is_active: boolean
          price_per_kg: number
          type: string
          updated_at: string
        }
        Insert: {
          base_price?: number
          created_at?: string
          description?: string | null
          id?: number
          is_active?: boolean
          price_per_kg?: number
          type: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          created_at?: string
          description?: string | null
          id?: number
          is_active?: boolean
          price_per_kg?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      shipment_route_pricing: {
        Row: {
          base_price: number
          created_at: string
          id: number
          is_active: boolean
          price_per_kg: number
          route_id: number | null
          shipment_type: string
          updated_at: string
        }
        Insert: {
          base_price?: number
          created_at?: string
          id?: number
          is_active?: boolean
          price_per_kg?: number
          route_id?: number | null
          shipment_type: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          created_at?: string
          id?: number
          is_active?: boolean
          price_per_kg?: number
          route_id?: number | null
          shipment_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_route_pricing_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          arrival_agency_id: number | null
          base_price: number | null
          created_at: string
          created_by: string | null
          delivered_at: string | null
          delivered_by: string | null
          departure_agency_id: number | null
          description: string | null
          id: number
          is_excess_baggage: boolean | null
          price_per_kg: number | null
          quantity: number | null
          receiver_name: string
          receiver_phone: string | null
          reference: string
          sender_name: string
          sender_phone: string | null
          status: Database["public"]["Enums"]["shipment_status"]
          ticket_id: number | null
          total_amount: number
          trip_id: number | null
          type: Database["public"]["Enums"]["shipment_type"]
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          arrival_agency_id?: number | null
          base_price?: number | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          delivered_by?: string | null
          departure_agency_id?: number | null
          description?: string | null
          id?: number
          is_excess_baggage?: boolean | null
          price_per_kg?: number | null
          quantity?: number | null
          receiver_name: string
          receiver_phone?: string | null
          reference: string
          sender_name: string
          sender_phone?: string | null
          status?: Database["public"]["Enums"]["shipment_status"]
          ticket_id?: number | null
          total_amount?: number
          trip_id?: number | null
          type: Database["public"]["Enums"]["shipment_type"]
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          arrival_agency_id?: number | null
          base_price?: number | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          delivered_by?: string | null
          departure_agency_id?: number | null
          description?: string | null
          id?: number
          is_excess_baggage?: boolean | null
          price_per_kg?: number | null
          quantity?: number | null
          receiver_name?: string
          receiver_phone?: string | null
          reference?: string
          sender_name?: string
          sender_phone?: string | null
          status?: Database["public"]["Enums"]["shipment_status"]
          ticket_id?: number | null
          total_amount?: number
          trip_id?: number | null
          type?: Database["public"]["Enums"]["shipment_type"]
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_arrival_agency_id_fkey"
            columns: ["arrival_agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_departure_agency_id_fkey"
            columns: ["departure_agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          agency_id: number | null
          base_salary: number | null
          created_at: string
          email: string | null
          first_name: string
          full_name: string | null
          hire_date: string | null
          id: number
          is_active: boolean
          job_title: string | null
          last_name: string
          phone: string | null
          staff_type: Database["public"]["Enums"]["staff_type"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agency_id?: number | null
          base_salary?: number | null
          created_at?: string
          email?: string | null
          first_name: string
          full_name?: string | null
          hire_date?: string | null
          id?: number
          is_active?: boolean
          job_title?: string | null
          last_name: string
          phone?: string | null
          staff_type?: Database["public"]["Enums"]["staff_type"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agency_id?: number | null
          base_salary?: number | null
          created_at?: string
          email?: string | null
          first_name?: string
          full_name?: string | null
          hire_date?: string | null
          id?: number
          is_active?: boolean
          job_title?: string | null
          last_name?: string
          phone?: string | null
          staff_type?: Database["public"]["Enums"]["staff_type"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_counters: {
        Row: {
          agency_id: number
          created_at: string
          id: number
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          agency_id: number
          created_at?: string
          id?: number
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          agency_id?: number
          created_at?: string
          id?: number
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_counters_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_scans: {
        Row: {
          id: number
          is_valid: boolean
          notes: string | null
          scanned_at: string
          scanned_by: string | null
          ticket_data: Json
          ticket_reference: string
        }
        Insert: {
          id?: number
          is_valid?: boolean
          notes?: string | null
          scanned_at?: string
          scanned_by?: string | null
          ticket_data: Json
          ticket_reference: string
        }
        Update: {
          id?: number
          is_valid?: boolean
          notes?: string | null
          scanned_at?: string
          scanned_by?: string | null
          ticket_data?: Json
          ticket_reference?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          agency_id: number | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          customer_name: string | null
          customer_phone: string | null
          id: number
          paid_at: string | null
          payment_method: string | null
          price: number
          reference: string | null
          refund_amount: number | null
          refund_reason: string | null
          seat_number: string | null
          seller_id: string | null
          session_id: number | null
          sold_at: string | null
          status: string
          ticket_number: string | null
          total_amount: number
          trip_id: number | null
          updated_at: string
        }
        Insert: {
          agency_id?: number | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: number
          paid_at?: string | null
          payment_method?: string | null
          price?: number
          reference?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
          seat_number?: string | null
          seller_id?: string | null
          session_id?: number | null
          sold_at?: string | null
          status?: string
          ticket_number?: string | null
          total_amount?: number
          trip_id?: number | null
          updated_at?: string
        }
        Update: {
          agency_id?: number | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: number
          paid_at?: string | null
          payment_method?: string | null
          price?: number
          reference?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
          seat_number?: string | null
          seller_id?: string | null
          session_id?: number | null
          sold_at?: string | null
          status?: string
          ticket_number?: string | null
          total_amount?: number
          trip_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "counter_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          arrival_datetime: string | null
          assistant_id: number | null
          capacity: number | null
          created_at: string
          departure_datetime: string
          driver_id: number | null
          id: number
          notes: string | null
          route_id: number | null
          status: string
          updated_at: string
          vehicle_id: number | null
        }
        Insert: {
          arrival_datetime?: string | null
          assistant_id?: number | null
          capacity?: number | null
          created_at?: string
          departure_datetime: string
          driver_id?: number | null
          id?: number
          notes?: string | null
          route_id?: number | null
          status?: string
          updated_at?: string
          vehicle_id?: number | null
        }
        Update: {
          arrival_datetime?: string | null
          assistant_id?: number | null
          capacity?: number | null
          created_at?: string
          departure_datetime?: string
          driver_id?: number | null
          id?: number
          notes?: string | null
          route_id?: number | null
          status?: string
          updated_at?: string
          vehicle_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
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
          role: Database["public"]["Enums"]["app_role"]
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
      vehicle_assignments: {
        Row: {
          agency_id: number | null
          created_at: string
          ended_at: string | null
          id: number
          note: string | null
          route_id: number | null
          started_at: string
          updated_at: string
          vehicle_id: number | null
        }
        Insert: {
          agency_id?: number | null
          created_at?: string
          ended_at?: string | null
          id?: number
          note?: string | null
          route_id?: number | null
          started_at?: string
          updated_at?: string
          vehicle_id?: number | null
        }
        Update: {
          agency_id?: number | null
          created_at?: string
          ended_at?: string | null
          id?: number
          note?: string | null
          route_id?: number | null
          started_at?: string
          updated_at?: string
          vehicle_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_assignments_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_assignments_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          acquisition_date: string | null
          agency_id: number | null
          brand: string | null
          created_at: string
          id: number
          model: string | null
          registration_number: string
          seats: number
          status: string
          type: string | null
          updated_at: string
        }
        Insert: {
          acquisition_date?: string | null
          agency_id?: number | null
          brand?: string | null
          created_at?: string
          id?: number
          model?: string | null
          registration_number: string
          seats?: number
          status?: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          acquisition_date?: string | null
          agency_id?: number | null
          brand?: string | null
          created_at?: string
          id?: number
          model?: string | null
          registration_number?: string
          seats?: number
          status?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: { Args: { user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "cashier"
        | "accountant"
        | "mechanic"
        | "driver"
        | "assistant"
      cash_closure_status: "open" | "closed" | "validated"
      maintenance_status: "open" | "in_progress" | "closed" | "cancelled"
      maintenance_type: "preventive" | "corrective" | "other"
      payment_method: "cash" | "mobile_money" | "card" | "other"
      payroll_status: "open" | "closed"
      shipment_status: "pending" | "in_transit" | "delivered" | "cancelled"
      shipment_type:
        | "excess_baggage"
        | "unaccompanied_baggage"
        | "parcel"
        | "express"
      staff_type:
        | "driver"
        | "assistant"
        | "cashier"
        | "admin"
        | "mechanic"
        | "other"
      ticket_status: "reserved" | "paid" | "cancelled" | "refunded" | "used"
      trip_status: "planned" | "boarding" | "departed" | "arrived" | "cancelled"
      vehicle_status: "active" | "maintenance" | "inactive"
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
      app_role: [
        "admin",
        "manager",
        "cashier",
        "accountant",
        "mechanic",
        "driver",
        "assistant",
      ],
      cash_closure_status: ["open", "closed", "validated"],
      maintenance_status: ["open", "in_progress", "closed", "cancelled"],
      maintenance_type: ["preventive", "corrective", "other"],
      payment_method: ["cash", "mobile_money", "card", "other"],
      payroll_status: ["open", "closed"],
      shipment_status: ["pending", "in_transit", "delivered", "cancelled"],
      shipment_type: [
        "excess_baggage",
        "unaccompanied_baggage",
        "parcel",
        "express",
      ],
      staff_type: [
        "driver",
        "assistant",
        "cashier",
        "admin",
        "mechanic",
        "other",
      ],
      ticket_status: ["reserved", "paid", "cancelled", "refunded", "used"],
      trip_status: ["planned", "boarding", "departed", "arrived", "cancelled"],
      vehicle_status: ["active", "maintenance", "inactive"],
    },
  },
} as const
