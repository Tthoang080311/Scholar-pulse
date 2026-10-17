"use client";
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
    { daysAgo: 2, subjectId: 'english_grammar', durationMinutes: 50, comprehension: 4, topic: 'Inversion, Subjunctive Mood & C2 Collocations' }
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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

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
    showToast('✅ Đã lưu phiên học!');
  };

  const handleDeleteSession = (id: string) => {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((s) => s.id !== id),
      lastUpdated: new Date().toISOString()
    }));
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100">
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl bg-slate-900 border border-purple-500/40 text-white text-xs font-semibold shadow-lg">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0f19]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center">
              <Brain className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">ScholarPulse v2.5 (Lite - No Pomodoro)</h1>
              <p className="text-xs text-slate-400">Đã tối ưu hiệu năng mượt 60FPS</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {state.sessions.length > 0 ? (
              <button
                onClick={() => setState(getZeroBlankState())}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Reset về 0</span>
              </button>
            ) : (
              <button
                onClick={() => setState(getInitialDemoState())}
                className="px-3 py-1.5 rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/30 text-xs font-medium"
              >
                Nạp dữ liệu mẫu
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* 4 Metric Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-[#111827] border border-white/10 p-5">
            <span className="text-xs font-semibold uppercase text-slate-400">Tổng thời gian học</span>
            <div className="text-3xl font-extrabold text-white mt-2">
              {stats.hours}h {stats.minutes}m
            </div>
            <p className="mt-2 text-xs text-purple-300">
              Giờ hiệu quả: {stats.effectiveHours.toFixed(1)}h
            </p>
          </div>

          <div className="rounded-2xl bg-[#111827] border border-white/10 p-5">
            <span className="text-xs font-semibold uppercase text-slate-400">Độ hiểu bài TB</span>
            <div className="text-3xl font-extrabold text-white mt-2">
              {stats.avgComprehension.toFixed(1)} <span className="text-sm text-slate-400">/ 5.0</span>
            </div>
          </div>

          <div className="rounded-2xl bg-[#111827] border border-white/10 p-5">
            <span className="text-xs font-semibold uppercase text-slate-400">Số phiên đã học</span>
            <div className="text-3xl font-extrabold text-white mt-2">{state.sessions.length}</div>
          </div>

          <div className="rounded-2xl bg-[#111827] border border-white/10 p-5">
            <span className="text-xs font-semibold uppercase text-slate-400">Tiến độ tổng</span>
            <div className="text-3xl font-extrabold text-white mt-2">{stats.progressPercent}%</div>
            <p className="mt-2 text-xs text-emerald-300">
              Mục tiêu: {state.targetTotalHours}h
            </p>
          </div>
        </section>

        {/* Bảng Phân bổ + Form Ghi nhận (Không còn Pomodoro) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-2xl bg-[#111827] border border-white/10 p-5">
            <h2 className="text-base font-bold text-white mb-4">Phân bổ Thời gian Giữa các Môn học</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-slate-400">
                    <th className="py-3">Môn học</th>
                    <th className="py-3 text-right">Số phiên</th>
                    <th className="py-3 text-right">Thời lượng</th>
                    <th className="py-3 text-right">Độ hiểu</th>
                    <th className="py-3 pl-4 w-44">Tỷ trọng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {distribution.map((row) => (
                    <tr key={row.id}>
                      <td className="py-3.5 font-semibold text-white">{row.name}</td>
                      <td className="py-3.5 text-right text-slate-300">{row.sessionCount}</td>
                      <td className="py-3.5 text-right font-bold text-white">{row.hours}h</td>
                      <td className="py-3.5 text-right text-cyan-300">{row.avgComp}/5</td>
                      <td className="py-3.5 pl-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${row.share}%`, backgroundColor: row.color }}
                            />
                          </div>
                          <span className="text-xs w-9 text-right">{row.share}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-2xl bg-[#111827] border border-white/10 p-5">
            <h2 className="text-base font-bold text-white mb-4">Ghi nhận Phiên học</h2>
            <form onSubmit={handleAddSession} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Môn học</label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value as SubjectId)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-sm text-white"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Thời lượng (phút)</label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Ngày học</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Độ hiểu bài (1 - 5)</label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setComprehension(lvl)}
                      className={`py-2 rounded-xl text-sm font-bold border ${
                        comprehension === lvl
                          ? 'bg-purple-600 text-white border-purple-400'
                          : 'bg-slate-950 border-white/10 text-slate-400'
                      }`}
                    >
                      {lvl} ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Ghi chú chuyên đề</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="VD: Giải đề Bluebook Test #6..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-sm text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm"
              >
                Lưu Phiên Học
              </button>
            </form>

            {/* Nhật ký gần đây */}
            <div className="mt-5 pt-4 border-t border-white/10 space-y-2 max-h-40 overflow-y-auto">
              {state.sessions.slice(0, 5).map((s) => {
                const subj = SUBJECTS.find((item) => item.id === s.subjectId);
                return (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-950 text-xs">
                    <div>
                      <span className="font-semibold text-white">{subj?.shortName}</span> •{' '}
                      <span className="text-purple-300">{s.durationMinutes}p</span> ({s.comprehension}★)
                      <p className="text-[11px] text-slate-400">{s.topic}</p>
                    </div>
                    <button onClick={() => handleDeleteSession(s.id)} className="text-slate-500 hover:text-rose-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Biểu đồ Phân tích */}
        <div className="rounded-2xl bg-[#111827] border border-white/10 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white">Biểu đồ Phân tích Học thuật</h2>
            <div className="flex gap-2">
              {([7, 14, 30] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setRangeDays(d)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    rangeDays === d ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  {d} ngày
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 h-64 bg-slate-950 rounded-xl p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px' }} />
                  <Bar dataKey="totalHours" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-64 bg-slate-950 rounded-xl p-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={65}>
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
