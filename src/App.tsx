import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BookOpen,
  Clock,
  Zap,
  Target,
  TrendingUp,
  Award,
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
  Send,
  X,
  Code2,
  ChevronRight,
  Brain,
  Layers,
  RefreshCw,
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
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line
} from 'recharts';

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
  comprehension: number;
  topic: string;
  date: string;
  timestamp: number;
  source?: 'manual' | 'pomodoro';
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
  date: string;
  satScore?: number;
  ieltsScore?: number;
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

const STORAGE_KEY = 'scholarpulse_v2_5_state';

export const SUBJECTS: SubjectMeta[] = [
  {
    id: 'math_ap',
    name: 'Toán (AP Calculus / THPT)',
    shortName: 'Toán / AP Calc',
    color: '#a855f7',
    badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    category: 'Core STEM'
  },
  {
    id: 'english_grammar',
    name: 'Tiếng Anh (Ngữ pháp & Từ vựng)',
    shortName: 'Tiếng Anh',
    color: '#3b82f6',
    badgeBg: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    category: 'Language'
  },
  {
    id: 'physics',
    name: 'Vật lý',
    shortName: 'Vật lý',
    color: '#06b6d4',
    badgeBg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    category: 'Core STEM'
  },
  {
    id: 'sat',
    name: 'SAT',
    shortName: 'SAT',
    color: '#f59e0b',
    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    category: 'Standardized Test'
  },
  {
    id: 'ielts',
    name: 'IELTS',
    shortName: 'IELTS',
    color: '#10b981',
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
  }> = [
    { daysAgo: 0, subjectId: 'sat', durationMinutes: 90, comprehension: 4, topic: 'Digital SAT RW Module 2 - Craft & Structure' },
    { daysAgo: 0, subjectId: 'math_ap', durationMinutes: 60, comprehension: 5, topic: 'Integration by Parts & Partial Fractions' },
    { daysAgo: 1, subjectId: 'ielts', durationMinutes: 75, comprehension: 4, topic: 'Writing Task 2: Opinion Essay + Lexical Resource' },
    { daysAgo: 1, subjectId: 'physics', durationMinutes: 45, comprehension: 3, topic: 'Dao động điều hòa & Con lắc lò xo nâng cao' },
    { daysAgo: 2, subjectId: 'sat', durationMinutes: 110, comprehension: 5, topic: 'Full Math Timed Drill + Desmos Regression Tricks' },
    { daysAgo: 2, subjectId: 'english_grammar', durationMinutes: 50, comprehension: 4, topic: 'Inversion, Subjunctive Mood & C2 Collocations' },
    { daysAgo: 3, subjectId: 'math_ap', durationMinutes: 85, comprehension: 4, topic: 'Parametric Equations & Polar Coordinates (BC)' },
    { daysAgo: 4, subjectId: 'ielts', durationMinutes: 60, comprehension: 4, topic: 'Cambridge 19 Test 3 Listening + Reading Passage 3' },
    { daysAgo: 5, subjectId: 'physics', durationMinutes: 60, comprehension: 3, topic: 'Điện xoay chiều & Giản đồ Fre-nen' }
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
      source: 'manual'
    };
  });
};

