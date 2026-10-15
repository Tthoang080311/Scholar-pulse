import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend 
} from 'recharts';
import { 
  BookOpen, Clock, Award, Target, Flame, Play, Pause, RotateCcw, 
  Download, Upload, Sparkles, CheckCircle2, TrendingUp, AlertCircle, RefreshCw, Layers
} from 'lucide-react';

// --- INTERFACES & TYPES ---
interface SubjectTime {
  name: string;
  hours: number;
  color: string;
}

interface Goal {
  id: string;
  title: string;
  current: string;
  target: string;
  deadline: string;
}

interface ScoreTrend {
  day: string;
  SAT: number;
  IELTS: number;
}

interface ActivityDay {
  date: string;
  count: number;
  level: number; // 0 to 4
}

interface LoggedSession {
  id: string;
  subject: string;
  minutes: number;
  understanding: number; // 1-5
  date: string;
}

interface AppState {
  totalMinutes: number;
  weeklyChange: number;
  velocity: number; // 0.0 - 5.0
  sessionCount: number;
  targetHours: number;
  subjects: SubjectTime[];
  goals: Goal[];
  scoreTrends: ScoreTrend[];
  heatmapData: ActivityDay[];
  sessions: LoggedSession[];
}

// --- INITIAL DEFAULT DATA (Phù hợp với thông tin học tập của bạn) ---
const INITIAL_STATE: AppState = {
  totalMinutes: 1450, // ~24h 10m
  weeklyChange: 14.2,
  velocity: 4.6,
  sessionCount: 38,
  targetHours: 120,
  subjects: [
    { name: 'Toán (AP Calculus / THPT)', hours: 42.5, color: '#3b82f6' },
    { name: 'Tiếng Anh (Ngữ pháp & Từ vựng)', hours: 35.0, color: '#8b5cf6' },
    { name: 'Vật lý (Kinematics)', hours: 28.0, color: '#ec4899' },
    { name: 'SAT', hours: 32.5, color: '#10b981' },
    { name: 'IELTS', hours: 25.0, color: '#f59e0b' },
  ],
  goals: [
    { id: '1', title: 'SAT Target', current: '1500', target: '1600', deadline: 'Deadline: Sớm' },
    { id: '2', title: 'IELTS Overall', current: '7.5', target: '8.0+', deadline: '~1.5 năm' },
    { id: '3', title: 'AP Calculus BC', current: 'Get Ready / AB', target: 'BC 5.0', deadline: 'Kỳ thi AP' },
  ],
  scoreTrends: [
    { day: 'Tuần 1', SAT: 1420, IELTS: 7.0 },
    { day: 'Tuần 2', SAT: 1450, IELTS: 7.5 },
    { day: 'Tuần 3', SAT: 1480, IELTS: 7.5 },
    { day: 'Tuần 4', SAT: 1500, IELTS: 7.5 },
  ],
  heatmapData: Array.from({ length: 35 }).map((_, i) => ({
    date: `2026-09-${i + 1}`,
    count: Math.floor(Math.random() * 5),
    level: Math.floor(Math.random() * 5)
  })),
  sessions: [
    { id: 's1', subject: 'SAT', minutes: 90, understanding: 5, date: 'Hôm nay' },
    { id: 's2', subject: 'Toán (AP Calculus / THPT)', minutes: 120, understanding: 4, date: 'Hôm qua' },
  ]
};

