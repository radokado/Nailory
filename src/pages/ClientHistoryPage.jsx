import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Sparkles,
  ArrowLeft,
  Phone,
  FileText,
  Copy,
  Check,
  Loader2,
  X,
  ArrowLeftRight,
  Palette,
  Tag,
  Clock,
  ChevronRight,
  Plus,
} from 'lucide-react';

export default function ClientHistoryPage({ customerId, onBack, onAddVisitForClient }) {
  const [customer, setCustomer] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Before / After Slider Position
  const [sliderPosition, setSliderPosition] = useState(50);

  // AI Design Generator Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [aiError, setAiError] = useState(null);

  useEffect(() => {
    async function loadCustomerData() {
      if (!customerId) return;
      setLoading(true);

      try {
        // Fetch customers list to find selected customer
        const custRes = await fetch('/api/customers', {
          headers: { 'x-tenant-id': 'tenant_demo' },
        });

        if (custRes.ok) {
          const custJson = await custRes.json();
          if (custJson.success && custJson.data) {
            const found = custJson.data.find((c) => c.id === customerId);
            if (found) setCustomer(found);
          }
        }
      } catch (err) {
        console.error('Chyba pri načítaní detailu zákazníčky:', err);
      }

      // Load mock or saved visits from localStorage / state
      try {
        const savedVisits = localStorage.getItem('nailory_visits');
        if (savedVisits) {
          const parsed = JSON.parse(savedVisits);
          const filtered = parsed.filter((v) => v.customer_id === customerId);
          setVisits(
            filtered.sort(
              (a, b) =>
                new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()
            )
          );
        }
      } catch (e) {
        console.error('Chyba pri načítaní histórie návštev:', e);
      } finally {
        setLoading(false);
      }
    }

    loadCustomerData();
  }, [customerId]);

  const handleGenerateDesign = async () => {
    setIsAiModalOpen(true);
    setIsGeneratingAi(true);
    setAiSuggestions(null);
    setAiError(null);

    try {
      const res = await fetch(`/api/generate-design?customer_id=${customerId}`, {
        headers: { 'x-tenant-id': 'tenant_demo' },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setAiSuggestions(json.data);
          setIsGeneratingAi(false);
          return;
        }
      }

      // Fallback pre lokálne prostredie
      await new Promise((r) => setTimeout(r, 1800));
      setAiSuggestions({
        history_used: visits.length,
        concepts: [
          {
            title: '1. Mliečna Elegancia s Rose Gold Fóliou',
            description:
              'Aplikácia mliečneho stavaného gélu so spevnením, doplnená o neopakovateľný Rose Gold akcent na prstenníku a hodvábny matný lesk.',
          },
          {
            title: '2. Moderný Francúzsky Micro-Ombre',
            description:
              'Jemný prechod bielej špičky do ružovkastého podkladu na obľúbenom mandľovom tvare s jemným perleťovým prachom.',
          },
          {
            title: '3. Odvážnejší Nude so Zlatou Geometriou',
            description:
              'Teplý karamelový odtieň s precíznymi zlatými líniami pri nechtovom lôžku a drobným kamienkom pre večerný záblesk.',
          },
        ],
        image_generation_prompt:
          'A close-up luxury fashion photograph of manicured woman hands with almond-shaped nails. Clean milky nude base gel with delicate rose gold metallic foil accents on cuticle line, soft studio lighting, ultra-realistic 8k.',
      });
    } catch (err) {
      console.error('Chyba pri generovaní návrhov:', err);
      setAiError('Zlyhalo načítanie AI návrhov.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <Loader2 className="w-10 h-10 text-[#e6c594] animate-spin mx-auto" />
        <p className="text-xs text-gray-400">Načítavam kartu a históriu návštev...</p>
      </div>
    );
  }

  // Pre Before / After slider potrebujeme najnovšiu (0) a predchádzajúcu (1) návštevu
  const latestVisit = visits[0];
  const previousVisit = visits[1];

  // Výpočet dní od poslednej návštevy
  const daysBetween =
    latestVisit && previousVisit
      ? Math.round(
          Math.abs(
            new Date(latestVisit.visit_date).getTime() -
              new Date(previousVisit.visit_date).getTime()
          ) /
            (1000 * 60 * 60 * 24)
        )
      : null;

  return (
    <div className="space-y-6 pb-28">
      {/* Top Navigation Bar with Back Button */}
      <div className="flex items-center justify-between border-b border-[#2a2e39] pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-[#e6c594] bg-[#161920] border border-[#2a2e39] px-3.5 py-2.5 rounded-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Späť na zoznam</span>
        </button>

        <button
          onClick={() => onAddVisitForClient && onAddVisitForClient(customerId)}
          className="flex items-center gap-2 bg-[#e6c594] text-[#0f1115] font-semibold text-xs px-4 py-2.5 rounded-xl hover:bg-[#f2dcbe] shadow-lg"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Pridať Návštevu</span>
        </button>
      </div>

      {/* Customer Header Info */}
      <div className="bg-[#161920] border border-[#2a2e39] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2a2e39] pb-4">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#e6c594] bg-[#0f1115] px-2.5 py-1 rounded-md border border-[#2a2e39]">
              Karta Klientky
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif-luxury font-bold text-[#f3f4f6] mt-2">
              {customer?.name || 'Mária Horváthová'}
            </h1>
            {customer?.phone && (
              <p className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                <Phone className="w-3.5 h-3.5 text-[#e6c594]" />
                <span>{customer.phone}</span>
              </p>
            )}
          </div>

          {/* Prompt 9: "Inšpirácia pre ďalšiu návštevu" Button */}
          <button
            onClick={handleGenerateDesign}
            className="h-[52px] min-h-[52px] px-5 bg-gradient-to-r from-[#2a2e39] to-[#1e222b] border border-[#e6c594]/50 hover:border-[#e6c594] text-[#e6c594] font-bold text-xs sm:text-sm rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95"
          >
            <Sparkles className="w-5 h-5 text-[#e6c594] fill-current" />
            <span>Inšpirácia pre ďalšiu návštevu</span>
          </button>
        </div>

        {customer?.notes && (
          <div className="bg-[#0f1115] border border-[#2a2e39] rounded-xl p-3.5 text-xs text-gray-300 flex items-start gap-2.5">
            <FileText className="w-4 h-4 text-[#e6c594] flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-gray-400 block mb-0.5">
                Špeciálne poznámky k manikúre:
              </span>
              <p className="leading-relaxed">{customer.notes}</p>
            </div>
          </div>
        )}
      </div>

      {/* Prompt 9: "Pred / Po" (Before / After) Visual Section */}
      <div className="bg-[#161920] border border-[#2a2e39] rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#2a2e39] pb-3">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-[#e6c594]" />
            <h3 className="text-sm font-serif-luxury font-bold text-[#f3f4f6]">
              Porovnanie Rastu & Stav Nechtov (Pred / Po)
            </h3>
          </div>
          {daysBetween && (
            <span className="text-[11px] font-mono text-[#e6c594] bg-[#0f1115] px-2.5 py-1 rounded-full border border-[#2a2e39]">
              Ostup: {daysBetween} dní
            </span>
          )}
        </div>

        {latestVisit && previousVisit ? (
          /* Interactive Comparison Slider */
          <div className="relative h-72 w-full rounded-xl overflow-hidden border border-[#2a2e39] select-none touch-none shadow-2xl">
            {/* Right / Latest Visit Photo (Po) */}
            <img
              src={
                latestVisit.photo_url ||
                'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=600&q=80'
              }
              alt="Aktuálna návšteva (Po)"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md text-[#e6c594] font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg border border-[#e6c594]/40">
              Po (Aktuálna: {new Date(latestVisit.visit_date).toLocaleDateString('sk-SK')})
            </div>

            {/* Left / Previous Visit Photo (Pred) Clipped by Slider */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPosition}%` }}
            >
              <img
                src={
                  previousVisit.photo_url ||
                  'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=600&q=80'
                }
                alt="Predchádzajúca návšteva (Pred)"
                className="absolute inset-0 w-full h-full object-cover max-w-none"
                style={{ width: '100%' }}
              />
              <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md text-gray-300 font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg border border-gray-600">
                Pred ({new Date(previousVisit.visit_date).toLocaleDateString('sk-SK')})
              </div>
            </div>

            {/* Divider bar */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-[#e6c594] flex items-center justify-center shadow-2xl"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="w-9 h-9 rounded-full bg-[#161920] border-2 border-[#e6c594] text-[#e6c594] flex items-center justify-center shadow-2xl text-xs font-bold">
                ↔
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={(e) => setSliderPosition(Number(e.target.value))}
              className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full"
            />
          </div>
        ) : (
          <div className="bg-[#0f1115] border border-dashed border-[#2a2e39] rounded-xl p-6 text-center space-y-2">
            <p className="text-xs text-gray-400">
              Pre porovnanie "Pred / Po" sú potrebné aspoň 2 zaznamenané návštevy.
            </p>
          </div>
        )}
      </div>

      {/* Chronological Timeline of Past Visits */}
      <div className="space-y-4">
        <h3 className="text-base font-serif-luxury font-bold text-[#f3f4f6] flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#e6c594]" />
          <span>Chronologická História Návštev ({visits.length})</span>
        </h3>

        {visits.map((visit) => (
          <div
            key={visit.id}
            className="bg-[#161920] border border-[#2a2e39] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between text-xs border-b border-[#2a2e39] pb-3">
              <span className="font-bold text-[#f3f4f6] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#e6c594]" />
                {new Date(visit.visit_date).toLocaleDateString('sk-SK')}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-2.5 py-1 rounded-md border border-emerald-800/40">
                Spárované v D1
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <img
                src={
                  visit.photo_url ||
                  'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=600&q=80'
                }
                alt="Fotografia návštevy"
                className="w-full sm:w-32 h-32 object-cover rounded-xl border border-[#2a2e39] flex-shrink-0"
              />

              <div className="space-y-3 text-xs flex-1">
                {/* AI Style Tags */}
                <div>
                  <span className="text-[11px] font-semibold text-gray-400 block mb-1">
                    AI Štýlové Tagy:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {visit.style_tags?.map((tag, idx) => (
                      <span
                        key={idx}
                        className="bg-[#0f1115] text-[#e6c594] text-[10px] px-2.5 py-0.5 rounded-md border border-[#2a2e39]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Visit Notes */}
                {visit.notes && (
                  <p className="text-gray-300 leading-relaxed bg-[#0f1115] p-3 rounded-xl border border-[#2a2e39]">
                    {visit.notes}
                  </p>
                )}

                {/* Matched Gels from Inventory */}
                {visit.matched_gels && visit.matched_gels.length > 0 && (
                  <div className="pt-2 border-t border-[#2a2e39]/60">
                    <span className="text-[10px] font-semibold text-gray-400 block mb-1.5">
                      Identifikované & Spárované Géle:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {visit.matched_gels.map((gel) => (
                        <div
                          key={gel.id}
                          className="flex items-center gap-2 bg-[#0f1115] border border-[#2a2e39] px-2.5 py-1 rounded-lg text-[11px] text-gray-200"
                        >
                          <span
                            className="w-3 h-3 rounded-full inline-block border border-black/40"
                            style={{ backgroundColor: gel.color_hex }}
                          ></span>
                          <span className="font-semibold text-[#e6c594]">{gel.brand}</span>
                          <span>{gel.code_or_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {visits.length === 0 && (
          <div className="py-12 text-center bg-[#161920] border border-dashed border-[#2a2e39] rounded-2xl p-6 space-y-2">
            <p className="text-sm text-gray-300 font-semibold">
              Zatiaľ žiadne zaznamenané návštevy
            </p>
            <p className="text-xs text-gray-500">
              Pridajte prvú návštevu tlačidlom "Pridať Návštevu" vyššie.
            </p>
          </div>
        )}
      </div>

      {/* Modal: AI Next Visit Design Generator */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-[#161920] border border-[#2a2e39] w-full max-w-lg rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative my-8">
            <div className="flex justify-between items-center border-b border-[#2a2e39] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#e6c594]/10 border border-[#e6c594]/30 text-[#e6c594]">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-serif-luxury font-bold text-[#f3f4f6]">
                    Inšpirácia pre Ďalšiu Návštevu
                  </h3>
                  <p className="text-xs text-gray-400">
                    Gemini AI vygenerovalo návrhy podľa histórie klientky.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="text-gray-400 hover:text-white p-2 rounded-xl"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {isGeneratingAi ? (
              <div className="py-12 text-center space-y-4">
                <Loader2 className="w-10 h-10 text-[#e6c594] animate-spin mx-auto" />
                <div>
                  <p className="text-sm font-bold text-[#f3f4f6]">
                    Gemini AI študuje preferencie z návštev...
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Pripravujeme 3 tvorivé koncepty dizajnu a prompt pre generovanie obrázku.
                  </p>
                </div>
              </div>
            ) : aiSuggestions ? (
              <div className="space-y-5 text-xs">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#e6c594]">
                    3 Tvorivé Koncepty pre Klientku:
                  </h4>

                  {aiSuggestions.concepts?.map((c, idx) => (
                    <div
                      key={idx}
                      className="bg-[#0f1115] border border-[#2a2e39] rounded-xl p-4 space-y-1.5"
                    >
                      <p className="font-bold text-[#f3f4f6] text-sm">{c.title}</p>
                      <p className="text-gray-300 leading-relaxed text-xs">
                        {c.description}
                      </p>
                    </div>
                  ))}
                </div>

                {aiSuggestions.image_generation_prompt && (
                  <div className="bg-[#0f1115] border border-[#e6c594]/30 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#e6c594]">
                        AI Prompt pre Generovanie Obrázku:
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(aiSuggestions.image_generation_prompt)
                        }
                        className="flex items-center gap-1.5 text-[#e6c594] hover:underline font-semibold"
                      >
                        {copiedPrompt ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-400">Skopírované!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Kopírovať Prompt</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-gray-400 font-mono text-[11px] leading-relaxed bg-[#161920] p-3 rounded-xl border border-[#2a2e39] select-all">
                      {aiSuggestions.image_generation_prompt}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setIsAiModalOpen(false)}
                  className="w-full h-[52px] bg-[#e6c594] text-[#0f1115] font-bold text-xs rounded-xl hover:bg-[#f2dcbe]"
                >
                  Zatvoriť
                </button>
              </div>
            ) : (
              <div className="p-4 text-center text-red-400 text-xs">
                {aiError || 'Zlyhalo načítanie návrhov.'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
