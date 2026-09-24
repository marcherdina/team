import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, X, Cpu, Lock, Sparkles, CheckCircle2 } from 'lucide-react';
import { WeekFactors } from '../utils/algorithm';

interface AlgorithmModalProps {
  isOpen: boolean;
  onClose: () => void;
  weekFactors: WeekFactors;
}

export const AlgorithmModal: React.FC<AlgorithmModalProps> = ({
  isOpen,
  onClose,
  weekFactors
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white border border-[#e5e5e5] max-w-2xl w-full p-6 sm:p-8 shadow-none relative my-8"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#e5e5e5]">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-black rounded-full"></div>
              <span className="text-xs uppercase font-bold tracking-widest text-black">
                Team Pulse Architecture
              </span>
              <span className="text-[10px] uppercase font-mono font-bold bg-black text-white px-2 py-0.5 ml-2">
                KW {weekFactors.kw} • {weekFactors.year}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-light tracking-tight text-black mt-2">
              Geheimer Wochen-Algorithmus & Datenschutz
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-[#666] hover:text-black transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 mt-6 text-xs sm:text-sm text-[#4A4A4A] leading-relaxed">
          
          {/* Privacy Guarantee */}
          <div className="p-5 bg-[#f9f9f9] border border-[#e5e5e5] flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-black shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-bold text-black text-xs uppercase tracking-wider">100% Anonymität & Zero-Backend</h4>
              <p className="text-xs text-[#666] leading-relaxed">
                Diese Web-App benötigt weder eine Datenbank noch ein Backend. Keine IP-Adressen, keine Cookies, keine Benutzerkonten. Alle Berechnungen finden ausschließlich im Browser des Nutzers statt.
              </p>
              <div className="pt-2 border-t border-[#e5e5e5]">
                <strong className="text-black text-xs font-bold block mb-0.5">Dynamische Fragen-Auswahl & Anti-Trace Reihenfolge-Mischung:</strong>
                <p className="text-xs text-[#666] leading-relaxed">
                  Beim Check-In werden 8 Fragen stets echt zufällig (Fisher-Yates) aus dem gesamten Fragen-Pool gezogen – kein Durchlauf gleicht dem vorherigen. Beim Importieren im Team-Dashboard werden alle Stimmen zudem sofort und dauerhaft deterministisch durchgemischt, sodass die angezeigten Kacheln zu keinem Zeitpunkt in der Reihenfolge des Hinzufügens stehen. Vor Erreichen von 5 unterschiedlichen Codes sind alle IDs und Werte vollständig maskiert.
                </p>
              </div>
            </div>
          </div>

          {/* Mathematical Formula */}
          <div>
            <h4 className="font-bold text-black text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-black" />
              Die mathematische Codierungs-Formel (KW {weekFactors.kw})
            </h4>
            <div className="bg-black text-white p-5 border border-black font-mono text-xs overflow-x-auto space-y-1.5">
              <div className="text-[#888]">// 1. Punkte-Summe aus den Antworten (je 1 bis 5)</div>
              <div className="text-white font-bold">S = Summe(Punkte 1..N)</div>
              <div className="text-[#888] mt-2">// 2. Wöchentliche dynamische Faktoren</div>
              <div>KW_Faktor = {weekFactors.kwFactor} <span className="text-[#888]">(basiert auf Kalenderwoche {weekFactors.kw})</span></div>
              <div>Montag_Offset = {weekFactors.mondayOffset} <span className="text-[#888]">(Montag, {weekFactors.mondayDate}. des Monats)</span></div>
              <div>Parity_Bonus = {weekFactors.parityBonus} <span className="text-[#888]">({weekFactors.kw % 2 === 0 ? 'Gerade KW -> Positiv' : 'Ungerade KW -> Negativ'})</span></div>
              <div>Basis_Offset = {weekFactors.baseOffset}</div>
              <div className="text-[#888] mt-2">// 3. Endgültige Wochen-Zahl (Z)</div>
              <div className="text-white font-bold text-xs bg-white/10 p-2.5 border border-white/20">
                Zahl = (S × {weekFactors.kwFactor}) + {weekFactors.mondayOffset} + ({weekFactors.parityBonus}) + {weekFactors.baseOffset}
              </div>
            </div>
          </div>

          {/* Reversibility & Secret ID */}
          <div>
            <h4 className="font-bold text-black text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-black" />
              Reversible Decodierung in der Teamrunde
            </h4>
            <p className="text-xs text-[#666]">
              Im Team-Meeting wird die Zahl <code className="font-mono bg-[#f9f9f9] px-1 py-0.5 border border-[#e5e5e5] text-black">Z</code> mit dem inversen Faktor decodiert:
            </p>
            <div className="bg-[#f9f9f9] p-3 font-mono text-xs mt-2 border border-[#e5e5e5] text-black">
              S = (Zahl - Montag_Offset - Parity_Bonus - Basis_Offset) / KW_Faktor
            </div>
            <p className="text-xs text-[#666] mt-2 leading-relaxed">
              Das ultra-kompakte Token-Format <code className="font-mono text-black font-bold">397-X824-u4ynt[-c5_m1]</code> (nur ~14–22 Zeichen) überträgt die Secret ID <strong className="text-black">#X824</strong>, die mathematisch in Base-36 komprimierten Frage-IDs samt Bewertungen und optional die spontane Custom-Teams-Frage. Eingegebene Kommentare werden dabei ohne Klartext-Wörter in unlesbare 2-Zeichen-Codes bzw. Base64url verschlüsselt.
            </p>
          </div>

          {/* Cloudflare Pages Note */}
          <div className="border-t border-[#e5e5e5] pt-4">
            <h5 className="font-bold text-black text-xs uppercase tracking-wider mb-1">Hosting auf Cloudflare Pages</h5>
            <p className="text-xs text-[#666] leading-relaxed">
              Da die App als reine Single-Page-Application (Vite + React + Tailwind) kompiliert wird, kann der generierte <code className="font-mono bg-[#f9f9f9] px-1 py-0.5 border border-[#e5e5e5] text-black">dist/</code>-Ordner mit einem Klick auf Cloudflare Pages, GitHub Pages oder einem beliebigen Webserver gehostet werden.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-[#e5e5e5] flex justify-end">
          <button
            onClick={onClose}
            className="bg-black hover:bg-[#1a1a1a] text-white text-xs uppercase tracking-widest font-bold px-6 py-3 cursor-pointer transition-all"
          >
            Schließen
          </button>
        </div>
      </motion.div>
    </div>
  );
};
