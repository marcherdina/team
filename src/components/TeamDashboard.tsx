import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Plus,
  Trash2,
  Share2,
  Sparkles,
  Download,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  X,
  Lock,
  ArrowRight,
  MessageSquare,
  TrendingUp,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import {
  DecodedEntry,
  TeamAnalytics,
  QuestionStat,
  CustomQuestionStats,
  AiActionPlan,
  QuestionCategory
} from '../types';
import {
  decodeSubmission,
  extractTokensFromText,
  WeekFactors
} from '../utils/algorithm';
import { QUESTIONS_POOL, getQuestionById, CATEGORY_META } from '../data/questions';
import { generateTeamPdfReport } from '../utils/pdfExport';
import { encodeWeeklyResultCode } from '../utils/weeklyTrends';

export interface DecodedEntryWithMeta extends DecodedEntry {
  isDuplicate?: boolean;
  originalIndex: number;
}

interface TeamDashboardProps {
  weekFactors: WeekFactors;
  teamCodes: string[];
  onAddCode: (code: string) => void;
  onAddCodes?: (codes: string[]) => void;
  onRemoveCode: (index: number) => void;
  onClearAll: () => void;
  onLoadSampleData: () => void;
  myLastSecretId?: string;
  onNavigateToAnalyze?: (weeklyCode?: string) => void;
}

