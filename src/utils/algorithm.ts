import { DecodedEntry, Question, QuestionAnswerPair, CustomQuestionVote, QuestionCategory } from '../types';
import { QUESTIONS_POOL, getQuestionById } from '../data/questions';

export interface WeekFactors {
  kw: number;
  year: number;
  mondayDate: number; // day of month 1..31
  mondayFullDate: string; // YYYY-MM-DD
  kwFactor: number;
  mondayOffset: number;
  parityBonus: number;
  baseOffset: number;
}

/**
 * Calculates current ISO-8601 Calendar Week and Monday date
 */
export function getCurrentWeekFactors(targetDate = new Date()): WeekFactors {
  const date = new Date(targetDate.getTime());
  date.setHours(0, 0, 0, 0);

  // Thursday in current week decides the year (ISO-8601)
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);

  // Calculate ISO week number
  const kw = 1 + Math.round(
    ((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
  );
  const year = date.getFullYear();

  // Find Monday of this current week
  const curr = new Date(targetDate.getTime());
  const day = curr.getDay();
  const diffToMonday = curr.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(curr.setDate(diffToMonday));
  const mondayDate = monday.getDate();
  const mondayFullDate = monday.toISOString().split('T')[0];

  // Deterministic factors for the secret Audi algorithm
  const kwFactor = 6 + (kw % 7); // between 6 and 12
  const mondayOffset = (mondayDate * 3) % 40;
  const parityBonus = kw % 2 === 0 ? 36 : -14;
  const baseOffset = 110;

  return {
    kw,
    year,
    mondayDate,
    mondayFullDate,
    kwFactor,
    mondayOffset,
    parityBonus,
    baseOffset
  };
}

/**
 * Generates an Audi-style 4-character Secret ID (e.g. R824, A619, Q788, TT42)
 */
export function generateSecretId(): string {
  const prefixes = ['R8', 'RS', 'A6', 'A4', 'Q7', 'Q5', 'TT', 'E4', 'GT', 'S3', 'Q8', 'A8'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const num = Math.floor(10 + Math.random() * 90); // 10..99
  return `${prefix}${num}`;
}

/**
 * Deterministically derives a Private Secret ID from initials (e.g. "MM" -> "RS24")
 * based on weekly factors and a salt.
 * In this way, when user sends their public code with "MM" in Teams, the final team view
 * recalculates "MM" back into their Private ID ("#RS24") so nobody in the meeting knows
 * which row belongs to whom, except the participant who saw their Private ID after the survey!
 */
export function deriveSecretIdFromInitials(initials: string, weekFactors = getCurrentWeekFactors()): string {
  const clean = initials.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!clean) return generateSecretId();

  const prefixes = ['RS', 'R8', 'A6', 'GT', 'Q7', 'S3', 'TT', 'Q8', 'A4', 'E4', 'SQ', 'ET'];
  
  // 32-bit deterministic FNV-1a hash
  let hash = 2166136261;
  const seed = `${clean}_KW${weekFactors.kw}_${weekFactors.year}_AudiSecretSalt_2026`;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const posHash = Math.abs(hash);
  const prefix = prefixes[posHash % prefixes.length];
  const num = 10 + (Math.floor(posHash / 13) % 90); // 10..99
  return `${prefix}${num}`;
}

/**
 * Extracts all valid tokens from arbitrary text (e.g. multiline copied directly from Teams chat)
 */
export function extractTokensFromText(text: string): string[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const tokens: string[] = [];

  for (let rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Pattern 1: Standard token "397-MM-u4ynt" or "397-R824-u4ynt-c5_m1"
    const standardMatch = line.match(/\b(\d{2,4}-[A-Za-z0-9]{1,8}-[a-z0-9]+(?:-[a-zA-Z0-9_]+)?)\b/);
    if (standardMatch) {
      tokens.push(standardMatch[1]);
      continue;
    }

    // Pattern 2: With author tag "MM: 397-u4ynt..."
    const authorMatch = line.match(/([A-Za-z]{1,4}):\s*(\d{2,4}-[a-z0-9]+.*)/);
    if (authorMatch) {
      // reconstruct standard token: "397-MM-..."
      const parts = authorMatch[2].split('-');
      if (parts.length >= 2) {
        tokens.push(`${parts[0]}-${authorMatch[1].toUpperCase()}-${parts.slice(1).join('-')}`);
        continue;
      }
    }

    // Pattern 3: Line with dashes and alphanumeric length
    const cleaned = line.replace(/^[•*\-\s]+/, '').trim();
    if (cleaned.includes('-') && cleaned.length >= 6) {
      tokens.push(cleaned);
    }
  }

  return tokens;
}

/**
 * Encodes answers array into an ultra-compact Base-36 string (5-10 characters).
 * Uses a base-6 positional digit for each of the 20 questions:
 * value = sum_{qId=1..20} (points * 6^(qId - 1))
 */
export function encodeAnswersBase36(answers: QuestionAnswerPair[]): string {
  let val = 0n;
  const map = new Map<number, bigint>();
  answers.forEach((a) => map.set(a.questionId, BigInt(Math.max(1, Math.min(5, a.points)))));

  for (let qId = 1; qId <= 20; qId++) {
    const pt = map.get(qId) || 0n;
    if (pt > 0n) {
      val += pt * (6n ** BigInt(qId - 1));
    }
  }
  return val.toString(36);
}

/**
 * Parses an arbitrary-length Base-36 string into BigInt safely without precision loss.
 */
export function parseBigInt36(str: string): bigint {
  let result = 0n;
  const chars = str.toLowerCase();
  for (let i = 0; i < chars.length; i++) {
    const c = chars.charCodeAt(i);
    let digit = 0n;
    if (c >= 48 && c <= 57) {
      digit = BigInt(c - 48);
    } else if (c >= 97 && c <= 122) {
      digit = BigInt(c - 97 + 10);
    } else {
      continue;
    }
    result = result * 36n + digit;
  }
  return result;
}

/**
 * Decodes the ultra-compact Base-36 string back into the exact Question IDs and ratings.
 */
export function decodeAnswersBase36(encodedStr: string): QuestionAnswerPair[] {
  let val = parseBigInt36(encodedStr);
  const result: QuestionAnswerPair[] = [];
  for (let qId = 1; qId <= 20; qId++) {
    const pt = Number(val % 6n);
    val = val / 6n;
    if (pt >= 1 && pt <= 5) {
      result.push({ questionId: qId, points: pt });
    }
  }
  return result;
}

/**
 * Pre-defined short mood dictionary for ultra-compact 2-character encoding.
 */
export const MOOD_DICTIONARY: Record<string, string> = {
  m1: 'Top',
  m2: 'Super Flow',
  m3: 'Starkes Team',
  m4: 'Alles bestens',
  m5: 'Ausgeglichen',
  m6: 'Fokuszeit fehlt',
  m7: 'Zu viele Meetings',
  m8: 'Müde / Erschöpft',
  m9: 'Unklare Prio',
  m0: 'Hilfe benötigt'
};

const REVERSE_MOOD_DICTIONARY: Record<string, string> = {};
Object.entries(MOOD_DICTIONARY).forEach(([k, v]) => {
  REVERSE_MOOD_DICTIONARY[v.toLowerCase()] = k;
});

/**
 * Encodes comment / text into a compact, scrambled non-plaintext format.
 * No plaintext words are exposed in the token.
 */
export function encodeCommentSafe(text: string): string {
  if (!text || !text.trim()) return '';
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // If matches preset mood keyword, use 2-char dictionary code!
  if (REVERSE_MOOD_DICTIONARY[lower]) {
    return REVERSE_MOOD_DICTIONARY[lower];
  }

  // Otherwise encode with Base64url (trimmed up to 120 chars)
  const sliceText = trimmed.slice(0, 120);
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(sliceText, 'utf-8').toString('base64url');
    }
  } catch {}

  // Universal browser-safe TextEncoder -> btoa base64url
  const utf8Bytes = new TextEncoder().encode(sliceText);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decodes encoded comment back to readable text (supports dictionary, base64url, and legacy plaintext).
 */
