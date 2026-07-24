import React, { useState } from 'react';
import { Visit } from '../types';
import { Calendar, ArrowLeftRight, Activity, Sparkles, Check } from 'lucide-react';

interface BeforeAfterCompareProps {
  visits: Visit[];
}

export const BeforeAfterCompare: React.FC<BeforeAfterCompareProps> = ({ visits }) => {
  if (visits.length < 2) {
    return (
      <div className="bg-[#161920] border border-[#2a2e39] rounded-2xl p-6 text-center space-y-3">
        <Activity className="w-8 h-8 text-[#e6c594] mx-auto" />
        <h4 className="text-sm font-semibold text-[#f3f4f6]">
          Nedostatok návštev na porovnanie
        </h4>
        <p className="text-xs text-gray-400">
          Porovnanie "Pred / Po" vyžaduje aspoň 2 zaznamenané návštevy pre túto klientku.
        </p>
      </div>
    );
  }

  // Zotriedime od najnovšej po najstaršiu
  const sortedVisits = [...visits].sort(
    (a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()
  );

  const currentVisit = sortedVisits[0]; // Najnovšia
  const previousVisit = sortedVisits[1]; // Predchádzajúca

  const [sliderPosition, setSliderPosition] = useState(50);

  // Výpočet dní medzi návštevami
  const diffDays = Math.round(
    Math.abs(
      new Date(currentVisit.visit_date).getTime() -
        new Date(previousVisit.visit_date).getTime()
    ) /
      (1000 * 60 * 60 * 24)
  );

  return (
    <div className="bg-[#161920] border border-[#2a2e39] rounded-2xl p-5 space-y-5">
      <div className="flex items-center justify-between border-b border-[#2a2e39] pb-3">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-[#e6c594]" />
          <h3 className="text-sm font-serif-luxury font-bold text-[#f3f4f6]">
            Porovnanie Rastu & Zdravia Nechtov (Pred / Po)
          </h3>
        </div>
        <span className="text-xs font-mono text-[#e6c594] bg-[#0f1115] px-2.5 py-1 rounded-full border border-[#2a2e39]">
          Ostup: {diffDays} dní
        </span>
      </div>

      {/* Interactive Slider comparison view */}
      <div className="relative h-64 w-full rounded-xl overflow-hidden border border-[#2a2e39] select-none touch-none">
        {/* Right / Current image */}
        <img
          src={currentVisit.photo_url || 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=600&q=80'}
          alt="Aktuálna návšteva"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-[#e6c594] font-semibold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md border border-[#e6c594]/30">
          Dnes ({new Date(currentVisit.visit_date).toLocaleDateString('sk-SK')})
        </div>

        {/* Left / Previous image clipped by slider */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${sliderPosition}%` }}
        >
          <img
            src={previousVisit.photo_url || 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=600&q=80'}
            alt="Predchádzajúca návšteva"
            className="absolute inset-0 w-full h-full object-cover max-w-none"
            style={{ width: '100%' }}
          />
          <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm text-gray-300 font-semibold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md border border-gray-600">
            Predtým ({new Date(previousVisit.visit_date).toLocaleDateString('sk-SK')})
          </div>
        </div>

        {/* Slider Handle Divider */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-[#e6c594] cursor-ew-resize flex items-center justify-center shadow-lg"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="w-8 h-8 rounded-full bg-[#161920] border-2 border-[#e6c594] text-[#e6c594] flex items-center justify-center shadow-2xl text-xs font-bold">
            ↔
          </div>
        </div>

        {/* Slider input control */}
        <input
          type="range"
          min="0"
          max="100"
          value={sliderPosition}
          onChange={(e) => setSliderPosition(Number(e.target.value))}
          className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full"
        />
      </div>

      {/* Side-by-side details comparison */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-[#0f1115] p-3 rounded-xl border border-[#2a2e39] space-y-1">
          <p className="text-gray-500 font-medium">Predchádzajúca Návšteva</p>
          <p className="text-[#f3f4f6] font-medium truncate">
            {previousVisit.notes || 'Bez osobitných poznámok'}
          </p>
          <div className="flex flex-wrap gap-1 pt-1">
            {previousVisit.style_tags.map((t, i) => (
              <span
                key={i}
                className="bg-[#161920] text-gray-400 text-[9px] px-1.5 py-0.5 rounded border border-[#2a2e39]"
              >
                #{t}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-[#0f1115] p-3 rounded-xl border border-[#e6c594]/30 space-y-1">
          <p className="text-[#e6c594] font-medium">Aktuálna Návšteva</p>
          <p className="text-[#f3f4f6] font-medium truncate">
            {currentVisit.notes || 'Bez osobitných poznámok'}
          </p>
          <div className="flex flex-wrap gap-1 pt-1">
            {currentVisit.style_tags.map((t, i) => (
              <span
                key={i}
                className="bg-[#161920] text-[#e6c594] text-[9px] px-1.5 py-0.5 rounded border border-[#e6c594]/30"
              >
                #{t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
