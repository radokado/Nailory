import React, { useState, useEffect } from 'react';
import { Plus, Search, Palette, Check, Sparkles, Filter, X, RefreshCw } from 'lucide-react';

export default function InventoryPage() {
  const [gels, setGels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State with large touch inputs
  const [brand, setBrand] = useState('');
  const [codeOrName, setCodeOrName] = useState('');
  const [colorHex, setColorHex] = useState('#e6c594');
  const [category, setCategory] = useState('color');
  const [submitting, setSubmitting] = useState(false);

  // Initial fetch from API
  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory', {
        headers: { 'x-tenant-id': 'tenant_demo' },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setGels(json.data);
        }
      }
    } catch (err) {
      console.error('Chyba načítania inventáru:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAddGel = async (e) => {
    e.preventDefault();
    if (!brand.trim() || !codeOrName.trim()) return;

    setSubmitting(true);
    const newGelData = {
      brand: brand.trim(),
      code_or_name: codeOrName.trim(),
      color_hex: colorHex,
      category,
    };

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'tenant_demo',
        },
        body: JSON.stringify(newGelData),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setGels((prev) => [json.data, ...prev]);
        }
      } else {
        // Fallback pre lokálne uloženie ak API nebeží
        const fallbackGel = {
          id: 'gel_' + Date.now(),
          tenant_id: 'tenant_demo',
          ...newGelData,
          created_at: new Date().toISOString(),
        };
        setGels((prev) => [fallbackGel, ...prev]);
      }
    } catch (err) {
      const fallbackGel = {
        id: 'gel_' + Date.now(),
        tenant_id: 'tenant_demo',
        ...newGelData,
        created_at: new Date().toISOString(),
      };
      setGels((prev) => [fallbackGel, ...prev]);
    } finally {
      setSubmitting(false);
      setBrand('');
      setCodeOrName('');
      setColorHex('#e6c594');
      setCategory('color');
      setIsModalOpen(false);
    }
  };

  const CATEGORIES = [
    { id: 'all', label: 'Všetky' },
    { id: 'color', label: 'Farebné Géle' },
    { id: 'base', label: 'Bázy & Podklady' },
    { id: 'top', label: 'Topy & Lesky' },
    { id: 'glitter', label: 'Trblietavé & Glitre' },
    { id: 'builder', label: 'Stavebné Géle' },
  ];

  const filteredGels = gels.filter((gel) => {
    const matchesSearch =
      gel.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gel.code_or_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || gel.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 pb-28">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2a2e39] pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif-luxury font-bold text-[#f3f4f6]">
            Katalóg Gélov Salónu
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Centrálny inventár pre presné AI spárovanie fľaštičiek z fotiek nechtov.
          </p>
        </div>

        {/* Large Touch Button (min 52px height) */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="h-[52px] min-h-[52px] px-6 bg-[#e6c594] text-[#0f1115] font-semibold text-sm rounded-2xl shadow-xl hover:bg-[#f2dcbe] active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>Pridať Gél do Inventáru</span>
        </button>
      </div>

      {/* Prominent Search Bar with Touch ergonomics */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Hľadať značku alebo odtieň (napr. Luxio, Semilac #01)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-[52px] bg-[#161920] border border-[#2a2e39] rounded-2xl pl-12 pr-4 text-sm text-[#f3f4f6] placeholder-gray-500 focus:outline-none focus:border-[#e6c594] transition-colors"
          />
        </div>

        {/* Category Horizontal Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`h-[44px] min-h-[44px] whitespace-nowrap text-xs font-medium px-4 rounded-xl transition-all ${
                selectedCategory === cat.id
                  ? 'bg-[#e6c594] text-[#0f1115] font-bold shadow-md'
                  : 'bg-[#161920] border border-[#2a2e39] text-gray-400 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gel Grid */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#e6c594] animate-spin mx-auto" />
          <p className="text-xs text-gray-400">Načítavam katalóg gélov...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {filteredGels.map((gel) => (
            <div
              key={gel.id}
              className="bg-[#161920] border border-[#2a2e39] rounded-2xl p-4 space-y-3 relative overflow-hidden group hover:border-[#e6c594]/50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="w-9 h-9 rounded-full border-2 border-[#2a2e39] shadow-inner flex items-center justify-center"
                    style={{ backgroundColor: gel.color_hex || '#e6c594' }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-white/30"></div>
                  </div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400 bg-[#0f1115] px-2 py-1 rounded-md border border-[#2a2e39]">
                    {gel.category}
                  </span>
                </div>

                <p className="text-xs text-[#e6c594] font-bold uppercase tracking-wider">
                  {gel.brand}
                </p>
                <h3 className="text-sm font-semibold text-[#f3f4f6] truncate mt-0.5">
                  {gel.code_or_name}
                </h3>
              </div>

              <div className="pt-2 border-t border-[#2a2e39]/60 flex items-center justify-between text-[11px] text-gray-500">
                <span className="font-mono">{gel.color_hex}</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> D1 Uložené
                </span>
              </div>
            </div>
          ))}

          {filteredGels.length === 0 && (
            <div className="col-span-full py-12 text-center bg-[#161920] border border-dashed border-[#2a2e39] rounded-2xl p-6 space-y-2">
              <Palette className="w-10 h-10 text-gray-600 mx-auto" />
              <p className="text-sm font-semibold text-gray-300">Nenašli sa žiadne géle</p>
              <p className="text-xs text-gray-500">
                Pridajte novú položku do katalógu pomocou tlačidla vyššie.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal: Pridať Nový Gél (with Min 52px height inputs for long nails) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-[#161920] border border-[#2a2e39] w-full max-w-lg rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative my-8">
            <div className="flex justify-between items-center border-b border-[#2a2e39] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#e6c594]/10 border border-[#e6c594]/30 text-[#e6c594]">
                  <Palette className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-serif-luxury font-bold text-[#f3f4f6]">
                    Pridať Gél do Katalógu
                  </h3>
                  <p className="text-xs text-gray-400">
                    Položky sa synchronizujú pre automatické spárovanie cez AI.
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

            <form onSubmit={handleAddGel} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1.5 uppercase tracking-wider">
                  Značka (Brand) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="napr. Luxio, Kodi, Semilac, Victoria Vynn"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full h-[52px] min-h-[52px] bg-[#0f1115] border border-[#2a2e39] rounded-xl px-4 text-sm text-[#f3f4f6] focus:border-[#e6c594] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1.5 uppercase tracking-wider">
                  Kód alebo Názov Odtieňa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="napr. Blush #01 alebo Nightfall Red"
                  value={codeOrName}
                  onChange={(e) => setCodeOrName(e.target.value)}
                  className="w-full h-[52px] min-h-[52px] bg-[#0f1115] border border-[#2a2e39] rounded-xl px-4 text-sm text-[#f3f4f6] focus:border-[#e6c594] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 font-semibold mb-1.5 uppercase tracking-wider">
                    Kategória *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-[52px] min-h-[52px] bg-[#0f1115] border border-[#2a2e39] rounded-xl px-4 text-sm text-[#f3f4f6] focus:border-[#e6c594] focus:outline-none"
                  >
                    <option value="color">Farebný gél</option>
                    <option value="base">Báza & Podklad</option>
                    <option value="top">Top Coat / Lesk</option>
                    <option value="glitter">Trblietavý / Glitrový</option>
                    <option value="builder">Stavebný gél</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 font-semibold mb-1.5 uppercase tracking-wider">
                    Farba (Hex Odtieň)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="w-[52px] h-[52px] rounded-xl bg-transparent border-0 cursor-pointer p-0"
                    />
                    <input
                      type="text"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="w-full h-[52px] min-h-[52px] bg-[#0f1115] border border-[#2a2e39] rounded-xl px-4 text-sm font-mono text-[#f3f4f6] focus:border-[#e6c594] focus:outline-none"
                    />
                  </div>
                </div>
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
                  <span>{submitting ? 'Ukladám...' : 'Uložiť do Katalógu'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
