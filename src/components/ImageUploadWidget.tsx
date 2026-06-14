/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Upload, Link, Cloud, CheckCircle, AlertCircle, Loader2, RefreshCw, Sparkles, Image as ImageIcon } from "lucide-react";

interface ImageUploadWidgetProps {
  value: string;
  onChange: (newValue: string) => void;
  label: string;
  randomPlaceholderSeed?: string;
  onGenerateRandom?: () => void;
}

// Global in-memory cache for the Google Access Token so it survives modal close/reopens!
let cachedGoogleAccessToken: string | null = null;

// Fallback client ID (or users can enter theirs directly if not injected)
const ENV_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || "";

export default function ImageUploadWidget({
  value,
  onChange,
  label,
  randomPlaceholderSeed = "img",
  onGenerateRandom
}: ImageUploadWidgetProps) {
  const [activeTab, setActiveTab] = useState<"url" | "local" | "drive">("url");
  const [urlInput, setUrlInput] = useState(value);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Google Drive states
  const [clientId, setClientId] = useState(ENV_CLIENT_ID);
  const [accessToken, setAccessToken] = useState<string | null>(cachedGoogleAccessToken);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [isDownloadingFromDrive, setIsDownloadingFromDrive] = useState(false);

  // Sync state if value changes externally
  useEffect(() => {
    setUrlInput(value);
  }, [value]);

  // Load Google Drive files once we have an access token
  useEffect(() => {
    if (accessToken && activeTab === "drive") {
      fetchDriveImages();
    }
  }, [accessToken, activeTab]);

  // Handle URL change
  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChange(urlInput.trim());
  };

  const handleUrlInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrlInput(e.target.value);
    onChange(e.target.value.trim());
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("请拖入或选择有效的图片格式文件！");
      return;
    }

    // Convert file to Base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      onChange(base64String);
    };
    reader.onerror = () => {
      alert("读取本地文件失败！");
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Google OAuth popup trigger
  const handleConnectDrive = () => {
    if (!clientId.trim()) {
      setDriveError("请先输入有效的 Google Client ID。可在云控制台配置或下方直接输入。");
      return;
    }
    setDriveError(null);

    // Calculate dynamic redirect URI
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const scopes = "https://www.googleapis.com/auth/drive.readonly";
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId.trim())}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scopes)}`;

    // Open connection popup
    const width = 600;
    const height = 650;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const authWindow = window.open(
      authUrl,
      "google_drive_oauth_popup",
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!authWindow) {
      alert("弹窗被浏览器拦截，请允许弹窗以授权连接 Google Drive。");
      return;
    }

    // Listen for connection callback message
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === "GOOGLE_AUTH_SUCCESS") {
        const token = event.data.token;
        cachedGoogleAccessToken = token;
        setAccessToken(token);
        window.removeEventListener("message", handleAuthMessage);
      }
    };

    window.addEventListener("message", handleAuthMessage);
  };

  // Fetch only images from the connected Google Drive
  const fetchDriveImages = async () => {
    if (!accessToken) return;
    setIsLoadingDrive(true);
    setDriveError(null);

    try {
      // Query images only, sorted by modified time
      const q = encodeURIComponent("mimeType contains 'image/' and trashed = false");
      const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,thumbnailLink,webContentLink)&pageSize=40&orderBy=modifiedTime%20desc`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!res.ok) {
        if (res.status === 401) {
          // Token expired
          setAccessToken(null);
          cachedGoogleAccessToken = null;
          throw new Error("登录会话已过期，请重新授权。");
        }
        throw new Error("加载 Google Drive 档案列表失败，请检查 API 配置。");
      }

      const data = await res.json();
      setDriveFiles(data.files || []);
    } catch (err: any) {
      console.error(err);
      setDriveError(err.message || "请求发生未知异常。");
    } finally {
      setIsLoadingDrive(false);
    }
  };

  // Download chosen Google Drive image and convert it to Base64
  const handleSelectDriveFile = async (file: any) => {
    if (!accessToken) return;
    setIsDownloadingFromDrive(true);
    setDriveError(null);

    try {
      // Fetch media contents using Alt=media query
      const url = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!res.ok) {
        throw new Error("下载该 Google Drive 档案失败，可能已被删除或权限不足。");
      }

      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onChange(base64String);
        setIsDownloadingFromDrive(false);
      };
      reader.onerror = () => {
        throw new Error("转换图片编码格式发生错误！");
      };
      reader.readAsDataURL(blob);

    } catch (err: any) {
      console.error(err);
      setDriveError(err.message || "处理 Google Drive 图片失败。");
      setIsDownloadingFromDrive(false);
    }
  };

  const handleDisconnectDrive = () => {
    setAccessToken(null);
    cachedGoogleAccessToken = null;
    setDriveFiles([]);
  };

  // Determine indicator if a valid image is selected
  const isImageValid = value && (value.startsWith("http") || value.startsWith("data:image/"));
  const isBase64 = value && value.startsWith("data:image/");

  return (
    <div className="space-y-2 border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-extrabold text-slate-700">{label}</label>
        {onGenerateRandom && (
          <button
            type="button"
            onClick={onGenerateRandom}
            className="text-[10px] text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 font-extrabold transition cursor-pointer"
          >
            随机生成图片 🔮
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("url")}
          className={`pb-2 px-3 flex items-center space-x-1 border-b-2 transition ${
            activeTab === "url"
              ? "border-amber-500 text-amber-700 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Link className="w-3.5 h-3.5" />
          <span>网络链接 URL</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("local")}
          className={`pb-2 px-3 flex items-center space-x-1 border-b-2 transition ${
            activeTab === "local"
              ? "border-amber-500 text-amber-700 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>电脑本地上传</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("drive")}
          className={`pb-2 px-3 flex items-center space-x-1 border-b-2 transition ${
            activeTab === "drive"
              ? "border-amber-500 text-amber-700 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Cloud className="w-3.5 h-3.5" />
          <span>Google Drive</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="pt-2 min-h-[90px] flex flex-col justify-center">
        {/* Tab 1: URL input */}
        {activeTab === "url" && (
          <div className="space-y-1.5">
            <input
              type="text"
              placeholder="请输入图片静态链接地址 (e.g. https://...)"
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={urlInput}
              onChange={handleUrlInputChange}
            />
          </div>
        )}

        {/* Tab 2: Local upload */}
        {activeTab === "local" && (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-xl p-4 text-center transition flex flex-col items-center justify-center space-y-1 ${
              dragActive
                ? "border-amber-500 bg-amber-50/50"
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/20"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Upload className="w-6 h-6 text-slate-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-600">点击上传或将图片文件拖拽至此</span>
            <span className="text-[10px] text-slate-400">支持 PNG, JPG, JPEG, WEBP 常见格式</span>
          </div>
        )}

        {/* Tab 3: Google Drive picker */}
        {activeTab === "drive" && (
          <div className="space-y-3">
            {!accessToken ? (
              <div className="bg-white p-3 rounded-xl border border-slate-100 flex flex-col items-center space-y-3">
                <Cloud className="w-8 h-8 text-[#4285F4] animate-bounce" />
                <div className="text-center">
                  <p className="text-xs font-extrabold text-slate-700">尚未授权连接您的 Google Drive</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">请通过 Google Auth 授权欣欣汉语读取您的云端相册与图片档案</p>
                </div>

                {/* Optional Custom Client ID config */}
                {!ENV_CLIENT_ID && (
                  <div className="w-full max-w-sm space-y-1 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    <label className="block text-[9px] font-black text-amber-800 uppercase">🛠️ 输入 Google Client ID (临时连接使用)</label>
                    <input
                      type="text"
                      placeholder="Enter Client ID (123456-abcdefg.apps.googleusercontent.com)"
                      className="w-full text-[10px] p-2 bg-white border border-amber-300 rounded focus:outline-none"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleConnectDrive}
                  className="bg-[#4285F4] hover:bg-[#357ae8] text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center space-x-2 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <svg className="w-3 w-3 fill-current" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                  <span>一键授权并连接 Google Drive</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold bg-white p-2 border border-slate-100 rounded-lg">
                  <span className="flex items-center space-x-1 text-emerald-600">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Google Drive 已连接</span>
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={fetchDriveImages}
                      className="p-1 hover:bg-slate-100 text-slate-600 rounded flex items-center space-x-1 text-[9px] cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3 hover:rotate-45 transition-transform" />
                      <span>刷新库</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnectDrive}
                      className="p-1 text-red-500 hover:bg-red-50 border border-red-100/35 rounded text-[9px] cursor-pointer"
                    >
                      断开 ✕
                    </button>
                  </div>
                </div>

                {isLoadingDrive ? (
                  <div className="py-8 text-center flex flex-col items-center justify-center space-y-2">
                    <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                    <span className="text-[10px] text-slate-400">正在搜索获取您云盘上的图片文件...</span>
                  </div>
                ) : driveFiles.length === 0 ? (
                  <div className="py-6 border border-dashed rounded-xl bg-white text-center text-[10px] text-slate-400">
                    您在 Google Drive 根目录及子目录里没有找到格式为 `image/*` 的图片，请上传一些测试。
                  </div>
                ) : (
                  <div className="grid grid-cols-5 gap-2 max-h-[160px] overflow-y-auto p-1 bg-white border border-slate-150 rounded-lg">
                    {driveFiles.map((file) => (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => handleSelectDriveFile(file)}
                        className="group relative h-14 border border-slate-100 rounded-md overflow-hidden bg-slate-50 hover:border-amber-500 flex flex-col items-center justify-center transition focus:outline-none cursor-pointer text-left"
                        title={file.name}
                      >
                        {file.thumbnailLink ? (
                          <img
                            src={file.thumbnailLink}
                            alt={file.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-slate-400" />
                        )}
                        <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] truncate p-0.5 text-center font-mono">
                          {file.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {isDownloadingFromDrive && (
        <div className="flex items-center justify-center space-x-2 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold p-2 rounded-xl animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
          <span>正在转码并安全转换您的 Google Drive 资产，请稍候...</span>
        </div>
      )}

      {/* Errors output */}
      {driveError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-[10px] p-2.5 rounded-xl flex items-start space-x-1.5 font-bold">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{driveError}</span>
        </div>
      )}

      {/* Preview block */}
      {isImageValid && (
        <div className="mt-2 text-center bg-white p-2.5 rounded-xl border border-slate-100 flex items-center justify-between space-x-3">
          <div className="flex items-center space-x-2">
            <img
              src={value}
              alt="illustration preview"
              referrerPolicy="no-referrer"
              className="rounded-lg h-10 w-16 object-cover border border-slate-200 shadow-xs bg-slate-50"
            />
            <div>
              <span className="text-[10px] text-slate-500 font-extrabold flex items-center space-x-1">
                <CheckCircle className="w-3 h-3 text-emerald-500" />
                <span>{isBase64 ? "已完成本地编码安全储存" : "图片静态路径加载成功"}</span>
              </span>
              <p className="text-[8px] text-slate-400 max-w-[150px] truncate font-mono">
                {value}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[9px] font-bold px-2 py-0.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 rounded cursor-pointer"
          >
            清除图片
          </button>
        </div>
      )}
    </div>
  );
}
