export type QuestionCategory =
  | 'collaboration' // Teamwork & Zusammenarbeit
  | 'culture'       // Spaß bei der Zusammenarbeit, Feedback & Kultur
  | 'learning'      // Lernmöglichkeiten & I&I
  | 'leadership'    // Unterstützung durch Führung
  | 'mission'       // Mission & Ziele
  | 'workload'      // Workload, Koffein, Feierabend, Office vs HO
  | 'focus'         // Fokus, Deep Work, Sprint-Punkte
  | 'tech'          // Tooling, IT, Architektur
  | 'team';         // Moderation, Organisation

export interface AnswerOption {
  text: string;
  points: number; // 1 bis 5
  description?: string;
}

export interface Question {
  id: number;
  title: string;
  category: QuestionCategory;
  categoryLabel: string;
  options: [AnswerOption, AnswerOption, AnswerOption, AnswerOption, AnswerOption];
  tag: string;
}

export interface QuestionAnswerPair {
  questionId: number;
  points: number; // 1-5
}

export interface CustomQuestionVote {
  points: number; // 1-5 (1 = negativ, 5 = positiv)
  comment?: string; // bis zu 120 Zeichen, nicht in Klartext gespeichert
}

export interface CheckInState {
  step: 'intro' | 'questions' | 'custom' | 'result';
  secretId: string;
  initials?: string;
  selectedQuestions: Question[];
  currentQuestionIndex: number;
  answers: Record<number, number>; // questionId -> points (1-5)
  customVote?: CustomQuestionVote;
  submittedAt?: string;
  encodedNumber?: string;
}

export interface DecodedEntry {
  rawCode: string;
  secretId: string; // Die geheime Private ID (z.B. RS24), in die auch Namenskürzel wie "MM" umgerechnet werden!
  publicInitials?: string; // Optional ursprüngliches Namenskürzel
  isConvertedFromInitials?: boolean;
  scoreSum: number;
  averageScore: number; // 1.0 to 5.0
  kw: number;
  year: number;
  mondayDate: number;
  answers: number[];
  questionAnswers: QuestionAnswerPair[];
  customQuestion?: CustomQuestionVote;
  categories: Record<string, number>;
  isValid: boolean;
  errorMessage?: string;
}

export interface QuestionStat {
  questionId: number;
  title: string;
  tag: string;
  category: QuestionCategory;
  categoryLabel: string;
  averageScore: number; // 1.0 to 5.0
  percentage: number; // e.g. 78%
  count: number;
  distribution: [number, number, number, number, number]; // count for 1..5
}

export interface CustomQuestionStats {
  count: number;
  averageScore: number;
  percentage: number;
  comments: string[];
}

export interface TeamAnalytics {
  count: number;
  averageScore: number;
  overallPercentage: number; // e.g. 74%
  minScore: number;
  maxScore: number;
  distribution: {
    critical: number; // 1.0 - 2.0
    stressed: number; // 2.1 - 2.9
    neutral: number;  // 3.0 - 3.7
    good: number;     // 3.8 - 4.4
    peak: number;     // 4.5 - 5.0
  };
  categoryScores: Record<string, { label: string; score: number; count: number }>;
  questionStats: QuestionStat[];
  customQuestionStats?: CustomQuestionStats;
  healthVerdict: {
    title: string;
    description: string;
    status: 'peak' | 'good' | 'neutral' | 'critical';
  };
}

export interface AiActionPlan {
  currentPercentage: number;
  targetPercentage: number;
  summary: string;
  actions: {
    priority: number;
    title: string;
    questionContext: string;
    recommendation: string;
    potentialImpact: string;
  }[];
}