export default function ScholarPulseDashboard() {
  // Local-first State Management
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('scholarpulse_v2_5_state');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_STATE;
  });

  useEffect(() => {
    localStorage.setItem('scholarpulse_v2_5_state', JSON.stringify(state));
  }, [state]);

  // UI Interactive States
  const [activeTab, setActiveTab] = useState<'overview' | 'pomodoro' | 'analytics' | 'ai-coach' | 'config'>('overview');
  const [timeFilter, setTimeFilter] = useState<'7' | '14' | '30'>('14');
  
  // Logger Form State
  const [selectedSubject, setSelectedSubject] = useState(state.subjects[0].name);
  const [studyMinutes, setStudyMinutes] = useState<number>(60);
  const [understandingLevel, setUnderstandingLevel] = useState<number>(5);

  // Pomodoro Timer State
  const [pomodoroMinutes, setPomodoroMinutes] = useState<number>(25);
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerSubject, setTimerSubject] = useState<string>(state.subjects[0].name);

  // AI Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'ai', text: string}>>([
    { role: 'ai', text: 'Chào bạn! Tôi là Trợ lý AI ScholarPulse. Dựa trên dữ liệu học tập local của bạn (SAT 1500, IELTS 7.5, định hướng AP Calculus BC), bạn muốn tối ưu hóa phần nào hôm nay?' }
  ]);

  // Pomodoro Timer Effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      alert(`Đã hoàn thành phiên Pomodoro ${pomodoroMinutes} phút! Hệ thống đã tự động cộng giờ vào môn ${timerSubject}.`);
      // Auto log time
      handleLogSessionDirect(timerSubject, pomodoroMinutes, 5);
      setTimeLeft(pomodoroMinutes * 60);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft, pomodoroMinutes, timerSubject]);

  const formatTimeLeft = () => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLogSessionDirect = (subName: string, mins: number, understanding: number) => {
    const addedHours = mins / 60;
    setState(prev => {
      const updatedSubjects = prev.subjects.map(s => 
        s.name === subName ? { ...s, hours: Number((s.hours + addedHours).toFixed(1)) } : s
      );
      const newTotalMins = prev.totalMinutes + mins;
      const newSessionsCount = prev.sessionCount + 1;
      const newSessionItem: LoggedSession = {
        id: Date.now().toString(),
        subject: subName,
        minutes: mins,
        understanding,
        date: 'Vừa xong'
      };
      return {
        ...prev,
        totalMinutes: newTotalMins,
        sessionCount: newSessionsCount,
        subjects: updatedSubjects,
        sessions: [newSessionItem, ...prev.sessions]
      };
    });
  };

  const handleManualLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogSessionDirect(selectedSubject, Number(studyMinutes), Number(understandingLevel));
    alert('Đã ghi nhận tiến trình học tập vào Local Storage thành công!');
  };

  const resetToZero = () => {
    if (confirm('Bạn có chắc muốn đặt lại toàn bộ bảng điều khiển về 0 (0h 0m và 0.0 / 5.0) như ảnh mẫu không?')) {
      setState({
        totalMinutes: 0,
        weeklyChange: 0,
        velocity: 0.0,
        sessionCount: 0,
        targetHours: 120,
        subjects: state.subjects.map(s => ({ ...s, hours: 0 })),
        goals: state.goals,
        scoreTrends: [],
        heatmapData: [],
        sessions: []
      });
    }
  };

  const loadSampleData = () => {
    setState(INITIAL_STATE);
    alert('Đã nạp lại dữ liệu mẫu phân tích nâng cao!');
  };

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `scholar_pulse_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (event.target.files && event.target.files[0]) {
      fileReader.readAsText(event.target.files[0], "UTF-8");
      fileReader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string);
          setState(parsed);
          alert('Khôi phục dữ liệu từ tệp JSON thành công!');
        } catch (err) {
          alert('Tệp JSON không hợp lệ!');
        }
      };
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');

    setTimeout(() => {
      let aiReply = "Dựa trên dữ liệu local của bạn, tiến độ học tập đang rất ổn định. Hãy duy trì đều đặn các phiên Pomodoro 25 phút để chạm mốc SAT 1600 và IELTS 8.0+ nhé!";
      if (userMsg.toLowerCase().includes('sat') || userMsg.toLowerCase().includes('1600')) {
        aiReply = "Với điểm SAT hiện tại là 1500, để đạt 1600 bạn cần tập trung rà soát kỹ các lỗi sai phần Toán (Math Section) để đạt tuyệt đối 800/800, đồng thời luyện thêm các bài đọc khó phần Reading & Writing.";
      } else if (userMsg.toLowerCase().includes('ielts')) {
        aiReply = "Mục tiêu IELTS 8.0+ hoàn toàn khả thi trong 1.5 năm tới. Hiện kỹ năng Writing và Speaking cần được nâng cấp qua việc giải đề và nhờ chấm chữa chi tiết từ các nguồn writing nâng cao.";
      } else if (userMsg.toLowerCase().includes('calculus') || userMsg.toLowerCase().includes('toán')) {
        aiReply = "AP Calculus BC đòi hỏi nền tảng giải tích vững chắc. Việc ôn tập trước từ Get Ready for AP Calculus trên Khan Academy là bước đệm tuyệt vời.";
      }
      setChatMessages(prev => [...prev, { role: 'ai', text: aiReply }]);
    }, 800);
  };

  const totalHoursFloat = (state.totalMinutes / 60).toFixed(1);
  const hoursNum = Math.floor(state.totalMinutes / 60);
  const minsNum = state.totalMinutes % 60;
  const progressPercent = Math.min(100, Math.round((Number(totalHoursFloat) / state.targetHours) * 100));

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white pb-12">
      
      {/* HEADER */}
      <header className="border-b border-gray-800 bg-[#0b0f19]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-white">ScholarPulse</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-medium border border-purple-500/30">v2.5</span>
            </div>
            <p className="text-xs text-gray-400">Advanced Learning Analytics & Local-first Tracker</p>
          </div>
        </div>

        {/* Status & Quick Actions */}
        <div className="flex items-center space-x-3 flex-wrap">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>🟢 Local-first Active</span>
          </div>

          <button 
            onClick={resetToZero}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs transition border border-gray-700"
            title="Đưa về 0 giống ảnh mẫu"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset về 0</span>
          </button>

          <button 
            onClick={loadSampleData}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs transition border border-purple-500/30"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Nạp dữ liệu mẫu</span>
          </button>

          <button 
            onClick={exportJSON}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs transition border border-blue-500/30"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          <label className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs transition cursor-pointer border border-gray-700">
            <Upload className="w-3.5 h-3.5" />
            <span>Import JSON</span>
            <input type="file" accept=".json" onChange={importJSON} className="hidden" />
          </label>
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <div className="max-w-7xl mx-auto w-full px-6 mt-6">
        <div className="flex space-x-2 border-b border-gray-800 pb-3 overflow-x-auto">
          {[
            { id: 'overview', label: '📊 Tổng quan & Mục tiêu' },
            { id: 'pomodoro', label: '⏱️ Pomodoro Focus' },
            { id: 'analytics', label: '📈 Phân tích & Biểu đồ' },
            { id: 'ai-coach', label: '🤖 Trợ lý AI Study' },
            { id: 'config', label: '⚙️ Cấu trúc & Hướng dẫn Deploy Vercel' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-600/20' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto w-full px-6 mt-6 flex-1 space-y-6">

        {activeTab === 'overview' && (
          <>
            {/* TOP METRIC CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* Card 1: Tổng thời gian học */}
              <div className="p-5 rounded-2xl bg-gray-900/60 border border-gray-800 backdrop-blur-xl relative overflow-hidden group hover:border-purple-500/50 transition">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Tổng thời gian học</p>
                    <h3 className="text-2xl font-bold text-white mt-1">{hoursNum}h {minsNum}m</h3>
                  </div>
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-xs text-emerald-400 font-medium">
                  <TrendingUp className="w-3.5 h-3.5 mr-1" />
                  <span>+{state.weeklyChange}% so với tuần trước</span>
                </div>
              </div>

              {/* Card 2: Học lực & Tốc độ */}
              <div className="p-5 rounded-2xl bg-gray-900/60 border border-gray-800 backdrop-blur-xl relative overflow-hidden group hover:border-blue-500/50 transition">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Học lực & Velocity</p>
                    <h3 className="text-2xl font-bold text-white mt-1">{state.velocity.toFixed(1)} <span className="text-sm font-normal text-gray-400">/ 5.0</span></h3>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Award className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-xs text-gray-400">
                  <span>Điểm hiểu bài trung bình</span>
                </div>
              </div>

              {/* Card 3: Phiên học đã ghi nhận */}
              <div className="p-5 rounded-2xl bg-gray-900/60 border border-gray-800 backdrop-blur-xl relative overflow-hidden group hover:border-emerald-500/50 transition">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Phiên học Local-first</p>
                    <h3 className="text-2xl font-bold text-white mt-1">{state.sessionCount} <span className="text-sm font-normal text-gray-400">phiên</span></h3>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Flame className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  <span>Đồng bộ LocalStorage chuẩn</span>
                </div>
              </div>

              {/* Card 4: Tiến độ Ôn tập Tổng thể */}
              <div className="p-5 rounded-2xl bg-gray-900/60 border border-gray-800 backdrop-blur-xl relative overflow-hidden group hover:border-pink-500/50 transition">
                <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl group-hover:bg-pink-500/20 transition"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Mục tiêu {state.targetHours}h</p>
                    <h3 className="text-2xl font-bold text-white mt-1">{progressPercent}%</h3>
                  </div>
                  <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
                    <Target className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                </div>
              </div>

            </div>

            {/* GOALS & DEADLINES */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {state.goals.map(goal => (
                <div key={goal.id} className="p-5 rounded-2xl bg-gray-900/60 border border-gray-800 backdrop-blur-xl flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">{goal.deadline}</span>
                      <Target className="w-4 h-4 text-gray-400" />
                    </div>
                    <h4 className="text-lg font-bold text-white mt-3">{goal.title}</h4>
                    <div className="mt-2 flex items-baseline space-x-2">
                      <span className="text-2xl font-black text-purple-400">{goal.current}</span>
                      <span className="text-sm text-gray-400">/ Mục tiêu: {goal.target}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-800/80 flex justify-between items-center text-xs text-gray-400">
                    <span>Trạng thái: Đang luyện thi</span>
                    <span className="text-emerald-400 font-medium">Đúng tiến độ</span>
                  </div>
                </div>
              ))}
            </div>

            {/* TIME DISTRIBUTION & INTERACTIVE LOGGER */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Phân bổ Thời gian Giữa các Môn học */}
              <div className="lg:col-span-2 p-6 rounded-2xl bg-gray-900/60 border border-gray-800 backdrop-blur-xl">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                  <BookOpen className="w-5 h-5 mr-2 text-purple-400" />
                  Phân bổ Thời gian Giữa các Môn học
                </h3>
                <div className="space-y-4">
                  {state.subjects.map((sub, idx) => {
                    const totalHrs = Number(totalHoursFloat) || 1;
                    const percent = Math.round((sub.hours / totalHrs) * 100) || 0;
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-gray-200">{sub.name}</span>
                          <span className="text-gray-400">{sub.hours}h ({percent}%)</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="h-2.5 rounded-full transition-all duration-500" 
                            style={{ width: `${percent}%`, backgroundColor: sub.color }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Ghi nhận Tiến trình Học tập */}
              <div className="p-6 rounded-2xl bg-gray-900/60 border border-gray-800 backdrop-blur-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                    <Sparkles className="w-5 h-5 mr-2 text-blue-400" />
                    Ghi nhận Học tập
                  </h3>
                  <form onSubmit={handleManualLogSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Chọn Môn học</label>
                      <select 
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                      >
                        {state.subjects.map((sub, i) => (
                          <option key={i} value={sub.name}>{sub.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Thời gian học (phút)</label>
                      <input 
                        type="number" 
                        min="5" 
                        max="600"
                        value={studyMinutes}
                        onChange={(e) => setStudyMinutes(Number(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Mức độ hiểu bài (1 - 5)</label>
                      <input 
                        type="range" 
                        min="1" 
                        max="5" 
                        value={understandingLevel}
                        onChange={(e) => setUnderstandingLevel(Number(e.target.value))}
                        className="w-full accent-purple-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>1 (Kém)</span>
                        <span>3 (Khá)</span>
                        <span>5 (Xuất sắc)</span>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold text-sm shadow-lg shadow-purple-600/30 hover:opacity-90 transition"
                    >
                      Cập nhật ngay vào State & Local
                    </button>
                  </form>
                </div>
              </div>

            </div>

            {/* GITHUB STYLE HEATMAP & RECENT SESSIONS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Smart Streak & Heatmap */}
              <div className="lg:col-span-2 p-6 rounded-2xl bg-gray-900/60 border border-gray-800 backdrop-blur-xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center">
                    <Flame className="w-5 h-5 mr-2 text-orange-400" />
                    Bản đồ nhiệt hoạt động (Smart Streak Heatmap)
                  </h3>
                  <span className="text-xs text-gray-400">Chuỗi học tập liên tục: <strong className="text-orange-400">14 ngày</strong></span>
                </div>
                <p className="text-xs text-gray-400 mb-4">Mức độ hoạt động học tập hàng ngày được lưu trữ cục bộ:</p>
                <div className="grid grid-cols-7 sm:grid-cols-12 gap-2">
                  {state.heatmapData.map((day, idx) => {
                    const bgColors = ['bg-gray-800', 'bg-purple-950', 'bg-purple-800', 'bg-purple-600', 'bg-purple-400'];
                    return (
                      <div 
                        key={idx} 
                        className={`h-8 rounded-lg ${bgColors[day.level] || 'bg-gray-800'} flex items-center justify-center text-[10px] text-gray-300 font-mono border border-gray-700/50 transition hover:scale-105`}
                        title={`Ngày ${day.date}: ${day.count} phiên học`}
                      >
                        {idx + 1}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lịch sử phiên học gần đây */}
              <div className="p-6 rounded-2xl bg-gray-900/60 border border-gray-800 backdrop-blur-xl">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-emerald-400" />
                  Phiên học gần đây
                </h3>
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {state.sessions.map((sess) => (
                    <div key={sess.id} className="p-3 rounded-xl bg-gray-800/60 border border-gray-700/50 flex justify-between items-center text-sm">
                      <div>
                        <p className="font-semibold text-gray-200 truncate max-w-[160px]">{sess.subject}</p>
                        <span className="text-xs text-gray-400">{sess.date} • {sess.minutes} phút</span>
                      </div>
                      <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                        ⭐ {sess.understanding}/5
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </>
        )}

        {activeTab === 'pomodoro' && (
          <div className="max-w-2xl mx-auto p-8 rounded-3xl bg-gray-900/80 border border-gray-800 backdrop-blur-xl text-center space-y-6">
            <h2 className="text-2xl font-bold text-white">⏱️ Pomodoro Focus Timer</h2>
            <p className="text-sm text-gray-400">Tập trung chuyên sâu, hết giờ tự động cộng dồn thời gian vào bảng thống kê môn học.</p>
            
            <div className="flex justify-center space-x-3">
              {[25, 45, 60].map(m => (
                <button
                  key={m}
                  onClick={() => { setPomodoroMinutes(m); setTimeLeft(m * 60); setIsTimerRunning(false); }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                    pomodoroMinutes === m ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {m} phút
                </button>
              ))}
            </div>

            <div className="my-8">
              <span className="text-6xl sm:text-7xl font-black font-mono tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                {formatTimeLeft()}
              </span>
            </div>

            <div className="max-w-xs mx-auto">
              <label className="block text-xs font-medium text-gray-400 mb-1">Môn học đang luyện tập</label>
              <select 
                value={timerSubject}
                onChange={(e) => setTimerSubject(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 mb-6"
              >
                {state.subjects.map((sub, i) => (
                  <option key={i} value={sub.name}>{sub.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-2xl font-bold text-white shadow-lg transition ${
                  isTimerRunning ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30' : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 shadow-purple-600/30'
                }`}
              >
                {isTimerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                <span>{isTimerRunning ? 'Tạm dừng' : 'Bắt đầu Focus'}</span>
              </button>

              <button
                onClick={() => { setIsTimerRunning(false); setTimeLeft(pomodoroMinutes * 60); }}
                className="flex items-center space-x-2 px-4 py-3 rounded-2xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium border border-gray-700 transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Đặt lại</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-gray-900/60 border border-gray-800 backdrop-blur-xl">
              <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h3 className="text-lg font-bold text-white">📈 Biểu đồ Xu hướng & Phân bổ Giờ học</h3>
                <div className="flex space-x-2">
                  {['7', '14', '30'].map(f => (
                    <button
                      key={f}
                      onClick={() => setTimeFilter(f as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        timeFilter === f ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      {f} ngày
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={state.subjects}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.4} />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
                    <YAxis stroke="#9ca3af" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '12px', color: '#fff' }} 
                    />
                    <Bar dataKey="hours" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-gray-900/60 border border-gray-800 backdrop-blur-xl">
              <h3 className="text-lg font-bold text-white mb-4">Biểu đồ Cải thiện Điểm số (SAT & IELTS)</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={state.scoreTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.4} />
                    <XAxis dataKey="day" stroke="#9ca3af" fontSize={11} />
                    <YAxis stroke="#9ca3af" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '12px', color: '#fff' }} />
                    <Legend />
                    <Bar dataKey="SAT" fill="#3b82f6" name="SAT Score" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="IELTS" fill="#10b981" name="IELTS Score (x200)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ai-coach' && (
          <div className="max-w-3xl mx-auto p-6 rounded-3xl bg-gray-900/80 border border-gray-800 backdrop-blur-xl flex flex-col h-[550px]">
            <div className="flex items-center space-x-3 pb-4 border-b border-gray-800">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 border border-purple-500/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">AI Study Assistant Mini-Widget</h3>
                <p className="text-xs text-gray-400">Phân tích chuyên sâu lộ trình SAT 1600, IELTS 8.0+ và AP Calculus BC</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-2">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-br-none' 
                      : 'bg-gray-800 text-gray-200 border border-gray-700/50 rounded-bl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="pt-3 border-t border-gray-800 flex gap-2">
              <input 
                type="text"
                placeholder="Hỏi AI về chiến lược ôn tập, cách nâng band SAT/IELTS..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500"
              />
              <button 
                type="submit"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold text-sm hover:opacity-90 transition shadow-lg shadow-purple-600/30"
              >
                Gửi
              </button>
            </form>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="max-w-3xl mx-auto p-8 rounded-3xl bg-gray-900/80 border border-gray-800 backdrop-blur-xl space-y-6">
            <h2 className="text-2xl font-bold text-white">⚙️ Cấu trúc Thư mục & Hướng dẫn Deploy Vercel</h2>
            <p className="text-sm text-gray-400">Dự án được thiết kế theo chuẩn kiến trúc hiện đại, sẵn sàng đưa lên GitHub và Vercel cực kỳ nhanh chóng.</p>
            
            <div className="p-4 rounded-xl bg-black/40 border border-gray-800 font-mono text-xs text-purple-300 space-y-1">
              <p>scholar-pulse/</p>
              <p className="pl-4">├── src/</p>
              <p className="pl-8">├── App.tsx (Toàn bộ logic & giao diện dashboard)</p>
              <p className="pl-8">├── main.tsx</p>
              <p className="pl-8">└── index.css (Tailwind CSS config)</p>
              <p className="pl-4">├── package.json (Lucide-react, Recharts, React)</p>
              <p className="pl-4">└── tailwind.config.js</p>
            </div>

            <div className="space-y-4">
              <h3 className="text-base font-bold text-white">🚀 Lệnh Terminal để Push lên GitHub & Deploy Vercel:</h3>
              <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 font-mono text-xs text-emerald-400 space-y-2">
                <p># 1. Khởi tạo Git và Commit</p>
                <p className="text-gray-300">git init && git add . && git commit -m "feat: ScholarPulse v2.5"</p>
                <p className="pt-2"># 2. Tạo repo và push lên GitHub (hoặc dùng GitHub CLI)</p>
                <p className="text-gray-300">gh repo create scholar-pulse --public --source=. --push</p>
                <p className="pt-2"># 3. Deploy lên Vercel production</p>
                <p className="text-gray-300">npx vercel --prod</p>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="mt-12 text-center text-xs text-gray-500 border-t border-gray-800 pt-6">
        <p>ScholarPulse | Advanced Learning Analytics & Local-first Tracker v2.5 © 2026. All data stored securely in browser localStorage.</p>
      </footer>
    </div>
  );
}