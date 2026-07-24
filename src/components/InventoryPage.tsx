import React, { useState } from 'react';
import { InventoryGel } from '../types';
import { Plus, Search, Sparkles, Tag, Camera, Check, Palette } from 'lucide-react';

interface InventoryPageProps {
  gels: InventoryGel[];
  onAddGel: (gel: Omit<InventoryGel, 'id' | 'tenant_id'>) => void;
}

export const InventoryPage: React.FC<InventoryPageProps> = ({ gels, onAddGel }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [brand, setBrand] = useState('');
  const [codeOrName, setCodeOrName] = useState('');
  const [colorHex, setColorHex] = useState('#e6c594');
  const [category, setCategory] = useState('color');

  const filteredGels = gels.filter((gel) => {
    const matchesSearch =
      gel.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gel.code_or_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || gel.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand.trim() || !codeOrName.trim()) return;

    onAddGel({
      brand: brand.trim(),
      code_or_name: codeOrName.trim(),
      color_hex: colorHex,
      category,
    });

    setBrand('');
    setCodeOrName('');
    setColorHex('#e6c594');
    setCategory('color');
    setIsModalOpen(false);
  };

  const CATEGORIES = [
    { id: 'all', label: 'Všetky' },
    { id: 'color', label: 'Farebné géle' },
    { id: 'base', label: 'Bázy & Podklady' },
    { id: 'top', label: 'Topy & Lesky' },
    { id: 'glitter', label: 'Trblietavé / Glitre' },
    { id: 'builder', label: 'Stavebné géle' },
  ];

  return (
    <div className="space-y-6 pb-24">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif-luxury font-bold text-[#f3f4f6]">
            Katalóg Gélov Salónu
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Inventár pre presné AI spárovanie pri fotení nechtov.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#e6c594] text-[#0f1115] font-semibold text-xs px-4 py-3 rounded-xl shadow-lg hover:bg-[#f2dcbe] transition-colors active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Pridať Gél</span>
        </button>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Hľadať značku alebo kód gélu (napr. Luxio #01)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#161920] border border-[#2a2e39] rounded-xl pl-10 pr-4 py-3 text-sm text-[#f3f4f6] placeholder-gray-500 focus:outline-none focus:border-[#e6c594]"
          />
        </div>

        {/* Horizontal Category Scroll */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`whitespace-nowrap text-xs font-medium px-3.5 py-2 rounded-lg transition-all ${
                selectedCategory === cat.id
                  ? 'bg-[#e6c594] text-[#0f1115] font-semibold shadow-md'
                  : 'bg-[#161920] border border-[#2a2e39] text-gray-400 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gel Grid list */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {filteredGels.map((gel) => (
          <div
            key={gel.id}
            className="bg-[#161920] border border-[#2a2e39] rounded-2xl p-4 space-y-3 relative overflow-hidden group hover:border-[#e6c594]/50 transition-all"
          >
            {/* Color Swatch Badge */}
            <div className="flex items-center justify-between">
              <div
                className="w-8 h-8 rounded-full border border-[#2a2e39] shadow-inner flex items-center justify-center"
                style={{ backgroundColor: gel.color_hex }}
              >
                <div className="w-2 h-2 rounded-full bg-white/20"></div>
              </div>
              <span className="text-[10px] uppercase tracking-wider font-mono text-gray-400 bg-[#0f1115] px-2 py-0.5 rounded-md border border-[#2a2e39]">
                {gel.category}
              </span>
            </div>

            {/* Gel Info */}
            <div>
              <p className="text-xs text-[#e6c594] font-semibold uppercase tracking-wider">
                {gel.brand}
              </p>
              <h3 className="text-sm font-medium text-[#f3f4f6] truncate mt-0.5">
                {gel.code_or_name}
              </h3>
            </div>

            <div className="pt-2 border-t border-[#2a2e39]/50 flex items-center justify-between text-[11px] text-gray-500">
              <span className="font-mono">{gel.color_hex}</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> V katalógu
              </span>
            </div>
          </div>
        ))}

        {filteredGels.length === 0 && (
          <div className="col-span-full py-12 text-center bg-[#161920] border border-dashed border-[#2a2e39] rounded-2xl p-6">
            <Palette className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-300 font-medium">Nenašli sa žiadne géle</p>
            <p className="text-xs text-gray-500 mt-1">
              Pridajte nový gél do inventáru salónu tlačidlom hore.
            </p>
          </div>
        )}
      </div>

      {/* Modal: Pridať Nový Gél */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#161920] border border-[#2a2e39] w-full max-w-md rounded-2xl p-6 space-y-5 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-[#2a2e39] pb-4">
              <h3 className="text-lg font-serif-luxury font-bold text-[#f3f4f6]">
                Pridať Gél do Katalógu
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 font-medium mb-1">
                  Značka (Brand) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="napr. Luxio, Semilac, Kodi"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full bg-[#0f1115] border border-[#2a2e39] rounded-xl px-3.5 py-2.5 text-sm text-[#f3f4f6] focus:border-[#e6c594] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-medium mb-1">
                  Kód alebo Názov Odtieňa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="napr. Blush #01 alebo Nightfall Red"
                  value={codeOrName}
                  onChange={(e) => setCodeOrName(e.target.value)}
                  className="w-full bg-[#0f1115] border border-[#2a2e39] rounded-xl px-3.5 py-2.5 text-sm text-[#f3f4f6] focus:border-[#e6c594] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 font-medium mb-1">
                    Kategória
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#0f1115] border border-[#2a2e39] rounded-xl px-3.5 py-2.5 text-sm text-[#f3f4f6] focus:border-[#e6c594] focus:outline-none"
                  >
                    <option value="color">Farebný gél</option>
                    <option value="base">Báza</option>
                    <option value="top">Top Coat</option>
                    <option value="glitter">Trblietavý / Glitrový</option>
                    <option value="builder">Stavebný gél</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 font-medium mb-1">
                    Farba (Hex Odtieň)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="w-full bg-[#0f1115] border border-[#2a2e39] rounded-xl px-2 py-2 text-xs font-mono text-[#f3f4f6]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 bg-[#0f1115] border border-[#2a2e39] text-gray-400 font-medium text-xs py-3 rounded-xl hover:text-white"
                >
                  Zrušiť
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-[#e6c594] text-[#0f1115] font-semibold text-xs py-3 rounded-xl hover:bg-[#f2dcbe] shadow-lg"
                >
                  Uložiť do Inventáru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
