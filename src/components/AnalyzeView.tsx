import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  TrendingUp,
  Plus,
  Trash2,
  Copy,
  Check,
  Calendar,
  Users,
  Award,
  AlertTriangle,
  HelpCircle,
  FileCode,
  Download,
  Share2,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import {
  WeeklyResult,
  decodeWeeklyResultCode,
  extractWeeklyTokensFromText,
  generateSampleWeeklyHistory
} from '../utils/weeklyTrends';

interface AnalyzeViewProps {
  savedCodes: string[];
  onAddCodes: (codes: string[]) => void;
  onRemoveCode: (index: number) => void;
  onClearAll: () => void;
  onLoadSampleData: () => void;
  onNavigateToTeam: () => void;
}

// Visual color palette for category trend lines
const CATEGORY_COLORS: Record<string, string> = {
  collaboration: '#2563eb', // Blue
  workload: '#ea580c',      // Orange
  focus: '#059669',         // Green
  culture: '#8b5cf6',       // Purple
  tech: '#0d9488',          // Teal
  leadership: '#475569',    // Slate
  learning: '#d97706',      // Amber
  mission: '#db2777'        // Pink
};

export const AnalyzeView: React.FC<AnalyzeViewProps> = ({
  savedCodes,
  onAddCodes,
  onRemoveCode,
  onClearAll,
  onLoadSampleData,
  onNavigateToTeam
}) => {
  const [inputMode, setInputMode] = useState<'single' | 'bulk'>('bulk');
  const [bulkInput, setBulkInput] = useState('');
  const [singleInput, setSingleInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [isInputOpen, setIsInputOpen] = useState(savedCodes.length === 0);

  // Parse all saved weekly codes into decoded WeeklyResult objects
  const weeklyResults = useMemo<WeeklyResult[]>(() => {
    const results: WeeklyResult[] = [];
    savedCodes.forEach((code) => {
      const decoded = decodeWeeklyResultCode(code);
      if (decoded) {
        results.push(decoded);
      }
    });

    // Sort chronologically (oldest week first, latest last)
    results.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.kw - b.kw;
    });

    return results;
  }, [savedCodes]);

  // Aggregate Metrics over time
  const metrics = useMemo(() => {
    if (weeklyResults.length === 0) return null;

    const countWeeks = weeklyResults.length;
    const avgScore = Number(
      (weeklyResults.reduce((acc, w) => acc + w.averageScore, 0) / countWeeks).toFixed(2)
    );
    const avgPercentage = Math.round((avgScore / 5) * 100);
    const totalParticipants = weeklyResults.reduce((acc, w) => acc + w.count, 0);

    const latest = weeklyResults[weeklyResults.length - 1];
    const previous = weeklyResults.length > 1 ? weeklyResults[weeklyResults.length - 2] : null;
    const deltaScore = previous
      ? Number((latest.averageScore - previous.averageScore).toFixed(2))
      : null;

    // Aggregate category scores across all weeks
    const catSums: Record<string, { label: string; sum: number; count: number }> = {};
    weeklyResults.forEach((w) => {
      Object.entries(w.categoryScores).forEach(([key, val]: [string, { label: string; score: number }]) => {
        if (!catSums[key]) {
          catSums[key] = { label: val.label, sum: 0, count: 0 };
        }
        catSums[key].sum += val.score;
        catSums[key].count += 1;
      });
    });

    const categoryAverages: { key: string; label: string; avg: number }[] = Object.entries(catSums).map(
      ([key, val]) => ({
        key,
        label: val.label,
        avg: Number((val.sum / val.count).toFixed(2))
      })
    );

    categoryAverages.sort((a, b) => b.avg - a.avg);
    const strongestCategory = categoryAverages[0] || null;
    const lowestCategory = categoryAverages[categoryAverages.length - 1] || null;

    return {
      countWeeks,
      avgScore,
      avgPercentage,
      totalParticipants,
      latest,
      previous,
      deltaScore,
      strongestCategory,
      lowestCategory,
      categoryAverages
    };
  }, [weeklyResults]);

  // Prepare chart dataset
  const chartData = useMemo(() => {
    return weeklyResults.map((w) => {
      const dataPoint: Record<string, any> = {
        name: `KW ${w.kw}`,
        fullLabel: `KW ${w.kw} (${w.year})`,
        score: w.averageScore,
        percentage: w.overallPercentage,
        participants: w.count,
        critical: w.distribution.critical,
        stressed: w.distribution.stressed,
        neutral: w.distribution.neutral,
        good: w.distribution.good,
        peak: w.distribution.peak
      };

      // Flatten category scores for multi-line chart
      Object.entries(w.categoryScores).forEach(([catKey, val]: [string, { label: string; score: number }]) => {
        dataPoint[catKey] = val.score;
      });

      return dataPoint;
    });
  }, [weeklyResults]);

  // Get list of active categories across the weeks for the multi-line chart
  const availableCategories = useMemo(() => {
    const keys = new Set<string>();
    weeklyResults.forEach((w) => {
      Object.keys(w.categoryScores).forEach((k) => keys.add(k));
    });
    return Array.from(keys);
  }, [weeklyResults]);

  const [visibleCategories, setVisibleCategories] = useState<Record<string, boolean>>({
    collaboration: true,
    workload: true,
    focus: true,
    culture: true
  });

  const toggleCategory = (cat: string) => {
    setVisibleCategories((prev) => ({
      ...prev,
      [cat]: prev[cat] === undefined ? false : !prev[cat]
    }));
  };

  // Submission handlers
  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);
    setSuccessMessage(null);

    const tokens = extractWeeklyTokensFromText(bulkInput);
    if (tokens.length === 0) {
      setInputError('Keine gültigen Wochencodes erkannt. Format z.B. AUDI-W37-2026-...');
      return;
    }

    onAddCodes(tokens);
    setBulkInput('');
    setSuccessMessage(`${tokens.length} Wochencode(s) erfolgreich importiert.`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);
    setSuccessMessage(null);

    const code = singleInput.trim();
    const test = decodeWeeklyResultCode(code);
    if (!test) {
      setInputError('Ungültiger Wochencode. Bitte Format prüfen (z.B. AUDI-W37-2026-...)');
      return;
    }

    onAddCodes([code]);
    setSingleInput('');
    setSuccessMessage(`Woche KW ${test.kw} erfolgreich hinzugefügt.`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleCopySingleCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  const handleCopyAllCodes = () => {
    if (savedCodes.length === 0) return;
    navigator.clipboard.writeText(savedCodes.join('\n'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-10 py-8">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#e5e5e5]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono font-bold tracking-[0.2em] text-[#f10202] bg-[#f10202]/10 px-2 py-0.5">
              Zeitverlauf & Analyse
            </span>
            <span className="text-xs text-[#666] font-mono">•</span>
            <span className="text-xs text-[#666] font-mono">
              {weeklyResults.length} {weeklyResults.length === 1 ? 'Woche' : 'Wochen'} erfasst
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-[0.1em] text-black mt-1">
            Team Pulse // Langzeittrends
          </h1>
          <p className="text-xs text-[#666] mt-1 max-w-2xl leading-relaxed">
            Verfolge die Entwicklung deines Teams über Wochen hinweg. Jede Woche generiert im Team-Dashboard einen komprimierten Wochencode, der hier im Zeitverlauf visualisiert wird.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsInputOpen((prev) => !prev)}
            className={`px-3.5 py-2 border text-xs uppercase tracking-wider font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isInputOpen
                ? 'bg-black text-white border-black'
                : 'bg-white text-black border-[#e5e5e5] hover:border-black'
            }`}
          >
            <Plus className="w-3.5 h-3.5 text-[#f10202]" />
            <span>{isInputOpen ? 'Eingabe schließen' : 'Codes einfügen'}</span>
          </button>

          <button
            type="button"
            onClick={onLoadSampleData}
            className="px-3.5 py-2 border border-[#e5e5e5] hover:border-black text-xs uppercase tracking-wider font-bold text-black bg-white transition-all cursor-pointer flex items-center gap-1.5"
            title="6 Wochen historische Testdaten laden"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#f10202]" />
            <span>6W Demo</span>
          </button>

          {savedCodes.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleCopyAllCodes}
                className="px-3.5 py-2 border border-[#e5e5e5] hover:border-black text-xs uppercase tracking-wider font-bold text-black bg-white transition-all cursor-pointer flex items-center gap-1.5"
                title="Alle Wochencodes in Zwischenablage kopieren"
              >
                {copiedAll ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-600" />
                    <span>Kopiert</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#666]" />
                    <span>Alle Codes</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClearAll}
                className="px-3.5 py-2 border border-[#e5e5e5] hover:border-[#f10202] hover:text-[#f10202] text-xs uppercase tracking-wider font-bold text-[#666] bg-white transition-all cursor-pointer"
                title="Alle gespeicherten Wochen löschen"
              >
                Leeren
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expandable Code Import Panel */}
      {isInputOpen && (
        <div className="my-6 p-5 bg-[#fafafa] border border-[#e5e5e5] transition-all">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-[#f10202]" />
              <span className="text-xs font-bold uppercase tracking-wider text-black">
                Wochen-Ergebniscodes importieren
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setInputMode('bulk')}
                className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                  inputMode === 'bulk'
                    ? 'bg-black text-white font-bold'
                    : 'text-[#666] hover:text-black'
                }`}
              >
                Mehrzeilig
              </button>
              <button
                type="button"
                onClick={() => setInputMode('single')}
                className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                  inputMode === 'single'
                    ? 'bg-black text-white font-bold'
                    : 'text-[#666] hover:text-black'
                }`}
              >
                Einzeln
              </button>
            </div>
          </div>

          <p className="text-xs text-[#666] mb-3 leading-relaxed">
            Kopiere den generierten Wochencode aus der Team-Runde hier hinein (z.B. <code className="bg-[#eee] px-1 py-0.5 text-black">AUDI-W37-2026-ey...</code>). Jeder Code enthält das aggregierte, anonyme Teamergebnis einer Woche.
          </p>

          {inputMode === 'bulk' ? (
            <form onSubmit={handleBulkSubmit} className="space-y-3">
              <textarea
                rows={3}
                value={bulkInput}
                onChange={(e) => {
                  setBulkInput(e.target.value);
                  setInputError(null);
                }}
                placeholder={`Wochencodes einfügen (ein Code pro Zeile):\nAUDI-W35-2026-eyJ2IjoxLCJ5IjoyMDI2LCJ3IjozNS... \nAUDI-W36-2026-eyJ2IjoxLCJ5IjoyMDI2LCJ3IjozNi... \nAUDI-W37-2026-eyJ2IjoxLCJ5IjoyMDI2LCJ3IjozNy...`}
                className="w-full bg-white border border-[#ccc] focus:border-black p-3 text-xs font-mono text-black outline-none leading-relaxed transition-colors"
              />

              <div className="flex items-center justify-between gap-3">
                <button
                  type="submit"
                  disabled={!bulkInput.trim()}
                  className="px-5 py-2.5 bg-black hover:bg-[#222] disabled:bg-[#ccc] text-white text-xs uppercase font-mono font-bold tracking-wider transition-colors cursor-pointer"
                >
                  Wochen importieren
                </button>

                <button
                  type="button"
                  onClick={onLoadSampleData}
                  className="text-xs text-[#666] hover:text-black underline cursor-pointer"
                >
                  Oder 6 Wochen Testverlauf laden
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSingleSubmit} className="flex gap-2">
              <input
                type="text"
                value={singleInput}
                onChange={(e) => {
                  setSingleInput(e.target.value);
                  setInputError(null);
                }}
                placeholder="Einzelnen Wochencode eingeben (z.B. AUDI-W37-2026-...)"
                className="flex-1 bg-white border border-[#ccc] focus:border-black px-3 py-2 text-xs font-mono text-black outline-none"
              />
              <button
                type="submit"
                disabled={!singleInput.trim()}
                className="px-4 py-2 bg-black hover:bg-[#222] disabled:bg-[#ccc] text-white text-xs uppercase font-mono font-bold tracking-wider transition-colors cursor-pointer"
              >
                Hinzufügen
              </button>
            </form>
          )}

          {inputError && (
            <div className="mt-2.5 text-xs text-[#f10202] font-mono flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{inputError}</span>
            </div>
          )}

          {successMessage && (
            <div className="mt-2.5 text-xs text-green-700 font-mono flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* Main Analytics Content */}
      {weeklyResults.length > 0 && metrics ? (
        <div className="space-y-8 mt-6">
          {/* KPI Dashboard Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* KPI 1: Neueste Woche & Trend */}
            <div className="p-4 bg-white border border-[#e5e5e5] shadow-xs">
              <div className="text-[10px] uppercase tracking-wider text-[#666] font-mono">
                Letzte Woche (KW {metrics.latest.kw})
              </div>
              <div className="text-2xl sm:text-3xl font-black text-black font-mono mt-1">
                {metrics.latest.overallPercentage}%
              </div>
              <div className="text-xs text-[#666] mt-0.5 flex items-center gap-1">
                <span>Ø {metrics.latest.averageScore} / 5.0</span>
                {metrics.deltaScore !== null && (
                  <span
                    className={`font-mono font-bold inline-flex items-center text-[10px] px-1 ${
                      metrics.deltaScore > 0
                        ? 'text-green-700 bg-green-50'
                        : metrics.deltaScore < 0
                        ? 'text-red-700 bg-red-50'
                        : 'text-zinc-600 bg-zinc-100'
                    }`}
                  >
                    {metrics.deltaScore > 0 ? (
                      <>
                        <ArrowUpRight className="w-3 h-3" />+{metrics.deltaScore}
                      </>
                    ) : metrics.deltaScore < 0 ? (
                      <>
                        <ArrowDownRight className="w-3 h-3" />{metrics.deltaScore}
                      </>
                    ) : (
                      <>
                        <Minus className="w-3 h-3" />±0.0
                      </>
                    )}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-[#888] mt-2 font-mono">
                {metrics.latest.count} Teilnehmer
              </div>
            </div>

            {/* KPI 2: Historischer Gesamtschnitt */}
            <div className="p-4 bg-white border border-[#e5e5e5] shadow-xs">
              <div className="text-[10px] uppercase tracking-wider text-[#666] font-mono">
                Gesamtdurchschnitt
              </div>
              <div className="text-2xl sm:text-3xl font-black text-black font-mono mt-1">
                {metrics.avgPercentage}%
              </div>
              <div className="text-xs text-[#666] mt-0.5">
                Ø {metrics.avgScore} / 5.0
              </div>
              <div className="text-[10px] text-[#888] mt-2 font-mono">
                Über alle {metrics.countWeeks} erfassten Wochen
              </div>
            </div>

            {/* KPI 3: Stärkste Kategorie */}
            <div className="p-4 bg-white border border-[#e5e5e5] shadow-xs">
              <div className="text-[10px] uppercase tracking-wider text-[#666] font-mono">
                Stärkste Dimension
              </div>
              <div className="text-sm sm:text-base font-bold text-black truncate mt-1">
                {metrics.strongestCategory ? metrics.strongestCategory.label : '—'}
              </div>
              <div className="text-xs text-green-700 font-mono font-bold mt-0.5">
                {metrics.strongestCategory ? `Ø ${metrics.strongestCategory.avg} / 5.0` : '—'}
              </div>
              <div className="text-[10px] text-[#888] mt-2 font-mono">
                Konstanter Teamerfolg
              </div>
            </div>

            {/* KPI 4: Größtes Handlungsfeld */}
            <div className="p-4 bg-white border border-[#e5e5e5] shadow-xs">
              <div className="text-[10px] uppercase tracking-wider text-[#666] font-mono">
                Größtes Potenzial
              </div>
              <div className="text-sm sm:text-base font-bold text-black truncate mt-1">
                {metrics.lowestCategory ? metrics.lowestCategory.label : '—'}
              </div>
              <div className="text-xs text-[#f10202] font-mono font-bold mt-0.5">
                {metrics.lowestCategory ? `Ø ${metrics.lowestCategory.avg} / 5.0` : '—'}
              </div>
              <div className="text-[10px] text-[#888] mt-2 font-mono">
                Prioritäres Handlungsfeld
              </div>
            </div>
          </div>

          {/* Chart 1: Gesamtstimmung / Team Pulse Verlauf */}
          <div className="p-5 sm:p-6 bg-white border border-[#e5e5e5]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-black flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#f10202]" />
                  <span>Entwicklung Team-Pulse (Gesamtstimmung)</span>
                </h3>
                <p className="text-xs text-[#666] mt-0.5">
                  Durchschnittlicher Score (1.0 bis 5.0) und Stimmungsprozent über alle Wochen.
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#f10202]" />
                  <span className="text-black font-bold">Team-Puls</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-zinc-300 border-t border-dashed border-zinc-400" />
                  <span className="text-zinc-500">Zielbereich (Ø 4.0)</span>
                </div>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="audiPulseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f10202" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f10202" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#888"
                    fontSize={11}
                    fontFamily="monospace"
                    tickLine={false}
                  />
                  <YAxis
                    domain={[1, 5]}
                    ticks={[1, 2, 3, 4, 5]}
                    stroke="#888"
                    fontSize={11}
                    fontFamily="monospace"
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-black text-white p-3 border border-zinc-700 shadow-xl font-mono text-xs">
                            <div className="font-bold text-sm tracking-wider text-white border-b border-zinc-800 pb-1 mb-2">
                              {data.fullLabel}
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between gap-4">
                                <span className="text-zinc-400">Score:</span>
                                <span className="text-[#f10202] font-bold">Ø {data.score} / 5.0</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-zinc-400">Puls:</span>
                                <span className="text-white font-bold">{data.percentage}%</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-zinc-400">Teilnehmer:</span>
                                <span className="text-white">{data.participants}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={4.0}
                    stroke="#999"
                    strokeDasharray="4 4"
                    label={{
                      value: 'Ziel: 4.0',
                      position: 'insideTopRight',
                      fill: '#888',
                      fontSize: 10,
                      fontFamily: 'monospace'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#f10202"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#audiPulseGradient)"
                    dot={{ r: 5, fill: '#f10202', stroke: '#fff', strokeWidth: 2 }}
                    activeDot={{ r: 7, fill: '#000', stroke: '#f10202', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Kategorie-Entwicklung im Zeitverlauf */}
          {availableCategories.length > 0 && (
            <div className="p-5 sm:p-6 bg-white border border-[#e5e5e5]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                    Kategorie-Trends im Detail
                  </h3>
                  <p className="text-xs text-[#666] mt-0.5">
                    Vergleichende Entwicklung einzelner Schwerpunkte (z.B. Workload vs. Zusammenarbeit).
                  </p>
                </div>

                {/* Category toggles */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {availableCategories.map((catKey) => {
                    const isVisible = visibleCategories[catKey] !== false;
                    const color = CATEGORY_COLORS[catKey] || '#666';
                    return (
                      <button
                        key={catKey}
                        type="button"
                        onClick={() => toggleCategory(catKey)}
                        className={`px-2 py-0.5 text-[10px] font-mono border transition-all cursor-pointer flex items-center gap-1.5 ${
                          isVisible
                            ? 'bg-zinc-900 text-white border-zinc-900 font-bold'
                            : 'bg-zinc-100 text-zinc-400 border-zinc-200 line-through'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="capitalize">{catKey}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#888"
                      fontSize={11}
                      fontFamily="monospace"
                      tickLine={false}
                    />
                    <YAxis
                      domain={[1, 5]}
                      ticks={[1, 2, 3, 4, 5]}
                      stroke="#888"
                      fontSize={11}
                      fontFamily="monospace"
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-black text-white p-3 border border-zinc-700 shadow-xl font-mono text-xs max-w-xs">
                              <div className="font-bold border-b border-zinc-800 pb-1 mb-2 text-white">
                                {label}
                              </div>
                              <div className="space-y-1">
                                {payload.map((entry: any, i: number) => (
                                  <div
                                    key={i}
                                    className="flex justify-between items-center gap-3 text-xs"
                                  >
                                    <span className="flex items-center gap-1.5 capitalize text-zinc-400">
                                      <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: entry.color }}
                                      />
                                      {entry.name}:
                                    </span>
                                    <span className="font-bold text-white">
                                      Ø {entry.value} / 5.0
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {availableCategories.map((catKey) => {
                      if (visibleCategories[catKey] === false) return null;
                      const color = CATEGORY_COLORS[catKey] || '#666';
                      return (
                        <Line
                          key={catKey}
                          type="monotone"
                          dataKey={catKey}
                          name={catKey}
                          stroke={color}
                          strokeWidth={2}
                          dot={{ r: 3.5, fill: color, stroke: '#fff', strokeWidth: 1.5 }}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Chart 3: Teilnehmer-Entwicklung */}
          <div className="p-5 sm:p-6 bg-white border border-[#e5e5e5]">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-black flex items-center gap-2">
                  <Users className="w-4 h-4 text-black" />
                  <span>Teilnahmequote pro Woche</span>
                </h3>
                <p className="text-xs text-[#666] mt-0.5">
                  Anzahl abgegebener anonymer Check-Ins über die Zeit.
                </p>
              </div>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#888"
                    fontSize={11}
                    fontFamily="monospace"
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#888"
                    fontSize={11}
                    fontFamily="monospace"
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-black text-white p-2.5 border border-zinc-700 shadow-xl font-mono text-xs">
                            <div className="font-bold text-white mb-1">{label}</div>
                            <div className="text-zinc-300">
                              Teilnehmer: <span className="font-bold text-white">{payload[0].value} Kollegen</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="participants" fill="#111111" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table: Chronologische Wochenübersicht */}
          <div className="p-5 sm:p-6 bg-white border border-[#e5e5e5]">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                Erfasste Wochen im Überblick ({weeklyResults.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e5e5e5] text-[10px] uppercase font-mono tracking-wider text-[#666]">
                    <th className="py-2.5 pr-4">Kalenderwoche</th>
                    <th className="py-2.5 px-3">Teilnahme</th>
                    <th className="py-2.5 px-3">Score</th>
                    <th className="py-2.5 px-3">Puls</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Top / Handlungsfeld</th>
                    <th className="py-2.5 pl-3 text-right">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f0] font-mono">
                  {weeklyResults.map((w, idx) => (
                    <tr key={w.rawCode} className="hover:bg-[#fafafa] transition-colors">
                      <td className="py-3 pr-4 font-bold text-black">
                        KW {w.kw} <span className="text-[#888] font-normal text-[10px]">({w.year})</span>
                      </td>
                      <td className="py-3 px-3 text-[#555]">
                        {w.count} Kollegen
                      </td>
                      <td className="py-3 px-3 font-bold text-black">
                        Ø {w.averageScore}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-black">{w.overallPercentage}%</span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[9px] uppercase px-1.5 py-0.5 font-bold tracking-wider ${
                            w.status === 'peak'
                              ? 'bg-green-100 text-green-800'
                              : w.status === 'good'
                              ? 'bg-zinc-100 text-zinc-800'
                              : w.status === 'neutral'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {w.verdictTitle}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[10px] text-[#666]">
                        {w.topTopic && (
                          <span className="text-green-700">▲ {w.topTopic}</span>
                        )}
                        {w.topTopic && w.lowestTopic && <span> • </span>}
                        {w.lowestTopic && (
                          <span className="text-[#f10202]">▼ {w.lowestTopic}</span>
                        )}
                      </td>
                      <td className="py-3 pl-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleCopySingleCode(w.rawCode, idx)}
                          className="px-2 py-1 border border-[#e5e5e5] hover:border-black text-[10px] text-black mr-2 transition-colors cursor-pointer"
                          title="Wochencode kopieren"
                        >
                          {copiedCodeIndex === idx ? 'Kopiert' : 'Code'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveCode(idx)}
                          className="p-1 text-[#999] hover:text-[#f10202] transition-colors cursor-pointer inline-flex items-center"
                          title="Woche entfernen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="my-12 p-8 sm:p-12 text-center bg-white border border-[#e5e5e5]">
          <div className="w-12 h-12 rounded-full bg-[#f10202]/10 text-[#f10202] flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider text-black">
            Noch keine Wochencodes hinterlegt
          </h2>
          <p className="text-xs text-[#666] max-w-md mx-auto mt-2 leading-relaxed">
            Füge Wochencodes aus deinen wöchentlichen Teamrunden ein oder lade direkt Beispieldaten, um die Diagramme und Zeitverläufe in Aktion zu sehen.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onLoadSampleData}
              className="px-5 py-2.5 bg-black hover:bg-[#222] text-white text-xs uppercase font-mono font-bold tracking-wider transition-colors cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#f10202]" />
              <span>6 Wochen Beispieldaten laden</span>
            </button>

            <button
              type="button"
              onClick={() => setIsInputOpen(true)}
              className="px-5 py-2.5 border border-[#e5e5e5] hover:border-black text-black text-xs uppercase font-mono font-bold tracking-wider transition-colors cursor-pointer"
            >
              Code manuell einfügen
            </button>

            <button
              type="button"
              onClick={onNavigateToTeam}
              className="px-5 py-2.5 border border-[#e5e5e5] hover:border-black text-[#666] text-xs uppercase font-mono font-bold tracking-wider transition-colors cursor-pointer"
            >
              Zur Team-Runde
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
