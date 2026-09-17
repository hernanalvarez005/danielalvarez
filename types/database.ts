export type MemberRole = "admin" | "engineer" | "applicator";

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: MemberRole;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role: MemberRole;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: MemberRole;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          legal_name: string | null;
          tax_id: string | null;
          phone: string | null;
          email: string | null;
          notes: string | null;
          active: boolean;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          legal_name?: string | null;
          tax_id?: string | null;
          phone?: string | null;
          email?: string | null;
          notes?: string | null;
          active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          legal_name?: string | null;
          tax_id?: string | null;
          phone?: string | null;
          email?: string | null;
          notes?: string | null;
          active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      fields: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          name: string;
          locality: string | null;
          province: string | null;
          notes: string | null;
          active: boolean;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          name: string;
          locality?: string | null;
          province?: string | null;
          notes?: string | null;
          active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          customer_id?: string;
          name?: string;
          locality?: string | null;
          province?: string | null;
          notes?: string | null;
          active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fields_customer_id_organization_id_fkey";
            columns: ["customer_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
      plots: {
        Row: {
          id: string;
          organization_id: string;
          field_id: string;
          name: string;
          area_ha: number | null;
          notes: string | null;
          active: boolean;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          field_id: string;
          name: string;
          area_ha?: number | null;
          notes?: string | null;
          active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          field_id?: string;
          name?: string;
          area_ha?: number | null;
          notes?: string | null;
          active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plots_field_id_organization_id_fkey";
            columns: ["field_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "fields";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
      campaigns: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          start_date: string | null;
          end_date: string | null;
          active: boolean;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          start_date?: string | null;
          end_date?: string | null;
          active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          start_date?: string | null;
          end_date?: string | null;
          active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      crops: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          active: boolean;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crops_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          default_unit: string;
          notes: string | null;
          active: boolean;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          default_unit: string;
          notes?: string | null;
          active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          default_unit?: string;
          notes?: string | null;
          active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      applicators: {
        Row: {
          id: string;
          organization_id: string;
          profile_id: string | null;
          name: string;
          phone: string | null;
          active: boolean;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          profile_id?: string | null;
          name: string;
          phone?: string | null;
          active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          profile_id?: string | null;
          name?: string;
          phone?: string | null;
          active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "applicators_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applicators_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      work_orders: {
        Row: {
          id: string;
          organization_id: string;
          order_number: number;
          operation_type: string;
          customer_id: string;
          field_id: string;
          plot_id: string;
          campaign_id: string | null;
          crop_id: string | null;
          applicator_id: string | null;
          scheduled_date: string | null;
          planned_area_ha: number;
          status: string;
          notes: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          order_number?: number;
          operation_type?: string;
          customer_id: string;
          field_id: string;
          plot_id: string;
          campaign_id?: string | null;
          crop_id?: string | null;
          applicator_id?: string | null;
          scheduled_date?: string | null;
          planned_area_ha: number;
          status?: string;
          notes?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          order_number?: number;
          operation_type?: string;
          customer_id?: string;
          field_id?: string;
          plot_id?: string;
          campaign_id?: string | null;
          crop_id?: string | null;
          applicator_id?: string | null;
          scheduled_date?: string | null;
          planned_area_ha?: number;
          status?: string;
          notes?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "work_orders_customer_id_organization_id_fkey";
            columns: ["customer_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "work_orders_field_id_customer_id_fkey";
            columns: ["field_id", "customer_id"];
            isOneToOne: false;
            referencedRelation: "fields";
            referencedColumns: ["id", "customer_id"];
          },
          {
            foreignKeyName: "work_orders_plot_id_field_id_fkey";
            columns: ["plot_id", "field_id"];
            isOneToOne: false;
            referencedRelation: "plots";
            referencedColumns: ["id", "field_id"];
          },
        ];
      };
      spray_orders: {
        Row: {
          work_order_id: string;
          application_method: string;
          target_spray_volume_per_ha: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          work_order_id: string;
          application_method: string;
          target_spray_volume_per_ha?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          work_order_id?: string;
          application_method?: string;
          target_spray_volume_per_ha?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "spray_orders_work_order_id_fkey";
            columns: ["work_order_id"];
            isOneToOne: true;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      spray_order_products: {
        Row: {
          id: string;
          organization_id: string;
          work_order_id: string;
          product_id: string;
          dose_value: number;
          dose_unit: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          work_order_id: string;
          product_id: string;
          dose_value: number;
          dose_unit: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          work_order_id?: string;
          product_id?: string;
          dose_value?: number;
          dose_unit?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "spray_order_products_work_order_id_organization_id_fkey";
            columns: ["work_order_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "work_orders";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "spray_order_products_product_id_organization_id_fkey";
            columns: ["product_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
      spray_executions: {
        Row: {
          work_order_id: string;
          organization_id: string;
          started_at: string | null;
          started_by: string | null;
          finished_at: string | null;
          finished_by: string | null;
          actual_area_ha: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          work_order_id: string;
          organization_id: string;
          started_at?: string | null;
          started_by?: string | null;
          finished_at?: string | null;
          finished_by?: string | null;
          actual_area_ha?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          work_order_id?: string;
          organization_id?: string;
          started_at?: string | null;
          started_by?: string | null;
          finished_at?: string | null;
          finished_by?: string | null;
          actual_area_ha?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "spray_executions_work_order_id_fkey";
            columns: ["work_order_id"];
            isOneToOne: true;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      spray_loads: {
        Row: {
          id: string;
          organization_id: string;
          work_order_id: string;
          load_number: number;
          water_liters: number;
          notes: string | null;
          client_request_id: string;
          recorded_at: string;
          recorded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          work_order_id: string;
          load_number?: number;
          water_liters: number;
          notes?: string | null;
          client_request_id: string;
          recorded_at?: string;
          recorded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          work_order_id?: string;
          load_number?: number;
          water_liters?: number;
          notes?: string | null;
          client_request_id?: string;
          recorded_at?: string;
          recorded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "spray_loads_work_order_id_organization_id_fkey";
            columns: ["work_order_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "work_orders";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
      spray_load_products: {
        Row: {
          id: string;
          organization_id: string;
          spray_load_id: string;
          product_id: string;
          quantity_value: number;
          quantity_unit: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          spray_load_id: string;
          product_id: string;
          quantity_value: number;
          quantity_unit: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          spray_load_id?: string;
          product_id?: string;
          quantity_value?: number;
          quantity_unit?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "spray_load_products_spray_load_id_organization_id_fkey";
            columns: ["spray_load_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "spray_loads";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "spray_load_products_product_id_organization_id_fkey";
            columns: ["product_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_spray_work_order: {
        Args: {
          p_customer_id: string;
          p_field_id: string;
          p_plot_id: string;
          p_campaign_id: string | null;
          p_crop_id: string | null;
          p_applicator_id: string | null;
          p_scheduled_date: string | null;
          p_planned_area_ha: number;
          p_notes: string | null;
          p_status: string;
          p_application_method: string;
          p_target_spray_volume_per_ha: number | null;
          p_products: SprayOrderProductInput[];
        };
        Returns: string;
      };
      update_spray_work_order: {
        Args: {
          p_work_order_id: string;
          p_customer_id: string;
          p_field_id: string;
          p_plot_id: string;
          p_campaign_id: string | null;
          p_crop_id: string | null;
          p_applicator_id: string | null;
          p_scheduled_date: string | null;
          p_planned_area_ha: number;
          p_notes: string | null;
          p_status: string;
          p_application_method: string;
          p_target_spray_volume_per_ha: number | null;
          p_products: SprayOrderProductInput[];
        };
        Returns: string;
      };
      start_spray_application: {
        Args: {
          p_work_order_id: string;
        };
        Returns: string;
      };
      finish_spray_application: {
        Args: {
          p_work_order_id: string;
          p_actual_area_ha: number;
          p_notes: string | null;
        };
        Returns: string;
      };
      register_spray_load: {
        Args: {
          p_work_order_id: string;
          p_client_request_id: string;
          p_water_liters: number;
          p_notes: string | null;
          p_products: SprayLoadProductInput[];
        };
        Returns: string;
      };
      update_spray_load: {
        Args: {
          p_spray_load_id: string;
          p_water_liters: number;
          p_notes: string | null;
          p_products: SprayLoadProductInput[];
        };
        Returns: string;
      };
    };
    Enums: {
      member_role: MemberRole;
    };
    CompositeTypes: Record<string, never>;
  };
}

export interface SprayOrderProductInput {
  product_id: string;
  dose_value: number;
  dose_unit: string;
  sort_order: number;
}

export interface SprayLoadProductInput {
  product_id: string;
  quantity_value: number;
  quantity_unit: string;
}