export function decodeCommentSafe(encoded: string): string {
  if (!encoded) return '';
  const trimmed = encoded.trim();

  // 1. Check dictionary code
  if (MOOD_DICTIONARY[trimmed]) {
    return MOOD_DICTIONARY[trimmed];
  }

  // 2. Try Base64url decoding
  try {
    let raw = '';
    if (typeof Buffer !== 'undefined') {
      raw = Buffer.from(trimmed, 'base64url').toString('utf-8');
    } else {
      let b64 = trimmed.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    }

    // Ensure it's genuine valid UTF-8 without control / replacement chars
    if (raw && !raw.includes('\uFFFD') && !/[\x00-\x08\x0E-\x1F]/.test(raw)) {
      return raw;
    }
  } catch {}

  // 3. Fallback for legacy plaintext (e.g. "_Top" or "_Meeting")
  return trimmed;
}

/**
 * Encodes answers into the secret Audi Weekly Number and complete token
 * including exact Question IDs and optional Custom Question.
 * Supports Namenskürzel (Initials, e.g. "MM"):
 * - Public token: e.g. 397-MM-u4ynt-c5_m1 (what the user sends in Teams)
 * - Private ID: e.g. RS24 (what the user remembers and what the dashboard re-derives)
 */
export function encodeAnswers(
  secretIdOrOptions: string | { initials?: string; secretId?: string },
  answers: QuestionAnswerPair[],
  weekFactors = getCurrentWeekFactors(),
  customVote?: CustomQuestionVote
): {
  secretNumber: number;
  fullToken: string;
  privateId: string;
  publicId: string;
  scoreSum: number;
  averageScore: number;
  answersArray: number[];
  questionAnswers: QuestionAnswerPair[];
  customQuestion?: CustomQuestionVote;
} {
  let initials = '';
  let secretId = '';

  if (typeof secretIdOrOptions === 'string') {
    const raw = secretIdOrOptions.trim().toUpperCase();
    if (/^[A-Z]{1,4}$/.test(raw)) {
      initials = raw;
      secretId = deriveSecretIdFromInitials(raw, weekFactors);
    } else {
      secretId = raw;
    }
  } else if (secretIdOrOptions) {
    if (secretIdOrOptions.initials) {
      initials = secretIdOrOptions.initials.trim().toUpperCase();
      secretId = deriveSecretIdFromInitials(initials, weekFactors);
    } else if (secretIdOrOptions.secretId) {
      secretId = secretIdOrOptions.secretId.trim().toUpperCase();
    }
  }

  if (!secretId) {
    secretId = generateSecretId();
  }

  const scoreSum = answers.reduce((sum, a) => sum + a.points, 0);
  const averageScore = Number((scoreSum / (answers.length || 7)).toFixed(2));
  const answersArray = answers.map((a) => Math.min(5, Math.max(1, a.points)));

  // Formula:
  // Secret Number = (scoreSum * kwFactor) + mondayOffset + parityBonus + baseOffset
  const secretNumber = Math.round(
    scoreSum * weekFactors.kwFactor +
    weekFactors.mondayOffset +
    weekFactors.parityBonus +
    weekFactors.baseOffset
  );

  // Ultra-compact Base-36 representation (5-10 characters!)
  const compactPayload = encodeAnswersBase36(answers);

  // Public ID in token: if initials were provided, token contains initials (e.g. 397-MM-u4ynt)
  // Otherwise it contains secretId (e.g. 397-R824-u4ynt)
  const publicId = initials || secretId;
  const privateId = secretId;

  // Minimal token format: e.g. 397-MM-u4ynt or 397-R824-u4ynt
  let token = `${secretNumber}-${publicId.toUpperCase()}-${compactPayload}`;

  // Custom question encoding (non-plaintext, scrambled)
  if (customVote && customVote.points >= 1 && customVote.points <= 5) {
    let customPart = `-c${customVote.points}`;
    if (customVote.comment && customVote.comment.trim().length > 0) {
      const encComment = encodeCommentSafe(customVote.comment);
      if (encComment) {
        customPart += `_${encComment}`;
      }
    }
    token += customPart;
  }

  return {
    secretNumber,
    fullToken: token,
    privateId,
    publicId,
    scoreSum,
    averageScore,
    answersArray,
    questionAnswers: answers,
    customQuestion: customVote
  };
}

