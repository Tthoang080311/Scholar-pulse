import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BookOpen,
  Clock,
  Zap,
  Target,
  TrendingUp,
  Award,
  Calendar,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Download,
  Upload,
  Sparkles,
  Flame,
  Trash2,
  Plus,
  BarChart3,
  PieChart as PieChartIcon,
  MessageSquare,
  Send,
  X,
  Code2,
  Sliders,
  AlertCircle,
  ChevronRight,
  Brain,
  Layers,
  RefreshCw,
  FileJson,
  Check
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line
} from 'recharts';

// ============================================================================
// 1. TYPES & INTERFACES (TypeScript 100%)
// ============================================================================

export type SubjectId = 'math_ap' | 'english_grammar' | 'physics' | 'sat' | 'ielts';

export interface SubjectMeta {
  id: SubjectId;
  name: string;
  shortName: string;
  color: string;
  badgeBg: string;
  category: 'Core STEM' | 'Language' | 'Standardized Test';
}

export interface StudySession {
  id: string;
  subjectId: SubjectId;
  durationMinutes: number;
  comprehension: number; // 1 to 5
  topic: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
  source: 'manual' | 'pomodoro';
}

export interface GoalItem {
  id: string;
  title: string;
  subtitle: string;
  targetLabel: string;
  currentValue: number;
  targetValue: number;
  minValue: number;
  unit: string;
  deadlineTag: string;
  deadlineTone: 'urgent' | 'medium' | 'ap';
  notes: string;
}

export interface ScoreRecord {
  id: string;
  date: string; // YYYY-MM-DD
  satScore?: number; // 400 - 1600
  ieltsScore?: number; // 1.0 - 9.0
  note?: string;
}

export interface ScholarPulseState {
  version: string;
  targetTotalHours: number;
  sessions: StudySession[];
  goals: GoalItem[];
  scoreHistory: ScoreRecord[];
  lastUpdated: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// ============================================================================
// 2. CONSTANTS & REALISTIC SEED DATA
// ============================================================================

const STORAGE_KEY = 'scholarpulse_v2_5_state';

export const SUBJECTS: SubjectMeta[] = [
  {
    id: 'math_ap',
    name: 'Toán (AP Calculus / THPT)',
    shortName: 'Toán / AP Calc',
    color: '#a855f7', // Neon Purple
    badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    category: 'Core STEM'
  },
  {
    id: 'english_grammar',
    name: 'Tiếng Anh (Ngữ pháp & Từ vựng)',
    shortName: 'Tiếng Anh',
    color: '#3b82f6', // Electric Blue
    badgeBg: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    category: 'Language'
  },
  {
    id: 'physics',
    name: 'Vật lý',
    shortName: 'Vật lý',
    color: '#06b6d4', // Cyan
    badgeBg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    category: 'Core STEM'
  },
  {
    id: 'sat',
    name: 'SAT',
    shortName: 'SAT',
    color: '#f59e0b', // Amber Neon
    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    category: 'Standardized Test'
  },
  {
    id: 'ielts',
    name: 'IELTS',
    shortName: 'IELTS',
    color: '#10b981', // Emerald Neon
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    category: 'Standardized Test'
  }
];

const DEFAULT_GOALS: GoalItem[] = [
  {
    id: 'goal_sat',
    title: 'SAT',
    subtitle: 'Digital SAT (Math & Reading/Writing)',
    targetLabel: 'Mục tiêu: 1600',
    currentValue: 1510,
    targetValue: 1600,
    minValue: 1000,
    unit: 'điểm',
    deadlineTag: 'Deadline: Sớm',
    deadlineTone: 'urgent',
    notes: 'RW: 730 | Math: 780 — Cần tối ưu câu hỏi Reading mức Hard'
  },
  {
    id: 'goal_ielts',
    title: 'IELTS',
    subtitle: 'IELTS Academic (4 Kỹ năng)',
    targetLabel: 'Mục tiêu: 8.0+',
    currentValue: 7.5,
    targetValue: 8.5,
    minValue: 5.0,
    unit: 'band',
    deadlineTag: '~1.5 năm',
    deadlineTone: 'medium',
    notes: 'L: 8.5 | R: 8.0 | W: 7.0 | S: 7.0 — Tập trung nâng Writing Task 2'
  },
  {
    id: 'goal_ap_calc',
    title: 'AP Calculus BC',
    subtitle: 'Lớp 10-12 • Giải tích Nâng cao',
    targetLabel: 'Mục tiêu: Điểm 5/5',
    currentValue: 72,
    targetValue: 100,
    minValue: 0,
    unit: '% chương trình',
    deadlineTag: 'Kỳ thi AP',
    deadlineTone: 'ap',
    notes: 'Đã xong Limits, Derivatives & Integrals • Đang học Series & Taylor'
  }
];

// Helper to get YYYY-MM-DD for N days ago
const getDateDaysAgo = (daysAgo: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const generateSeedSessions = (): StudySession[] => {
  const rawSeeds: Array<{
    daysAgo: number;
    subjectId: SubjectId;
    durationMinutes: number;
    comprehension: number;
    topic: string;
    source: 'manual' | 'pomodoro';
  }> = [
    { daysAgo: 0, subjectId: 'sat', durationMinutes: 90, comprehension: 4, topic: 'Digital SAT RW Module 2 - Craft & Structure', source: 'pomodoro' },
    { daysAgo: 0, subjectId: 'math_ap', durationMinutes: 60, comprehension: 5, topic: 'Integration by Parts & Partial Fractions', source: 'manual' },
    { daysAgo: 1, subjectId: 'ielts', durationMinutes: 75, comprehension: 4, topic: 'Writing Task 2: Opinion Essay + Lexical Resource', source: 'pomodoro' },
    { daysAgo: 1, subjectId: 'physics', durationMinutes: 45, comprehension: 3, topic: 'Dao động điều hòa & Con lắc lò xo nâng cao', source: 'manual' },
    { daysAgo: 2, subjectId: 'sat', durationMinutes: 110, comprehension: 5, topic: 'Full Math Timed Drill + Desmos Regression Tricks', source: 'manual' },
    { daysAgo: 2, subjectId: 'english_grammar', durationMinutes: 50, comprehension: 4, topic: 'Inversion, Subjunctive Mood & C2 Collocations', source: 'pomodoro' },
    { daysAgo: 3, subjectId: 'math_ap', durationMinutes: 85, comprehension: 4, topic: 'Parametric Equations & Polar Coordinates (BC)', source: 'manual' },
    { daysAgo: 4, subjectId: 'ielts', durationMinutes: 60, comprehension: 4, topic: 'Cambridge 19 Test 3 Listening + Reading Passage 3', source: 'manual' },
    { daysAgo: 5, subjectId: 'physics', durationMinutes: 60, comprehension: 3, topic: 'Điện xoay chiều & Giản đồ Fre-nen', source: 'manual' },
    { daysAgo: 6, subjectId: 'sat', durationMinutes: 95, comprehension: 4, topic: 'Logical Completion & Command of Evidence (Quantitative)', source: 'pomodoro' },
    { daysAgo: 7, subjectId: 'english_grammar', durationMinutes: 45, comprehension: 5, topic: 'Academic Phrasal Verbs & Idiomatic Expressions', source: 'manual' },
    { daysAgo: 8, subjectId: 'math_ap', durationMinutes: 90, comprehension: 5, topic: 'Fundamental Theorem of Calculus & Differential Equations', source: 'pomodoro' },
    { daysAgo: 9, subjectId: 'ielts', durationMinutes: 80, comprehension: 4, topic: 'Speaking Part 2 & 3 Fluency Recording Drill', source: 'manual' },
    { daysAgo: 10, subjectId: 'sat', durationMinutes: 120, comprehension: 4, topic: 'Bluebook Practice Test #5 Review & Error Log', source: 'manual' },
    { daysAgo: 12, subjectId: 'physics', durationMinutes: 55, comprehension: 4, topic: 'Sóng cơ học & Giao thoa sóng hai nguồn kết hợp', source: 'manual' },
    { daysAgo: 13, subjectId: 'math_ap', durationMinutes: 70, comprehension: 4, topic: 'L’Hôpital’s Rule & Related Rates Optimization', source: 'pomodoro' },
    { daysAgo: 15, subjectId: 'english_grammar', durationMinutes: 60, comprehension: 4, topic: 'Punctuation Rules for SAT Standard English Conventions', source: 'manual' },
    { daysAgo: 17, subjectId: 'ielts', durationMinutes: 90, comprehension: 4, topic: 'Writing Task 1: Process & Dynamic Charts Comparison', source: 'manual' },
    { daysAgo: 19, subjectId: 'sat', durationMinutes: 85, comprehension: 5, topic: 'Advanced Geometry, Trigonometry & Circle Theorems', source: 'pomodoro' },
    { daysAgo: 21, subjectId: 'math_ap', durationMinutes: 100, comprehension: 5, topic: 'Implicit Differentiation & Inverse Trig Derivatives', source: 'manual' },
    { daysAgo: 24, subjectId: 'physics', durationMinutes: 50, comprehension: 3, topic: 'Động lực học chất điểm & Định luật bảo toàn', source: 'manual' },
    { daysAgo: 27, subjectId: 'ielts', durationMinutes: 65, comprehension: 4, topic: 'Reading True/False/Not Given Deep Analysis', source: 'manual' }
  ];

  return rawSeeds.map((seed, index) => {
    const dateStr = getDateDaysAgo(seed.daysAgo);
    return {
      id: `seed_session_${index}`,
      subjectId: seed.subjectId,
      durationMinutes: seed.durationMinutes,
      comprehension: seed.comprehension,
      topic: seed.topic,
      date: dateStr,
      timestamp: new Date(dateStr).getTime() + index * 1000,
      source: seed.source
    };
  });
};

const DEFAULT_SCORE_HISTORY: ScoreRecord[] = [
  { id: 'sc_1', date: getDateDaysAgo(28), satScore: 1420, ieltsScore: 7.0, note: 'Diagnostic Test đầu kỳ' },
  { id: 'sc_2', date: getDateDaysAgo(21), satScore: 1450, ieltsScore: 7.0, note: 'Bluebook Test #3' },
  { id: 'sc_3', date: getDateDaysAgo(14), satScore: 1480, ieltsScore: 7.5, note: 'Bluebook Test #4 + Mock IELTS' },
  { id: 'sc_4', date: getDateDaysAgo(7), satScore: 1490, ieltsScore: 7.5, note: 'Luyện đề RW nâng cao' },
  { id: 'sc_5', date: getDateDaysAgo(1), satScore: 1510, ieltsScore: 7.5, note: 'Bluebook Test #5 (Math 780, RW 730)' }
];

const getInitialDemoState = (): ScholarPulseState => ({
  version: '2.5',
  targetTotalHours: 120,
  sessions: generateSeedSessions(),
  goals: DEFAULT_GOALS,
  scoreHistory: DEFAULT_SCORE_HISTORY,
  lastUpdated: new Date().toISOString()
});

const getZeroBlankState = (): ScholarPulseState => ({
  version: '2.5',
  targetTotalHours: 120,
  sessions: [],
  goals: [
    {
      ...DEFAULT_GOALS[0],
      currentValue: 1500
    },
    {
      ...DEFAULT_GOALS[1],
      currentValue: 7.5
    },
    {
      ...DEFAULT_GOALS[2],
      currentValue: 0
    }
  ],
  scoreHistory: [
    { id: 'sc_init', date: getDateDaysAgo(0), satScore: 1500, ieltsScore: 7.5, note: 'Điểm khởi điểm' }
  ],
  lastUpdated: new Date().toISOString()
});

// ============================================================================
// 3. SOUND UTILITY (Web Audio API Chime for Pomodoro)
// ============================================================================

const playNotificationChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.14);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.14 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.14);
      osc.stop(ctx.currentTime + idx * 0.14 + 0.45);
    });
  } catch {
    // Ignore audio error if blocked by browser autoplay policy
  }
};

