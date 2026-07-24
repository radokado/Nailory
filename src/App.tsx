import React, { useState, useEffect } from 'react';
import { Customer, InventoryGel, Visit } from './types';
import { INITIAL_CUSTOMERS, INITIAL_GELS, INITIAL_VISITS } from './mockData';
import { ClientHistoryPage } from './components/ClientHistoryPage';
import { InventoryPage } from './components/InventoryPage';
import { AddVisitModal } from './components/AddVisitModal';
import {
  Users,
  Camera,
  Palette,
  Sparkles,
  Wifi,
  Database,
  Plus,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'customers' | 'inventory'>('customers');
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);

  // Persistence with localStorage
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('nailory_customers');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [gels, setGels] = useState<InventoryGel[]>(() => {
    const saved = localStorage.getItem('nailory_gels');
    return saved ? JSON.parse(saved) : INITIAL_GELS;
  });

  const [visits, setVisits] = useState<Visit[]>(() => {
    const saved = localStorage.getItem('nailory_visits');
    return saved ? JSON.parse(saved) : INITIAL_VISITS;
  });

  useEffect(() => {
    localStorage.setItem('nailory_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('nailory_gels', JSON.stringify(gels));
  }, [gels]);

  useEffect(() => {
    localStorage.setItem('nailory_visits', JSON.stringify(visits));
  }, [visits]);

  // Load initial remote D1 data if backend is active
  useEffect(() => {
    async function loadDataFromApi() {
      try {
        const [custRes, gelRes] = await Promise.all([
          fetch('/api/customers', { headers: { 'x-tenant-id': 'tenant_demo' } }),
          fetch('/api/inventory', { headers: { 'x-tenant-id': 'tenant_demo' } }),
        ]);

        if (custRes.ok) {
          const custData = await custRes.json();
          if (custData.success && custData.data?.length > 0) {
            setCustomers(custData.data);
          }
        }

        if (gelRes.ok) {
          const gelData = await gelRes.json();
          if (gelData.success && gelData.data?.length > 0) {
            setGels(gelData.data);
          }
        }
      } catch (e) {
        // Fallback na lokálne dáta
      }
    }

    loadDataFromApi();
  }, []);

  const handleAddCustomer = (
    newCust: Omit<Customer, 'id' | 'tenant_id' | 'created_at'>
  ) => {
    const created: Customer = {
      id: 'cust_' + Date.now(),
      tenant_id: 'tenant_demo',
      name: newCust.name,
      phone: newCust.phone,
      notes: newCust.notes,
      created_at: new Date().toISOString(),
    };
    setCustomers((prev) => [created, ...prev]);

    // Send to backend API
    fetch('/api/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'tenant_demo',
      },
      body: JSON.stringify(newCust),
    }).catch(() => {});
  };

  const handleAddGel = (newGel: Omit<InventoryGel, 'id' | 'tenant_id'>) => {
    const created: InventoryGel = {
      id: 'gel_' + Date.now(),
      tenant_id: 'tenant_demo',
      ...newGel,
    };
    setGels((prev) => [created, ...prev]);

    // Send to backend API
    fetch('/api/inventory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'tenant_demo',
      },
      body: JSON.stringify(newGel),
    }).catch(() => {});
  };

  const handleSaveVisit = (newVisit: Visit) => {
    setVisits((prev) => [newVisit, ...prev]);
  };

  const [presetCustomerIdForVisit, setPresetCustomerIdForVisit] = useState<string | null>(null);

  const handleTriggerVisitForCustomer = (customerId: string) => {
    setPresetCustomerIdForVisit(customerId);
    setIsVisitModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-[#f3f4f6] font-sans antialiased flex flex-col selection:bg-[#e6c594]/30 selection:text-[#e6c594]">
      {/* Subtle Luxury Gradient Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-72 bg-[#e6c594]/5 rounded-full blur-3xl"></div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-2xl mx-auto flex-1 flex flex-col px-4 pt-4">
        {/* Top Header */}
        <header className="flex items-center justify-between py-4 border-b border-[#2a2e39] mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2a2e39] to-[#161920] border border-[#e6c594]/40 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-[#e6c594]" />
            </div>
            <div>
              <h1 className="text-xl font-serif-luxury font-bold text-[#f3f4f6] tracking-wide">
                Nailory
              </h1>
              <p className="text-[10px] text-[#e6c594] font-semibold tracking-widest uppercase">
                Luxusný Salónny Asistent
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[10px] text-gray-400 bg-[#161920] border border-[#2a2e39] px-2.5 py-1 rounded-full font-mono">
              <Database className="w-3 h-3 text-[#e6c594]" />
              <span>D1 + R2 + AI</span>
            </span>
          </div>
        </header>

        {/* Dynamic View Content */}
        <main className="flex-1">
          {activeTab === 'customers' && (
            <ClientHistoryPage
              customers={customers}
              visits={visits}
              onSelectCustomerToAddVisit={handleTriggerVisitForCustomer}
              onAddCustomer={handleAddCustomer}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryPage gels={gels} onAddGel={handleAddGel} />
          )}
        </main>
      </div>

      {/* Add Visit Modal */}
      <AddVisitModal
        customers={customers}
        gels={gels}
        isOpen={isVisitModalOpen}
        onClose={() => {
          setIsVisitModalOpen(false);
          setPresetCustomerIdForVisit(null);
        }}
        onSaveVisit={handleSaveVisit}
      />

      {/* Mobile-First PWA Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#161920]/95 backdrop-blur-lg border-t border-[#2a2e39] safe-area-bottom shadow-2xl">
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-around">
          {/* Tab 1: Zákazníčky */}
          <button
            onClick={() => setActiveTab('customers')}
            className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all ${
              activeTab === 'customers'
                ? 'text-[#e6c594] font-semibold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[11px]">Zákazníčky</span>
          </button>

          {/* Action Button: Nová Návšteva (Central Elevated Camera Button) */}
          <button
            onClick={() => setIsVisitModalOpen(true)}
            className="flex flex-col items-center gap-1 -mt-5"
          >
            <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#cba36b] to-[#e6c594] text-[#0f1115] flex items-center justify-center shadow-2xl border-4 border-[#0f1115] active:scale-90 transition-transform">
              <Camera className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="text-[10px] font-bold text-[#e6c594]">
              Nová Návšteva
            </span>
          </button>

          {/* Tab 2: Inventár */}
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all ${
              activeTab === 'inventory'
                ? 'text-[#e6c594] font-semibold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Palette className="w-5 h-5" />
            <span className="text-[11px]">Katalóg Gélov</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
