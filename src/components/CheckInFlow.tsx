import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  ArrowRight,
  Sparkles,
  SkipForward,
  MessageSquare,
  ShieldCheck,
  Inbox,
  CheckCircle2,
  HelpCircle,
  Lock,
  Copy,
  Check
} from 'lucide-react';
import { Question, CustomQuestionVote } from '../types';
import { QUESTIONS_POOL } from '../data/questions';
import {
  generateSecretId,
  deriveSecretIdFromInitials,
  encodeAnswers,
  WeekFactors
} from '../utils/algorithm';

interface CheckInFlowProps {
  weekFactors: WeekFactors;
  onCheckInCompleted: (code: string) => void;
  onNavigateToTeam: () => void;
}

export const CheckInFlow: React.FC<CheckInFlowProps> = ({
  weekFactors,
  onCheckInCompleted,
  onNavigateToTeam
}) => {
  // State
  const [step, setStep] = useState<'intro' | 'questions' | 'custom' | 'result'>('intro');
  const [secretId, setSecretId] = useState<string>('');
  const [initials, setInitials] = useState<string>('');
  const [questionMode, setQuestionMode] = useState<'core' | 'all'>('core');
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, number>>({}); // questionId -> points (1-5)
  
  // Custom Question State
  const [customPoints, setCustomPoints] = useState<number | null>(null);
  const [customComment, setCustomComment] = useState<string>('');
  
  const [copiedTeamsToken, setCopiedTeamsToken] = useState<boolean>(false);
  const [copiedPrivateId, setCopiedPrivateId] = useState<boolean>(false);

  const [resultData, setResultData] = useState<{
    secretNumber: number;
    fullToken: string;
    privateId: string;
    publicId: string;
    scoreSum: number;
    averageScore: number;
    customQuestion?: CustomQuestionVote;
  } | null>(null);

  // Initialize Secret ID and Questions on mount
  useEffect(() => {
    initNewSession(questionMode);
  }, []);

  const initNewSession = (mode: 'core' | 'all' = questionMode) => {
    const newId = generateSecretId();
    setSecretId(newId);

    // Core set covers the 8 essential sprint questions:
    // 1: Teamwork, 2: Spaß, 3: Lernmöglichkeiten, 4: Führung, 5: Mission, 6: Moderation, 7: Kaffee, 10: Feierabend
    const coreIds = [1, 2, 3, 4, 5, 6, 7, 10];
    const selected = mode === 'core'
      ? QUESTIONS_POOL.filter((q) => coreIds.includes(q.id))
      : QUESTIONS_POOL;

    setSelectedQuestions(selected);
    setCurrentIdx(0);
    setAnswers({});
    setCustomPoints(null);
    setCustomComment('');
    setResultData(null);
    setStep('intro');
  };

  const handleSelectOption = (questionId: number, points: number) => {
    const updatedAnswers = { ...answers, [questionId]: points };
    setAnswers(updatedAnswers);

    // Auto-advance after small delay for smooth experience
    if (currentIdx < selectedQuestions.length - 1) {
      setTimeout(() => {
        setCurrentIdx((prev) => prev + 1);
      }, 180);
    }
  };

  // Move from questions to custom question
  const handleProceedToCustom = () => {
    setStep('custom');
  };

  // Complete check-in with or without custom question
  const handleFinalize = (customVote?: CustomQuestionVote) => {
    const answersArray = selectedQuestions.map((q) => ({
      questionId: q.id,
      points: answers[q.id] || 3
    }));

    const encoded = encodeAnswers(
      { initials: initials.trim() || undefined, secretId: secretId || undefined },
      answersArray,
      weekFactors,
      customVote
    );
    setResultData(encoded);
    setStep('result');
    onCheckInCompleted(encoded.fullToken);

    // Confetti
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#f10202', '#000000', '#737373']
    });
  };

  const handleSkipCustom = () => {
    // Completely skip custom question, not encoded in ID
    handleFinalize(undefined);
  };

  const handleSubmitCustom = () => {
    if (!customPoints) return;
    const vote: CustomQuestionVote = {
      points: customPoints,
      comment: customComment.trim().slice(0, 120) || undefined
    };
    handleFinalize(vote);
  };

  const handleCopyTeamsToken = () => {
    if (!resultData) return;
    navigator.clipboard.writeText(resultData.fullToken);
    setCopiedTeamsToken(true);
    setTimeout(() => setCopiedTeamsToken(false), 2000);
  };

  const handleCopyPrivateId = () => {
    if (!resultData) return;
    navigator.clipboard.writeText(`#${resultData.privateId}`);
    setCopiedPrivateId(true);
    setTimeout(() => setCopiedPrivateId(false), 2000);
  };

  // 1. INTRO STEP (Minimalist Audi clean style)
  if (step === 'intro') {
    const derivedPrivateId = initials.trim()
      ? deriveSecretIdFromInitials(initials, weekFactors)
      : secretId;

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="max-w-xl mx-auto py-10 px-4"
      >
        <div className="bg-white border border-[#e5e5e5] p-6 sm:p-10 shadow-none">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#e5e5e5]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#f10202] rounded-full"></div>
              <span className="text-xs uppercase font-bold tracking-widest text-black">
                Audi IT Pulse
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-black">
              KW {weekFactors.kw}
            </span>
          </div>

          {/* Title & minimal 1-line description */}
          <div className="my-6">
            <h1 className="text-2xl sm:text-3xl font-light text-black tracking-tight">
              Wochen-Check-In
            </h1>
            <p className="text-xs text-[#666] mt-1 tracking-wide">
              {selectedQuestions.length} Fragen mit fester ID-Zuordnung • 100% anonym
            </p>
          </div>

          {/* Mode Switch: Core 8 vs All 20 */}
          <div className="mb-6 p-1 bg-[#f5f5f5] border border-[#e5e5e5] flex gap-1">
            <button
              onClick={() => {
                setQuestionMode('core');
                initNewSession('core');
              }}
              className={`flex-1 py-2 text-[11px] uppercase tracking-wider font-bold transition-all cursor-pointer ${
                questionMode === 'core'
                  ? 'bg-white text-black shadow-xs border border-[#e0e0e0]'
                  : 'text-[#666] hover:text-black'
              }`}
            >
              Kompakt ({8} Kernfragen)
            </button>
            <button
              onClick={() => {
                setQuestionMode('all');
                initNewSession('all');
              }}
              className={`flex-1 py-2 text-[11px] uppercase tracking-wider font-bold transition-all cursor-pointer ${
                questionMode === 'all'
                  ? 'bg-white text-black shadow-xs border border-[#e0e0e0]'
                  : 'text-[#666] hover:text-black'
              }`}
            >
              Vollständig (Alle 20 Fragen)
            </button>
          </div>

          {/* Namenskürzel (Initials) & Public vs Private ID Concept */}
          <div className="bg-[#f9f9f9] border border-[#e5e5e5] p-5 my-6">
            <div className="flex items-center justify-between gap-3 mb-2">
              <label htmlFor="user-initials-input" className="text-xs font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#f10202]" />
                <span>Dein Namenskürzel (z.B. MM für Max Mustermann)</span>
              </label>
              <span className="text-[10px] text-[#888] font-mono">Empfohlen</span>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <input
                id="user-initials-input"
                type="text"
                maxLength={4}
                value={initials}
                onChange={(e) => setInitials(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="z.B. MM"
                className="w-full sm:w-28 bg-white border border-[#ccc] focus:border-black px-3 py-2 text-base font-mono font-bold text-black uppercase outline-none text-center tracking-wider"
              />
              <div className="flex-1 text-xs text-[#555] leading-relaxed">
                {initials.trim() ? (
                  <div>
                    In Teams sendest du: <span className="font-mono font-bold text-black bg-white px-1.5 py-0.5 border border-[#ddd]">397-{initials.trim().toUpperCase()}-...</span>
                    <div className="text-[11px] text-[#888] mt-1">
                      In der Teamrunde wird daraus automatisch deine Private ID: <span className="font-mono font-bold text-[#f10202]">#{derivedPrivateId}</span>
                    </div>
                  </div>
                ) : (
                  <span>
                    Gib dein Kürzel ein. Du versendest den Code mit deinem Kürzel in Teams, aber in der Teamrunde wird er automatisch in deine geheime Private ID umgerechnet!
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#e5e5e5] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[#666]">Deine geheime Private ID:</span>
                <span className="font-mono font-bold text-black bg-white px-2 py-0.5 border border-[#ddd]">
                  #{derivedPrivateId}
                </span>
              </div>
              {!initials.trim() && (
                <button
                  type="button"
                  onClick={() => setSecretId(generateSecretId())}
                  className="flex items-center gap-1 text-[10px] uppercase font-bold text-[#666] hover:text-black cursor-pointer"
                >
                  <RotateCcw className="w-2.5 h-2.5 text-[#f10202]" />
                  <span>Neu würfeln</span>
                </button>
              )}
            </div>
          </div>

          {/* Action Button */}
          <button
            id="start-checkin-btn"
            onClick={() => setStep('questions')}
            className="w-full bg-black hover:bg-[#1a1a1a] text-white text-xs uppercase tracking-widest font-bold py-4 px-6 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Starten</span>
            <ArrowRight className="w-4 h-4 text-[#f10202]" />
          </button>

          <div className="mt-6 pt-3 border-t border-[#e5e5e5] flex items-center justify-between text-[10px] uppercase tracking-widest text-[#999]">
            <span>Fragen-IDs mitgespeichert</span>
            <span>Client-Side Verschlüsselung</span>
          </div>
        </div>
      </motion.div>
    );
  }

  // 2. QUESTIONS STEP (With clear question IDs and category tag)
  if (step === 'questions') {
    const currentQ = selectedQuestions[currentIdx];
    const currentAnswerPoints = answers[currentQ.id];
    const progressPercent = ((currentIdx + 1) / (selectedQuestions.length + 1)) * 100;
    const isLastRegularQuestion = currentIdx === selectedQuestions.length - 1;
    const hasAnsweredCurrent = answers[currentQ.id] !== undefined;

    return (
      <div className="max-w-xl mx-auto py-8 sm:py-10 px-4">
        {/* Progress & Header */}
        <div className="mb-4 flex items-center justify-between border-b border-[#e5e5e5] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#f10202] rounded-full"></div>
            <span className="text-xs uppercase font-bold tracking-widest text-black">
              #{secretId}
            </span>
            <span className="text-xs font-mono font-bold text-[#666] ml-2">
              ID {currentQ.id < 10 ? `0${currentQ.id}` : currentQ.id}
            </span>
          </div>
          <span className="text-xs font-mono text-[#666]">
            {currentIdx + 1} / {selectedQuestions.length}
          </span>
        </div>

        {/* Minimal Progress Bar */}
        <div className="h-1 w-full bg-[#e5e5e5] mb-6 overflow-hidden">
          <motion.div
            className="h-full bg-[#f10202]"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ.id}
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.15 }}
            className="bg-white border border-[#e5e5e5] p-6 sm:p-8 shadow-none"
          >
            {/* Tag & Category */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-widest font-bold text-[#f10202]">
                {currentQ.categoryLabel}
              </span>
              <span className="text-[10px] font-mono text-[#888] bg-[#f5f5f5] px-1.5 py-0.5 border border-[#e5e5e5]">
                ID #{currentQ.id}
              </span>
            </div>

            {/* Question Title */}
            <h2 className="text-xl sm:text-2xl font-light leading-snug text-black mb-6">
              {currentQ.title}
            </h2>

            {/* 5 Options */}
            <div className="space-y-2.5" role="radiogroup" aria-label={currentQ.title}>
              {currentQ.options.map((option, optIdx) => {
                const isSelected = currentAnswerPoints === option.points;
                return (
                  <div
                    key={optIdx}
                    id={`opt-${currentQ.id}-${optIdx}`}
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleSelectOption(currentQ.id, option.points)}
                    className={`group flex items-center justify-between p-3.5 border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-black bg-black text-white'
                        : 'border-[#e5e5e5] hover:border-black bg-white text-black'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-mono font-bold ${isSelected ? 'text-[#aaa]' : 'text-[#888]'}`}>
                        0{optIdx + 1}
                      </span>
                      <span className="text-xs sm:text-sm font-normal">
                        {option.text}
                      </span>
                    </div>

                    <div>
                      {isSelected ? (
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 bg-[#f10202] text-white tracking-widest">
                          ✓
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#bbb] group-hover:text-black">
                          •
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Navigation Controls */}
            <div className="flex gap-3 mt-6 pt-5 border-t border-[#e5e5e5]">
              <button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((prev) => prev - 1)}
                className={`flex-1 py-3 border text-xs uppercase tracking-widest font-bold transition-all cursor-pointer ${
                  currentIdx === 0
                    ? 'border-[#e5e5e5] text-[#ccc] cursor-not-allowed'
                    : 'border-black text-black hover:bg-[#f9f9f9]'
                }`}
              >
                Zurück
              </button>

              {isLastRegularQuestion ? (
                <button
                  id="to-custom-btn"
                  disabled={!hasAnsweredCurrent}
                  onClick={handleProceedToCustom}
                  className={`flex-1 py-3 text-xs uppercase tracking-widest font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    hasAnsweredCurrent
                      ? 'bg-black hover:bg-[#1a1a1a] text-white'
                      : 'bg-[#e5e5e5] text-[#999] cursor-not-allowed'
                  }`}
                >
                  <span>Zur Custom Frage</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#f10202]" />
                </button>
              ) : (
                <button
                  disabled={!hasAnsweredCurrent}
                  onClick={() => setCurrentIdx((prev) => prev + 1)}
                  className={`flex-1 py-3 text-xs uppercase tracking-widest font-bold transition-all cursor-pointer ${
                    hasAnsweredCurrent
                      ? 'bg-black hover:bg-[#1a1a1a] text-white'
                      : 'bg-[#e5e5e5] text-[#999] cursor-not-allowed'
                  }`}
                >
                  Weiter
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // 3. CUSTOM QUESTION STEP (Leere Custom Frage Abstimmung am Ende)
  if (step === 'custom') {
    const customOptions = [
      { points: 5, label: '5 – Sehr positiv', desc: 'Voll und ganz / begeistert' },
      { points: 4, label: '4 – Eher positiv', desc: 'Zustimmung / gut' },
      { points: 3, label: '3 – Neutral', desc: 'Ausgeglichen / geteilt' },
      { points: 2, label: '2 – Eher negativ', desc: 'Bedenken / unzufrieden' },
      { points: 1, label: '1 – Sehr negativ', desc: 'Überhaupt nicht / kritisch' }
    ];

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="max-w-xl mx-auto py-8 sm:py-10 px-4"
      >
        <div className="bg-white border border-[#e5e5e5] p-6 sm:p-8 shadow-none">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e5]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#f10202] rounded-full"></div>
              <span className="text-xs uppercase font-bold tracking-widest text-[#f10202]">
                Zusatz-Abstimmung
              </span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#888] bg-[#f5f5f5] px-2 py-0.5">
              Optional
            </span>
          </div>

          <div className="my-6">
            <h2 className="text-2xl sm:text-3xl font-light text-black">
              Custom Frage
            </h2>
            <p className="text-xs text-[#666] mt-1.5 leading-relaxed">
              Die Frage, die im Teams-Chat oder vom Chef gestellt wurde. Stimme hier von 1 (negativ) bis 5 (positiv) ab.
            </p>
          </div>

          {/* 1 to 5 scale */}
          <div className="space-y-2 mb-6">
            {customOptions.map((opt) => {
              const isSelected = customPoints === opt.points;
              return (
                <div
                  key={opt.points}
                  id={`custom-opt-${opt.points}`}
                  onClick={() => setCustomPoints(opt.points)}
                  className={`flex items-center justify-between p-3.5 border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-black bg-black text-white'
                      : 'border-[#e5e5e5] hover:border-black bg-white text-black'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-mono font-bold ${isSelected ? 'text-[#f10202]' : 'text-black'}`}>
                      {opt.points}
                    </span>
                    <span className="text-xs sm:text-sm font-medium">
                      {opt.label}
                    </span>
                    <span className={`text-[11px] hidden sm:inline ${isSelected ? 'text-[#aaa]' : 'text-[#888]'}`}>
                      ({opt.desc})
                    </span>
                  </div>

                  <div>
                    {isSelected ? (
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 bg-[#f10202] text-white">
                        ✓
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#bbb]">•</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Optional One-Word Comment (max 120 characters, non-plaintext encoded) */}
          <div className="mb-6 p-4 bg-[#f9f9f9] border border-[#e5e5e5]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-black flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3 text-[#f10202]" />
                <span>Feedback / Stimmung (Wird verschlüsselt)</span>
              </label>
              <span className="text-[10px] font-mono text-[#888]">
                {customComment.length}/120 Zeichen
              </span>
            </div>

            {/* Quick Mood Chips for ultra-compact 2-char tokens */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {[
                'Top',
                'Super Flow',
                'Starkes Team',
                'Alles bestens',
                'Fokuszeit fehlt',
                'Zu viele Meetings',
                'Müde / Erschöpft',
                'Unklare Prio'
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setCustomComment(chip)}
                  className={`text-[11px] px-2 py-1 border transition-all cursor-pointer ${
                    customComment === chip
                      ? 'bg-black text-white border-black font-bold'
                      : 'bg-white text-[#555] border-[#ddd] hover:border-black'
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>

            <input
              type="text"
              id="custom-comment-input"
              maxLength={120}
              value={customComment}
              onChange={(e) => setCustomComment(e.target.value)}
              placeholder="Eigene Notiz oder Stimmung schreiben..."
              className="w-full bg-white border border-[#e5e5e5] focus:border-black px-3 py-2 text-sm text-black outline-none transition-colors"
            />
            <p className="text-[10px] text-[#666] mt-2 flex items-center gap-1.5 leading-normal">
              <Lock className="w-3 h-3 text-[#16a34a] shrink-0" />
              <span>Kein Klartext im Token: Dein Text wird automatisch in unlesbare Base-36/Base64url-Zeichen codiert.</span>
            </p>
          </div>

          {/* Action Buttons: Skip vs Submit */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#e5e5e5]">
            <button
              id="skip-custom-btn"
              onClick={handleSkipCustom}
              className="flex-1 py-3.5 border border-[#e5e5e5] hover:border-black text-xs uppercase tracking-widest font-bold text-[#666] hover:text-black flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5 text-[#888]" />
              <span>Keine Custom Frage (Überspringen)</span>
            </button>

            <button
              id="finish-with-custom-btn"
              disabled={customPoints === null}
              onClick={handleSubmitCustom}
              className={`flex-1 py-3.5 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                customPoints !== null
                  ? 'bg-[#f10202] hover:bg-[#d00202] text-white'
                  : 'bg-[#e5e5e5] text-[#999] cursor-not-allowed'
              }`}
            >
              <span>Übernehmen & Fertig</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // 4. RESULT STEP (Public Teams-Code & Private Secret ID display)
  if (step === 'result' && resultData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="max-w-xl mx-auto py-8 sm:py-10 px-4"
      >
        <div className="bg-white border border-[#e5e5e5] p-6 sm:p-10 shadow-none">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#e5e5e5]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#f10202] rounded-full"></div>
              <span className="text-xs uppercase font-bold tracking-widest text-[#f10202]">
                Check-In Abgeschlossen
              </span>
            </div>
            <span className="text-xs font-mono text-[#666]">
              KW {weekFactors.kw}
            </span>
          </div>

          <div className="my-6">
            <h2 className="text-2xl sm:text-3xl font-light text-black">
              Deine Codes sind bereit
            </h2>
            <p className="text-xs text-[#666] mt-1 leading-relaxed">
              Kopiere deinen Teams-Code für den Chat und merke dir deine Private ID für die Teamrunde.
            </p>
          </div>

          {/* BOX 1: SECRET PRIVATE ID (Nur für dich) */}
          <div className="bg-[#f9f9f9] border-2 border-black p-5 sm:p-6 mb-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e5]">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-[#f10202]" />
                <span className="text-xs uppercase font-bold tracking-wider text-black">
                  1. Deine geheime Private ID (Nur für dich!)
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-black text-white px-2 py-0.5">
                Privat & Geheim
              </span>
            </div>

            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-3xl sm:text-4xl font-mono font-bold text-black tracking-wider">
                  #{resultData.privateId}
                </div>
                <p className="text-xs text-[#555] mt-2 leading-relaxed max-w-md">
                  {resultData.publicId !== resultData.privateId ? (
                    <>
                      Du hast das Kürzel <strong className="text-black font-mono">{resultData.publicId}</strong> verwendet. In der Teamrunde auf dem Screen rechnet das Dashboard dein Kürzel automatisch wieder in <strong className="text-[#f10202] font-mono">#{resultData.privateId}</strong> um.
                    </>
                  ) : (
                    <>
                      In der Teamrunde siehst du deine Bewertung anonym unter der ID <strong className="text-[#f10202] font-mono">#{resultData.privateId}</strong>.
                    </>
                  )}
                  {' '}So erkennst nur du dein eigenes Feedback, während deine Kollegen nur die Private ID sehen!
                </p>
              </div>

              <button
                id="copy-private-id-btn"
                onClick={handleCopyPrivateId}
                className={`py-2.5 px-4 border text-xs uppercase tracking-wider font-bold transition-all cursor-pointer shrink-0 flex items-center justify-center gap-2 ${
                  copiedPrivateId
                    ? 'bg-[#16a34a] text-white border-[#16a34a]'
                    : 'bg-white hover:bg-black hover:text-white border-black text-black'
                }`}
              >
                {copiedPrivateId ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>ID kopiert ✓</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>ID kopieren</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* BOX 2: PUBLIC TEAMS-CODE (Zum Teilen in Teams) */}
          <div className="bg-black text-white p-6 sm:p-7 border border-black mb-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#333]">
              <div className="text-[10px] uppercase text-[#999] tracking-widest font-bold flex items-center gap-2">
                <span>2. Öffentlicher Teams-Code (In Teams senden)</span>
                {resultData.publicId !== resultData.privateId && (
                  <span className="bg-[#222] text-[#eee] px-1.5 py-0.5 border border-[#444] font-mono text-[10px]">
                    Kürzel: {resultData.publicId}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono text-[#aaa] bg-[#1a1a1a] px-2 py-0.5 border border-[#333]">
                Kein Klartext
              </span>
            </div>

            {/* Huge Full Token Display */}
            <div className="py-5">
              <div className="text-xl sm:text-2xl md:text-3xl font-mono font-bold tracking-wider text-white break-all select-all leading-snug">
                {resultData.fullToken}
              </div>
              <p className="text-[11px] text-[#888] mt-2 leading-relaxed">
                Sende diesen Code in euren Teams-Chat. Der Moderator kopiert alle Zeilen gemeinsam in die Teamrunde.
              </p>
            </div>

            {/* Stats Breakdown & Copy Button */}
            <div className="pt-4 border-t border-[#222] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-[#888]">
                <span>Wochen-Zahl: <strong className="text-white">{resultData.secretNumber}</strong></span>
                <span>•</span>
                <span>Schnitt: <strong className="text-white">Ø {resultData.averageScore}</strong></span>
              </div>

              <button
                id="copy-token-btn"
                onClick={handleCopyTeamsToken}
                className={`py-3 px-5 border text-xs uppercase tracking-widest font-bold transition-all cursor-pointer shrink-0 flex items-center justify-center gap-2 ${
                  copiedTeamsToken
                    ? 'bg-[#16a34a] border-[#16a34a] text-white'
                    : 'bg-white text-black border-white hover:bg-[#f10202] hover:text-white hover:border-[#f10202]'
                }`}
              >
                {copiedTeamsToken ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Teams-Code kopiert ✓</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Teams-Code kopieren</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Summary stats */}
          <div className="space-y-2 mb-6">
            <div className="bg-[#f9f9f9] border border-[#e5e5e5] p-3.5 flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-widest text-black">
                Persönlicher Schnitt
              </span>
              <span className="text-sm font-mono font-bold text-[#f10202]">
                Ø {resultData.averageScore} / 5.0
              </span>
            </div>

            {resultData.customQuestion && (
              <div className="bg-[#f9f9f9] border border-[#e5e5e5] p-3.5 flex items-center justify-between">
                <span className="text-xs uppercase font-bold tracking-widest text-black">
                  Custom Frage Vote
                </span>
                <span className="text-xs font-mono font-bold text-black flex items-center gap-2">
                  <span>{resultData.customQuestion.points} / 5</span>
                  {resultData.customQuestion.comment && (
                    <span className="bg-black text-white px-2 py-0.5 text-[10px]">
                      "{resultData.customQuestion.comment}"
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              id="transfer-to-team-btn"
              onClick={onNavigateToTeam}
              className="flex-1 py-3.5 bg-black hover:bg-[#1a1a1a] text-white text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <span>Zur Team-Runde</span>
              <ArrowRight className="w-4 h-4 text-[#f10202]" />
            </button>

            <button
              id="restart-checkin-btn"
              onClick={() => initNewSession(questionMode)}
              className="py-3.5 px-5 border border-black text-xs uppercase tracking-widest font-bold text-black hover:bg-[#f9f9f9] cursor-pointer transition-all"
            >
              Neu
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
};
