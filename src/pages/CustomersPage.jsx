import React, { useState, useEffect } from 'react';
import { Search, Plus, User, Phone, Calendar, ChevronRight, FileText, Sparkles, X, Check, RefreshCw } from 'lucide-react';

export default function CustomersPage({ onSelectCustomer }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State with 52px touch inputs
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch customers from D1 API
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customers', {
        headers: { 'x-tenant-id': 'tenant_demo' },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setCustomers(json.data);
        }
      }
    } catch (err) {
      console.error('Chyba pri načítaní zákazníčok:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    const newCustData = {
      name: name.trim(),
      phone: phone.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'tenant_demo',
        },
        body: JSON.stringify(newCustData),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setCustomers((prev) => [json.data, ...prev]);
        }
      } else {
        const fallbackCust = {
          id: 'cust_' + Date.now(),
          tenant_id: 'tenant_demo',
          ...newCustData,
          created_at: new Date().toISOString(),
        };
        setCustomers((prev) => [fallbackCust, ...prev]);
      }
    } catch (err) {
      const fallbackCust = {
        id: 'cust_' + Date.now(),
        tenant_id: 'tenant_demo',
        ...newCustData,
        created_at: new Date().toISOString(),
      };
      setCustomers((prev) => [fallbackCust, ...prev]);
    } finally {
      setSubmitting(false);
      setName('');
      setPhone('');
      setNotes('');
      setIsModalOpen(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      (c.phone && c.phone.toLowerCase().includes(term)) ||
      (c.notes && c.notes.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 pb-28">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2a2e39] pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif-luxury font-bold text-[#f3f4f6]">
            Zákazníčky Salónu
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Databáza klientiek, história ošetrení nechtov a špeciálne požiadavky.
          </p>
        </div>

        {/* Large touch-friendly button (min 52px) */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="h-[52px] min-h-[52px] px-6 bg-[#e6c594] text-[#0f1115] font-semibold text-sm rounded-2xl shadow-xl hover:bg-[#f2dcbe] active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>Vytvoriť Kartu Klientky</span>
        </button>
      </div>

      {/* Prominent Search Bar (min 52px height) */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Vyhľadať klientku podľa mena alebo telefónu (napr. Horváthová)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-[52px] min-h-[52px] bg-[#161920] border border-[#2a2e39] rounded-2xl pl-12 pr-4 text-sm text-[#f3f4f6] placeholder-gray-500 focus:outline-none focus:border-[#e6c594] transition-colors"
        />
      </div>

      {/* Customer List */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#e6c594] animate-spin mx-auto" />
          <p className="text-xs text-gray-400">Načítavam zoznam klientiek...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map((cust) => (
            <div
              key={cust.id}
              onClick={() => onSelectCustomer && onSelectCustomer(cust.id)}
              className="bg-[#161920] border border-[#2a2e39] hover:border-[#e6c594]/60 rounded-2xl p-4 sm:p-5 transition-all cursor-pointer shadow-lg space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#2a2e39] to-[#161920] border border-[#e6c594]/30 text-[#e6c594] font-bold text-base flex items-center justify-center shadow-md">
                    {cust.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#f3f4f6] group-hover:text-[#e6c594] transition-colors">
                      {cust.name}
                    </h3>
                    {cust.phone ? (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-[#e6c594]" />
                        <span>{cust.phone}</span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-gray-500">Bez telefónneho čísla</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#e6c594]">
                  <span className="hidden sm:inline font-medium">Otvoriť kartu</span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {cust.notes && (
                <div className="bg-[#0f1115] border border-[#2a2e39] rounded-xl p-3 text-xs text-gray-300 flex items-start gap-2">
                  <FileText className="w-4 h-4 text-[#e6c594] flex-shrink-0 mt-0.5" />
                  <p className="line-clamp-2 leading-relaxed">{cust.notes}</p>
                </div>
              )}
            </div>
          ))}

          {filteredCustomers.length === 0 && (
            <div className="py-12 text-center bg-[#161920] border border-dashed border-[#2a2e39] rounded-2xl p-6 space-y-2">
              <User className="w-10 h-10 text-gray-600 mx-auto" />
              <p className="text-sm font-semibold text-gray-300">Žiadne zhodné klientky</p>
              <p className="text-xs text-gray-500">
                Skontrolujte hľadaný výraz alebo vytvorte novú kartu klientky.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal: Vytvoriť Kartu Nové Klientky (min 52px inputs) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-[#161920] border border-[#2a2e39] w-full max-w-lg rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative my-8">
            <div className="flex justify-between items-center border-b border-[#2a2e39] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#e6c594]/10 border border-[#e6c594]/30 text-[#e6c594]">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-serif-luxury font-bold text-[#f3f4f6]">
                    Vytvoriť Kartu Klientky
                  </h3>
                  <p className="text-xs text-gray-400">
                    Osobný profil pre zaznamenávanie histórie manikúry.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white p-2 rounded-xl"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1.5 uppercase tracking-wider">
                  Meno a Prievisko Klientky *
                </label>
                <input
                  type="text"
                  required
                  placeholder="napr. Mária Horváthová"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-[52px] min-h-[52px] bg-[#0f1115] border border-[#2a2e39] rounded-xl px-4 text-sm text-[#f3f4f6] focus:border-[#e6c594] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1.5 uppercase tracking-wider">
                  Telefónne Číslo
                </label>
                <input
                  type="tel"
                  placeholder="napr. +421 905 123 456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-[52px] min-h-[52px] bg-[#0f1115] border border-[#2a2e39] rounded-xl px-4 text-sm text-[#f3f4f6] focus:border-[#e6c594] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1.5 uppercase tracking-wider">
                  Poznámky & Špeciálne Požiadavky (Alergie, preferovaný tvar nechtov)
                </label>
                <textarea
                  rows={3}
                  placeholder="napr. Citlivé kutilky, obľubuje mandľový tvar a nude odtiene..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#0f1115] border border-[#2a2e39] rounded-xl p-4 text-sm text-[#f3f4f6] focus:border-[#e6c594] focus:outline-none"
                ></textarea>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 h-[52px] min-h-[52px] bg-[#0f1115] border border-[#2a2e39] text-gray-400 font-semibold text-xs rounded-xl hover:text-white"
                >
                  Zrušiť
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 h-[52px] min-h-[52px] bg-[#e6c594] text-[#0f1115] font-bold text-xs rounded-xl hover:bg-[#f2dcbe] shadow-lg flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{submitting ? 'Ukladám...' : 'Uložiť Kartu'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
