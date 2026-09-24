import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { CheckInFlow } from './components/CheckInFlow';
import { TeamDashboard } from './components/TeamDashboard';
import { AnalyzeView } from './components/AnalyzeView';
import { AlgorithmModal } from './components/AlgorithmModal';
import {
  getCurrentWeekFactors,
  generateSampleTeamSubmissions,
  decodeSubmission
} from './utils/algorithm';
import { generateSampleWeeklyHistory } from './utils/weeklyTrends';

export default function App() {
  const [activeTab, setActiveTab] = useState<'checkin' | 'team' | 'analyze'>('checkin');
  const [isAlgorithmModalOpen, setIsAlgorithmModalOpen] = useState(false);
  const [myLastSecretId, setMyLastSecretId] = useState<string | undefined>(() => {
    return localStorage.getItem('tp_my_secret_id') || localStorage.getItem('audi_my_secret_id') || undefined;
  });

  // Calculate current week factors
  const weekFactors = useMemo(() => getCurrentWeekFactors(), []);

  // Saved Weekly Codes for Longitudinal Analytics
  const [savedWeeklyCodes, setSavedWeeklyCodes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('tp_saved_weekly_codes') || localStorage.getItem('audi_saved_weekly_codes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Persist saved weekly codes
  useEffect(() => {
    try {
      if (savedWeeklyCodes.length === 0) {
        localStorage.removeItem('tp_saved_weekly_codes');
      } else {
        localStorage.setItem('tp_saved_weekly_codes', JSON.stringify(savedWeeklyCodes));
      }
    } catch {
      // ignore
    }
  }, [savedWeeklyCodes]);

  const handleAddWeeklyCodes = (codes: string[]) => {
    setSavedWeeklyCodes((prev) => {
      const newCodes = codes.filter((c) => !prev.includes(c));
      return [...newCodes, ...prev];
    });
  };

  const handleRemoveWeeklyCode = (index: number) => {
    setSavedWeeklyCodes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearAllWeeklyCodes = () => {
    setSavedWeeklyCodes([]);
    localStorage.removeItem('tp_saved_weekly_codes');
  };

  const handleLoadWeeklySampleData = () => {
    const samples = generateSampleWeeklyHistory();
    setSavedWeeklyCodes(samples);
  };

  const handleNavigateToAnalyze = (weeklyCode?: string) => {
    if (weeklyCode) {
      handleAddWeeklyCodes([weeklyCode]);
    }
    setActiveTab('analyze');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Team codes state with localStorage fallback (cleans up any legacy sample data)
  const [teamCodes, setTeamCodes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('tp_team_codes') || localStorage.getItem('audi_team_codes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If saved dataset contains the generated sample codes, clean it out so it starts empty
          const isSample = parsed.some(
            (c: string) =>
              typeof c === 'string' &&
              (c.includes('-R824-') || c.includes('-A619-') || c.includes('-B302-'))
          );
          if (isSample) {
            localStorage.removeItem('tp_team_codes');
            localStorage.removeItem('audi_team_codes');
            return [];
          }
          return parsed;
        }
      }
    } catch {
      // ignore parsing error
    }
    // Default: always start with clean, empty version
    return [];
  });

  // Persist team codes in localStorage only for real entered codes (not sample data)
  useEffect(() => {
    try {
      if (teamCodes.length === 0) {
        localStorage.removeItem('tp_team_codes');
        return;
      }
      const isSample = teamCodes.some(
        (c) => typeof c === 'string' && (c.includes('-R824-') || c.includes('-A619-'))
      );
      if (!isSample) {
        localStorage.setItem('tp_team_codes', JSON.stringify(teamCodes));
      } else {
        localStorage.removeItem('tp_team_codes');
      }
    } catch {
      // ignore
    }
  }, [teamCodes]);

  // Calculate count of unique valid submissions for the threshold & header
  const distinctTeamCount = useMemo(() => {
    const seenTokens = new Set<string>();
    const seenSecretIds = new Set<string>();
    let count = 0;

    for (const code of teamCodes) {
      const decoded = decodeSubmission(code, weekFactors);
      if (!decoded.isValid) continue;

      const normToken = decoded.rawCode.trim().toUpperCase();
      const normSecretId =
        decoded.secretId && decoded.secretId !== 'UNGÜLTIG'
          ? decoded.secretId.trim().toUpperCase()
          : '';

      if (seenTokens.has(normToken) || (normSecretId && seenSecretIds.has(normSecretId))) {
        continue;
      }

      seenTokens.add(normToken);
      if (normSecretId) {
        seenSecretIds.add(normSecretId);
      }
      count++;
    }

    return count;
  }, [teamCodes, weekFactors]);

  const handleAddCode = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setTeamCodes((prev) => [trimmed, ...prev]);
  };

  const handleAddCodes = (codes: string[]) => {
    const cleaned = codes.map((c) => c.trim()).filter(Boolean);
    if (cleaned.length === 0) return;
    setTeamCodes((prev) => [...cleaned, ...prev]);
  };

  const handleRemoveCode = (index: number) => {
    setTeamCodes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    setTeamCodes([]);
    localStorage.removeItem('tp_team_codes');
    localStorage.removeItem('audi_team_codes');
  };

  const handleLoadSampleData = () => {
    const samples = generateSampleTeamSubmissions(weekFactors);
    setTeamCodes(samples);
  };

  const handleCheckInCompleted = (fullToken: string) => {
    // Extract secretId from token
    const decoded = decodeSubmission(fullToken, weekFactors);
    if (decoded.isValid) {
      setMyLastSecretId(decoded.secretId);
      localStorage.setItem('tp_my_secret_id', decoded.secretId);
      // Auto-add user's token to the team list
      setTeamCodes((prev) => [fullToken, ...prev.filter((c) => c !== fullToken)]);
    }
  };

  const handleNavigateToTeam = () => {
    setActiveTab('team');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#000000] flex flex-col font-sans border-t-4 border-black selection:bg-black selection:text-white">
      {/* Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        weekFactors={weekFactors}
        onOpenAlgorithmModal={() => setIsAlgorithmModalOpen(true)}
        teamCount={teamCodes.length}
        distinctTeamCount={distinctTeamCount}
        savedWeeksCount={savedWeeklyCodes.length}
        myLastSecretId={myLastSecretId}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {activeTab === 'checkin' && (
          <CheckInFlow
            weekFactors={weekFactors}
            onCheckInCompleted={handleCheckInCompleted}
            onNavigateToTeam={handleNavigateToTeam}
          />
        )}
        {activeTab === 'team' && (
          <TeamDashboard
            weekFactors={weekFactors}
            teamCodes={teamCodes}
            onAddCode={handleAddCode}
            onAddCodes={handleAddCodes}
            onRemoveCode={handleRemoveCode}
            onClearAll={handleClearAll}
            onLoadSampleData={handleLoadSampleData}
            myLastSecretId={myLastSecretId}
            onNavigateToAnalyze={handleNavigateToAnalyze}
          />
        )}
        {activeTab === 'analyze' && (
          <AnalyzeView
            savedCodes={savedWeeklyCodes}
            onAddCodes={handleAddWeeklyCodes}
            onRemoveCode={handleRemoveWeeklyCode}
            onClearAll={handleClearAllWeeklyCodes}
            onLoadSampleData={handleLoadWeeklySampleData}
            onNavigateToTeam={handleNavigateToTeam}
          />
        )}
      </main>

      {/* Clean Minimalism Footer */}
      <footer className="px-6 sm:px-10 py-5 bg-white border-t border-[#e5e5e5] text-[10px] uppercase tracking-[0.1em] text-[#666]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-bold text-black tracking-[0.15em]">
              © Team Pulse // Internal Tooling
            </span>
            <span className="text-[#ccc]">•</span>
            <span>KW {weekFactors.kw} ({weekFactors.year})</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsAlgorithmModalOpen(true)}
              className="hover:text-black tracking-widest transition-colors cursor-pointer underline underline-offset-4"
            >
              Algorithmus & Datenschutz
            </button>
            <span className="text-[#ccc]">•</span>
            <span className="text-[#999] tracking-widest hidden sm:inline">
              Secure • Anonymous • Frontend Only
            </span>
            <span className="text-white select-text">
              LCK MH
            </span>
          </div>
        </div>
      </footer>

      {/* Algorithm Modal */}
      <AlgorithmModal
        isOpen={isAlgorithmModalOpen}
        onClose={() => setIsAlgorithmModalOpen(false)}
        weekFactors={weekFactors}
      />
    </div>
  );
}