export const TeamDashboard: React.FC<TeamDashboardProps> = ({
  weekFactors,
  teamCodes,
  onAddCode,
  onAddCodes,
  onRemoveCode,
  onClearAll,
  onLoadSampleData,
  onNavigateToAnalyze
}) => {
  const [singleInput, setSingleInput] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedWeeklyCode, setCopiedWeeklyCode] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showSingleInput, setShowSingleInput] = useState(false);

  // AI Action Plan state
  const [aiPlan, setAiPlan] = useState<AiActionPlan | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  // Real-time detection of tokens in bulk text
  const recognizedCount = useMemo(() => {
    if (!bulkInput.trim()) return 0;
    return extractTokensFromText(bulkInput).length;
  }, [bulkInput]);

  // Decode all team codes with duplicate detection
  const { decodedEntries, uniqueValidEntries, duplicateCount, invalidCount } = useMemo(() => {
    const decoded = teamCodes.map((code) => decodeSubmission(code, weekFactors));
    const seenTokens = new Set<string>();
    const seenSecretIds = new Set<string>();
    const uniqueValids: DecodedEntry[] = [];
    let dups = 0;
    let invalids = 0;

    const entriesWithMeta: DecodedEntryWithMeta[] = decoded.map((entry, index) => {
      if (!entry.isValid) {
        invalids++;
        return { ...entry, isDuplicate: false, originalIndex: index };
      }

      // Check for duplicate by normalized code string
      const normalizedToken = entry.rawCode.trim().toUpperCase();
      // Also check if secretId matches an already registered user
      const normalizedSecretId =
        entry.secretId && entry.secretId !== 'UNGÜLTIG'
          ? entry.secretId.trim().toUpperCase()
          : '';

      const isDup =
        seenTokens.has(normalizedToken) ||
        (normalizedSecretId ? seenSecretIds.has(normalizedSecretId) : false);

      if (isDup) {
        dups++;
        return { ...entry, isDuplicate: true, originalIndex: index };
      }

      seenTokens.add(normalizedToken);
      if (normalizedSecretId) {
        seenSecretIds.add(normalizedSecretId);
      }
      uniqueValids.push(entry);
      return { ...entry, isDuplicate: false, originalIndex: index };
    });

    return {
      decodedEntries: entriesWithMeta,
      uniqueValidEntries: uniqueValids,
      duplicateCount: dups,
      invalidCount: invalids
    };
  }, [teamCodes, weekFactors]);

  const MIN_REQUIRED_CODES = 5;
  const distinctCodeCount = uniqueValidEntries.length;
  const isPrivacyThresholdMet = distinctCodeCount >= MIN_REQUIRED_CODES;

  // Shuffle displayed lists deterministically based on hash so order NEVER correlates with import sequence
  const shuffledDisplayEntries = useMemo(() => {
    if (decodedEntries.length <= 1) return decodedEntries;
    const entries = [...decodedEntries];
    let seed = weekFactors.kw * 10007 + weekFactors.year + 7919;
    for (let i = 0; i < entries.length; i++) {
      const str = entries[i].rawCode;
      for (let c = 0; c < str.length; c++) {
        seed = (seed * 33 + str.charCodeAt(c)) & 0xffffffff;
      }
    }
    const pseudoRand = () => {
      seed = (seed * 1664525 + 1013904223) & 0xffffffff;
      return (seed >>> 0) / 4294967296;
    };

    // Fisher-Yates shuffle
    for (let i = entries.length - 1; i > 0; i--) {
      const j = Math.floor(pseudoRand() * (i + 1));
      [entries[i], entries[j]] = [entries[j], entries[i]];
    }
    return entries;
  }, [decodedEntries, weekFactors]);

  const shuffledUnlockedEntries = useMemo(() => {
    if (!isPrivacyThresholdMet) return [];
    return shuffledDisplayEntries;
  }, [isPrivacyThresholdMet, shuffledDisplayEntries]);

  // Compute team analytics - ONLY when at least 5 different valid codes are present!
  const analytics = useMemo<TeamAnalytics | null>(() => {
    if (!isPrivacyThresholdMet) return null;

    const valid = uniqueValidEntries;
    const count = valid.length;
    const scores = valid.map((e) => e.averageScore);
    const sum = scores.reduce((a, b) => a + b, 0);
    const averageScore = Number((sum / count).toFixed(2));
    const overallPercentage = Math.round((averageScore / 5) * 100);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);

    // Distribution
    const distribution = {
      critical: valid.filter((e) => e.averageScore <= 2.0).length,
      stressed: valid.filter((e) => e.averageScore > 2.0 && e.averageScore <= 2.9).length,
      neutral: valid.filter((e) => e.averageScore > 2.9 && e.averageScore <= 3.7).length,
      good: valid.filter((e) => e.averageScore > 3.7 && e.averageScore <= 4.4).length,
      peak: valid.filter((e) => e.averageScore > 4.4).length
    };

    // Category scores calculation across all answered questions
    const categoryAgg: Record<string, { label: string; sum: number; count: number }> = {};
    valid.forEach((entry) => {
      entry.questionAnswers.forEach((qa) => {
        const q = getQuestionById(qa.questionId);
        const cat = q?.category || 'team';
        const label = CATEGORY_META[cat as QuestionCategory]?.label || q?.categoryLabel || 'Kategorie';
        if (!categoryAgg[cat]) {
          categoryAgg[cat] = { label, sum: 0, count: 0 };
        }
        categoryAgg[cat].sum += qa.points;
        categoryAgg[cat].count += 1;
      });
    });

    const categoryScores: Record<string, { label: string; score: number; count: number }> = {};
    Object.keys(categoryAgg).forEach((cat) => {
      const item = categoryAgg[cat];
      categoryScores[cat] = {
        label: item.label,
        count: item.count,
        score: Number((item.sum / item.count).toFixed(2))
      };
    });

    // Question-by-Question Stats
    const questionAgg: Record<number, { scores: number[]; count: number }> = {};
    valid.forEach((entry) => {
      entry.questionAnswers.forEach((qa) => {
        if (!questionAgg[qa.questionId]) {
          questionAgg[qa.questionId] = { scores: [], count: 0 };
        }
        questionAgg[qa.questionId].scores.push(qa.points);
        questionAgg[qa.questionId].count += 1;
      });
    });

    const questionStats: QuestionStat[] = Object.keys(questionAgg).map((idStr) => {
      const qId = parseInt(idStr, 10);
      const q = getQuestionById(qId);
      const agg = questionAgg[qId];
      const qSum = agg.scores.reduce((a, b) => a + b, 0);
      const avg = Number((qSum / agg.count).toFixed(2));
      const dist: [number, number, number, number, number] = [0, 0, 0, 0, 0];
      agg.scores.forEach((s) => {
        if (s >= 1 && s <= 5) dist[s - 1] += 1;
      });

      return {
        questionId: qId,
        title: q?.title || `Frage #${qId}`,
        tag: q?.tag || 'Thema',
        category: (q?.category || 'team') as QuestionCategory,
        categoryLabel: q?.categoryLabel || 'Kategorie',
        averageScore: avg,
        percentage: Math.round((avg / 5) * 100),
        count: agg.count,
        distribution: dist
      };
    });

    // Sort questions by average score ascending (lowest first) so weak spots are instantly clear
    questionStats.sort((a, b) => a.averageScore - b.averageScore);

    // Custom Question Stats
    let customQuestionStats: CustomQuestionStats | undefined = undefined;
    const customEntries = valid.filter((e) => e.customQuestion && e.customQuestion.points >= 1);
    if (customEntries.length > 0) {
      const customSum = customEntries.reduce((acc, e) => acc + (e.customQuestion?.points || 0), 0);
      const customAvg = Number((customSum / customEntries.length).toFixed(2));
      const comments = customEntries
        .map((e) => e.customQuestion?.comment)
        .filter((c): c is string => Boolean(c && c.trim().length > 0));

      customQuestionStats = {
        count: customEntries.length,
        averageScore: customAvg,
        percentage: Math.round((customAvg / 5) * 100),
        comments
      };
    }

    // Health verdict
    let healthVerdict: TeamAnalytics['healthVerdict'] = {
      title: 'Ausgeglichenes Stimmungsbild',
      description: 'Solide Woche im Team. Gute Arbeitsgrundlage ohne akute Ausreißer.',
      status: 'neutral'
    };

    if (averageScore >= 4.2) {
      healthVerdict = {
        title: 'Spitzenleistung & Maximaler Flow',
        description: 'Das Team fühlt sich stark unterstützt, arbeitet fokussiert und hat Spaß an den Aufgaben.',
        status: 'peak'
      };
    } else if (averageScore >= 3.5) {
      healthVerdict = {
        title: 'Guter & produktiver Team-Flow',
        description: 'Die meisten Themen laufen reibungslos. Vereinzelte kleinere Reibungspunkte sind beherrschbar.',
        status: 'good'
      };
    } else if (averageScore <= 2.7) {
      healthVerdict = {
        title: 'Erhöhte Belastung & Handlungsbedarf',
        description: 'Mehrere Teammitglieder melden Blockaden, Deadlinestress oder Tooling-Probleme.',
        status: 'critical'
      };
    }

    return {
      count,
      averageScore,
      overallPercentage,
      minScore,
      maxScore,
      distribution,
      categoryScores,
      questionStats,
      customQuestionStats,
      healthVerdict
    };
  }, [isPrivacyThresholdMet, uniqueValidEntries]);

  // Add single code
  const handleAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleInput.trim()) return;

    const trimmed = singleInput.trim();
    const test = decodeSubmission(trimmed, weekFactors);
    if (!test.isValid) {
      setInputError('Code nicht erkannt. Erwartet: z.B. 397-MM-u4ynt oder 397-R824-u4ynt-c5_Top');
      return;
    }

    // Check if already in list
    if (teamCodes.some((c) => c.trim().toUpperCase() === trimmed.toUpperCase())) {
      setInputError('Dieser Code ist bereits in der Liste vorhanden. Zur Freischaltung der Ergebnisse werden 5 unterschiedliche Codes benötigt.');
      return;
    }

    setInputError(null);
    onAddCode(trimmed);
    setSingleInput('');
    setImportSuccessCount(1);
    setTimeout(() => setImportSuccessCount(null), 3000);
  };

  // Add bulk codes (multi-line, separated by newlines, Teams chat messages, etc.)
  const handleBulkSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const tokens = extractTokensFromText(bulkInput);
    if (tokens.length === 0) {
      setInputError('Keine gültigen Codes im Text erkannt. Format: z.B. 397-MM-u4ynt oder 397-R824-u4ynt');
      return;
    }

    if (onAddCodes) {
      onAddCodes(tokens);
    } else {
      tokens.forEach((line) => {
        onAddCode(line);
      });
    }

    setImportSuccessCount(tokens.length);
    setBulkInput('');
    setInputError(null);
    setTimeout(() => setImportSuccessCount(null), 4000);
  };

  // PDF Export
  const handleExportPdf = () => {
    if (!analytics) return;
    setIsExportingPdf(true);
    try {
      generateTeamPdfReport(analytics, weekFactors, aiPlan);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Fetch or generate AI Action Plan to raise mood > 80%
  const handleGenerateAiPlan = async () => {
    if (!analytics) return;
    setIsLoadingAi(true);
    setShowAiModal(true);

    try {
      const payload = {
        overallPercentage: analytics.overallPercentage,
        averageScore: analytics.averageScore,
        count: analytics.count,
        lowestQuestions: analytics.questionStats.slice(0, 4).map((q) => ({
          id: q.questionId,
          title: q.title,
          tag: q.tag,
          score: q.averageScore,
          percentage: q.percentage
        })),
        topQuestions: analytics.questionStats.slice(-2).map((q) => ({
          id: q.questionId,
          title: q.title,
          tag: q.tag,
          score: q.averageScore,
          percentage: q.percentage
        })),
        customFeedback: analytics.customQuestionStats
      };

      const res = await fetch('/api/ai-action-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to fetch action plan');
      const data: AiActionPlan = await res.json();
      setAiPlan(data);
    } catch (err) {
      console.error('AI plan generation error:', err);
    } finally {
      setIsLoadingAi(false);
    }
  };

  // Copy Summary text for Microsoft Teams chat
  const handleCopySummary = () => {
    if (!analytics) return;

    let text = `📊 **Team Pulse – KW ${weekFactors.kw}**\n` +
      `• Gesamt-Stimmung: ${analytics.overallPercentage}% (Ø ${analytics.averageScore} / 5.0)\n` +
      `• Feedback-Status: ${analytics.healthVerdict.title}\n` +
      `• Teilnahme: ${analytics.count} Kollegen (100% anonym)\n\n` +
      `**Top Themen & Handlungsfelder:**\n`;

    // 2 lowest and 1 highest question
    const lowest = analytics.questionStats.slice(0, 2);
    lowest.forEach((q) => {
      text += `⚠️ [${q.tag}]: Ø ${q.averageScore} / 5.0 (${q.percentage}%)\n`;
    });

    const highest = analytics.questionStats.slice(-1)[0];
    if (highest) {
      text += `✅ [${highest.tag}]: Ø ${highest.averageScore} / 5.0 (${highest.percentage}%)\n`;
    }

    if (analytics.customQuestionStats) {
      text += `\n💬 **Custom Frage:** Ø ${analytics.customQuestionStats.averageScore} / 5.0 (${analytics.customQuestionStats.percentage}%)`;
      if (analytics.customQuestionStats.comments.length > 0) {
        text += `\nKommentare: ${analytics.customQuestionStats.comments.join(', ')}`;
      }
    }

    text += `\n\n*Ausgewertet via Team Pulse*`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  // Encoded Weekly Result Code for Long-Term Analytics
  const weeklyResultCode = useMemo(() => {
    if (!analytics) return null;
    return encodeWeeklyResultCode(analytics, weekFactors);
  }, [analytics, weekFactors]);

  const handleCopyWeeklyCode = () => {
    if (!weeklyResultCode) return;
    navigator.clipboard.writeText(weeklyResultCode);
    setCopiedWeeklyCode(true);
    setTimeout(() => setCopiedWeeklyCode(false), 2500);
  };

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    if (!analytics) return [];
    if (activeCategoryFilter === 'all') return analytics.questionStats;
    return analytics.questionStats.filter((q) => q.category === activeCategoryFilter);
  }, [analytics, activeCategoryFilter]);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-8">
      {/* Top Banner & Title Bar */}
      <div className="bg-white border border-[#e5e5e5] p-6 sm:p-8 mb-6 shadow-none">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#e5e5e5]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-black rounded-full"></div>
              <span className="text-xs uppercase font-bold tracking-widest text-black">
                Team Pulse Teamrunde
              </span>
              <span className="text-xs font-mono font-bold text-[#666]">
                • KW {weekFactors.kw}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-light text-black tracking-tight">
              Stimmungsbild & Fragen-Analyse
            </h1>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="export-pdf-btn"
              disabled={!analytics || isExportingPdf}
              onClick={handleExportPdf}
              className={`px-3.5 py-2 border text-xs uppercase tracking-wider font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                analytics
                  ? 'border-black hover:bg-black hover:text-white text-black bg-white'
                  : 'border-[#e5e5e5] text-[#ccc] cursor-not-allowed'
              }`}
              title="Ergebnisbericht als PDF exportieren"
            >
              <Download className="w-3.5 h-3.5 text-black" />
              <span>{isExportingPdf ? 'Exportiere...' : 'PDF Export'}</span>
            </button>

            {/* Wochen-Ergebniscode Button for Langzeit-Analyse */}
            <button
              id="copy-weekly-code-btn"
              disabled={!analytics}
              onClick={handleCopyWeeklyCode}
              className={`px-3.5 py-2 border text-xs uppercase tracking-wider font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                analytics
                  ? 'border-black hover:bg-black hover:text-white text-black bg-white'
                  : 'border-[#e5e5e5] text-[#ccc] cursor-not-allowed'
              }`}
              title="Wochencode für Zeitverlauf kopieren"
            >
              {copiedWeeklyCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-600" />
                  <span>Code kopiert</span>
                </>
              ) : (
                <>
                  <TrendingUp className="w-3.5 h-3.5 text-black" />
                  <span>Wochen-Code</span>
                </>
              )}
            </button>

            <button
              id="ai-plan-btn"
              disabled={!analytics}
              onClick={handleGenerateAiPlan}
              className={`px-3.5 py-2 text-xs uppercase tracking-wider font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                analytics
                  ? 'bg-black hover:bg-[#222] text-white'
                  : 'bg-[#e5e5e5] text-[#999] cursor-not-allowed'
              }`}
              title="KI Analyse"
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>KI</span>
            </button>

            <button
              id="copy-teams-summary-btn"
              disabled={!analytics}
              onClick={handleCopySummary}
              className="px-3.5 py-2 border border-[#e5e5e5] hover:border-black text-xs uppercase tracking-wider font-bold text-black bg-white transition-all cursor-pointer flex items-center gap-1.5"
            >
              {copiedSummary ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-600" />
                  <span>Kopiert</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-[#666]" />
                  <span>Teams-Text</span>
                </>
              )}
            </button>

            {teamCodes.length > 0 && (
              <button
                id="clear-all-btn"
                onClick={onClearAll}
                className="px-3.5 py-2 border border-[#e5e5e5] hover:border-black hover:text-black text-xs uppercase tracking-wider font-bold text-[#666] bg-white transition-all cursor-pointer"
                title="Alle eingetragenen Codes zurücksetzen"
              >
                Zurücksetzen
              </button>
            )}

            {teamCodes.length === 0 && (
              <button
                id="load-sample-btn"
                onClick={onLoadSampleData}
                className="px-3.5 py-2 bg-black hover:bg-[#222] text-white text-xs uppercase tracking-wider font-bold transition-all cursor-pointer"
              >
                Testdaten laden
              </button>
            )}
          </div>
        </div>

        {/* Weekly Code Display Banner */}
        {analytics && weeklyResultCode && (
          <div className="mt-4 pt-4 border-t border-[#e5e5e5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#fafafa] p-3.5 border border-[#eee]">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-black" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-black">
                  Wochen-Ergebniscode für KW {weekFactors.kw} ({weekFactors.year})
                </span>
                <span className="text-[9px] bg-zinc-200 text-zinc-700 font-mono px-1.5 py-0.5 font-bold">
                  Für Analyse
                </span>
              </div>
              <div className="mt-1 font-mono text-[11px] text-[#444] truncate bg-white px-2 py-1 border border-[#ddd]">
                {weeklyResultCode}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyWeeklyCode}
                className="px-3 py-1.5 bg-black hover:bg-[#222] text-white text-[11px] uppercase font-mono font-bold tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {copiedWeeklyCode ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedWeeklyCode ? 'Kopiert' : 'Code kopieren'}</span>
              </button>

              {onNavigateToAnalyze && (
                <button
                  type="button"
                  onClick={() => onNavigateToAnalyze(weeklyResultCode)}
                  className="px-3 py-1.5 border border-[#ccc] hover:border-black text-black text-[11px] uppercase font-mono font-bold tracking-wider transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>In Analyse ansehen</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Multi-Line Bulk Input Box (Paste All Teams Codes by newline) */}
        <div className="mt-5 p-4 sm:p-5 bg-[#fafafa] border border-[#e5e5e5]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#e5e5e5]">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-black" />
              <h3 className="text-xs uppercase font-bold tracking-wider text-black">
                Teams-Codes gesammelt einfügen (Zeile für Zeile)
              </h3>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              {recognizedCount > 0 && (
                <span className="text-xs font-mono font-bold text-[#16a34a] bg-[#dcfce7] px-2 py-0.5 border border-[#bbf7d0]">
                  {recognizedCount} {recognizedCount === 1 ? 'Code im Text erkannt' : 'Codes im Text erkannt'}
                </span>
              )}
              <span className="text-xs font-mono text-[#666]">
                Erfasst: <strong className="text-black font-bold">{distinctCodeCount}</strong> / 5 unterschiedliche
                {duplicateCount > 0 && (
                  <span className="text-amber-800 font-bold ml-1.5">
                    ({duplicateCount} Duplikat{duplicateCount > 1 ? 'e' : ''})
                  </span>
                )}
              </span>
            </div>
          </div>

          <p className="text-xs text-[#666] mt-2.5 mb-3 leading-relaxed">
            Kopiere alle Zeilen aus Microsoft Teams hier hinein (jeder Code in einer neuen Zeile, auch mit Namenskürzel wie <code className="bg-[#eee] px-1 py-0.5 text-black">397-MM-u4ynt</code> oder Chat-Präfixen). Alle Namenskürzel werden automatisch in die sicheren Private IDs umgerechnet.{' '}
            <strong className="text-black">Mindestens 5 unterschiedliche Codes erforderlich</strong> (Duplikate werden ignoriert).
          </p>

          <form onSubmit={handleBulkSubmit} className="space-y-3">
            <textarea
              id="bulk-codes-textarea"
              rows={4}
              value={bulkInput}
              onChange={(e) => {
                setBulkInput(e.target.value);
                setInputError(null);
              }}
              placeholder={`Codes aus Teams einfügen (pro Zeile ein Code):\n397-MM-u4ynt\n397-AB-v8wpx\n397-TK-m1k9a-c5_Top`}
              className="w-full bg-white border border-[#ccc] focus:border-black p-3 text-xs font-mono text-black outline-none leading-relaxed transition-colors"
            />

            {inputError && (
              <div className="text-xs text-black font-mono flex items-center gap-1.5 p-2 bg-[#f0f0f0] border border-[#ccc]">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-black" />
                <span>{inputError}</span>
              </div>
            )}

            {importSuccessCount !== null && (
              <div className="text-xs text-[#16a34a] font-mono flex items-center gap-1.5 bg-[#dcfce7] border border-[#bbf7d0] p-2.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>✓ {importSuccessCount} {importSuccessCount === 1 ? 'Code' : 'Codes'} erfolgreich importiert und decodiert!</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowSingleInput(!showSingleInput)}
                  className="text-xs text-[#666] hover:text-black underline cursor-pointer"
                >
                  {showSingleInput ? 'Einzel-Eingabe schließen' : 'Einzelnen Code manuell eingeben...'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                {bulkInput.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setBulkInput('');
                      setInputError(null);
                    }}
                    className="px-3 py-2 border border-[#e5e5e5] hover:border-black text-xs uppercase tracking-wider font-bold text-[#666] hover:text-black bg-white cursor-pointer transition-all"
                  >
                    Leeren
                  </button>
                )}

                <button
                  type="submit"
                  id="submit-bulk-codes-btn"
                  disabled={!bulkInput.trim()}
                  className={`px-5 py-2 text-xs uppercase tracking-widest font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    bulkInput.trim()
                      ? 'bg-black hover:bg-[#1a1a1a] text-white'
                      : 'bg-[#e5e5e5] text-[#999] cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 text-white" />
                  <span>
                    {recognizedCount > 0
                      ? `Alle ${recognizedCount} Codes importieren`
                      : 'Codes importieren'}
                  </span>
                </button>
              </div>
            </div>
          </form>

          {/* Optional Single Code Quick Input */}
          {showSingleInput && (
            <form onSubmit={handleAddSingle} className="mt-3 pt-3 border-t border-[#e5e5e5] flex items-center gap-2">
              <input
                type="text"
                id="single-code-input"
                value={singleInput}
                onChange={(e) => {
                  setSingleInput(e.target.value);
                  setInputError(null);
                }}
                placeholder="Einzelnen Code eingeben (z.B. 397-MM-u4ynt oder 397-R824-u4ynt)"
                className="flex-1 bg-white border border-[#ccc] focus:border-black px-3 py-2 text-xs font-mono text-black outline-none"
              />
              <button
                type="submit"
                className="bg-black text-white px-4 py-2 text-xs uppercase tracking-wider font-bold hover:bg-[#222] cursor-pointer shrink-0"
              >
                Hinzufügen
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {analytics ? (
        <div className="space-y-6">
          {/* Privacy Verification Banner */}
          <div className="bg-[#f9f9f9] border border-[#e5e5e5] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2 text-black flex-wrap">
              <ShieldCheck className="w-4 h-4 text-[#16a34a] shrink-0" />
              <span>
                <strong>Anonymitätsschutz erfüllt:</strong> {distinctCodeCount} unterschiedliche Stimmen ausgewertet (k ≥ 5)
              </span>
              {duplicateCount > 0 && (
                <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 border border-amber-200 text-[11px]">
                  {duplicateCount} identische{duplicateCount > 1 ? 's' : ''} Duplikat{duplicateCount > 1 ? 'e' : ''} ignoriert
                </span>
              )}
            </div>
            <span className="text-[10px] uppercase text-[#666] tracking-wider shrink-0">
              100% Anonym • Zero-Backend
            </span>
          </div>

          {/* Key Metrics Overview Card */}
          <div className="bg-black text-white p-6 sm:p-8 border border-black">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Overall Percentage */}
              <div className="border-b md:border-b-0 md:border-r border-[#333] pb-6 md:pb-0 md:pr-6">
                <div className="text-[10px] uppercase text-[#999] tracking-widest mb-1">
                  Team-Puls Gesamt
                </div>
                <div className="flex items-baseline gap-3">
                  <div className="text-5xl sm:text-6xl font-light font-mono tracking-tight text-white">
                    {analytics.overallPercentage}%
                  </div>
                  <div className="text-lg font-light text-zinc-300 font-mono">
                    Ø {analytics.averageScore} / 5.0
                  </div>
                </div>
                <div className="text-xs text-[#aaa] mt-2 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  <span>{analytics.healthVerdict.title}</span>
                </div>
              </div>

              {/* Status & Description */}
              <div className="border-b md:border-b-0 md:border-r border-[#333] pb-6 md:pb-0 md:pr-6">
                <div className="text-[10px] uppercase text-[#999] tracking-widest mb-1">
                  Zusammenfassung
                </div>
                <p className="text-xs text-[#ccc] leading-relaxed">
                  {analytics.healthVerdict.description}
                </p>
                <div className="mt-3 flex items-center gap-3 text-[11px] font-mono text-[#888]">
                  <span>Min: {analytics.minScore}</span>
                  <span>•</span>
                  <span>Max: {analytics.maxScore}</span>
                  <span>•</span>
                  <span>Teilnahme: {analytics.count}</span>
                </div>
              </div>

              {/* Distribution */}
              <div>
                <div className="text-[10px] uppercase text-[#999] tracking-widest mb-2">
                  Stimmungs-Verteilung
                </div>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-[#888]">Peak (4.5–5.0)</span>
                    <span className="text-white font-bold">{analytics.distribution.peak}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#888]">Gut (3.8–4.4)</span>
                    <span className="text-white font-bold">{analytics.distribution.good}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#888]">Neutral (3.0–3.7)</span>
                    <span className="text-white font-bold">{analytics.distribution.neutral}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Kritisch (&lt;3.0)</span>
                    <span className="text-white font-bold">
                      {analytics.distribution.critical + analytics.distribution.stressed}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Custom Question Results Box (if any submissions present) */}
          {analytics.customQuestionStats && (
            <div className="bg-white border border-[#e5e5e5] p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#e5e5e5]">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-black" />
                  <h3 className="text-xs uppercase font-bold tracking-widest text-black">
                    Custom Frage (Teams-Chat)
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-[#666]">{analytics.customQuestionStats.count} Stimmen</span>
                  <span className="font-bold text-black bg-[#f5f5f5] px-2 py-0.5 border border-[#e5e5e5]">
                    Ø {analytics.customQuestionStats.averageScore} / 5.0 ({analytics.customQuestionStats.percentage}%)
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 w-full bg-[#f0f0f0] my-4 overflow-hidden">
                <div
                  className="h-full bg-black"
                  style={{ width: `${analytics.customQuestionStats.percentage}%` }}
                />
              </div>

              {/* Comments (max 10 characters) */}
              <div>
                <div className="text-[10px] uppercase text-[#888] tracking-widest mb-2">
                  Ein-Wort-Kommentare aus dem Team:
                </div>
                {analytics.customQuestionStats.comments.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {analytics.customQuestionStats.comments.map((comment, cIdx) => (
                      <span
                        key={cIdx}
                        className="bg-[#f9f9f9] border border-[#e5e5e5] px-2.5 py-1 text-xs font-mono font-medium text-black"
                      >
                        "{comment}"
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-[#999] italic">Keine Kommentare hinterlegt</span>
                )}
              </div>
            </div>
          )}

          {/* Question Breakdown Table (ID & Question Mapping) */}
          <div className="bg-white border border-[#e5e5e5] p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e5e5e5]">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                  <h3 className="text-xs uppercase font-bold tracking-widest text-black">
                    Fragen-Detailanalyse (ID-Zuordnung)
                  </h3>
                </div>
                <p className="text-xs text-[#666] mt-0.5">
                  Automatische Zuordnung von Frage-ID zu Antwort-Score
                </p>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1 overflow-x-auto">
                <button
                  onClick={() => setActiveCategoryFilter('all')}
                  className={`px-2.5 py-1 text-[11px] uppercase tracking-wider font-bold transition-all cursor-pointer ${
                    activeCategoryFilter === 'all'
                      ? 'bg-black text-white'
                      : 'text-[#666] hover:text-black'
                  }`}
                >
                  Alle ({analytics.questionStats.length})
                </button>
                {Object.keys(analytics.categoryScores).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategoryFilter(cat)}
                    className={`px-2.5 py-1 text-[11px] uppercase tracking-wider font-bold transition-all cursor-pointer ${
                      activeCategoryFilter === cat
                        ? 'bg-black text-white'
                        : 'text-[#666] hover:text-black'
                    }`}
                  >
                    {CATEGORY_META[cat as QuestionCategory]?.label.split(' ')[0] || cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Questions List */}
            <div className="divide-y divide-[#f0f0f0]">
              {filteredQuestions.map((qs) => {
                const isCritical = qs.averageScore < 3.0;
                const isTop = qs.averageScore >= 4.2;

                return (
                  <div key={qs.questionId} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: ID, Tag, Title */}
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-xs font-mono font-bold text-black bg-[#f5f5f5] px-2 py-0.5 border border-[#e5e5e5] shrink-0 mt-0.5">
                        #{qs.questionId < 10 ? `0${qs.questionId}` : qs.questionId}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-black">
                            {qs.tag}
                          </span>
                          <span className="text-[10px] text-[#999]">
                            • {qs.categoryLabel}
                          </span>
                        </div>
                        <h4 className="text-sm font-normal text-black leading-snug">
                          {qs.title}
                        </h4>
                      </div>
                    </div>

                    {/* Right: Score & Visual Bar */}
                    <div className="flex items-center gap-4 shrink-0 self-end md:self-center">
                      <div className="w-28 sm:w-36">
                        <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                          <span className="text-[#888]">{qs.percentage}%</span>
                          <span className="font-bold text-black">
                            Ø {qs.averageScore}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-[#f0f0f0] overflow-hidden">
                          <div
                            className={`h-full ${isCritical ? 'bg-[#666]' : isTop ? 'bg-black' : 'bg-[#333]'}`}
                            style={{ width: `${qs.percentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Small distribution dots */}
                      <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-[#888] pl-3 border-l border-[#e5e5e5]">
                        <span title="Antworten 1 (Negativ)" className="text-[#555] font-bold">{qs.distribution[0]}</span>
                        <span>/</span>
                        <span title="Antworten 5 (Positiv)" className="text-black font-bold">{qs.distribution[4]}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submissions List (Strictly Anonymous, No Highlight to protect presenter) */}
          <div className="bg-white border border-[#e5e5e5] p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e5]">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-[#666]" />
                <h3 className="text-xs uppercase font-bold tracking-widest text-black">
                  Anonyme Eingangs-Codes ({decodedEntries.length})
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase font-mono text-[#666]">
                  {distinctCodeCount} einzigartig{duplicateCount > 0 ? ` • ${duplicateCount} Duplikat${duplicateCount > 1 ? 'e' : ''}` : ''}
                </span>
                <span className="text-[10px] uppercase text-[#16a34a] font-mono font-bold tracking-wider hidden sm:inline">
                  Reihenfolge gemischt (Anti-Trace)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 mt-4">
              {shuffledUnlockedEntries.map((entry, idx) => (
                <div
                  key={idx}
                  className={`border p-2.5 flex items-center justify-between text-xs font-mono transition-all ${
                    entry.isDuplicate
                      ? 'bg-[#f5f5f5] border-[#e0e0e0] opacity-50'
                      : 'bg-[#f9f9f9] border-[#e5e5e5]'
                  }`}
                >
                  <div className="overflow-hidden flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-black">#{entry.secretId}</span>
                    {entry.isDuplicate ? (
                      <span className="text-[9px] uppercase px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300">
                        Duplikat
                      </span>
                    ) : (
                      <>
                        {entry.isConvertedFromInitials && (
                          <span
                            className="text-[9px] uppercase px-1 py-0.2 bg-[#f0f0f0] text-[#666] border border-[#ddd]"
                            title="Aus Kürzel in Private ID umgerechnet"
                          >
                            Private ID
                          </span>
                        )}
                        <span className="ml-1 font-bold text-black">
                          Ø {entry.averageScore.toFixed(1)}
                        </span>
                        {entry.customQuestion && (
                          <span className="text-[10px] bg-[#e5e5e5] text-black px-1">
                            C:{entry.customQuestion.points}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => onRemoveCode(entry.originalIndex)}
                    className="text-[#bbb] hover:text-black transition-colors p-1 cursor-pointer"
                    title="Code entfernen"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : teamCodes.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-[#e5e5e5] p-12 text-center">
          <div className="w-10 h-10 bg-[#f9f9f9] border border-[#e5e5e5] text-[#888] flex items-center justify-center mx-auto mb-4">
            <Users className="w-5 h-5 text-black" />
          </div>
          <h3 className="text-lg font-light text-black mb-1">
            Noch keine Codes eingetragen
          </h3>
          <p className="text-xs text-[#666] max-w-md mx-auto mb-6">
            Kopiere die Wochen-Codes der Teammitglieder in das Eingabefeld oben (ein Code pro Zeile), oder lade realistische Testdaten für eine Demo.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={onLoadSampleData}
              className="bg-black hover:bg-[#222] text-white px-5 py-2.5 text-xs uppercase tracking-wider font-bold transition-all cursor-pointer"
            >
              Testdaten laden (8 unterschiedliche Codes)
            </button>
          </div>
        </div>
      ) : (
        /* Anonymity Protection State (< 5 distinct codes) */
        <div className="space-y-6">
          {/* Anonymity Protection Card */}
          <div className="bg-white border border-[#e5e5e5] p-6 sm:p-8">
            <div className="max-w-3xl">
              {/* Shield Header */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-black text-white flex items-center justify-center">
                  <Lock className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-[11px] uppercase font-mono font-bold tracking-wider text-black">
                  Anonymitätsschutz aktiv (k-Anonymität ≥ 5)
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-zinc-200 text-zinc-900 border border-zinc-300">
                  Ergebnisse gesperrt
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-light text-black tracking-tight mb-2">
                Mindestens 5 unterschiedliche Codes erforderlich
              </h2>

              <p className="text-xs sm:text-sm text-[#555] leading-relaxed mb-6">
                Um die Vertraulichkeit jedes einzelnen Teammitglieds mathematisch abzusichern und Rückschlüsse auf Einzelpersonen unmöglich zu machen, wird die Team-Auswertung erst freigeschaltet, wenn mindestens <strong>5 voneinander verschiedene Check-In-Codes</strong> erfasst wurden.
              </p>

              {/* Visual 5-Step Indicator */}
              <div className="bg-[#f9f9f9] border border-[#e5e5e5] p-5 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-mono font-bold text-black">
                      {distinctCodeCount}
                    </span>
                    <span className="text-base font-mono text-[#666]">
                      / 5 unterschiedliche Stimmen
                    </span>
                  </div>
                  <div className="text-xs font-mono font-bold text-black">
                    Noch {MIN_REQUIRED_CODES - distinctCodeCount} {MIN_REQUIRED_CODES - distinctCodeCount === 1 ? 'weiterer unterschiedlicher Code' : 'weitere unterschiedliche Codes'} benötigt
                  </div>
                </div>

                {/* 5 Step Progress Blocks */}
                <div className="grid grid-cols-5 gap-2 sm:gap-3">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const isDone = i < distinctCodeCount;
                    const isNext = i === distinctCodeCount;
                    return (
                      <div
                        key={i}
                        className={`p-3 text-center transition-all ${
                          isDone
                            ? 'bg-black text-white border border-black'
                            : isNext
                            ? 'bg-zinc-100 border-2 border-black text-black'
                            : 'bg-white border border-dashed border-[#ccc] text-[#999]'
                        }`}
                      >
                        <div className="text-[10px] font-mono uppercase tracking-widest font-bold">
                          {isDone ? 'Erfasst' : isNext ? 'Nächster' : 'Offen'}
                        </div>
                        <div className="text-sm sm:text-base font-mono font-bold mt-0.5 flex items-center justify-center gap-1">
                          {isDone ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-green-400" />
                              <span>#{i + 1}</span>
                            </>
                          ) : (
                            <span>#{i + 1}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Duplicate Warning */}
              {duplicateCount > 0 && (
                <div className="mb-6 p-4 bg-[#fffbeb] border border-[#fde68a] text-xs text-[#92400e] font-mono flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-[#b45309] mt-0.5" />
                  <div>
                    <strong className="font-bold">
                      {duplicateCount} identische(r) Code(s) erkannt:
                    </strong>{' '}
                    Mehrfach eingereichte Kopien desselben Codes zählen nicht als zusätzliche Stimmen. Es werden 5 eigenständige Rückmeldungen unterschiedlicher Teammitglieder benötigt.
                  </div>
                </div>
              )}

              {/* Invalid Warning */}
              {invalidCount > 0 && (
                <div className="mb-6 p-4 bg-zinc-100 border border-zinc-300 text-xs text-black font-mono flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-black mt-0.5" />
                  <div>
                    <strong className="font-bold">{invalidCount} ungültige(r) Code(s):</strong>{' '}
                    Einige Codes konnten nicht decodiert werden und zählen nicht zur Mindestanzahl.
                  </div>
                </div>
              )}

              {/* Action Shortcuts */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={onLoadSampleData}
                  className="bg-black hover:bg-[#222] text-white px-5 py-2.5 text-xs uppercase tracking-wider font-bold transition-all cursor-pointer flex items-center gap-2"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Testdaten laden (8 unterschiedliche Codes)</span>
                </button>

                {teamCodes.length > 0 && (
                  <button
                    onClick={onClearAll}
                    className="border border-[#e5e5e5] hover:border-black bg-white text-[#666] hover:text-black px-4 py-2.5 text-xs uppercase tracking-wider font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Alle {teamCodes.length} Codes leeren</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* List of currently entered codes (Private IDs and Scores HIDDEN for strict anonymity!) */}
          <div className="bg-white border border-[#e5e5e5] p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#e5e5e5]">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-black" />
                <h3 className="text-xs uppercase font-bold tracking-widest text-black">
                  Erfasste Einreichungen ({teamCodes.length})
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#666]">
                Private IDs & Einzelergebnisse zum Schutz der Einreicher bis zur Freischaltung maskiert
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 mt-4">
              {shuffledDisplayEntries.map((entry, idx) => (
                <div
                  key={entry.originalIndex ?? idx}
                  className={`border p-2.5 flex items-center justify-between text-xs font-mono transition-all ${
                    entry.isDuplicate
                      ? 'bg-[#f5f5f5] border-[#e0e0e0] opacity-50'
                      : 'bg-[#f9f9f9] border-[#e5e5e5]'
                  }`}
                >
                  <div className="overflow-hidden flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-black flex items-center gap-1">
                      <Lock className="w-3 h-3 text-[#999]" />
                      <span>Stimme #{String(idx + 1).padStart(2, '0')}</span>
                    </span>
                    {entry.isDuplicate ? (
                      <span className="text-[9px] uppercase px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-200">
                        Duplikat (ignoriert)
                      </span>
                    ) : entry.isValid ? (
                      <span className="text-[9px] uppercase px-1.5 py-0.5 bg-green-100 text-green-800 border border-green-200">
                        ✓ Gültig
                      </span>
                    ) : (
                      <span className="text-[9px] uppercase px-1.5 py-0.5 bg-red-100 text-red-800 border border-red-200">
                        Fehlerhaft
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => onRemoveCode(entry.originalIndex ?? idx)}
                    className="text-[#bbb] hover:text-black transition-colors p-1 cursor-pointer"
                    title="Code entfernen"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-[#f0f0f0] text-[11px] text-[#777] font-mono flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#16a34a] shrink-0" />
              <span>
                <strong>Zero-Trace Schutz:</strong> Codes werden in randomisierter Reihenfolge dargestellt (nicht in Import-Reihenfolge). Weder Namenskürzel noch berechnete Private IDs werden angezeigt, solange weniger als 5 unterschiedliche Stimmen vorliegen.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* AI Action Plan Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border border-black max-w-2xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#e5e5e5]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-black" />
                <h3 className="text-xs uppercase font-bold tracking-widest text-black">
                  KI: Stimmungsbild auf &gt;80% anheben
                </h3>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="text-[#888] hover:text-black p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isLoadingAi ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-6 h-6 border-2 border-black border-t-transparent animate-spin mx-auto"></div>
                <p className="text-xs font-mono text-[#666]">
                  Gemini KI analysiert Fragen-Antwort-Muster und kalkuliert Hebel...
                </p>
              </div>
            ) : aiPlan ? (
              <div className="mt-6 space-y-6">
                {/* Score Goal Box */}
                <div className="bg-black text-white p-4 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase text-[#888] tracking-widest">Ausgangslage vs. Ziel</div>
                    <div className="text-2xl font-mono text-white font-light mt-0.5">
                      {aiPlan.currentPercentage}% <span className="text-zinc-400">→</span> {aiPlan.targetPercentage}%
                    </div>
                  </div>
                  <div className="text-right text-xs text-[#aaa] max-w-xs">
                    {aiPlan.summary}
                  </div>
                </div>

                {/* 3 Actions */}
                <div className="space-y-3">
                  <div className="text-xs uppercase font-bold tracking-widest text-black">
                    Empfohlene Sofortmaßnahmen für die Teamrunde:
                  </div>

                  {aiPlan.actions.map((act) => (
                    <div
                      key={act.priority}
                      className="p-4 border border-[#e5e5e5] bg-[#f9f9f9] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-black flex items-center gap-2">
                          <span className="w-5 h-5 bg-black text-white flex items-center justify-center text-[10px] font-mono">
                            {act.priority}
                          </span>
                          <span>{act.title}</span>
                        </span>
                        <span className="text-[10px] font-mono text-black font-bold">
                          {act.potentialImpact}
                        </span>
                      </div>

                      <div className="text-[11px] text-[#666] font-mono">
                        Bezug: {act.questionContext}
                      </div>

                      <p className="text-xs text-black leading-relaxed">
                        {act.recommendation}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[#e5e5e5]">
                  <button
                    onClick={() => setShowAiModal(false)}
                    className="px-4 py-2 bg-black text-white text-xs uppercase tracking-wider font-bold hover:bg-[#222] cursor-pointer"
                  >
                    Schließen
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
