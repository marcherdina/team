import React from 'react';
import { ShieldCheck, BarChart3, CheckCircle2, TrendingUp } from 'lucide-react';
import { WeekFactors } from '../utils/algorithm';

interface HeaderProps {
  activeTab: 'checkin' | 'team' | 'analyze';
  onTabChange: (tab: 'checkin' | 'team' | 'analyze') => void;
  weekFactors: WeekFactors;
  onOpenAlgorithmModal: () => void;
  teamCount: number;
  savedWeeksCount?: number;
  myLastSecretId?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  weekFactors,
  onOpenAlgorithmModal,
  teamCount,
  savedWeeksCount,
  myLastSecretId
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#e5e5e5] transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-10 h-20 flex items-center justify-between">
        
        {/* Audi Brand Identity */}
        <div className="flex items-center gap-4 sm:gap-8">
          {/* Overlapping Audi 4 Rings */}
          <div className="flex space-x-[-8px] items-center" title="Audi IT">
            <div className="w-7 h-7 rounded-full border-2 border-black bg-transparent"></div>
            <div className="w-7 h-7 rounded-full border-2 border-black bg-transparent"></div>
            <div className="w-7 h-7 rounded-full border-2 border-black bg-transparent"></div>
            <div className="w-7 h-7 rounded-full border-2 border-black bg-transparent"></div>
          </div>

          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-[0.2em] font-bold text-black flex items-center gap-1.5">
              Audi IT
              <span className="w-1.5 h-1.5 rounded-full bg-[#f10202] inline-block" />
            </span>
            <span className="text-[10px] uppercase tracking-[0.1em] text-[#666]">
              Team Pulse / KW {weekFactors.kw}
            </span>
          </div>
        </div>

        {/* Navigation & Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Nav Tabs - Clean Minimalism Style */}
          <nav
            aria-label="Hauptnavigation"
            className="flex items-center gap-1.5 sm:gap-2"
          >
            <button
              id="tab-checkin-btn"
              onClick={() => onTabChange('checkin')}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 border text-xs uppercase tracking-widest font-bold transition-all cursor-pointer ${
                activeTab === 'checkin'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-[#e5e5e5] hover:border-black'
              }`}
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${activeTab === 'checkin' ? 'text-[#f10202]' : 'text-black'}`} />
              <span>Check-In</span>
            </button>

            <button
              id="tab-team-btn"
              onClick={() => onTabChange('team')}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 border text-xs uppercase tracking-widest font-bold transition-all cursor-pointer ${
                activeTab === 'team'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-[#e5e5e5] hover:border-black'
              }`}
            >
              <BarChart3 className={`w-3.5 h-3.5 ${activeTab === 'team' ? 'text-[#f10202]' : 'text-black'}`} />
              <span>Team-Runde</span>
              {teamCount > 0 && (
                <span className="bg-[#f10202] text-white text-[10px] font-mono font-bold px-1.5 py-0.5">
                  {teamCount}
                </span>
              )}
            </button>

            <button
              id="tab-analyze-btn"
              onClick={() => onTabChange('analyze')}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 border text-xs uppercase tracking-widest font-bold transition-all cursor-pointer ${
                activeTab === 'analyze'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-[#e5e5e5] hover:border-black'
              }`}
            >
              <TrendingUp className={`w-3.5 h-3.5 ${activeTab === 'analyze' ? 'text-[#f10202]' : 'text-black'}`} />
              <span>Analyse</span>
              {savedWeeksCount !== undefined && savedWeeksCount > 0 && (
                <span className="bg-[#444] text-white text-[10px] font-mono font-bold px-1.5 py-0.5">
                  {savedWeeksCount}W
                </span>
              )}
            </button>
          </nav>

          {/* User Session ID Badge (Only visible on check-in tab, hidden during team presentation to protect anonymity) */}
          {myLastSecretId && activeTab === 'checkin' ? (
            <div className="hidden md:flex items-center gap-3 pl-4 border-l border-[#e5e5e5]">
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-[#666]">Session ID</div>
                <div className="text-xs font-mono font-bold tracking-wider text-black">
                  #{myLastSecretId}
                </div>
              </div>
              <div className="w-8 h-8 bg-black flex items-center justify-center text-white text-[10px] font-mono font-bold">
                ID
              </div>
            </div>
          ) : null}

          {/* Privacy & Algorithm Trigger */}
          <button
            id="algo-info-btn"
            onClick={onOpenAlgorithmModal}
            className="p-2 border border-[#e5e5e5] hover:border-black text-[#666] hover:text-black transition-colors cursor-pointer"
            title="Geheimer Wochen-Algorithmus & Datenschutz"
            aria-label="Algorithmus Details"
          >
            <ShieldCheck className="w-4 h-4 text-[#f10202]" />
          </button>
        </div>

      </div>
    </header>
  );
};