// ============================================================================
// 4. MODULAR SUB-COMPONENTS
// ============================================================================

interface HeaderProps {
  lastUpdated: string;
  sessionCount: number;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  onResetZero: () => void;
  onLoadDemo: () => void;
  onOpenProjectGuide: () => void;
}

const Header: React.FC<HeaderProps> = ({
  lastUpdated,
  sessionCount,
  onExportJson,
  onImportJson,
  onResetZero,
  onLoadDemo,
  onOpenProjectGuide
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const formattedTime = useMemo(() => {
    try {
      const d = new Date(lastUpdated);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return 'Vừa xong';
    }
  }, [lastUpdated]);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0f19]/85 backdrop-blur-xl">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Brand & Version */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-cyan-500 p-[1px] shadow-lg shadow-purple-500/20">
              <div className="w-full h-full bg-[#0b0f19] rounded-[11px] flex items-center justify-center">
                <Brain className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-purple-300 bg-clip-text text-transparent">
                  ScholarPulse
                </h1>
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  v2.5
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Advanced Learning Analytics &amp; Local-first Tracker
              </p>
            </div>
          </div>

          {/* Mobile status badge */}
          <div className="flex md:hidden items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Local-first Active</span>
          </div>
        </div>

        {/* Right Controls: Status Badge + Data Backup/Restore + Project Guide */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Dynamic Status Badge */}
          <div
            title={`Lưu tự động vào localStorage lúc ${formattedTime}`}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-medium mr-1"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>🟢 Local-first Active</span>
            <span className="text-emerald-400/60 border-l border-emerald-500/20 pl-2 tabular-nums">
              {formattedTime}
            </span>
          </div>

          {/* Toggle Demo vs Blank Zero State */}
          {sessionCount > 0 ? (
            <button
              onClick={onResetZero}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-white/10 text-xs font-medium transition"
              title="Đặt lại về trạng thái 0h 0m như ảnh mẫu ban đầu"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Reset về 0</span>
            </button>
          ) : (
            <button
              onClick={onLoadDemo}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-medium transition"
              title="Nạp dữ liệu mẫu 30 ngày để xem biểu đồ đầy đủ"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Nạp dữ liệu mẫu</span>
            </button>
          )}

          {/* Export JSON */}
          <button
            onClick={onExportJson}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-white/10 text-xs font-medium transition"
            title="Xuất toàn bộ dữ liệu học tập ra file .json"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export JSON</span>
          </button>

          {/* Import JSON */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onImportJson(file);
                e.target.value = '';
              }
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-white/10 text-xs font-medium transition"
            title="Khôi phục dữ liệu từ file .json"
          >
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span>Import JSON</span>
          </button>

          {/* Architecture & Vercel Guide Modal Button */}
          <button
            onClick={onOpenProjectGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600/30 to-blue-600/30 hover:from-purple-600/40 hover:to-blue-600/40 text-purple-200 border border-purple-500/30 text-xs font-semibold transition shadow-sm"
          >
            <Code2 className="w-3.5 h-3.5 text-purple-300" />
            <span className="hidden sm:inline">Cấu trúc &amp; Deploy Vercel</span>
            <span className="sm:hidden">Deploy</span>
          </button>
        </div>
      </div>
    </header>
  );
};

// ============================================================================
// 5. TOP METRIC CARDS COMPONENT (`MetricCards.tsx`)
// ============================================================================

interface MetricCardsProps {
  sessions: StudySession[];
  targetTotalHours: number;
  streakDays: number;
  onUpdateTargetHours: (newTarget: number) => void;
}