/**
 * Decodes an input token string into structured entry data.
 * If the token contains a participant's initials (e.g. "MM"), it recalculates
 * the exact same Private Secret ID (e.g. "RS24") using the deterministic weekly algorithm,
 * so in the final team view, "MM" is displayed as the anonymous Private ID "#RS24"!
 */
export function decodeSubmission(
  rawInput: string,
  weekFactors = getCurrentWeekFactors()
): DecodedEntry {
  let cleaned = rawInput.trim();
  if (!cleaned) {
    return createInvalidEntry(rawInput, weekFactors, 'Leere Eingabe');
  }

  // Strip leading author/timestamp prefix if copied from Teams:
  // e.g. "Max Mustermann [10:42]: 397-MM-..." or "MM: 397-..."
  const prefixMatch = cleaned.match(/^[^:]+:\s*(3\d{2}-.*)$/);
  if (prefixMatch) {
    cleaned = prefixMatch[1].trim();
  }

  // Check for custom question suffix: e.g. -c5 or -c5_m1 or -c5_VG9w or legacy -c5_Top
  let withoutCustom = cleaned;
  let customVote: CustomQuestionVote | undefined = undefined;

  const customMatch = cleaned.match(/[-_]c([1-5])(?:_?([a-zA-Z0-9_-]+))?$/i);
  if (customMatch) {
    const pts = parseInt(customMatch[1], 10);
    const rawComment = customMatch[2];
    const comment = rawComment ? decodeCommentSafe(rawComment) : undefined;
    customVote = { points: pts, comment };
    withoutCustom = cleaned.slice(0, customMatch.index).trim();
  }

  const parts = withoutCustom.split(/[-_\s#]+/);
  if (parts.length < 1) {
    return createInvalidEntry(rawInput, weekFactors, 'Ungültiges Format');
  }

  let secretNumber = 0;
  let rawSecretId = 'R800';
  let questionAnswers: QuestionAnswerPair[] = [];

  // Determine parts layout:
  // Layout 1: "397-MM-u4ynt" or "397-R824-u4ynt" (3 parts)
  if (parts.length >= 3) {
    secretNumber = parseInt(parts[0], 10) || 0;
    rawSecretId = parts[1].toUpperCase();
    const qaPart = parts.slice(2).join('.');
    questionAnswers = parseQuestionAnswerString(qaPart);
  }
  // Layout 2: "R824-u4ynt" or "MM-u4ynt" (2 parts)
  else if (parts.length === 2 && !/^\d+$/.test(parts[0])) {
    rawSecretId = parts[0].toUpperCase();
    questionAnswers = parseQuestionAnswerString(parts[1]);
  }
  // Layout 3: "237-R824" (2 parts: SecretNumber + SecretID)
  else if (parts.length === 2 && /^\d+$/.test(parts[0])) {
    secretNumber = parseInt(parts[0], 10);
    rawSecretId = parts[1].toUpperCase();
    // Try to see if parts[1] is actually a base36 string
    const tryB36 = decodeAnswersBase36(parts[1]);
    if (tryB36.length >= 4) {
      questionAnswers = tryB36;
      rawSecretId = `ID-${parts[0].slice(-2)}`;
    }
  }
  // Layout 4: "237" (1 part: number only)
  else if (parts.length === 1 && /^\d+$/.test(parts[0])) {
    secretNumber = parseInt(parts[0], 10);
    rawSecretId = `ID-${parts[0].slice(-2)}`;
  }
  // Fallback
  else {
    rawSecretId = parts[0].toUpperCase();
    if (parts.length > 1) {
      questionAnswers = parseQuestionAnswerString(parts[1]);
    }
  }

  // Convert Namenskürzel (Initials like "MM", "TW") back into the Private ID (e.g. "RS24")!
  let secretId = rawSecretId;
  let publicInitials: string | undefined = undefined;
  let isConvertedFromInitials = false;

  // If rawSecretId consists of 1 to 4 letters without numbers (e.g. "MM"), it is an initials code:
  if (/^[A-Z]{1,4}$/.test(rawSecretId)) {
    publicInitials = rawSecretId;
    isConvertedFromInitials = true;
    secretId = deriveSecretIdFromInitials(rawSecretId, weekFactors);
  }

  // If questionAnswers were decoded, compute the actual scoreSum
  let scoreSum = 0;
  if (questionAnswers.length > 0) {
    scoreSum = questionAnswers.reduce((a, b) => a + b.points, 0);
    // If secretNumber was not provided in input (e.g. "R824-u4ynt"), calculate it!
    if (secretNumber === 0) {
      secretNumber = Math.round(
        scoreSum * weekFactors.kwFactor +
        weekFactors.mondayOffset +
        weekFactors.parityBonus +
        weekFactors.baseOffset
      );
    }
  } else if (secretNumber > 0) {
    // Legacy fallback: reconstruct from secretNumber
    const rawSum = Math.round(
      (secretNumber - weekFactors.mondayOffset - weekFactors.parityBonus - weekFactors.baseOffset) /
      weekFactors.kwFactor
    );
    scoreSum = Math.max(7, Math.min(35, rawSum));
    const base = Math.floor(scoreSum / 7);
    const rem = scoreSum % 7;
    questionAnswers = Array(7)
      .fill(0)
      .map((_, i) => ({
        questionId: i + 1,
        points: i < rem ? base + 1 : base
      }));
  }

  const answers = questionAnswers.map((qa) => qa.points);
  const averageScore = Number((scoreSum / (answers.length || 1)).toFixed(2));

  // Category scores
  const categoryAcc: Record<string, { sum: number; count: number }> = {};
  questionAnswers.forEach((qa) => {
    const q = getQuestionById(qa.questionId);
    const cat = q?.category || 'team';
    if (!categoryAcc[cat]) categoryAcc[cat] = { sum: 0, count: 0 };
    categoryAcc[cat].sum += qa.points;
    categoryAcc[cat].count += 1;
  });

  const categories: Record<string, number> = {};
  Object.keys(categoryAcc).forEach((cat) => {
    categories[cat] = Number((categoryAcc[cat].sum / categoryAcc[cat].count).toFixed(1));
  });

  return {
    rawCode: rawInput,
    secretId,
    publicInitials,
    isConvertedFromInitials,
    scoreSum,
    averageScore,
    kw: weekFactors.kw,
    year: weekFactors.year,
    mondayDate: weekFactors.mondayDate,
    answers,
    questionAnswers,
    customQuestion: customVote,
    categories,
    isValid: true
  };
}

/**
 * Parses question-answer strings in various formats:
 * - "q01v5.q02v4.q03v5"
 * - "01v5.02v4"
 * - "015.024.035"
 * - "5435425" (legacy 7-digit string)
 */
function parseQuestionAnswerString(str: string): QuestionAnswerPair[] {
  const result: QuestionAnswerPair[] = [];

  // Match "q01v5" or "01v5" or "q1v5"
  const qvRegex = /q?(\d{1,2})v([1-5])/gi;
  let match: RegExpExecArray | null;
  while ((match = qvRegex.exec(str)) !== null) {
    const qId = parseInt(match[1], 10);
    const pts = parseInt(match[2], 10);
    if (qId >= 1 && qId <= 20) {
      result.push({ questionId: qId, points: pts });
    }
  }

  if (result.length > 0) return result;

  // Match 3-digit triplets: "015024035"
  if (/^(\d{3})+$/.test(str)) {
    for (let i = 0; i < str.length; i += 3) {
      const qId = parseInt(str.substring(i, i + 2), 10);
      const pts = parseInt(str.substring(i + 2, i + 3), 10);
      if (qId >= 1 && qId <= 20 && pts >= 1 && pts <= 5) {
        result.push({ questionId: qId, points: pts });
      }
    }
    if (result.length > 0) return result;
  }

  // Legacy single digits string: e.g. "5435425" (7 digits)
  if (/^[1-5]{6,8}$/.test(str)) {
    return str.split('').map((ch, idx) => ({
      questionId: idx + 1,
      points: parseInt(ch, 10)
    }));
  }

  // Match ultra-compact Base-36 string (e.g. "u4ynt" or "ykbrdykbrd")
  if (/^[0-9a-z]+$/i.test(str)) {
    const base36Answers = decodeAnswersBase36(str);
    if (base36Answers.length > 0) {
      return base36Answers;
    }
  }

  return [];
}

function createInvalidEntry(
  rawInput: string,
  weekFactors: WeekFactors,
  errorMessage: string
): DecodedEntry {
  return {
    rawCode: rawInput,
    secretId: 'UNGÜLTIG',
    scoreSum: 0,
    averageScore: 0,
    kw: weekFactors.kw,
    year: weekFactors.year,
    mondayDate: weekFactors.mondayDate,
    answers: [],
    questionAnswers: [],
    categories: {},
    isValid: false,
    errorMessage
  };
}

/**
 * Generates sample realistic team entries for testing
 * including Question IDs and Custom Questions with 10-char comments
 */
export function generateSampleTeamSubmissions(weekFactors = getCurrentWeekFactors()): string[] {
  const samples: {
    id: string;
    answers: QuestionAnswerPair[];
    custom?: CustomQuestionVote;
  }[] = [
    {
      id: 'R824',
      answers: [
        { questionId: 1, points: 5 }, // Teamwork
        { questionId: 2, points: 4 }, // Spaß
        { questionId: 3, points: 5 }, // Lernmöglichkeiten
        { questionId: 4, points: 4 }, // Führung
        { questionId: 5, points: 5 }, // Mission
        { questionId: 6, points: 5 }, // Moderation
        { questionId: 7, points: 4 }, // Kaffee
        { questionId: 10, points: 4 } // Feierabend
      ],
      custom: { points: 5, comment: 'Top-Sprint' }
    },
    {
      id: 'A619',
      answers: [
        { questionId: 1, points: 4 },
        { questionId: 2, points: 4 },
        { questionId: 3, points: 4 },
        { questionId: 4, points: 4 },
        { questionId: 5, points: 4 },
        { questionId: 6, points: 3 },
        { questionId: 8, points: 4 }
      ],
      custom: { points: 4, comment: 'Stabil' }
    },
    {
      id: 'Q788',
      answers: [
        { questionId: 1, points: 3 },
        { questionId: 2, points: 3 },
        { questionId: 3, points: 2 },
        { questionId: 4, points: 3 },
        { questionId: 6, points: 2 },
        { questionId: 7, points: 2 },
        { questionId: 10, points: 2 }
      ],
      custom: { points: 2, comment: 'Viel Druck' }
    },
    {
      id: 'RS04',
      answers: [
        { questionId: 1, points: 5 },
        { questionId: 2, points: 5 },
        { questionId: 4, points: 5 },
        { questionId: 5, points: 5 },
        { questionId: 6, points: 4 },
        { questionId: 11, points: 5 },
        { questionId: 14, points: 5 }
      ],
      custom: { points: 5, comment: 'Mega Team' }
    },
    {
      id: 'TT42',
      answers: [
        { questionId: 1, points: 3 },
        { questionId: 2, points: 2 },
        { questionId: 3, points: 2 },
        { questionId: 6, points: 1 },
        { questionId: 7, points: 1 },
        { questionId: 10, points: 2 },
        { questionId: 13, points: 2 }
      ],
      custom: { points: 2, comment: 'Müde' }
    },
    {
      id: 'E491',
      answers: [
        { questionId: 1, points: 2 },
        { questionId: 2, points: 1 },
        { questionId: 4, points: 2 },
        { questionId: 5, points: 2 },
        { questionId: 6, points: 1 },
        { questionId: 10, points: 1 },
        { questionId: 13, points: 1 }
      ]
      // No custom question
    },
    {
      id: 'GT07',
      answers: [
        { questionId: 1, points: 4 },
        { questionId: 2, points: 5 },
        { questionId: 3, points: 4 },
        { questionId: 4, points: 4 },
        { questionId: 5, points: 5 },
        { questionId: 9, points: 5 },
        { questionId: 12, points: 4 }
      ],
      custom: { points: 4, comment: 'Klasse Mix' }
    },
    {
      id: 'S311',
      answers: [
        { questionId: 1, points: 4 },
        { questionId: 2, points: 3 },
        { questionId: 3, points: 3 },
        { questionId: 6, points: 2 },
        { questionId: 7, points: 3 },
        { questionId: 8, points: 3 },
        { questionId: 15, points: 4 }
      ],
      custom: { points: 3, comment: 'Geht so' }
    }
  ];

  return samples.map((s) => {
    const res = encodeAnswers(s.id, s.answers, weekFactors, s.custom);
    return res.fullToken;
  });
}
