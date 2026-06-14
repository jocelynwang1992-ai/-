/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AlertCircle, GraduationCap, Sparkles } from "lucide-react";
import React, { useState } from "react";
import { User } from "../types";

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [selectedRole, setSelectedRole] = useState<"student" | "teacher">("student");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg("请填写您的姓名/账号及密码");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password: password.trim() })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        // Double check matching role permissions if desired
        if (selectedRole === "teacher" && data.user.role !== "teacher") {
          setErrorMsg("该账号不具备教师权限，请使用学生身份登录");
          setLoading(false);
          return;
        }
        onLoginSuccess(data.user);
      } else {
        setErrorMsg(data.error || "登录失败，请检查您的凭证或联系老师");
      }
    } catch (err: any) {
      console.warn("Login connection fault:", err?.message || err);
      setErrorMsg("服务器连接失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-container" className="min-h-screen bg-[#FAF7F2] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      
      {/* Brand Section mirroring the screenshot */}
      <div className="flex flex-col items-center mb-8 select-none text-center animate-in fade-in slide-in-from-top-4 duration-500">
        {/* Chinese character logo with Crimson square */}
        <div id="brand-logo-tile" className="w-20 h-20 bg-[#C2413C] rounded-[24px] flex items-center justify-center text-white shadow-lg shadow-[#C2413C]/10 mb-4 transition-transform hover:scale-105">
          <span className="text-4xl font-serif font-semibold">汉</span>
        </div>
        
        {/* Title in fine typography */}
        <h2 className="text-3xl font-black text-slate-800 tracking-wide font-serif">
          欣欣汉语学习
        </h2>
        {/* Subtitle */}
        <p className="mt-1 text-sm text-[#8A8275] font-semibold tracking-wide uppercase font-mono">
          Chinese Learning Platform
        </p>
      </div>

      {/* Main Login Card Panel */}
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-[#4A3B2B]/5 rounded-3xl border border-[#ECE5D9]/50">
          
          {/* Tab Selector Inside Card */}
          <div id="role-tab-capsule" className="bg-[#F0EAE1] p-1.5 rounded-2xl flex items-center mb-8 select-none">
            <button
              id="tab-role-student"
              type="button"
              onClick={() => {
                setSelectedRole("student");
                setErrorMsg(null);
                setUsername("");
                setPassword("");
              }}
              className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                selectedRole === "student"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-[#8A8275] hover:text-slate-800"
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>学生 Student</span>
            </button>

            <button
              id="tab-role-teacher"
              type="button"
              onClick={() => {
                setSelectedRole("teacher");
                setErrorMsg(null);
                setUsername("");
                setPassword("");
              }}
              className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                selectedRole === "teacher"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-[#8A8275] hover:text-slate-800"
              }`}
            >
              <GraduationCap className="w-4 h-4 text-[#C2413C]" />
              <span>教师 Teacher</span>
            </button>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            {/* Input Name field */}
            <div>
              <label htmlFor="username-input" className="block text-sm font-bold text-slate-700 mb-1.5">
                姓名 Name
              </label>
              <input
                id="username-input"
                name="username"
                type="text"
                required
                className="block w-full px-4 py-3 bg-[#FAF7F2] border border-[#EFE9DB] rounded-xl text-slate-800 placeholder-[#AFA89C] focus:outline-none focus:ring-2 focus:ring-[#C2413C]/50 focus:border-[#C2413C] text-sm transition-all font-semibold"
                placeholder={selectedRole === "student" ? "请输入您的注册姓名" : "请输入教师账号"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            {/* Input Password field */}
            <div>
              <label htmlFor="password-input" className="block text-sm font-bold text-slate-700 mb-1.5">
                密码 Password
              </label>
              <input
                id="password-input"
                name="password"
                type="password"
                required
                className="block w-full px-4 py-3 bg-[#FAF7F2] border border-[#EFE9DB] rounded-xl text-slate-800 placeholder-[#AFA89C] focus:outline-none focus:ring-2 focus:ring-[#C2413C]/50 focus:border-[#C2413C] text-sm transition-all font-semibold"
                placeholder="输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* Hint Notification Message */}
            <div id="login-helper-hint" className="text-xs text-[#8A8275] font-semibold mt-1">
              {selectedRole === "student" ? (
                <span>提示：学生需使用老师注册的姓名与密码登录</span>
              ) : (
                <span>提示：教师请使用对应的管理账号与密码登录</span>
              )}
            </div>

            {/* Error Indicator */}
            {errorMsg && (
              <div id="login-error-alert" className="rounded-xl bg-red-50 p-4 border border-red-100 flex items-start space-x-2 text-red-700 mt-4 animate-shake">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                <span className="text-xs font-bold leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {/* CTA Submit Button */}
            <div className="pt-2">
              <button
                id="login-btn"
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-[#C2413C] hover:bg-[#A83733] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C2413C] disabled:opacity-50 transition-all cursor-pointer active:scale-95"
              >
                {loading ? (
                  <span className="flex items-center space-x-2">
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>正在登录...</span>
                  </span>
                ) : (
                  <span>登录 Login</span>
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