const MetricCards: React.FC<MetricCardsProps> = ({
  sessions,
  targetTotalHours,
  streakDays,
  onUpdateTargetHours
}) => {
  const [editingTarget, setEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState(String(targetTotalHours));

  const stats = useMemo(() => {
    const totalMinutes = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const totalHoursFloat = totalMinutes / 60;

    // Comprehension average (Velocity / Học lực)
    const avgComprehension =
      sessions.length > 0
        ? sessions.reduce((acc, s) => acc + s.comprehension, 0) / sessions.length
        : 0;

    // Effective Hours weighted by comprehension (comprehension / 5)
    const effectiveHours =
      sessions.reduce((acc, s) => acc + (s.durationMinutes / 60) * (s.comprehension / 5), 0);

    // Weekly change % calculation (Last 7 days vs Previous 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(now.getDate() - 14);

    let thisWeekMins = 0;
    let lastWeekMins = 0;

    sessions.forEach((s) => {
      const d = new Date(s.date);
      if (d >= sevenDaysAgo) {
        thisWeekMins += s.durationMinutes;
      } else if (d >= fourteenDaysAgo && d < sevenDaysAgo) {
        lastWeekMins += s.durationMinutes;
      }
    });

    const weeklyChangePercent =
      lastWeekMins === 0
        ? thisWeekMins > 0
          ? 100
          : 0
        : Math.round(((thisWeekMins - lastWeekMins) / lastWeekMins) * 100);

    const progressPercent = Math.min(
      100,
      Number(((totalHoursFloat / Math.max(1, targetTotalHours)) * 100).toFixed(1))
    );

    return {
      hours,
      minutes,
      totalHoursFloat,
      avgComprehension,
      effectiveHours,
      thisWeekMins,
      weeklyChangePercent,
      progressPercent
    };
  }, [sessions, targetTotalHours]);

  const handleSaveTarget = () => {
    const parsed = Number(tempTarget);
    if (!isNaN(parsed) && parsed >= 10 && parsed <= 2000) {
      onUpdateTargetHours(parsed);
    }
    setEditingTarget(false);
  };

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Card 1: Tổng thời gian học */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 p-5 shadow-lg hover:border-purple-500/30 transition group">
        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-purple-600/10 blur-2xl group-hover:bg-purple-600/20 transition" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Tổng thời gian học
          </span>
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-white tabular-nums tracking-tight">
            {stats.hours}h {stats.minutes}m
          </span>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums ${
              stats.weeklyChangePercent >= 0
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
            }`}
          >
            {stats.weeklyChangePercent >= 0 ? `+${stats.weeklyChangePercent}%` : `${stats.weeklyChangePercent}%`} tuần này
          </span>
        </div>
        <p className="mt-2.5 text-xs text-slate-400 flex items-center justify-between">
          <span>Giờ học hiệu quả (Weighted):</span>
          <span className="text-purple-300 font-semibold tabular-nums">
            {stats.effectiveHours.toFixed(1)}h thực chất
          </span>
        </p>
      </div>

      {/* Card 2: Học lực & Tốc độ (Velocity) */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 p-5 shadow-lg hover:border-blue-500/30 transition group">
        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-blue-600/10 blur-2xl group-hover:bg-blue-600/20 transition" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Học lực &amp; Tốc độ (Velocity)
          </span>
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Zap className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-white tabular-nums tracking-tight">
            {stats.avgComprehension.toFixed(1)}
          </span>
          <span className="text-sm text-slate-400 font-medium">
            / 5.0 điểm hiểu bài TB
          </span>
        </div>
        <div className="mt-3">
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${(stats.avgComprehension / 5) * 100}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400 flex justify-between">
            <span>Chất lượng tiếp thu kiến thức</span>
            <span className="text-cyan-300 font-medium">
              {stats.avgComprehension >= 4.2
                ? 'Xuất sắc (Deep Mastery)'
                : stats.avgComprehension >= 3.2
                ? 'Khá tốt (Solid)'
                : stats.avgComprehension > 0
                ? 'Cần ôn lại (Review)'
                : 'Chưa có dữ liệu'}
            </span>
          </p>
        </div>
      </div>

      {/* Card 3: Phiên học đã ghi nhận */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 p-5 shadow-lg hover:border-cyan-500/30 transition group">
        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-cyan-600/10 blur-2xl group-hover:bg-cyan-600/20 transition" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Phiên học đã ghi nhận
          </span>
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2.5">
          <span className="text-3xl font-extrabold text-white tabular-nums tracking-tight">
            {sessions.length}
          </span>
          <span className="text-xs text-slate-400">bản ghi local-first</span>
        </div>
        <div className="mt-2.5 flex items-center justify-between text-xs">
          <span className="text-slate-400">Chuỗi duy trì (Streak):</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold tabular-nums">
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            {streakDays} ngày liên tiếp
          </span>
        </div>
      </div>

      {/* Card 4: Tiến độ Ôn tập Tổng thể */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 p-5 shadow-lg hover:border-emerald-500/30 transition group">
        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-emerald-600/10 blur-2xl group-hover:bg-emerald-600/20 transition" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Tiến độ Ôn tập Tổng thể
          </span>
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Target className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tabular-nums tracking-tight">
              {stats.progressPercent}%
            </span>
            <span className="text-xs text-slate-400">
              ({stats.totalHoursFloat.toFixed(1)}h / {targetTotalHours}h)
            </span>
          </div>
          {!editingTarget ? (
            <button
              onClick={() => {
                setTempTarget(String(targetTotalHours));
                setEditingTarget(true);
              }}
              className="text-[11px] text-purple-300 hover:text-purple-200 underline underline-offset-2"
            >
              Đổi mục tiêu
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={tempTarget}
                onChange={(e) => setTempTarget(e.target.value)}
                className="w-16 px-1.5 py-0.5 text-xs bg-slate-800 border border-purple-500/40 rounded text-white"
              />
              <button
                onClick={handleSaveTarget}
                className="p-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
              >
                <Check className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
        <div className="mt-3">
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${stats.progressPercent}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400 flex justify-between">
            <span>Mục tiêu chiến dịch</span>
            <span className="text-emerald-300 font-medium tabular-nums">
              Còn {Math.max(0, targetTotalHours - stats.totalHoursFloat).toFixed(1)}h nữa
            </span>
          </p>
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// 6. GOALS & DEADLINES SECTION (`GoalSection.tsx`)
// ============================================================================

interface GoalSectionProps {
  goals: GoalItem[];
  onUpdateGoal: (goalId: string, newCurrentValue: number, newNotes?: string) => void;
}

const GoalSection: React.FC<GoalSectionProps> = ({ goals, onUpdateGoal }) => {
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [inputVal, setInputVal] = useState<string>('');
  const [inputNotes, setInputNotes] = useState<string>('');

  const startEditing = (g: GoalItem) => {
    setEditingGoalId(g.id);
    setInputVal(String(g.currentValue));
    setInputNotes(g.notes);
  };

  const saveEdit = (g: GoalItem) => {
    const parsed = Number(inputVal);
    if (!isNaN(parsed)) {
      onUpdateGoal(g.id, parsed, inputNotes);
    }
    setEditingGoalId(null);
  };

  const getBadgeStyle = (tone: GoalItem['deadlineTone']) => {
    switch (tone) {
      case 'urgent':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'medium':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'ap':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Mục tiêu &amp; Deadline Trọng tâm</h2>
            <p className="text-xs text-slate-400">
              Theo dõi sát tiến độ điểm số chuẩn hóa &amp; học thuật THPT
            </p>
          </div>
        </div>
        <span className="text-[11px] text-slate-400 hidden sm:inline">
          Nhấn vào thẻ để cập nhật điểm hiện tại
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {goals.map((goal) => {
          const pct = Math.max(
            5,
            Math.min(
              100,
              Math.round(((goal.currentValue - goal.minValue) / (goal.targetValue - goal.minValue)) * 100)
            )
          );
          const isEditing = editingGoalId === goal.id;

          return (
            <div
              key={goal.id}
              className="rounded-xl bg-slate-950/60 border border-white/10 p-4 hover:border-purple-500/30 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      {goal.title}
                    </h3>
                    <p className="text-xs text-slate-400">{goal.subtitle}</p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${getBadgeStyle(
                      goal.deadlineTone
                    )}`}
                  >
                    {goal.deadlineTag}
                  </span>
                </div>

                {/* Target vs Current */}
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-purple-300">{goal.targetLabel}</span>
                  <span className="text-xs text-slate-300 tabular-nums">
                    Hiện tại:{' '}
                    <strong className="text-white font-bold">
                      {goal.currentValue} {goal.unit}
                    </strong>
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mt-2 w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">{goal.notes}</p>
              </div>

              {/* Quick Edit Controls */}
              <div className="mt-3 pt-2.5 border-t border-white/5">
                {!isEditing ? (
                  <button
                    onClick={() => startEditing(goal)}
                    className="w-full text-left text-[11px] text-slate-400 hover:text-purple-300 flex items-center justify-between transition"
                  >
                    <span>Cập nhật tiến độ / điểm thi thử</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.5"
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        className="w-24 px-2 py-1 text-xs rounded bg-slate-900 border border-purple-500/40 text-white"
                        placeholder="Điểm mới"
                      />
                      <input
                        type="text"
                        value={inputNotes}
                        onChange={(e) => setInputNotes(e.target.value)}
                        className="flex-1 px-2 py-1 text-xs rounded bg-slate-900 border border-white/15 text-slate-200"
                        placeholder="Ghi chú..."
                      />
                    </div>
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setEditingGoalId(null)}
                        className="px-2 py-1 text-[11px] rounded bg-slate-800 text-slate-300"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={() => saveEdit(goal)}
                        className="px-2.5 py-1 text-[11px] rounded bg-purple-600 text-white font-medium"
                      >
                        Lưu
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// 7. TIME DISTRIBUTION TABLE (`TimeDistributionTable.tsx`)
// ============================================================================

interface TimeDistributionTableProps {
  sessions: StudySession[];
}

const TimeDistributionTable: React.FC<TimeDistributionTableProps> = ({ sessions }) => {
  const distribution = useMemo(() => {
    const totalMinutes = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);

    return SUBJECTS.map((subj) => {
      const subjSessions = sessions.filter((s) => s.subjectId === subj.id);
      const mins = subjSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
      const hours = (mins / 60).toFixed(1);
      const share = totalMinutes > 0 ? Math.round((mins / totalMinutes) * 100) : 0;
      const avgComp =
        subjSessions.length > 0
          ? (subjSessions.reduce((acc, s) => acc + s.comprehension, 0) / subjSessions.length).toFixed(1)
          : '0.0';

      return {
        ...subj,
        mins,
        hours,
        share,
        sessionCount: subjSessions.length,
        avgComp
      };
    });
  }, [sessions]);

  return (
    <div className="rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Phân bổ Thời gian Giữa các Môn học
            </h2>
            <p className="text-xs text-slate-400">
              Tỷ trọng giờ học thực tế &amp; mức độ hiểu bài trung bình từng môn
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="py-3 pr-4">Môn học / Chuyên đề</th>
              <th className="py-3 px-3 text-right">Số phiên</th>
              <th className="py-3 px-3 text-right">Thời lượng</th>
              <th className="py-3 px-3 text-right">Độ hiểu TB</th>
              <th className="py-3 pl-4 w-44 sm:w-56">Tỷ trọng (%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm">
            {distribution.map((row) => (
              <tr key={row.id} className="hover:bg-white/[0.02] transition">
                <td className="py-3.5 pr-4">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: row.color }}
                    />
                    <div>
                      <div className="font-semibold text-slate-100">{row.name}</div>
                      <span className="text-[11px] text-slate-400">{row.category}</span>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-3 text-right tabular-nums text-slate-300">
                  {row.sessionCount} phiên
                </td>
                <td className="py-3.5 px-3 text-right tabular-nums">
                  <span className="font-bold text-white">{row.hours}h</span>{' '}
                  <span className="text-xs text-slate-400">({row.mins}p)</span>
                </td>
                <td className="py-3.5 px-3 text-right tabular-nums">
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-white/10 text-xs font-semibold text-cyan-300">
                    {row.avgComp} / 5.0
                  </span>
                </td>
                <td className="py-3.5 pl-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${row.share}%`,
                          backgroundColor: row.color
                        }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs font-bold tabular-nums text-slate-200">
                      {row.share}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================================
// 8. INTERACTIVE LOGGER FORM (`TimeTrackerForm.tsx`)
// ============================================================================

interface TimeTrackerFormProps {
  onAddSession: (session: Omit<StudySession, 'id' | 'timestamp'>) => void;
  recentSessions: StudySession[];
  onDeleteSession: (id: string) => void;
}

const COMPREHENSION_LABELS: Record<number, string> = {
  1: '1 - Mơ hồ (Cần học lại)',
  2: '2 - Hiểu sơ bộ (<50%)',
  3: '3 - Nắm được cơ bản (~70%)',
  4: '4 - Vận dụng tốt (~85%)',
  5: '5 - Làm chủ hoàn toàn (95%+)'
};

const TimeTrackerForm: React.FC<TimeTrackerFormProps> = ({
  onAddSession,
  recentSessions,
  onDeleteSession
}) => {
  const [subjectId, setSubjectId] = useState<SubjectId>('math_ap');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [comprehension, setComprehension] = useState<number>(4);
  const [topic, setTopic] = useState<string>('');
  const [date, setDate] = useState<string>(getDateDaysAgo(0));
  const [justSaved, setJustSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (durationMinutes <= 0 || durationMinutes > 720) return;

    const selectedSubj = SUBJECTS.find((s) => s.id === subjectId);
    onAddSession({
      subjectId,
      durationMinutes: Number(durationMinutes),
      comprehension,
      topic: topic.trim() || `Ôn tập ${selectedSubj?.shortName || 'chuyên đề'}`,
      date,
      source: 'manual'
    });

    setTopic('');
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  return (
    <div className="rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 p-5 shadow-lg flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Ghi nhận Tiến trình Học tập</h2>
              <p className="text-xs text-slate-400">
                Cập nhật ngay vào thuật toán phân tích &amp; LocalStorage
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Subject Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Chọn Môn học / Mục tiêu
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value as SubjectId)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-white/10 text-sm text-white focus:outline-none focus:border-purple-500 transition"
            >
              {SUBJECTS.map((subj) => (
                <option key={subj.id} value={subj.id} className="bg-slate-900 text-white">
                  {subj.name}
                </option>
              ))}
            </select>
          </div>

          {/* Duration & Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Thời lượng học (phút)
              </label>
              <input
                type="number"
                min={5}
                max={720}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950/90 border border-white/10 text-sm text-white tabular-nums focus:outline-none focus:border-purple-500"
              />
              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[25, 45, 60, 90, 120].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDurationMinutes(preset)}
                    className={`px-2 py-0.5 text-[11px] rounded-md border transition tabular-nums ${
                      durationMinutes === preset
                        ? 'bg-purple-600/30 border-purple-500 text-purple-200 font-semibold'
                        : 'bg-slate-800/70 border-white/5 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {preset}p
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Ngày thực hiện
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950/90 border border-white/10 text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Comprehension Rating (1-5) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Đánh giá mức độ hiểu bài (1 - 5)
              </label>
              <span className="text-xs font-semibold text-cyan-300">
                {COMPREHENSION_LABELS[comprehension]}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setComprehension(level)}
                  className={`py-2 rounded-xl font-bold text-sm border transition flex flex-col items-center justify-center ${
                    comprehension === level
                      ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white border-purple-400 shadow-md shadow-purple-500/20'
                      : 'bg-slate-950/70 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                  }`}
                >
                  <span>{level} ★</span>
                </button>
              ))}
            </div>
          </div>

          {/* Topic / Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Chuyên đề / Ghi chú phiên học (Tùy chọn)
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="VD: Giải đề Bluebook Test #6, Tích phân từng phần..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950/90 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            {justSaved ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Đã ghi nhận &amp; Cập nhật biểu đồ!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Lưu Phiên Học &amp; Cập Nhật Phân Tích</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Mini Recent Sessions List */}
      <div className="mt-5 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Nhật ký gần đây ({recentSessions.length})
          </span>
        </div>
        {recentSessions.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 text-center">
            Chưa có phiên học nào. Hãy ghi nhận phiên học đầu tiên!
          </p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {recentSessions.slice(0, 5).map((s) => {
              const subj = SUBJECTS.find((item) => item.id === s.subjectId);
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-white/5 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: subj?.color || '#a855f7' }}
                      />
                      <span className="font-semibold text-slate-200 truncate">
                        {subj?.shortName}
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-purple-300 font-semibold tabular-nums">
                        {s.durationMinutes}p
                      </span>
                      <span className="text-cyan-300 tabular-nums">({s.comprehension}★)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{s.topic}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-slate-500 tabular-nums">{s.date.slice(5)}</span>
                    <button
                      onClick={() => onDeleteSession(s.id)}
                      className="text-slate-500 hover:text-rose-400 transition p-1"
                      title="Xóa bản ghi này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 9. POMODORO FOCUS TIMER (`PomodoroTimer.tsx`)
// ============================================================================

interface PomodoroTimerProps {
  onAutoLogPomodoro: (subjectId: SubjectId, minutes: number, comprehension: number, note: string) => void;
}

const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ onAutoLogPomodoro }) => {
  const [mode, setMode] = useState<'focus25' | 'focus50' | 'break5'>('focus25');
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedSubject, setSelectedSubject] = useState<SubjectId>('sat');
  const [comprehension, setComprehension] = useState<number>(4);
  const [sessionBanner, setSessionBanner] = useState<string | null>(null);

  const totalModeSeconds = mode === 'focus25' ? 25 * 60 : mode === 'focus50' ? 50 * 60 : 5 * 60;

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsRunning(false);
          playNotificationChime();
          if (mode !== 'break5') {
            const mins = mode === 'focus25' ? 25 : 50;
            const subj = SUBJECTS.find((s) => s.id === selectedSubject);
            onAutoLogPomodoro(
              selectedSubject,
              mins,
              comprehension,
              `Phiên Pomodoro hoàn tất (${mins} phút • ${subj?.shortName})`
            );
            setSessionBanner(`🎉 Đã tự động cộng +${mins} phút vào môn ${subj?.shortName}!`);
            setTimeout(() => setSessionBanner(null), 5000);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, mode, selectedSubject, comprehension, onAutoLogPomodoro]);

  const switchMode = (newMode: 'focus25' | 'focus50' | 'break5') => {
    setIsRunning(false);
    setMode(newMode);
    setSecondsLeft(newMode === 'focus25' ? 25 * 60 : newMode === 'focus50' ? 50 * 60 : 5 * 60);
  };

  const handleLogElapsedNow = () => {
    const elapsedSeconds = totalModeSeconds - secondsLeft;
    const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    const subj = SUBJECTS.find((s) => s.id === selectedSubject);
    onAutoLogPomodoro(
      selectedSubject,
      elapsedMinutes,
      comprehension,
      `Phiên Focus Pomodoro (${elapsedMinutes} phút • ${subj?.shortName})`
    );
    setIsRunning(false);
    setSecondsLeft(totalModeSeconds);
    setSessionBanner(`✅ Đã ghi nhận +${elapsedMinutes} phút học ${subj?.shortName}!`);
    setTimeout(() => setSessionBanner(null), 4000);
  };

  const minsDisplay = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secsDisplay = String(secondsLeft % 60).padStart(2, '0');
  const progressPct = Math.round(((totalModeSeconds - secondsLeft) / totalModeSeconds) * 100);

  return (
    <div className="rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 p-5 shadow-lg relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Pomodoro Focus Timer</h2>
            <p className="text-xs text-slate-400">Tự động cộng dồn giờ học khi hết giờ</p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-white/10 text-xs">
          <button
            onClick={() => switchMode('focus25')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              mode === 'focus25' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            25p
          </button>
          <button
            onClick={() => switchMode('focus50')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              mode === 'focus50' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            50p
          </button>
          <button
            onClick={() => switchMode('break5')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              mode === 'break5' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Nghỉ 5p
          </button>
        </div>
      </div>

      {/* Timer Display */}
      <div className="my-4 p-4 rounded-2xl bg-slate-950/80 border border-white/10 flex flex-col items-center justify-center relative">
        <div className="text-5xl font-black tracking-wider text-white tabular-nums font-mono">
          {minsDisplay}:{secsDisplay}
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-3">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex items-center gap-2.5 mt-4">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`px-5 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition shadow-md ${
              isRunning
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? 'Tạm dừng' : 'Bắt đầu Focus'}</span>
          </button>

          <button
            onClick={() => {
              setIsRunning(false);
              setSecondsLeft(totalModeSeconds);
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 transition"
            title="Đặt lại đồng hồ"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {mode !== 'break5' && secondsLeft < totalModeSeconds && (
            <button
              onClick={handleLogElapsedNow}
              className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition"
              title="Lưu ngay số phút vừa bấm giờ vào thống kê"
            >
              Lưu phiên ngay
            </button>
          )}
        </div>
      </div>

      {/* Subject & Comprehension Linked to Timer */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="sm:col-span-2">
          <label className="block text-[11px] text-slate-400 mb-1">
            Môn học đang bấm giờ:
          </label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value as SubjectId)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-xs"
          >
            {SUBJECTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">Mức độ hiểu:</label>
          <select
            value={comprehension}
            onChange={(e) => setComprehension(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-cyan-300 font-semibold text-xs"
          >
            {[5, 4, 3, 2, 1].map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl} ★ / 5
              </option>
            ))}
          </select>
        </div>
      </div>

      {sessionBanner && (
        <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs font-medium text-center">
          {sessionBanner}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 10. ANALYTICS & TREND CHARTS (`AnalyticsCharts.tsx`)
// ============================================================================

interface AnalyticsChartsProps {
  sessions: StudySession[];
  scoreHistory: ScoreRecord[];
  onAddScoreRecord: (record: Omit<ScoreRecord, 'id'>) => void;
}

const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  sessions,
  scoreHistory,
  onAddScoreRecord
}) => {
  const [rangeDays, setRangeDays] = useState<7 | 14 | 30>(14);
  const [activeChartTab, setActiveChartTab] = useState<'time' | 'scores'>('time');

  // Form state for adding a new mock test score
  const [newSat, setNewSat] = useState<string>('1520');
  const [newIelts, setNewIelts] = useState<string>('8.0');
  const [newScoreNote, setNewScoreNote] = useState<string>('');

  // Filtered daily time series data
  const dailyData = useMemo(() => {
    const result: Array<{
      date: string;
      label: string;
      totalHours: number;
      avgComp: number;
    }> = [];

    for (let i = rangeDays - 1; i >= 0; i--) {
      const dStr = getDateDaysAgo(i);
      const daySessions = sessions.filter((s) => s.date === dStr);
      const mins = daySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
      const avgComp =
        daySessions.length > 0
          ? daySessions.reduce((acc, s) => acc + s.comprehension, 0) / daySessions.length
          : 0;

      result.push({
        date: dStr,
        label: dStr.slice(5), // MM-DD
        totalHours: Number((mins / 60).toFixed(2)),
        avgComp: Number(avgComp.toFixed(1))
      });
    }
    return result;
  }, [sessions, rangeDays]);

  // Pie chart data for filtered range
  const pieData = useMemo(() => {
    const cutoffDate = getDateDaysAgo(rangeDays);
    const filtered = sessions.filter((s) => s.date >= cutoffDate);

    return SUBJECTS.map((subj) => {
      const mins = filtered
        .filter((s) => s.subjectId === subj.id)
        .reduce((acc, s) => acc + s.durationMinutes, 0);
      return {
        name: subj.shortName,
        value: Number((mins / 60).toFixed(1)),
        color: subj.color
      };
    }).filter((d) => d.value > 0);
  }, [sessions, rangeDays]);

  const handleAddMockScore = (e: React.FormEvent) => {
    e.preventDefault();
    const satNum = Number(newSat);
    const ieltsNum = Number(newIelts);
    onAddScoreRecord({
      date: getDateDaysAgo(0),
      satScore: !isNaN(satNum) && satNum >= 400 ? satNum : undefined,
      ieltsScore: !isNaN(ieltsNum) && ieltsNum >= 1 ? ieltsNum : undefined,
      note: newScoreNote.trim() || 'Thi thử định kỳ'
    });
    setNewScoreNote('');
  };

  return (
    <div className="rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 p-5 shadow-lg">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Biểu đồ Phân tích &amp; Xu hướng Học thuật
            </h2>
            <p className="text-xs text-slate-400">
              Theo dõi biến thiên giờ học hàng ngày &amp; quỹ đạo điểm thi chuẩn hóa
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Switcher */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setActiveChartTab('time')}
              className={`px-3 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeChartTab === 'time'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <PieChartIcon className="w-3.5 h-3.5" />
              <span>Phân bổ Thời gian</span>
            </button>
            <button
              onClick={() => setActiveChartTab('scores')}
              className={`px-3 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeChartTab === 'scores'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Xu hướng SAT / IELTS</span>
            </button>
          </div>

          {/* 7d / 14d / 30d Range Filter */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-white/10 text-xs">
            {([7, 14, 30] as const).map((d) => (
              <button
                key={d}
                onClick={() => setRangeDays(d)}
                className={`px-2.5 py-1 rounded-lg font-semibold tabular-nums transition ${
                  rangeDays === d
                    ? 'bg-slate-800 text-purple-300 border border-purple-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {d} ngày
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeChartTab === 'time' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-center">
          {/* Bar/Area Chart: Daily Study Hours */}
          <div className="lg:col-span-2 h-72 bg-slate-950/50 rounded-xl p-3 border border-white/5">
            <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
              <span>Số giờ học mỗi ngày ({rangeDays} ngày qua)</span>
              <span className="text-purple-300">Đơn vị: Giờ (h)</span>
            </div>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: 'rgba(255,255,255,0.12)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#f8fafc'
                  }}
                />
                <Bar
                  dataKey="totalHours"
                  name="Giờ học"
                  fill="#a855f7"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Donut Chart: Subject Share */}
          <div className="h-72 bg-slate-950/50 rounded-xl p-3 border border-white/5 flex flex-col justify-between">
            <div className="text-xs font-semibold text-slate-300">
              Tỷ trọng theo môn ({rangeDays} ngày)
            </div>
            {pieData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
                Chưa có dữ liệu trong khoảng thời gian này
              </div>
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={72}
                      paddingAngle={3}
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: 'rgba(255,255,255,0.12)',
                        borderRadius: '10px',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="flex flex-wrap gap-2 justify-center">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-1 text-[11px] text-slate-300">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span>
                    {item.name}: <strong>{item.value}h</strong>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* SAT Trend */}
            <div className="h-64 bg-slate-950/50 rounded-xl p-3.5 border border-white/5">
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className="text-amber-300">Xu hướng Điểm SAT (Mục tiêu: 1600)</span>
                <span className="text-slate-400">Thang 400 - 1600</span>
              </div>
              <ResponsiveContainer width="100%" height="88%">
                <AreaChart data={scoreHistory}>
                  <defs>
                    <linearGradient id="satGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis domain={[1200, 1600]} stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: 'rgba(255,255,255,0.12)',
                      borderRadius: '10px',
                      fontSize: '12px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="satScore"
                    name="Điểm SAT"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    fill="url(#satGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* IELTS Trend */}
            <div className="h-64 bg-slate-950/50 rounded-xl p-3.5 border border-white/5">
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className="text-emerald-300">Xu hướng Band IELTS (Mục tiêu: 8.0+)</span>
                <span className="text-slate-400">Thang 1.0 - 9.0</span>
              </div>
              <ResponsiveContainer width="100%" height="88%">
                <LineChart data={scoreHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis domain={[5.5, 9.0]} stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: 'rgba(255,255,255,0.12)',
                      borderRadius: '10px',
                      fontSize: '12px'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ieltsScore"
                    name="Band IELTS"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10b981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Add Mock Test Score Bar */}
          <form
            onSubmit={handleAddMockScore}
            className="p-3.5 rounded-xl bg-slate-950/70 border border-white/10 flex flex-wrap items-end gap-3"
          >
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Điểm SAT Mock</label>
              <input
                type="number"
                min={400}
                max={1600}
                step={10}
                value={newSat}
                onChange={(e) => setNewSat(e.target.value)}
                className="w-28 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Band IELTS Mock</label>
              <input
                type="number"
                min={1}
                max={9}
                step={0.5}
                value={newIelts}
                onChange={(e) => setNewIelts(e.target.value)}
                className="w-28 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white"
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[11px] text-slate-400 mb-1">Ghi chú kỳ thi thử</label>
              <input
                type="text"
                value={newScoreNote}
                onChange={(e) => setNewScoreNote(e.target.value)}
                placeholder="VD: Bluebook Practice Test #6..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
            >
              + Thêm mốc điểm
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 11. SMART STREAK & GITHUB-STYLE ACTIVITY HEATMAP (`ActivityHeatmap.tsx`)
// ============================================================================

interface ActivityHeatmapProps {
  sessions: StudySession[];
  streakDays: number;
}

const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ sessions, streakDays }) => {
  // Generate 84 days (12 weeks) grid
  const heatmapDays = useMemo(() => {
    const map = new Map<string, number>();
    sessions.forEach((s) => {
      map.set(s.date, (map.get(s.date) || 0) + s.durationMinutes);
    });

    const days: Array<{ date: string; minutes: number }> = [];
    for (let i = 83; i >= 0; i--) {
      const d = getDateDaysAgo(i);
      days.push({
        date: d,
        minutes: map.get(d) || 0
      });
    }
    return days;
  }, [sessions]);

  const activeDaysCount = useMemo(
    () => heatmapDays.filter((d) => d.minutes > 0).length,
    [heatmapDays]
  );

  const getCellColor = (mins: number) => {
    if (mins === 0) return 'bg-slate-800/70 border-white/5';
    if (mins < 45) return 'bg-emerald-900/70 border-emerald-700/40';
    if (mins < 90) return 'bg-emerald-600/70 border-emerald-500/50';
    if (mins < 150) return 'bg-emerald-500 border-emerald-400';
    return 'bg-cyan-400 border-white shadow-sm shadow-cyan-400/50';
  };

  return (
    <div className="rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Smart Streak &amp; Bản đồ nhiệt Hoạt động (84 ngày)
            </h2>
            <p className="text-xs text-slate-400">
              Mật độ cày cuốc mỗi ngày theo phong cách GitHub Contribution Graph
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-white/10 text-slate-300 tabular-nums">
            Ngày có học: <strong className="text-emerald-400">{activeDaysCount}/84</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold tabular-nums">
            🔥 Streak: {streakDays} ngày
          </span>
        </div>
      </div>

      {/* 12-week Grid */}
      <div className="overflow-x-auto pb-2">
        <div className="grid grid-flow-col grid-rows-7 gap-1.5 min-w-[520px]">
          {heatmapDays.map((item) => (
            <div
              key={item.date}
              title={`${item.date}: ${item.minutes} phút học (${(item.minutes / 60).toFixed(1)}h)`}
              className={`w-4 h-4 sm:w-5 sm:h-5 rounded-[5px] border transition transform hover:scale-125 cursor-pointer ${getCellColor(
                item.minutes
              )}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
        <span>Chạm hoặc di chuột vào từng ô vuông để xem chi tiết số phút học mỗi ngày</span>
        <div className="flex items-center gap-1.5">
          <span>Ít</span>
          <span className="w-3 h-3 rounded-sm bg-slate-800/70 inline-block" />
          <span className="w-3 h-3 rounded-sm bg-emerald-900/70 inline-block" />
          <span className="w-3 h-3 rounded-sm bg-emerald-600/70 inline-block" />
          <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
          <span className="w-3 h-3 rounded-sm bg-cyan-400 inline-block" />
          <span>Nhiều (150p+)</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 12. AI STUDY ASSISTANT MINI-WIDGET (`AiStudyAssistant.tsx`)
// ============================================================================

interface AiStudyAssistantProps {
  sessions: StudySession[];
  goals: GoalItem[];
  targetTotalHours: number;
}

const AiStudyAssistant: React.FC<AiStudyAssistantProps> = ({
  sessions,
  goals,
  targetTotalHours
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Xin chào! Mình là **ScholarPulse AI Coach v2.5**. Mình có thể đọc trực tiếp dữ liệu LocalStorage của bạn để chỉ ra lỗ hổng phân bổ thời gian, môn có điểm hiểu bài thấp nhất và gợi ý lịch ôn SAT 1600 / IELTS 8.0+ / AP Calc BC. Bạn muốn phân tích gì hôm nay?',
      timestamp: 'Sẵn sàng'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Build deterministic local diagnostic summary
  const buildLocalDiagnostic = (userPrompt: string): string => {
    const totalMins = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    const totalHours = (totalMins / 60).toFixed(1);

    const bySubject = SUBJECTS.map((subj) => {
      const sList = sessions.filter((s) => s.subjectId === subj.id);
      const mins = sList.reduce((a, b) => a + b.durationMinutes, 0);
      const avgComp =
        sList.length > 0
          ? sList.reduce((a, b) => a + b.comprehension, 0) / sList.length
          : 0;
      return { ...subj, mins, avgComp, count: sList.length };
    });

    const weakestComp = [...bySubject]
      .filter((s) => s.count > 0)
      .sort((a, b) => a.avgComp - b.avgComp)[0];
    const leastStudied = [...bySubject].sort((a, b) => a.mins - b.mins)[0];
    const mostStudied = [...bySubject].sort((a, b) => b.mins - a.mins)[0];

    return [
      `📊 **Chẩn đoán Học thuật từ dữ liệu Local-first (${totalHours}h / ${targetTotalHours}h):**`,
      `- **Môn đầu tư nhiều nhất:** ${mostStudied.name} (${(mostStudied.mins / 60).toFixed(1)}h).`,
      `- **Môn đang bị bỏ ngỏ:** ${leastStudied.name} (chỉ ${(leastStudied.mins / 60).toFixed(1)}h) — Cần bổ sung ít nhất 2 phiên Pomodoro 45p tuần này.`,
      weakestComp
        ? `- **Cảnh báo Độ hiểu bài thấp nhất:** ${weakestComp.name} đang ở mức **${weakestComp.avgComp.toFixed(1)}/5.0**. Thay vì chỉ làm đề liên tục, bạn nên dành 30 phút lập Error Log phân tích lỗi sai cốt lõi.`
        : `- Bạn chưa có phiên học nào được ghi nhận. Hãy bấm giờ Pomodoro 25 phút đầu tiên!`,
      `- **Chiến thuật cho câu hỏi "${userPrompt}":** Với mục tiêu SAT 1600 (Deadline sớm) và AP Calculus BC, hãy áp dụng quy tắc **60/25/15**: 60% thời gian cho SAT + AP Calc buổi sáng/tối khi não tỉnh táo nhất, 25% cho IELTS Writing/Speaking và 15% ôn Vật lý & Ngữ pháp.`
    ].join('\n');
  };

  const handleSend = async (customPrompt?: string) => {
    const queryText = (customPrompt ?? input).trim();
    if (!queryText || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: queryText,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInput('');
    setIsLoading(true);

    try {
      const totalMins = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
      const summaryContext = SUBJECTS.map((subj) => {
        const list = sessions.filter((s) => s.subjectId === subj.id);
        const mins = list.reduce((a, b) => a + b.durationMinutes, 0);
        const comp =
          list.length > 0
            ? (list.reduce((a, b) => a + b.comprehension, 0) / list.length).toFixed(1)
            : '0';
        return `${subj.name}: ${(mins / 60).toFixed(1)}h (${list.length} phiên, độ hiểu TB ${comp}/5)`;
      }).join('; ');

      const goalsContext = goals
        .map((g) => `${g.title}: hiện tại ${g.currentValue}/${g.targetValue} (${g.deadlineTag})`)
        .join('; ');

      const apiKey = '';
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

      const payload = {
        contents: [
          {
            parts: [
              {
                text: `Dữ liệu học tập hiện tại của học sinh: Tổng ${(totalMins / 60).toFixed(1)}/${targetTotalHours} giờ. Phân bổ: ${summaryContext}. Mục tiêu: ${goalsContext}.\nCâu hỏi của học sinh: "${queryText}"`
              }
            ]
          }
        ],
        systemInstruction: {
          parts: [
            {
              text: 'Bạn là cố vấn học thuật khắt khe, sắc sảo của ScholarPulse v2.5. Hãy phân tích thẳng thắn dựa trên số liệu thực tế của học sinh, chỉ ra điểm yếu (môn học ít giờ hoặc điểm hiểu bài thấp) và đề xuất lịch trình hành động cụ thể ngắn gọn (dưới 160 từ, dùng gạch đầu dòng rõ ràng bằng tiếng Việt).'
            }
          ]
        }
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Fallback to local diagnostic');
      }

      const result = await response.json();
      const aiText =
        result?.candidates?.[0]?.content?.parts?.[0]?.text || buildLocalDiagnostic(queryText);

      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content: aiText,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch {
      const fallbackText = buildLocalDiagnostic(queryText);
      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content: fallbackText,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 p-5 shadow-lg flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/30 text-purple-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>AI Study Assistant</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Gemini 3 Flash
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Phân tích lỗ hổng kiến thức &amp; tối ưu lịch ôn tập từ dữ liệu vừa nhập
              </p>
            </div>
          </div>
        </div>

        {/* Quick Prompt Chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {[
            'Phân tích điểm yếu tuần này',
            'Lịch ôn nước rút SAT 1600',
            'Cách tăng điểm hiểu môn Vật lý & AP Calc'
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSend(prompt)}
              className="px-2.5 py-1 rounded-lg bg-slate-950/90 hover:bg-purple-950/50 border border-white/10 hover:border-purple-500/40 text-[11px] text-slate-300 hover:text-purple-200 transition"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat Messages Box */}
        <div className="h-56 overflow-y-auto space-y-2.5 p-3 rounded-xl bg-slate-950/70 border border-white/5 text-xs">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-xl px-3.5 py-2.5 whitespace-pre-line leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-900 border border-white/10 text-slate-200'
                }`}
              >
                {m.content}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 px-1">{m.timestamp}</span>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-purple-300 text-xs py-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>AI Coach đang đọc dữ liệu LocalStorage của bạn...</span>
            </div>
          )}
        </div>
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="mt-3 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Hỏi AI Coach về lịch ôn tập, phân bổ giờ học..."
          className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white transition"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};

// ============================================================================
// 13. PROJECT STRUCTURE & VERCEL DEPLOYMENT MODAL
// ============================================================================

interface ProjectGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProjectGuideModal: React.FC<ProjectGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl bg-[#0f1626] border border-white/15 p-6 shadow-2xl text-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <Code2 className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-bold text-white">
              Cấu trúc Thư mục Chuẩn &amp; Hướng dẫn Deploy Vercel
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-5 text-xs leading-relaxed">
          <div>
            <h4 className="text-sm font-bold text-purple-300 mb-2">
              1. Cấu trúc Thư mục Dự án (Next.js App Router / Vite + React + TypeScript)
            </h4>
            <pre className="p-3.5 rounded-xl bg-slate-950 border border-white/10 text-slate-300 font-mono overflow-x-auto">
{`scholarpulse-v2.5/
├── src/
│   ├── types/
│   │   └── scholar.ts               # Định nghĩa TypeScript interfaces (StudySession, GoalItem...)
│   ├── components/
│   │   ├── Header.tsx               # Logo v2.5, 🟢 Local-first Active, Import/Export JSON
│   │   ├── MetricCards.tsx          # 4 thẻ thống kê tổng quan & Velocity
│   │   ├── GoalSection.tsx          # Mục tiêu SAT 1600, IELTS 8.0+, AP Calculus BC
│   │   ├── TimeDistributionTable.tsx# Bảng phân bổ giờ học & % tỷ trọng 5 môn
│   │   ├── TimeTrackerForm.tsx      # Form ghi nhận phiên học & mức độ hiểu bài (1-5)
│   │   ├── AnalyticsCharts.tsx      # Biểu đồ Recharts (7/14/30 ngày) & Xu hướng điểm
│   │   ├── PomodoroTimer.tsx        # Đồng hồ bấm giờ tự động cộng dồn vào môn học
│   │   ├── ActivityHeatmap.tsx      # Bản đồ nhiệt GitHub Streak 84 ngày
│   │   └── AiStudyAssistant.tsx     # Trợ lý AI phân tích lộ trình ôn tập
│   ├── App.tsx                      # Main Dashboard Container & LocalStorage Sync
│   └── main.tsx                     # Entry Point
├── package.json
├── tailwind.config.js
└── tsconfig.json`}
            </pre>
          </div>

          <div>
            <h4 className="text-sm font-bold text-cyan-300 mb-2">
              2. Khởi tạo Nhanh ở Máy Cá Nhân (Local Setup)
            </h4>
            <pre className="p-3.5 rounded-xl bg-slate-950 border border-white/10 text-emerald-300 font-mono overflow-x-auto">
{`# Khởi tạo với Vite + React + TypeScript
npm create vite@latest scholarpulse -- --template react-ts
cd scholarpulse

# Cài đặt thư viện Icons, Biểu đồ Recharts và Tailwind CSS
npm install lucide-react recharts
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Chạy server phát triển
npm run dev`}
            </pre>
          </div>

          <div>
            <h4 className="text-sm font-bold text-amber-300 mb-2">
              3. Push lên GitHub &amp; Deploy lên Vercel trong 1 nốt nhạc
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
              <li>
                Copy toàn bộ mã nguồn trong file <code>App.tsx</code> này vào <code>src/App.tsx</code> của dự án.
              </li>
              <li>
                Đẩy code lên GitHub:
                <code className="block mt-1 p-2 rounded bg-slate-950 text-purple-300 font-mono">
                  git init &amp;&amp; git add . &amp;&amp; git commit -m "feat: ScholarPulse v2.5" &amp;&amp; git push -u origin main
                </code>
              </li>
              <li>
                Truy cập <strong>vercel.com/new</strong>, chọn repository <code>scholarpulse</code> vừa tạo và bấm <strong>Deploy</strong>. Vì kiến trúc là <strong>Local-first 100%</strong>, bạn không cần cấu hình Database phức tạp mà dữ liệu vẫn được bảo toàn trên trình duyệt người dùng kèm tính năng Backup/Restore file <code>.json</code>.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 14. MAIN DASHBOARD APPLICATION (`App.tsx`)
// ============================================================================

export function App() {
  const [state, setState] = useState<ScholarPulseState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ScholarPulseState;
        if (parsed && Array.isArray(parsed.sessions) && Array.isArray(parsed.goals)) {
          return parsed;
        }
      }
    } catch {
      // Fallback to demo state if localStorage is corrupted
    }
    return getInitialDemoState();
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  // Sync every state change to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors
    }
  }, [state]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Calculate current day streak
  const streakDays = useMemo(() => {
    if (state.sessions.length === 0) return 0;
    const uniqueDates = new Set(state.sessions.map((s) => s.date));
    let streak = 0;
    let cursor = 0;

    // If user hasn't studied today yet, check if they studied yesterday to keep streak alive
    if (!uniqueDates.has(getDateDaysAgo(0)) && uniqueDates.has(getDateDaysAgo(1))) {
      cursor = 1;
    }

    while (uniqueDates.has(getDateDaysAgo(cursor))) {
      streak++;
      cursor++;
    }
    return streak;
  }, [state.sessions]);

  // Handlers
  const handleAddSession = (newSessionData: Omit<StudySession, 'id' | 'timestamp'>) => {
    const newSession: StudySession = {
      ...newSessionData,
      id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now()
    };

    setState((prev) => ({
      ...prev,
      sessions: [newSession, ...prev.sessions],
      lastUpdated: new Date().toISOString()
    }));
  };

  const handleDeleteSession = (id: string) => {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((s) => s.id !== id),
      lastUpdated: new Date().toISOString()
    }));
    showToast('🗑️ Đã xóa bản ghi phiên học.');
  };

  const handleAutoLogPomodoro = (
    subjectId: SubjectId,
    minutes: number,
    comprehension: number,
    note: string
  ) => {
    handleAddSession({
      subjectId,
      durationMinutes: minutes,
      comprehension,
      topic: note,
      date: getDateDaysAgo(0),
      source: 'pomodoro'
    });
  };

  const handleUpdateTargetHours = (newTarget: number) => {
    setState((prev) => ({
      ...prev,
      targetTotalHours: newTarget,
      lastUpdated: new Date().toISOString()
    }));
    showToast(`🎯 Đã cập nhật mục tiêu tổng thành ${newTarget} giờ!`);
  };

  const handleUpdateGoal = (goalId: string, newCurrentValue: number, newNotes?: string) => {
    setState((prev) => ({
      ...prev,
      goals: prev.goals.map((g) =>
        g.id === goalId
          ? { ...g, currentValue: newCurrentValue, notes: newNotes ?? g.notes }
          : g
      ),
      lastUpdated: new Date().toISOString()
    }));
    showToast('✅ Đã cập nhật tiến độ mục tiêu!');
  };

  const handleAddScoreRecord = (record: Omit<ScoreRecord, 'id'>) => {
    const newRecord: ScoreRecord = {
      ...record,
      id: `sc_${Date.now()}`
    };
    setState((prev) => ({
      ...prev,
      scoreHistory: [...prev.scoreHistory, newRecord],
      lastUpdated: new Date().toISOString()
    }));
    showToast('📈 Đã thêm mốc điểm thi thử mới vào biểu đồ xu hướng!');
  };

  // Export JSON Backup
  const handleExportJson = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scholarpulse-backup-v2.5-${getDateDaysAgo(0)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📦 Đã xuất file JSON sao lưu dữ liệu thành công!');
  };

  // Import JSON Restore
  const handleImportJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result)) as ScholarPulseState;
        if (!parsed || !Array.isArray(parsed.sessions) || !Array.isArray(parsed.goals)) {
          showToast('⚠️ File JSON không đúng định dạng ScholarPulse v2.5!');
          return;
        }
        setState({
          ...parsed,
          lastUpdated: new Date().toISOString()
        });
        showToast('🎉 Đã khôi phục dữ liệu học tập từ file JSON thành công!');
      } catch {
        showToast('❌ Lỗi đọc file JSON. Vui lòng kiểm tra lại tệp tin!');
      }
    };
    reader.readAsText(file);
  };

  const handleResetZero = () => {
    setState(getZeroBlankState());
    showToast('🔄 Đã đặt về trạng thái 0h 0m (Blank State) giống ảnh mẫu.');
  };

  const handleLoadDemo = () => {
    setState(getInitialDemoState());
    showToast('✨ Đã nạp dữ liệu mẫu 30 ngày đầy đủ!');
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 selection:bg-purple-500 selection:text-white relative overflow-x-hidden">
      {/* Ambient Neon Radial Glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/15 rounded-full blur-[130px]" />
        <div className="absolute top-1/4 -right-40 w-96 h-96 bg-blue-600/15 rounded-full blur-[130px]" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-cyan-500/10 rounded-full blur-[140px]" />
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl bg-slate-900/95 border border-purple-500/40 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 animate-bounce">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Sticky Header */}
      <Header
        lastUpdated={state.lastUpdated}
        sessionCount={state.sessions.length}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onResetZero={handleResetZero}
        onLoadDemo={handleLoadDemo}
        onOpenProjectGuide={() => setIsGuideOpen(true)}
      />

      {/* Main Dashboard Content */}
      <main className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* 1. Top 4 Metric Cards */}
        <MetricCards
          sessions={state.sessions}
          targetTotalHours={state.targetTotalHours}
          streakDays={streakDays}
          onUpdateTargetHours={handleUpdateTargetHours}
        />

        {/* 2. Goals & Deadlines Section (SAT 1600, IELTS 8.0+, AP Calculus BC) */}
        <GoalSection goals={state.goals} onUpdateGoal={handleUpdateGoal} />

        {/* 3. Middle Grid: Time Distribution Table + Interactive Logger Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <TimeDistributionTable sessions={state.sessions} />
            <PomodoroTimer onAutoLogPomodoro={handleAutoLogPomodoro} />
          </div>

          <div className="lg:col-span-5">
            <TimeTrackerForm
              onAddSession={handleAddSession}
              recentSessions={state.sessions}
              onDeleteSession={handleDeleteSession}
            />
          </div>
        </div>

        {/* 4. Analytics & Trend Charts (7d / 14d / 30d + SAT/IELTS Score Trajectory) */}
        <AnalyticsCharts
          sessions={state.sessions}
          scoreHistory={state.scoreHistory}
          onAddScoreRecord={handleAddScoreRecord}
        />

        {/* 5. Bottom Grid: Smart Streak GitHub Heatmap + AI Study Assistant */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <ActivityHeatmap sessions={state.sessions} streakDays={streakDays} />
          </div>
          <div className="lg:col-span-5">
            <AiStudyAssistant
              sessions={state.sessions}
              goals={state.goals}
              targetTotalHours={state.targetTotalHours}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 mt-10 py-5 text-center text-xs text-slate-500">
        <div className="max-w-[1440px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>ScholarPulse v2.5</strong> • Advanced Learning Analytics &amp; Local-first Tracker
          </span>
          <span>
            Dữ liệu được lưu trữ an toàn 100% trên trình duyệt của bạn (LocalStorage)
          </span>
        </div>
      </footer>

      {/* Project Structure & Vercel Deployment Modal */}
      <ProjectGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
}

export default App;
