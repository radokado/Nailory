import React, { useState } from 'react';
import { Customer, Visit, AIDesignSuggestion } from '../types';
import { BeforeAfterCompare } from './BeforeAfterCompare';
import {
  Search,
  Sparkles,
  User,
  Phone,
  Calendar,
  ChevronRight,
  Plus,
  Tag,
  Loader2,
  X,
  FileText,
  Palette,
  CheckCircle,
  Copy,
  Check,
} from 'lucide-react';

interface ClientHistoryPageProps {
  customers: Customer[];
  visits: Visit[];
  onSelectCustomerToAddVisit: (customerId: string) => void;
  onAddCustomer: (customer: Omit<Customer, 'id' | 'tenant_id' | 'created_at'>) => void;
}

export const ClientHistoryPage: React.FC<ClientHistoryPageProps> = ({
  customers,
  visits,
  onSelectCustomerToAddVisit,
  onAddCustomer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    customers[0]?.id || null
  );

  // New Client Modal
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientNotes, setNewClientNotes] = useState('');

  // AI Design Generator Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiResult, setAiResult] = useState<AIDesignSuggestion | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Zoznam všetkých štýlových tagov pre filtrovanie
  const ALL_STYLE_TAGS = [
    'all',
    'nude',
    'french',
    'red',
    'ombre',
    'glitter',
    'almond',
    'square',
    'coffin',
  ];

  // Filtrovaní klienti
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.phone && customer.phone.includes(searchTerm));

    // Kontrola či klientka má návštevy s vybraným tagom
    const customerVisits = visits.filter((v) => v.customer_id === customer.id);
    const matchesTag =
      selectedTag === 'all' ||
      customerVisits.some((v) => v.style_tags.includes(selectedTag));

    return matchesSearch && matchesTag;
  });

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const selectedCustomerVisits = visits
    .filter((v) => v.customer_id === selectedCustomerId)
    .sort(
      (a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()
    );

  const handleAddClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    onAddCustomer({
      name: newClientName.trim(),
      phone: newClientPhone.trim() || undefined,
      notes: newClientNotes.trim() || undefined,
    });

    setNewClientName('');
    setNewClientPhone('');
    setNewClientNotes('');
    setIsAddClientOpen(false);
  };

  const handleGenerateNextVisitDesign = async () => {
    if (!selectedCustomerId) return;

    setIsAiModalOpen(true);
    setIsGeneratingAi(true);
    setAiResult(null);

    try {
      // Skúsime volať reálne API /api/generate-design
      const response = await fetch(
        `/api/generate-design?customer_id=${selectedCustomerId}`,
        {
          headers: {
            'x-tenant-id': 'tenant_demo',
          },
        }
      );

      if (response.ok) {
        const resData = await response.json();
        if (resData.success && resData.data) {
          setAiResult(resData.data);
          setIsGeneratingAi(false);
          return;
        }
      }

      // Fallback simulácia v klientskom prostredí
      await new Promise((r) => setTimeout(r, 2000));
      setAiResult({
        history_used: selectedCustomerVisits.length,
        concepts: [
          {
            title: '1. Mliečna Elegancia s Rose Gold Fóliou',
            description:
              'Vychádza z preferencie nude odtieňov klientky. Navrhujeme mliečnobielu bázu so spevnením gélom, jemným Rose Gold akcentom na prstenníku a matným finišom.',
          },
          {
            title: '2. Moderný Francúzsky Micro-Ombre',
            description:
              'Spája jej obľúbenú francúzsku manikúru a mandľový tvar. Biela špička plynule prechádza do ružovkastého lôžka s perleťovým trblietavým prachom.',
          },
          {
            title: '3. Odvážnejší Nude so Zlatou Geometriou',
            description:
              'Jemný karamelový základ s precíznymi zlatými líniami a malým zirkónom pri nechtovom lôžku pre luxusný večerný efekt.',
          },
        ],
        image_generation_prompt:
          'A close-up high fashion luxury photograph of a woman’s hand with almond-shaped manicured nails. The design features a smooth milky nude gel base with delicate rose gold foil flakes at the cuticle line, soft studio lighting, silk fabric background, ultra-detailed 8k resolution.',
      });
    } catch (err) {
      console.error('AI Generation error:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif-luxury font-bold text-[#f3f4f6]">
            História Klientiek
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Prehľad návštev, stav nechtov a AI generátor nových dizajnov.
          </p>
        </div>
        <button
          onClick={() => setIsAddClientOpen(true)}
          className="flex items-center gap-2 bg-[#e6c594] text-[#0f1115] font-semibold text-xs px-4 py-3 rounded-xl shadow-lg hover:bg-[#f2dcbe] transition-colors active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Nová Klientka</span>
        </button>
      </div>

      {/* Search & Style Filter Bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Vyhľadať klientku podľa mena alebo telefónu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#161920] border border-[#2a2e39] rounded-xl pl-10 pr-4 py-3 text-sm text-[#f3f4f6] placeholder-gray-500 focus:outline-none focus:border-[#e6c594]"
          />
        </div>

        {/* Style tags horizontal filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {ALL_STYLE_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`whitespace-nowrap text-xs font-medium px-3.5 py-2 rounded-lg transition-all capitalize ${
                selectedTag === tag
                  ? 'bg-[#e6c594] text-[#0f1115] font-semibold shadow-md'
                  : 'bg-[#161920] border border-[#2a2e39] text-gray-400 hover:text-white'
              }`}
            >
              {tag === 'all' ? 'Všetky Štýly' : `#${tag}`}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Selector Cards - Horizontal Scroll or Grid */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400 font-medium">Zvoľte Klientku:</label>
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {filteredCustomers.map((c) => {
            const isSelected = c.id === selectedCustomerId;
            return (
              <div
                key={c.id}
                onClick={() => setSelectedCustomerId(c.id)}
                className={`min-w-[200px] p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#161920] border-[#e6c594] shadow-lg text-white'
                    : 'bg-[#0f1115] border-[#2a2e39] text-gray-400 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                      isSelected
                        ? 'bg-[#e6c594] text-[#0f1115]'
                        : 'bg-[#161920] text-gray-300 border border-[#2a2e39]'
                    }`}
                  >
                    {c.name.charAt(0)}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-xs font-bold truncate text-[#f3f4f6]">
                      {c.name}
                    </h4>
                    <p className="text-[10px] text-gray-500 truncate">
                      {c.phone || 'Bez telefónu'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Customer Detail View */}
      {selectedCustomer ? (
        <div className="space-y-6">
          {/* Customer Profile Banner */}
          <div className="bg-[#161920] border border-[#2a2e39] rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2a2e39] pb-4">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#e6c594]">
                  Karta Klientky
                </span>
                <h3 className="text-xl font-serif-luxury font-bold text-[#f3f4f6] mt-0.5">
                  {selectedCustomer.name}
                </h3>
                {selectedCustomer.phone && (
                  <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-1">
                    <Phone className="w-3.5 h-3.5 text-[#e6c594]" />
                    <span>{selectedCustomer.phone}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateNextVisitDesign}
                  className="flex items-center gap-2 bg-gradient-to-r from-[#2a2e39] to-[#1e222b] border border-[#e6c594]/40 text-[#e6c594] font-semibold text-xs px-3.5 py-2.5 rounded-xl hover:border-[#e6c594] transition-all"
                >
                  <Sparkles className="w-4 h-4 text-[#e6c594]" />
                  <span>AI Návrh Ďalšieho Dizajnu</span>
                </button>

                <button
                  onClick={() => onSelectCustomerToAddVisit(selectedCustomer.id)}
                  className="flex items-center gap-1.5 bg-[#e6c594] text-[#0f1115] font-semibold text-xs px-3.5 py-2.5 rounded-xl hover:bg-[#f2dcbe]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Pridať Návštevu</span>
                </button>
              </div>
            </div>

            {selectedCustomer.notes && (
              <div className="bg-[#0f1115] border border-[#2a2e39] rounded-xl p-3 text-xs text-gray-300 flex gap-2">
                <FileText className="w-4 h-4 text-[#e6c594] flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-gray-400 block mb-0.5">
                    Poznámky k manikúre:
                  </span>
                  <p>{selectedCustomer.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Before / After Comparison Slider component */}
          <BeforeAfterCompare visits={selectedCustomerVisits} />

          {/* Visit History Log list */}
          <div className="space-y-3">
            <h4 className="text-sm font-serif-luxury font-bold text-[#f3f4f6] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#e6c594]" />
              <span>História Všetkých Návštev ({selectedCustomerVisits.length})</span>
            </h4>

            {selectedCustomerVisits.map((visit) => (
              <div
                key={visit.id}
                className="bg-[#161920] border border-[#2a2e39] rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between text-xs text-gray-400 border-b border-[#2a2e39] pb-2">
                  <span className="font-semibold text-[#f3f4f6]">
                    Návšteva: {new Date(visit.visit_date).toLocaleDateString('sk-SK')}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                    Spracované cez Gemini
                  </span>
                </div>

                <div className="flex gap-4">
                  <img
                    src={visit.photo_url || 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=600&q=80'}
                    alt="Návšteva"
                    className="w-24 h-24 object-cover rounded-xl border border-[#2a2e39] flex-shrink-0"
                  />

                  <div className="space-y-2 text-xs flex-1">
                    <div className="flex flex-wrap gap-1">
                      {visit.style_tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="bg-[#0f1115] text-[#e6c594] text-[10px] px-2 py-0.5 rounded-md border border-[#2a2e39]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <p className="text-gray-300 leading-relaxed">
                      {visit.notes || 'Bez osobitných poznámok.'}
                    </p>

                    {visit.matched_gels && visit.matched_gels.length > 0 && (
                      <div className="pt-1 border-t border-[#2a2e39]/50">
                        <span className="text-[10px] text-gray-500 block mb-1">
                          Použité géle z katalógu:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {visit.matched_gels.map((g) => (
                            <div
                              key={g.id}
                              className="flex items-center gap-1.5 bg-[#0f1115] border border-[#2a2e39] px-2 py-1 rounded-md text-[10px] text-gray-300"
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block"
                                style={{ backgroundColor: g.color_hex }}
                              ></span>
                              <span className="font-medium">{g.brand} {g.code_or_name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {selectedCustomerVisits.length === 0 && (
              <div className="bg-[#161920] border border-dashed border-[#2a2e39] rounded-2xl p-8 text-center space-y-2">
                <p className="text-sm text-gray-300">Zatiaľ žiadne záznamy návštev</p>
                <p className="text-xs text-gray-500">
                  Kliknite na tlačidlo "Pridať Návštevu" a odfotografujte nechtový dizajn.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-[#161920] border border-[#2a2e39] rounded-2xl p-8 text-center text-gray-400 text-sm">
          Vyberte klientku zo zoznamu vyššie pre zobrazenie jej karty.
        </div>
      )}

      {/* Modal: Add New Client */}
      {isAddClientOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#161920] border border-[#2a2e39] w-full max-w-md rounded-2xl p-6 space-y-5 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-[#2a2e39] pb-4">
              <h3 className="text-lg font-serif-luxury font-bold text-[#f3f4f6]">
                Vytvoriť Kartu Nové Klientky
              </h3>
              <button
                onClick={() => setIsAddClientOpen(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddClientSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 font-medium mb-1">
                  Meno a Prievisko Klientky *
                </label>
                <input
                  type="text"
                  required
                  placeholder="napr. Mária Horváthová"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full bg-[#0f1115] border border-[#2a2e39] rounded-xl px-3.5 py-2.5 text-sm text-[#f3f4f6] focus:border-[#e6c594] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-medium mb-1">
                  Telefónne Číslo
                </label>
                <input
                  type="tel"
                  placeholder="napr. +421 905 123 456"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  className="w-full bg-[#0f1115] border border-[#2a2e39] rounded-xl px-3.5 py-2.5 text-sm text-[#f3f4f6] focus:border-[#e6c594] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-medium mb-1">
                  Poznámky k Manikúre (Alergie, obľúbený tvar, vlastnosti nechtov)
                </label>
                <textarea
                  rows={3}
                  placeholder="napr. Citlivá pokožka okolo nechtov, obľubuje mandľový tvar a nude odtiene..."
                  value={newClientNotes}
                  onChange={(e) => setNewClientNotes(e.target.value)}
                  className="w-full bg-[#0f1115] border border-[#2a2e39] rounded-xl px-3.5 py-2.5 text-sm text-[#f3f4f6] focus:border-[#e6c594] focus:outline-none"
                ></textarea>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddClientOpen(false)}
                  className="w-1/2 bg-[#0f1115] border border-[#2a2e39] text-gray-400 font-medium text-xs py-3 rounded-xl hover:text-white"
                >
                  Zrušiť
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-[#e6c594] text-[#0f1115] font-semibold text-xs py-3 rounded-xl hover:bg-[#f2dcbe] shadow-lg"
                >
                  Uložiť Klientku
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: AI Next Visit Design Generator */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-[#161920] border border-[#2a2e39] w-full max-w-lg rounded-2xl p-6 space-y-5 shadow-2xl relative my-8">
            <div className="flex justify-between items-center border-b border-[#2a2e39] pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#e6c594]/10 border border-[#e6c594]/30">
                  <Sparkles className="w-5 h-5 text-[#e6c594]" />
                </div>
                <div>
                  <h3 className="text-lg font-serif-luxury font-bold text-[#f3f4f6]">
                    AI Návrh Ďalšieho Dizajnu
                  </h3>
                  <p className="text-xs text-gray-400">
                    Generované pre klientku {selectedCustomer?.name} podľa histórie.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isGeneratingAi ? (
              <div className="py-12 text-center space-y-4">
                <Loader2 className="w-10 h-10 text-[#e6c594] animate-spin mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#f3f4f6]">
                    Gemini AI analyzuje posledné návštevy...
                  </p>
                  <p className="text-xs text-gray-500">
                    Pripravujeme 3 tvorivé koncepty a anglický prompt pre generátor obrázkov.
                  </p>
                </div>
              </div>
            ) : aiResult ? (
              <div className="space-y-5 text-xs">
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#e6c594]">
                    3 Odporúčané Koncepty Manikúry:
                  </h4>

                  {aiResult.concepts.map((concept, idx) => (
                    <div
                      key={idx}
                      className="bg-[#0f1115] border border-[#2a2e39] rounded-xl p-3.5 space-y-1"
                    >
                      <p className="font-bold text-[#f3f4f6] text-xs">
                        {concept.title}
                      </p>
                      <p className="text-gray-300 leading-relaxed">
                        {concept.description}
                      </p>
                    </div>
                  ))}
                </div>

                {aiResult.image_generation_prompt && (
                  <div className="bg-[#0f1115] border border-[#e6c594]/30 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#e6c594]">
                        AI Prompt pre Generátor Obrázkov:
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(aiResult.image_generation_prompt)
                        }
                        className="flex items-center gap-1 text-[#e6c594] hover:underline"
                      >
                        {copiedPrompt ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Skopírované!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Kopírovať Prompt</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-gray-400 font-mono text-[11px] leading-relaxed bg-[#161920] p-3 rounded-lg border border-[#2a2e39] select-all">
                      {aiResult.image_generation_prompt}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setIsAiModalOpen(false)}
                  className="w-full bg-[#e6c594] text-[#0f1115] font-semibold text-xs py-3 rounded-xl hover:bg-[#f2dcbe]"
                >
                  Zatvoriť
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