const DEFAULT_SCORE_HISTORY: ScoreRecord[] = [
  { id: 'sc_1', date: getDateDaysAgo(28), satScore: 1420, ieltsScore: 7.0, note: 'Diagnostic Test đầu kỳ' },
  { id: 'sc_2', date: getDateDaysAgo(14), satScore: 1480, ieltsScore: 7.5, note: 'Bluebook Test #4 + Mock IELTS' },
  { id: 'sc_3', date: getDateDaysAgo(1), satScore: 1510, ieltsScore: 7.5, note: 'Bluebook Test #5 (Math 780, RW 730)' }
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
    { ...DEFAULT_GOALS[0], currentValue: 1500 },
    { ...DEFAULT_GOALS[1], currentValue: 7.5 },
    { ...DEFAULT_GOALS[2], currentValue: 0 }
  ],
  scoreHistory: [
    { id: 'sc_init', date: getDateDaysAgo(0), satScore: 1500, ieltsScore: 7.5, note: 'Điểm khởi điểm' }
  ],
  lastUpdated: new Date().toISOString()
});

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
    } catch {}
    return getInitialDemoState();
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form states
  const [subjectId, setSubjectId] = useState<SubjectId>('math_ap');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [comprehension, setComprehension] = useState<number>(4);
  const [topic, setTopic] = useState<string>('');
  const [date, setDate] = useState<string>(getDateDaysAgo(0));

  // Chart states
  const [rangeDays, setRangeDays] = useState<7 | 14 | 30>(14);
  const [activeChartTab, setActiveChartTab] = useState<'time' | 'scores'>('time');

  // AI Chat states
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Xin chào! Mình là **ScholarPulse AI Coach v2.5**. Mình đã sẵn sàng phân tích dữ liệu học tập và giúp bạn tối ưu tiến trình!',
      timestamp: 'Sẵn sàng'
    }
  ]);
  const [inputChat, setInputChat] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const streakDays = useMemo(() => {
    if (state.sessions.length === 0) return 0;
    const uniqueDates = new Set(state.sessions.map((s) => s.date));
    let streak = 0;
    let cursor = 0;
    if (!uniqueDates.has(getDateDaysAgo(0)) && uniqueDates.has(getDateDaysAgo(1))) {
      cursor = 1;
    }
    while (uniqueDates.has(getDateDaysAgo(cursor))) {
      streak++;
      cursor++;
    }
    return streak;
  }, [state.sessions]);

  const stats = useMemo(() => {
    const totalMinutes = state.sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const totalHoursFloat = totalMinutes / 60;
    const avgComprehension =
      state.sessions.length > 0
        ? state.sessions.reduce((acc, s) => acc + s.comprehension, 0) / state.sessions.length
        : 0;
    const effectiveHours = state.sessions.reduce(
      (acc, s) => acc + (s.durationMinutes / 60) * (s.comprehension / 5),
      0
    );
    const progressPercent = Math.min(
      100,
      Number(((totalHoursFloat / Math.max(1, state.targetTotalHours)) * 100).toFixed(1))
    );
    return { hours, minutes, totalHoursFloat, avgComprehension, effectiveHours, progressPercent };
  }, [state.sessions, state.targetTotalHours]);

  const distribution = useMemo(() => {
    const totalMinutes = state.sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    return SUBJECTS.map((subj) => {
      const subjSessions = state.sessions.filter((s) => s.subjectId === subj.id);
      const mins = subjSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
      const hours = (mins / 60).toFixed(1);
      const share = totalMinutes > 0 ? Math.round((mins / totalMinutes) * 100) : 0;
      const avgComp =
        subjSessions.length > 0
          ? (subjSessions.reduce((acc, s) => acc + s.comprehension, 0) / subjSessions.length).toFixed(1)
          : '0.0';
      return { ...subj, mins, hours, share, sessionCount: subjSessions.length, avgComp };
    });
  }, [state.sessions]);

  const dailyData = useMemo(() => {
    const result = [];
    for (let i = rangeDays - 1; i >= 0; i--) {
      const dStr = getDateDaysAgo(i);
      const daySessions = state.sessions.filter((s) => s.date === dStr);
      const mins = daySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
      result.push({
        label: dStr.slice(5),
        totalHours: Number((mins / 60).toFixed(2))
      });
    }
    return result;
  }, [state.sessions, rangeDays]);

  const pieData = useMemo(() => {
    const cutoffDate = getDateDaysAgo(rangeDays);
    const filtered = state.sessions.filter((s) => s.date >= cutoffDate);
    return SUBJECTS.map((subj) => {
      const mins = filtered
        .filter((s) => s.subjectId === subj.id)
        .reduce((acc, s) => acc + s.durationMinutes, 0);
      return { name: subj.shortName, value: Number((mins / 60).toFixed(1)), color: subj.color };
    }).filter((d) => d.value > 0);
  }, [state.sessions, rangeDays]);

  const heatmapDays = useMemo(() => {
    const map = new Map<string, number>();
    state.sessions.forEach((s) => {
      map.set(s.date, (map.get(s.date) || 0) + s.durationMinutes);
    });
    const days = [];
    for (let i = 83; i >= 0; i--) {
      const d = getDateDaysAgo(i);
      days.push({ date: d, minutes: map.get(d) || 0 });
    }
    return days;
  }, [state.sessions]);

  const handleAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (durationMinutes <= 0) return;
    const selectedSubj = SUBJECTS.find((s) => s.id === subjectId);
    const newSession: StudySession = {
      id: `sess_${Date.now()}`,
      subjectId,
      durationMinutes: Number(durationMinutes),
      comprehension,
      topic: topic.trim() || `Ôn tập ${selectedSubj?.shortName}`,
      date,
      timestamp: Date.now(),
      source: 'manual'
    };
    setState((prev) => ({
      ...prev,
      sessions: [newSession, ...prev.sessions],
      lastUpdated: new Date().toISOString()
    }));
    setTopic('');
    showToast('✨ Đã lưu phiên học mới thành công!');
  };

  const handleDeleteSession = (id: string) => {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((s) => s.id !== id),
      lastUpdated: new Date().toISOString()
    }));
    showToast('🗑️ Đã xóa phiên học.');
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 selection:bg-purple-500 selection:text-white relative overflow-x-hidden">
      {/* Hiệu ứng ánh sáng nền Neon lung linh như bản cũ */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/15 rounded-full blur-[130px]" />
        <div className="absolute top-1/4 -right-40 w-96 h-96 bg-blue-600/15 rounded-full blur-[130px]" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-cyan-500/10 rounded-full blur-[140px]" />
      </div>

      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl bg-slate-900/95 border border-purple-500/40 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 animate-bounce">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header đỉnh cao với hiệu ứng kính mờ */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0f19]/85 backdrop-blur-xl">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
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
              <p className="text-xs text-slate-400 hidden sm:block">Advanced Learning Analytics &amp; Local-first Tracker</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {state.sessions.length > 0 ? (
              <button
                onClick={() => setState(getZeroBlankState())}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-white/10 text-xs font-medium transition"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Reset về 0</span>
              </button>
            ) : (
              <button
                onClick={() => setState(getInitialDemoState())}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-medium transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Nạp dữ liệu mẫu</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* 1. 4 Thẻ Thống kê đồ họa xịn xò */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 p-5 shadow-lg group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tổng thời gian học</span>
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white tabular-nums tracking-tight">
              {stats.hours}h {stats.minutes}m
            </div>
            <p className="mt-2.5 text-xs text-slate-400 flex justify-between">
              <span>Hiệu quả (Weighted):</span>
              <span className="text-purple-300 font-semibold">{stats.effectiveHours.toFixed(1)}h</span>
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 p-5 shadow-lg group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Học lực &amp; Velocity</span>
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white tabular-nums tracking-tight">
              {stats.avgComprehension.toFixed(1)} <span className="text-sm font-medium text-slate-400">/ 5.0</span>
            </div>
            <div className="mt-3 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full" style={{ width: `${(stats.avgComprehension / 5) * 100}%` }} />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 p-5 shadow-lg group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Phiên đã ghi nhận</span>
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white tabular-nums tracking-tight">
              {state.sessions.length}
            </div>
            <div className="mt-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-400">Streak liên tục:</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                🔥 {streakDays} ngày
              </span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 p-5 shadow-lg group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tiến độ Ôn tập</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white tabular-nums tracking-tight">
              {stats.progressPercent}%
            </div>
            <div className="mt-3 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400 rounded-full" style={{ width: `${stats.progressPercent}%` }} />
            </div>
          </div>
        </section>

        {/* 2. Mục tiêu trọng tâm (SAT, IELTS, AP Calc) */}
        <div className="rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 p-5 shadow-lg">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Mục tiêu &amp; Deadline Trọng tâm</h2>
              <p className="text-xs text-slate-400">Theo dõi tiến độ SAT 1600, IELTS 8.0+ và AP Calculus BC</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {state.goals.map((goal) => (
              <div key={goal.id} className="rounded-xl bg-slate-950/60 border border-white/10 p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-base font-bold text-white">{goal.title}</h3>
                  <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    {goal.deadlineTag}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{goal.subtitle}</p>
                <div className="mt-3 flex justify-between text-xs">
                  <span className="text-purple-300 font-semibold">{goal.targetLabel}</span>
                  <span className="text-white font-bold">{goal.currentValue} {goal.unit}</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">{goal.notes}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Bảng Phân bổ & Form Ghi nhận (Đã sạch bóng Pomodoro) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 p-5 shadow-lg">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <BookOpen className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white">Phân bổ Thời gian Giữa các Môn học</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[11px] font-semibold uppercase text-slate-400">
                    <th className="py-3 pr-4">Môn học</th>
                    <th className="py-3 px-3 text-right">Số phiên</th>
                    <th className="py-3 px-3 text-right">Thời lượng</th>
                    <th className="py-3 px-3 text-right">Độ hiểu TB</th>
                    <th className="py-3 pl-4 w-44">Tỷ trọng (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {distribution.map((row) => (
                    <tr key={row.id} className="hover:bg-white/[0.02]">
                      <td className="py-3.5 pr-4 flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                        <span className="font-semibold text-slate-100">{row.name}</span>
                      </td>
                      <td className="py-3.5 px-3 text-right text-slate-300">{row.sessionCount} phiên</td>
                      <td className="py-3.5 px-3 text-right font-bold text-white">{row.hours}h</td>
                      <td className="py-3.5 px-3 text-right text-cyan-300">{row.avgComp} / 5</td>
                      <td className="py-3.5 pl-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${row.share}%`, backgroundColor: row.color }} />
                          </div>
                          <span className="w-10 text-right text-xs font-bold">{row.share}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 p-5 shadow-lg">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Plus className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white">Ghi nhận Tiến trình Học tập</h2>
            </div>
            <form onSubmit={handleAddSession} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Chọn Môn học</label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value as SubjectId)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-sm text-white"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Thời lượng (phút)</label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Ngày thực hiện</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Mức độ hiểu bài (1 - 5)</label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setComprehension(level)}
                      className={`py-2 rounded-xl font-bold text-sm border ${
                        comprehension === level ? 'bg-purple-600 text-white border-purple-400 shadow-md' : 'bg-slate-950 border-white/10 text-slate-400'
                      }`}
                    >
                      {level} ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Ghi chú chuyên đề</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="VD: Giải đề Bluebook Test #6..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-sm text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold text-sm shadow-lg"
              >
                Lưu Phiên Học
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-white/10 space-y-2 max-h-44 overflow-y-auto">
              <span className="text-xs font-semibold text-slate-400 uppercase">Nhật ký gần đây</span>
              {state.sessions.slice(0, 4).map((s) => {
                const subj = SUBJECTS.find((item) => item.id === s.subjectId);
                return (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-950 text-xs">
                    <div>
                      <span className="font-semibold text-white">{subj?.shortName}</span> • <span className="text-purple-300">{s.durationMinutes}p</span>
                      <p className="text-[11px] text-slate-400">{s.topic}</p>
                    </div>
                    <button onClick={() => handleDeleteSession(s.id)} className="text-slate-500 hover:text-rose-400 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4. Biểu đồ Recharts & Bản đồ nhiệt GitHub Streak */}
        <div className="rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 p-5 shadow-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white">Biểu đồ Phân tích &amp; Xu hướng Học thuật</h2>
            </div>
            <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-white/10">
              {([7, 14, 30] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setRangeDays(d)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${rangeDays === d ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
                >
                  {d} ngày
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 h-72 bg-slate-950/50 rounded-xl p-3 border border-white/5">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px' }} />
                  <Bar dataKey="totalHours" fill="#a855f7" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-72 bg-slate-950/50 rounded-xl p-3 border border-white/5">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70}>
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 5. GitHub Heatmap Streak */}
        <div className="rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 p-5 shadow-lg">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Flame className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white">Smart Streak &amp; Bản đồ nhiệt Hoạt động (84 ngày)</h2>
          </div>
          <div className="overflow-x-auto pb-2">
            <div className="grid grid-flow-col grid-rows-7 gap-1.5 min-w-[520px]">
              {heatmapDays.map((item) => (
                <div
                  key={item.date}
                  title={`${item.date}: ${item.minutes} phút`}
                  className={`w-4 h-4 rounded-[4px] border ${
                    item.minutes === 0 ? 'bg-slate-800/70 border-white/5' : item.minutes < 60 ? 'bg-emerald-700 border-emerald-500' : 'bg-cyan-400 border-white'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/10 mt-10 py-5 text-center text-xs text-slate-500">
        ScholarPulse v2.5 • Local-first Tracker (Đã gỡ bỏ hoàn toàn Pomodoro)
      </footer>
    </div>
  );
}

export default App;
