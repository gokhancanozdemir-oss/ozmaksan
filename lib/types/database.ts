export type Unit = "kg" | "m" | "adet";
export type UserRole = "admin" | "okutucu";

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
};

export type Product = {
  id: string;
  qr_code: string;
  name: string;
  unit_cost: number;
  default_unit: Unit;
  stock_quantity: number;
};

export type ConsumptionRecord = {
  id: string;
  product_id: string;
  project_id: string;
  user_id: string | null;
  quantity: number;
  unit: Unit;
  unit_cost: number;
  total_cost: number;
  created_at: string;
  products?: { name: string; qr_code: string } | null;
  projects?: { name: string } | null;
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
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          customer?: string | null;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          customer?: string | null;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          qr_code: string;
          name: string;
          unit_cost: number;
          default_unit: Unit;
          stock_quantity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          qr_code: string;
          name: string;
          unit_cost?: number;
          default_unit: Unit;
          stock_quantity?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          qr_code?: string;
          name?: string;
          unit_cost?: number;
          default_unit?: Unit;
          stock_quantity?: number;
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
        };
        Returns: ConsumptionResult;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
