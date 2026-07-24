export interface Tenant {
  id: string;
  name: string;
  email: string;
  stripe_customer_id?: string;
  subscription_status: string;
  created_at: string;
}

export interface InventoryGel {
  id: string;
  tenant_id: string;
  brand: string;
  code_or_name: string;
  color_hex: string;
  category: 'color' | 'base' | 'top' | 'builder' | 'glitter' | 'effect' | string;
  photo_key?: string;
  created_at?: string;
}

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  phone?: string;
  notes?: string;
  created_at: string;
}

export interface Visit {
  id: string;
  tenant_id: string;
  customer_id: string;
  visit_date: string;
  photo_key: string;
  photo_url?: string;
  style_tags: string[];
  notes?: string;
  matched_gels?: InventoryGel[];
}

export interface DesignConcept {
  title: string;
  description: string;
}

export interface AIDesignSuggestion {
  history_used: number;
  concepts: DesignConcept[];
  image_generation_prompt: string;
}
