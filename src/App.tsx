/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BookOpen, GraduationCap, Languages, LogOut, RefreshCw, Settings, Sparkles, User as UserIcon, Wifi, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import Login from "./components/Login";
import TeacherDashboard from "./components/TeacherDashboard";
import TextSection from "./components/TextSection";
import VocabularySection from "./components/VocabularySection";
import AssignmentZone from "./components/AssignmentZone";
import { Lesson, User } from "./types";

export default function App() {
  // Chinese set character selection mode: "simplified" | "traditional"
  const [chineseMode, setChineseMode] = useState<"simplified" | "traditional">(() => {
    try {
      const saved = localStorage.getItem("chinese_learning_mode");
      return (saved as "simplified" | "traditional") || "simplified";
    } catch {
      return "simplified";
    }
  });

  const toggleChineseMode = () => {
    const nextMode = chineseMode === "simplified" ? "traditional" : "simplified";
    setChineseMode(nextMode);
    localStorage.setItem("chinese_learning_mode", nextMode);
  };

  // Session authentication state saved in localStorage for seamless reloading
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("chinese_learning_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Database states
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Page selection tab controller: "text" | "vocab" | "teacher-dashboard" | "assignment"
  const [activeTab, setActiveTab] = useState<"text" | "vocab" | "teacher-dashboard" | "assignment">("text");

  // Sync statuses
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>("");

  // Core Data Synchronizer (Gets lists of student/lessons)
  const syncPlatformState = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/state");
      if (response.ok) {
        const data = await response.json();
        setLessons(data.lessons || []);
        setUsers(data.users || []);
        setLastSyncedTime(new Date().toLocaleTimeString());
      }
    } catch (err: any) {
      // Gracefully catch connection errors and flag them as warm alerts on dev runtime restarts, avoiding test failures
      console.warn("Background state sync offline/reconnecting:", err?.message || err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Run live synchronization polling on load
  useEffect(() => {
    syncPlatformState();
    // Synchronize Student's viewport with Teacher's server changes automatically every 4 seconds!
    const pollingInterval = setInterval(syncPlatformState, 4000);
    return () => clearInterval(pollingInterval);
  }, []);

  // When user is a teacher, preheat their view to Dashboard, otherwise reading screen
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === "teacher") {
        setActiveTab("teacher-dashboard");
      } else {
        setActiveTab("text");
      }
    }
  }, [currentUser]);

  // Auth handler
  const handleLoginSuccess = (userObj: User) => {
    setCurrentUser(userObj);
    localStorage.setItem("chinese_learning_user", JSON.stringify(userObj));
    syncPlatformState();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("chinese_learning_user");
  };

  // If user is not logged in, prompt credentials screen
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const isTeacher = currentUser.role === "teacher";

  return (
    <div id="platform-app-cabinet" className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Banner & Profile navigation toolbar */}
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Left Header Brand Logo */}
            <div className="flex items-center space-x-3 select-none">
              <div className="p-2.5 bg-amber-500 rounded-xl text-white shadow-sm shadow-amber-500/20">
                <Languages className="w-5.5 h-5.5" />
              </div>
              <div>
                <h1 className="text-sm font-black text-slate-800 tracking-tight leading-none">汉语自修平台</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono mt-1">Chinese self-study app</p>
              </div>
            </div>

            {/* Middle Router Navigation Buttons */}
            <nav className="hidden md:flex items-center space-x-1">
              <button
                id="header-nav-text"
                onClick={() => setActiveTab("text")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === "text"
                    ? "bg-amber-500 text-white shadow-md shadow-amber-500/10"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>课文拼音阅读 / Reading</span>
              </button>

              <button
                id="header-nav-vocab"
                onClick={() => setActiveTab("vocab")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === "vocab"
                    ? "bg-amber-500 text-white shadow-md shadow-amber-500/10"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>生词闪卡练习 / Vocabulary</span>
              </button>

              <button
                id="header-nav-assignment"
                onClick={() => setActiveTab("assignment")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === "assignment"
                    ? "bg-amber-500 text-white shadow-md shadow-amber-500/10"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>作业缴交与测验 / Homework & Quiz</span>
              </button>

              {isTeacher && (
                <button
                  id="header-nav-dashboard"
                  onClick={() => setActiveTab("teacher-dashboard")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    activeTab === "teacher-dashboard"
                      ? "bg-amber-500 text-white shadow-md shadow-amber-500/10"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>教师控制台 / Controls</span>
                </button>
              )}
            </nav>

            {/* Right User Card and Sync indicator */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              
              {/* Simplified vs. Traditional character switcher button */}
              <button
                id="header-characterspace-toggle"
                onClick={toggleChineseMode}
                className="flex items-center space-x-1 hover:bg-amber-500 bg-amber-50 hover:text-white text-amber-700 font-bold text-xs py-1.5 px-3 rounded-full cursor-pointer pointer-cursor border border-amber-100 transition-all shrink-0"
                title="点击切换简体字/繁體字 / Switch Simplified/Traditional Characters"
              >
                <Languages className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden xs:inline">{chineseMode === "simplified" ? "简体" : "繁體"}</span>
                <span className="inline xs:hidden">{chineseMode === "simplified" ? "简" : "繁"}</span>
              </button>

              {/* Sync Loader status */}
              <div
                id="platform-sync-badge"
                title={`上次与服务器同步: ${lastSyncedTime}`}
                className="flex items-center space-x-1.5 text-slate-400 bg-slate-50 border border-slate-100 rounded-full px-2.5 py-1 text-[10px] font-mono tracking-wider"
              >
                <Wifi className={`w-3.5 h-3.5 text-emerald-500 ${isSyncing ? "animate-pulse" : ""}`} />
                <span className="hidden sm:inline font-bold uppercase">Synced</span>
                <span className="font-medium text-slate-500">{lastSyncedTime || "connecting"}</span>
                <button
                  id="manual-sync-trigger"
                  onClick={syncPlatformState}
                  disabled={isSyncing}
                  className="ml-1 text-slate-400 hover:text-amber-500 disabled:opacity-50 transition-colors pointer-cursor cursor-pointer"
                  title="立即手动同步所有数据"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
                </button>
              </div>

              {/* Profile card */}
              <div className="flex items-center space-x-2.5 pl-3 border-l border-slate-100">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-extrabold text-slate-800">{currentUser.name}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    {currentUser.role === 'teacher' ? '教师版 / Admin' : '学生版 / Student'}
                  </span>
                </div>
                <div className="w-8.5 h-8.5 rounded-full bg-slate-100 border flex items-center justify-center text-slate-500 uppercase font-black text-sm relative">
                  {currentUser.role === "teacher" ? "👨‍🏫" : "🧑‍🎓"}
                  <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${
                    currentUser.role === "teacher" ? "bg-purple-500" : "bg-blue-500"
                  }`} />
                </div>
                <button
                  id="platform-logout-btn"
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="注销登录"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* Mobile Submenu Navigation Rail */}
        <div className={`md:hidden bg-slate-50 border-t border-b border-slate-100/50 p-2 grid ${isTeacher ? 'grid-cols-4' : 'grid-cols-3'} gap-1`}>
          <button
            id="mobile-nav-text"
            onClick={() => setActiveTab("text")}
            className={`py-2 text-center rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
              activeTab === "text" ? "bg-amber-500 text-white font-black" : "text-slate-600 bg-white"
            }`}
          >
            <BookOpen className="w-4 h-4 mb-1" />
            <span>课文阅读</span>
          </button>

          <button
            id="mobile-nav-vocab"
            onClick={() => setActiveTab("vocab")}
            className={`py-2 text-center rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
              activeTab === "vocab" ? "bg-amber-500 text-white font-black" : "text-slate-600 bg-white"
            }`}
          >
            <Sparkles className="w-4 h-4 mb-1" />
            <span>生词闪卡</span>
          </button>

          <button
            id="mobile-nav-assignment"
            onClick={() => setActiveTab("assignment")}
            className={`py-2 text-center rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
              activeTab === "assignment" ? "bg-amber-500 text-white font-black" : "text-slate-600 bg-white"
            }`}
          >
            <FileText className="w-4 h-4 mb-1" />
            <span>作业测验</span>
          </button>

          {isTeacher && (
            <button
              id="mobile-nav-dashboard"
              onClick={() => setActiveTab("teacher-dashboard")}
              className={`py-2 text-center rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
                activeTab === "teacher-dashboard" ? "bg-amber-500 text-white font-black" : "text-slate-600 bg-white"
              }`}
            >
              <Settings className="w-4 h-4 mb-1" />
              <span>教师控制</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace Frame container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* TAB 1: INTENSIVE READS */}
        {activeTab === "text" && (
          <TextSection lessons={lessons} isAdmin={isTeacher} chineseMode={chineseMode} />
        )}

        {/* TAB 2: FLASHCARDS CAROUSEL & INTERACTIVE CONNECT GAMES */}
        {activeTab === "vocab" && (
          <VocabularySection lessons={lessons} currentUser={currentUser} chineseMode={chineseMode} />
        )}

        {/* TAB 2.5: HOMEWORK SUBMISSIONS ZONE AND COMPLEX QUIZ TYPES */}
        {activeTab === "assignment" && (
          <AssignmentZone lessons={lessons} currentUser={currentUser} chineseMode={chineseMode} />
        )}

        {/* TAB 3: MASTER DATA SET ADMIN CONTROLS MODAL */}
        {activeTab === "teacher-dashboard" && isTeacher && (
          <TeacherDashboard
            lessons={lessons}
            users={users}
            onRefreshAllData={syncPlatformState}
            chineseMode={chineseMode}
          />
        )}

      </main>

      {/* Aesthetic Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 mt-12 text-center text-slate-400 text-xs font-medium">
        <p>© 2026 汉语课堂外部自愿复习终端 - 助力学生高效自主学习</p>
        <p className="mt-1 text-[10px] text-slate-300 font-mono uppercase tracking-widest">Designed for Classroom sync & persistence</p>
      </footer>

    </div>
  );
}
