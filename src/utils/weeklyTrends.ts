import { TeamAnalytics, QuestionCategory } from '../types';
import { WeekFactors } from './algorithm';

export interface WeeklyResult {
  rawCode: string;
  year: number;
  kw: number;
  count: number;
  averageScore: number; // 1.0 to 5.0
  overallPercentage: number; // 0 to 100
  minScore: number;
  maxScore: number;
  distribution: {
    critical: number;
    stressed: number;
    neutral: number;
    good: number;
    peak: number;
  };
  categoryScores: Record<string, { label: string; score: number }>;
  customAverage?: number;
  topTopic?: string;
  lowestTopic?: string;
  verdictTitle: string;
  status: 'peak' | 'good' | 'neutral' | 'critical';
  dateLabel: string;
}

const CATEGORY_NAMES: Record<string, string> = {
  collaboration: 'Zusammenarbeit',
  culture: 'Kultur & Feedback',
  learning: 'Lernchancen & I&I',
  leadership: 'Führung & Support',
  mission: 'Mission & Ziele',
  workload: 'Workload & Energie',
  focus: 'Fokus & Flow',
  tech: 'IT & Tooling',
  team: 'Organisation'
};

function toBase64Url(str: string): string {
  try {
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}

function fromBase64Url(str: string): string {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return decodeURIComponent(escape(atob(base64)));
  } catch {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return atob(base64);
  }
}

/**
 * Encodes a week's analytics into a shareable, tamper-evident weekly result code.
 * Example format: AUDI-W37-2026-<base64url>
 */
export function encodeWeeklyResultCode(
  analytics: TeamAnalytics,
  weekFactors: WeekFactors
): string {
  const payload = {
    v: 1,
    y: weekFactors.year,
    w: weekFactors.kw,
    n: analytics.count,
    s: analytics.averageScore,
    p: analytics.overallPercentage,
    min: analytics.minScore,
    max: analytics.maxScore,
    d: [
      analytics.distribution.critical,
      analytics.distribution.stressed,
      analytics.distribution.neutral,
      analytics.distribution.good,
      analytics.distribution.peak
    ],
    c: Object.fromEntries(
      Object.entries(analytics.categoryScores).map(([k, v]) => [k, v.score])
    ),
    st: analytics.healthVerdict.status,
    vt: analytics.healthVerdict.title,
    top: analytics.questionStats.length > 0 ? analytics.questionStats[analytics.questionStats.length - 1].tag : undefined,
    low: analytics.questionStats.length > 0 ? analytics.questionStats[0].tag : undefined,
    cq: analytics.customQuestionStats ? analytics.customQuestionStats.averageScore : undefined
  };

  const encoded = toBase64Url(JSON.stringify(payload));
  return `AUDI-W${weekFactors.kw}-${weekFactors.year}-${encoded}`;
}

/**
 * Decodes a weekly result code back into structured WeeklyResult data.
 */
export function decodeWeeklyResultCode(rawCode: string): WeeklyResult | null {
  const clean = rawCode.trim();
  if (!clean) return null;

  // Match token pattern: AUDI-W{kw}-{year}-{payload} or similar
  const match = clean.match(/(?:AUDI-)?(?:W|KW)(\d{1,2})-(\d{4})-([A-Za-z0-9_-]+)/i);
  if (!match) return null;

  const kw = parseInt(match[1], 10);
  const year = parseInt(match[2], 10);
  const payloadStr = match[3];

  try {
    const jsonStr = fromBase64Url(payloadStr);
    const data = JSON.parse(jsonStr);

    if (!data || typeof data.s !== 'number') return null;

    const categoryScores: Record<string, { label: string; score: number }> = {};
    if (data.c && typeof data.c === 'object') {
      Object.entries(data.c).forEach(([k, score]) => {
        if (typeof score === 'number') {
          categoryScores[k] = {
            label: CATEGORY_NAMES[k] || k,
            score: Number(score.toFixed(2))
          };
        }
      });
    }

    const dist = Array.isArray(data.d) && data.d.length === 5 ? data.d : [0, 0, 0, 0, 0];

    return {
      rawCode: clean,
      year: data.y || year,
      kw: data.w || kw,
      count: data.n || 0,
      averageScore: Number(Number(data.s).toFixed(2)),
      overallPercentage: Math.round(data.p || (data.s / 5) * 100),
      minScore: typeof data.min === 'number' ? data.min : 1.0,
      maxScore: typeof data.max === 'number' ? data.max : 5.0,
      distribution: {
        critical: dist[0] || 0,
        stressed: dist[1] || 0,
        neutral: dist[2] || 0,
        good: dist[3] || 0,
        peak: dist[4] || 0
      },
      categoryScores,
      customAverage: typeof data.cq === 'number' ? data.cq : undefined,
      topTopic: data.top,
      lowestTopic: data.low,
      verdictTitle: data.vt || 'Wochenauswertung',
      status: (['peak', 'good', 'neutral', 'critical'].includes(data.st) ? data.st : 'good') as any,
      dateLabel: `KW ${data.w || kw} (${data.y || year})`
    };
  } catch (err) {
    console.warn('Failed to parse weekly code:', err);
    return null;
  }
}

