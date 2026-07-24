import { Customer, InventoryGel, Visit } from './types';

export const INITIAL_GELS: InventoryGel[] = [
  {
    id: 'gel_01',
    tenant_id: 'tenant_demo',
    brand: 'Luxio',
    code_or_name: 'Blush #01',
    color_hex: '#e8beac',
    category: 'color',
    created_at: new Date().toISOString(),
  },
  {
    id: 'gel_02',
    tenant_id: 'tenant_demo',
    brand: 'Luxio',
    code_or_name: 'Nightfall Red',
    color_hex: '#8a1c22',
    category: 'color',
    created_at: new Date().toISOString(),
  },
  {
    id: 'gel_03',
    tenant_id: 'tenant_demo',
    brand: 'Kodi Professional',
    code_or_name: 'Rubber Base Gel',
    color_hex: '#dfc2a6',
    category: 'base',
    created_at: new Date().toISOString(),
  },
  {
    id: 'gel_04',
    tenant_id: 'tenant_demo',
    brand: 'Semilac',
    code_or_name: 'French Nude 002',
    color_hex: '#f5e2d5',
    category: 'color',
    created_at: new Date().toISOString(),
  },
  {
    id: 'gel_05',
    tenant_id: 'tenant_demo',
    brand: 'Victoria Vynn',
    code_or_name: 'Glitter Rose Gold #42',
    color_hex: '#e6c594',
    category: 'glitter',
    created_at: new Date().toISOString(),
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust_01',
    tenant_id: 'tenant_demo',
    name: 'Mária Horváthová',
    phone: '+421 905 123 456',
    notes: 'Citlivé nechtové lôžka. Obľubuje mandľový tvar a nude odtiene s jemnými trblietkami.',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'cust_02',
    tenant_id: 'tenant_demo',
    name: 'Lucia Kováčová',
    phone: '+421 911 888 999',
    notes: 'Rýchly rast kutiliek, preferuje spevnenie stavaným gélom a francúzsku manikúru.',
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: 'cust_03',
    tenant_id: 'tenant_demo',
    name: 'Elena Molnárová',
    phone: '+421 903 555 111',
    notes: 'Výrazné farby, tmavé červené a vínové tóny na kratšie hranaté nechty.',
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  }
];

export const INITIAL_VISITS: Visit[] = [
  {
    id: 'visit_101',
    tenant_id: 'tenant_demo',
    customer_id: 'cust_01',
    visit_date: new Date(Date.now() - 25 * 86400000).toISOString(),
    photo_key: 'visits/cust_01_1.jpg',
    photo_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=600&q=80',
    style_tags: ['nude', 'almond', 'glitter', 'natural'],
    notes: 'Aplikovaný gél Luxio Blush #01 so štipkou trblietok Rose Gold na prstenníku. Perfektné hojenie.',
    matched_gels: [INITIAL_GELS[0], INITIAL_GELS[4]]
  },
  {
    id: 'visit_102',
    tenant_id: 'tenant_demo',
    customer_id: 'cust_01',
    visit_date: new Date().toISOString(),
    photo_key: 'visits/cust_01_2.jpg',
    photo_url: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=600&q=80',
    style_tags: ['french', 'almond', 'nude', 'elegant'],
    notes: 'Jemná moderna francúzska manikúra na podklade Semilac French Nude.',
    matched_gels: [INITIAL_GELS[3]]
  },
  {
    id: 'visit_201',
    tenant_id: 'tenant_demo',
    customer_id: 'cust_03',
    visit_date: new Date(Date.now() - 10 * 86400000).toISOString(),
    photo_key: 'visits/cust_03_1.jpg',
    photo_url: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=600&q=80',
    style_tags: ['red', 'square', 'classic', 'glossy'],
    notes: 'Klasická tmavočervená manikúra Luxio Nightfall Red.',
    matched_gels: [INITIAL_GELS[1]]
  }
];
