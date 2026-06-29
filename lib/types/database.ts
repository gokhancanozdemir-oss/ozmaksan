export type Unit = "kg" | "m" | "adet";
export type UserRole = "admin" | "okutucu";
export type ProductType = "standard" | "sac";
export type ProjectItemStatus = "not_started" | "active" | "completed";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
};

export type Project = {
  id: string;
  name: string;
  customer: string | null;
  description: string | null;
  is_active?: boolean;
  order_number: string | null;
  order_year: number | null;
  status?: ProjectItemStatus;
  items?: ProjectItem[];
};

export type ProjectItem = {
  id: string;
  project_id: string;
  sort_order: number;
  spec: string | null;
  product_name: string;
  quantity: number | null;
  status: ProjectItemStatus;
  order_delivery: string | null;
  factory_delivery: string | null;
  notes: string | null;
  destination: string | null;
};

export type Product = {
  id: string;
  qr_code: string;
  name: string;
  product_type: ProductType;
  unit_cost: number;
  default_unit: Unit;
  stock_quantity: number;
  sac_en_mm: number | null;
  sac_boy_mm: number | null;
  sac_derinlik_mm: number | null;
  sac_adet: number | null;
  min_stock_threshold: number | null;
  is_active?: boolean;
};

export type ConsumptionRecord = {
  id: string;
  product_id: string;
  project_id: string;
  project_item_id: string | null;
  user_id: string | null;
  quantity: number;
  unit: Unit;
  unit_cost: number;
  total_cost: number;
  created_at: string;
  sac_used_en_mm: number | null;
  sac_used_boy_mm: number | null;
  products?: { name: string; qr_code: string; product_type?: ProductType } | null;
  projects?: { name: string } | null;
  project_items?: {
    spec: string | null;
    product_name: string;
  } | null;
  profiles?: { email: string; full_name: string | null } | null;
};

export type ConsumptionResult = {
  id: string;
  total_cost: number;
  product_name: string;
  remaining_stock: number;
};

export type ConsumptionData = {
  qrCode: string;
  productId: string;
  productName: string;
  miktar: number;
  birim: Unit;
  projeId: string;
  projeAdi: string;
  projectItemId?: string;
  kalemLabel?: string;
  sacUsedEnMm?: number;
  sacUsedBoyMm?: number;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: UserRole;
          created_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          name: string;
          customer: string | null;
          description: string | null;
          is_active: boolean;
          order_number: string | null;
          order_year: number | null;
          status: ProjectItemStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          customer?: string | null;
          description?: string | null;
          is_active?: boolean;
          order_number?: string | null;
          order_year?: number | null;
          status?: ProjectItemStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          customer?: string | null;
          description?: string | null;
          is_active?: boolean;
          order_number?: string | null;
          order_year?: number | null;
          status?: ProjectItemStatus;
          created_at?: string;
        };
        Relationships: [];
      };
      project_items: {
        Row: ProjectItem & { created_at: string };
        Insert: {
          id?: string;
          project_id: string;
          sort_order?: number;
          spec?: string | null;
          product_name: string;
          quantity?: number | null;
          status?: ProjectItemStatus;
          order_delivery?: string | null;
          factory_delivery?: string | null;
          notes?: string | null;
          destination?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          sort_order?: number;
          spec?: string | null;
          product_name?: string;
          quantity?: number | null;
          status?: ProjectItemStatus;
          order_delivery?: string | null;
          factory_delivery?: string | null;
          notes?: string | null;
          destination?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          qr_code: string;
          name: string;
          product_type: ProductType;
          unit_cost: number;
          default_unit: Unit;
          stock_quantity: number;
          sac_en_mm: number | null;
          sac_boy_mm: number | null;
          sac_derinlik_mm: number | null;
          sac_adet: number | null;
          min_stock_threshold: number | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          qr_code: string;
          name: string;
          product_type?: ProductType;
          unit_cost?: number;
          default_unit: Unit;
          stock_quantity?: number;
          sac_en_mm?: number | null;
          sac_boy_mm?: number | null;
          sac_derinlik_mm?: number | null;
          sac_adet?: number | null;
          min_stock_threshold?: number | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          qr_code?: string;
          name?: string;
          product_type?: ProductType;
          unit_cost?: number;
          default_unit?: Unit;
          stock_quantity?: number;
          sac_en_mm?: number | null;
          sac_boy_mm?: number | null;
          sac_derinlik_mm?: number | null;
          sac_adet?: number | null;
          min_stock_threshold?: number | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      consumption_records: {
        Row: ConsumptionRecord;
        Insert: {
          id?: string;
          product_id: string;
          project_id: string;
          project_item_id?: string | null;
          user_id?: string | null;
          quantity: number;
          unit: Unit;
          unit_cost: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          project_id?: string;
          project_item_id?: string | null;
          user_id?: string | null;
          quantity?: number;
          unit?: Unit;
          unit_cost?: number;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      record_consumption: {
        Args: {
          p_qr_code: string;
          p_project_id: string;
          p_quantity: number;
          p_unit: string;
          p_sac_used_en_mm?: number | null;
          p_sac_used_boy_mm?: number | null;
          p_project_item_id?: string | null;
        };
        Returns: ConsumptionResult;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      add_stock_by_qr: {
        Args: {
          p_qr_code: string;
          p_quantity: number;
          p_unit: string;
          p_notes?: string | null;
        };
        Returns: {
          product_id: string;
          product_name: string;
          added: number;
          unit: string;
          new_stock: number;
        };
      };
      delete_consumption_record: {
        Args: {
          p_record_id: string;
        };
        Returns: {
          id: string;
          product_name: string;
          restored_quantity: number;
          unit: string;
          new_stock: number;
        };
      };
      delete_project: {
        Args: {
          p_project_id: string;
        };
        Returns: {
          project_id: string;
          deleted_consumption_count: number;
        };
      };
    };
    Enums: {
      user_role: UserRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