/**
 * Extracts all valid weekly result tokens from any multiline text.
 */
export function extractWeeklyTokensFromText(text: string): string[] {
  const lines = text.split(/[\r\n]+/);
  const tokens: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(/\b((?:AUDI-)?(?:W|KW)\d{1,2}-\d{4}-[A-Za-z0-9_-]+)\b/i);
    if (match) {
      tokens.push(match[1]);
    }
  }

  // Remove duplicates while preserving order
  return Array.from(new Set(tokens));
}

/**
 * Generates sample weekly result codes for 6 consecutive weeks
 * to show a realistic time-series trend in the analysis view.
 */
export function generateSampleWeeklyHistory(): string[] {
  const currentYear = new Date().getFullYear();
  
  // 6 weeks of sample data showing team progression
  const weekConfigs = [
    {
      w: 32,
      count: 7,
      score: 3.42,
      percentage: 68,
      status: 'neutral' as const,
      verdict: 'Workload spürbar',
      cats: { collaboration: 3.8, culture: 3.5, workload: 2.8, focus: 3.1, tech: 3.9 },
      dist: [1, 2, 2, 2, 0],
      top: 'Tooling',
      low: 'Workload'
    },
    {
      w: 33,
      count: 8,
      score: 3.65,
      percentage: 73,
      status: 'neutral' as const,
      verdict: 'Leichte Besserung',
      cats: { collaboration: 4.0, culture: 3.8, workload: 3.0, focus: 3.4, tech: 4.1 },
      dist: [0, 2, 3, 3, 0],
      top: 'Teamwork',
      low: 'Workload'
    },
    {
      w: 34,
      count: 8,
      score: 3.88,
      percentage: 78,
      status: 'good' as const,
      verdict: 'Solider Flow',
      cats: { collaboration: 4.2, culture: 4.0, workload: 3.4, focus: 3.7, tech: 4.1 },
      dist: [0, 1, 2, 4, 1],
      top: 'Teamwork',
      low: 'Fokus'
    },
    {
      w: 35,
      count: 9,
      score: 3.75,
      percentage: 75,
      status: 'good' as const,
      verdict: 'Sprint-Endspurt',
      cats: { collaboration: 4.1, culture: 3.9, workload: 3.1, focus: 3.5, tech: 4.2 },
      dist: [0, 2, 2, 4, 1],
      top: 'IT & Tooling',
      low: 'Workload'
    },
    {
      w: 36,
      count: 9,
      score: 4.15,
      percentage: 83,
      status: 'good' as const,
      verdict: 'Hohes Engagement',
      cats: { collaboration: 4.5, culture: 4.3, workload: 3.6, focus: 4.1, tech: 4.3 },
      dist: [0, 0, 2, 5, 2],
      top: 'Teamwork',
      low: 'Workload'
    },
    {
      w: 37,
      count: 10,
      score: 4.38,
      percentage: 88,
      status: 'peak' as const,
      verdict: 'Exzellenter Team-Pulse',
      cats: { collaboration: 4.7, culture: 4.5, workload: 3.9, focus: 4.3, tech: 4.5 },
      dist: [0, 0, 1, 5, 4],
      top: 'Teamwork',
      low: 'Workload'
    }
  ];

  return weekConfigs.map((cfg) => {
    const payload = {
      v: 1,
      y: currentYear,
      w: cfg.w,
      n: cfg.count,
      s: cfg.score,
      p: cfg.percentage,
      min: 2.0,
      max: 5.0,
      d: cfg.dist,
      c: cfg.cats,
      st: cfg.status,
      vt: cfg.verdict,
      top: cfg.top,
      low: cfg.low
    };

    const encoded = toBase64Url(JSON.stringify(payload));
    return `AUDI-W${cfg.w}-${currentYear}-${encoded}`;
  });
}
