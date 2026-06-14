/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BookOpen, ChevronRight, HelpCircle, Volume2, VolumeX, Play, Pause, RotateCcw } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Lesson, VocabItem, TextLine } from "../types";
import { speakChinese, stopSpeaking, SPEECH_RATES } from "./AudioTTS";
import { translateChinese } from "../utils/chineseConverter";
import { alignPinyinAndChinese } from "../utils/pinyinAligner";

interface TextSectionProps {
  lessons: Lesson[];
  isAdmin: boolean;
  chineseMode: "simplified" | "traditional";
}

export default function TextSection({ lessons, isAdmin, chineseMode }: TextSectionProps) {
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [hidePinyin, setHidePinyin] = useState<boolean>(false);
  const [prosePageIndex, setProsePageIndex] = useState<number>(0);
  
  // Audio state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [currentlyPlayingLineIdx, setCurrentlyPlayingLineIdx] = useState<number | null>(null);

  // Pop-up Vocab state
  const [popupVocab, setPopupVocab] = useState<VocabItem | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setProsePageIndex(0);
  }, [selectedLessonId]);

  useEffect(() => {
    if (lessons.length > 0) {
      if (!selectedLessonId || !lessons.some(l => l.id === selectedLessonId)) {
        setSelectedLessonId(lessons[0].id);
        setActiveLesson(lessons[0]);
      } else {
        const found = lessons.find(l => l.id === selectedLessonId);
        if (found) {
          setActiveLesson(found);
        }
      }
    } else {
      setActiveLesson(null);
    }
  }, [lessons, selectedLessonId]);

  // Handle lesson click
  const selectLesson = (lesson: Lesson) => {
    stopSpeaking();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentlyPlayingLineIdx(null);
    setSelectedLessonId(lesson.id);
    setActiveLesson(lesson);
    setPopupVocab(null);
    setProsePageIndex(0);
  };

  // Speak whole lesson line by line
  const startFullAudio = () => {
    if (!activeLesson || activeLesson.lines.length === 0) return;
    stopSpeaking();
    setIsPlaying(true);
    setIsPaused(false);
    
    if (activeLesson.lessonType === "prose") {
      setProsePageIndex(0);
    }
    
    // Play line by line
    let currentIdx = 0;
    const playNext = () => {
      if (currentIdx >= activeLesson.lines.length) {
        setIsPlaying(false);
        setCurrentlyPlayingLineIdx(null);
        return;
      }
      setCurrentlyPlayingLineIdx(currentIdx);
      if (activeLesson.lessonType === "prose") {
        setProsePageIndex(currentIdx);
      }
      speakChinese(activeLesson.lines[currentIdx].character, speechRate, () => {
        currentIdx++;
        // Give 0.8s gap between lines
        setTimeout(playNext, 800);
      }, currentIdx % 2 === 0 ? "A" : "B", activeLesson.lessonType === "prose");
    };
    playNext();
  };

  // Speak single line
  const playSingleLine = (index: number, text: string) => {
    stopSpeaking();
    setIsPlaying(true);
    setCurrentlyPlayingLineIdx(index);
    speakChinese(text, speechRate, () => {
      setIsPlaying(false);
      setCurrentlyPlayingLineIdx(null);
    }, index % 2 === 0 ? "A" : "B", activeLesson?.lessonType === "prose");
  };

  // Stop everything
  const handleStopAudio = () => {
    stopSpeaking();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentlyPlayingLineIdx(null);
  };

  // Helper: Tokenize text to extract vocabulary words
  const tokenizeLine = (lineText: string, vocabList: VocabItem[]) => {
    if (!vocabList || vocabList.length === 0) {
      return [{ text: lineText, isVocab: false, vocabItem: null }];
    }

    // Sort vocab by word length descending so that longer matches take priority
    const sortedVocab = [...vocabList].sort((a, b) => b.word.length - a.word.length);
    
    // Build array of intervals where vocabulary matches occur
    interface Match {
      start: number;
      end: number;
      item: VocabItem;
    }
    const matches: Match[] = [];

    for (const vocab of sortedVocab) {
      if (!vocab.word) continue;
      
      let startIdx = 0;
      while (true) {
        const foundIdx = lineText.indexOf(vocab.word, startIdx);
        if (foundIdx === -1) break;
        
        const endIdx = foundIdx + vocab.word.length;

        // Check if this match overlaps with any previously found priority matches
        const isOverlapping = matches.some(m => 
          (foundIdx >= m.start && foundIdx < m.end) || 
          (endIdx > m.start && endIdx <= m.end) ||
          (foundIdx <= m.start && endIdx >= m.end)
        );

        if (!isOverlapping) {
          matches.push({ start: foundIdx, end: endIdx, item: vocab });
        }
        
        startIdx = foundIdx + 1;
      }
    }

    // Sort matches by starting index
    matches.sort((a, b) => a.start - b.start);

    // Split string into final segments
    const segments: { text: string; isVocab: boolean; vocabItem: VocabItem | null }[] = [];
    let currentIndex = 0;

    for (const match of matches) {
      // Add plain text before match if any
      if (match.start > currentIndex) {
        segments.push({
          text: lineText.substring(currentIndex, match.start),
          isVocab: false,
          vocabItem: null
        });
      }
      // Add vocabulary match
      segments.push({
        text: lineText.substring(match.start, match.end),
        isVocab: true,
        vocabItem: match.item
      });
      currentIndex = match.end;
    }

    // Add remaining plain text
    if (currentIndex < lineText.length) {
      segments.push({
        text: lineText.substring(currentIndex),
        isVocab: false,
        vocabItem: null
      });
    }

    return segments;
  };

  const handleVocabClick = (e: React.MouseEvent, item: VocabItem) => {
    e.stopPropagation();
    
    // Position of popup relative to viewport
    const rect = e.currentTarget.getBoundingClientRect();
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    setPopupVocab(item);
    setPopupPosition({
      x: rect.left + scrollLeft + (rect.width / 2),
      y: rect.top + scrollTop - 8 // Draw slightly above
    });
    
    // Play item audio immediately on hover/click for immersive feel!
    speakChinese(item.word, speechRate);
  };

  return (
    <div id="text-section-box" className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative" onClick={() => setPopupVocab(null)}>
      {/* Sidebar Lesson Directory */}
      <div className="lg:col-span-1 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-fit">
        <div className="flex items-center space-x-2 text-slate-800 font-bold text-base mb-4 pb-2 border-b border-slate-50">
          <BookOpen className="w-5 h-5 text-amber-500" />
          <span>课文目录 / Directory</span>
        </div>
        {lessons.length === 0 ? (
          <div className="text-slate-400 text-sm py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            暂无课文内容，教师请在控制台添加
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[350px] lg:max-h-[500px] overflow-y-auto pr-1">
            {lessons.map((lesson) => (
              <button
                id={`lesson-item-${lesson.id}`}
                key={lesson.id}
                onClick={() => selectLesson(lesson)}
                className={`w-full flex items-center justify-between text-left px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                  selectedLessonId === lesson.id
                    ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700"
                }`}
              >
                <div className="truncate mr-2">
                  <p className={`font-semibold ${selectedLessonId === lesson.id ? "text-white" : "text-slate-800"}`}>
                    {translateChinese(lesson.title, chineseMode)}
                  </p>
                  <p className={`text-xs truncate font-mono mt-0.5 ${selectedLessonId === lesson.id ? "text-amber-100" : "text-slate-400"}`}>
                    {lesson.pinyinTitle || "No Pinyin"}
                  </p>
                </div>
                <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${selectedLessonId === lesson.id ? "translate-x-0.5 text-white" : "text-slate-400"}`} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Reading Screen */}
      <div className="lg:col-span-3 space-y-6">
        {activeLesson ? (
          <>
            {/* Lesson Illustration */}
            {(activeLesson.lessonType === "prose" ? (activeLesson.lines[prosePageIndex]?.imageUrl || activeLesson.imageUrl) : activeLesson.imageUrl) && (
              <div id="lesson-illustration-box" className="rounded-2xl overflow-hidden border border-slate-200 shadow-md h-[380px] w-full relative animate-in fade-in duration-300">
                <img 
                  src={activeLesson.lessonType === "prose" ? (activeLesson.lines[prosePageIndex]?.imageUrl || activeLesson.imageUrl) : activeLesson.imageUrl} 
                  alt={activeLesson.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent text-white p-4 flex items-end">
                  <span className="text-xs bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                    {activeLesson.lessonType === "prose" ? `🖼️ 第 ${prosePageIndex + 1} 页插画 / Slide ${prosePageIndex + 1} Illustration` : "🖼️ 课文情境插画 / Dialogue Scene Illustration"}
                  </span>
                </div>
              </div>
            )}

            {/* Header with audio control tools */}
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl shadow-sm text-white p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <span className="bg-[#9f5119]/30 text-amber-100 text-[10px] px-2.5 py-1 rounded-full font-black font-mono tracking-wider">
                  {activeLesson.lessonType === "prose" ? "📝 欣欣精读短文 (PROSE STUDY)" : "💬 情境汉语对话 (DIALOGUE PRACTICE)"}
                </span>
                <h3 className="text-2xl font-extrabold mt-1">{translateChinese(activeLesson.title, chineseMode)}</h3>
                <p className="text-xs font-mono text-amber-100 tracking-wide mt-1">
                  {activeLesson.pinyinTitle || "Pinyin Title Unavailable"}
                </p>
                <p className="text-sm mt-3 text-white/90 font-medium">
                  {translateChinese(activeLesson.description, chineseMode) || "本节课暂无说明 / No description provided."}
                </p>
              </div>

              {/* Speech control bar */}
              <div className="bg-white/10 backdrop-blur-md border border-white/15 p-3 rounded-xl flex flex-wrap items-center gap-3 self-start md:self-center shrink-0">
                {/* Rate Selector */}
                <div className="flex items-center space-x-1 bg-white/10 rounded-lg px-2 py-1">
                  <span className="text-[10px] text-amber-100 font-bold uppercase tracking-wider">Speed:</span>
                  <select
                    id="speech-rate-selector"
                    value={speechRate}
                    onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                    className="bg-transparent text-white focus:outline-none text-xs font-bold font-mono cursor-pointer"
                  >
                    {SPEECH_RATES.map((opt) => (
                      <option key={opt.value} value={opt.value} className="text-slate-800">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Audio Triggers */}
                <div className="flex items-center space-x-1.5">
                  {!isPlaying ? (
                    <button
                      id="play-lesson-audio"
                      onClick={startFullAudio}
                      className="bg-white text-amber-700 hover:bg-amber-50 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>全文朗读</span>
                    </button>
                  ) : (
                    <button
                      id="stop-lesson-audio"
                      onClick={handleStopAudio}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 animate-spin-slow" />
                      <span>停止播放</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Reading Text Display Area */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-slate-50 flex-wrap gap-2">
                <div className="flex items-center space-x-3 flex-wrap">
                  <span className="text-slate-800 font-bold text-sm flex items-center space-x-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>{activeLesson.lessonType === "prose" ? "文章段落精读 / Prose Intense Study" : "情景对话练习 / Dialogue Role Play"}</span>
                  </span>
                  
                  {/* Pinyin Show/Hide Choice */}
                  <button
                    type="button"
                    id="toggle-pinyin-btn"
                    onClick={() => setHidePinyin(!hidePinyin)}
                    className={`px-3 py-1 text-[10px] sm:text-xs font-black rounded-full cursor-pointer flex items-center space-x-1 border transition-all ${
                      hidePinyin 
                        ? "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200" 
                        : "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-150"
                    }`}
                  >
                    <span>{hidePinyin ? translateChinese("显示拼音", chineseMode) : translateChinese("隐藏拼音", chineseMode)}</span>
                  </button>
                </div>
                <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md font-medium">
                  💡 点击金色的 **生词** 查看拼音与释义例句
                </span>
              </div>

              {activeLesson.lines.length === 0 ? (
                <div className="text-slate-400 text-sm py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  {activeLesson.lessonType === "prose" ? "本课暂无短文段落 / No prose paragraphs available." : "本课无课文段落 / No dialogue lines available."}
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in duration-300 font-sans">
                  {activeLesson.lines.map((line, idx) => {
                    const isLinePlaying = currentlyPlayingLineIdx === idx;
                    // Dynamic Alignment of Chinese character words to space-separated pinyin words!
                    const alignedBlocks = alignPinyinAndChinese(line.character, line.pinyin);

                    // Skip lines for prose that are not the current page!
                    if (activeLesson.lessonType === "prose" && idx !== prosePageIndex) {
                      return null;
                    }

                    if (activeLesson.lessonType === "prose") {
                      return (
                        <div
                          id={`text-line-wrapper-${idx}`}
                          key={idx}
                          className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
                        >
                          {/* Rich uncropped Image panel */}
                          {line.imageUrl && (
                            <div className="w-full bg-slate-50 border border-slate-200/60 rounded-3xl p-4 flex items-center justify-center shadow-xs">
                              <img
                                src={line.imageUrl}
                                alt={`Chapter scenic illustration ${idx + 1}`}
                                referrerPolicy="no-referrer"
                                className="max-h-[380px] w-auto max-w-full object-contain rounded-2xl shadow-2xs"
                              />
                            </div>
                          )}

                          {/* Paragraph text card */}
                          <div
                            className={`p-6 md:p-8 rounded-3xl border transition-all ${
                              isLinePlaying
                                ? "bg-amber-50/50 border-amber-300 shadow-md shadow-amber-100 animate-pulse"
                                : "bg-slate-50/45 hover:bg-slate-50 border-slate-100"
                            }`}
                          >
                            <div className="flex flex-col space-y-5">
                              {/* Paragraph Title / Tag */}
                              <div className="flex justify-between items-center">
                                <span className="text-[11px] font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
                                  第 {idx + 1} 段 / Paragraph {idx + 1}
                                </span>
                              </div>

                              {/* Chinese and Pinyin area */}
                              <div className="flex flex-wrap items-end gap-x-2.5 gap-y-4 pt-1">
                                {alignedBlocks.map((block, bIdx) => {
                                  // Match vocabulary items
                                  const matchedVocab = activeLesson.vocab.find(v => 
                                    block.chars === v.word || 
                                    v.word === block.chars ||
                                    (block.chars.length > 1 && v.word.includes(block.chars))
                                  );
                                  const isVocab = !!matchedVocab;

                                  return (
                                    <div
                                      key={bIdx}
                                      onClick={isVocab ? (e) => handleVocabClick(e, matchedVocab) : undefined}
                                      className={`inline-flex flex-col items-center select-none ${
                                        isVocab 
                                          ? "cursor-pointer group/vocab hover:bg-amber-100 hover:text-amber-950 px-1 py-0.5 rounded-xl transition-all" 
                                          : ""
                                      }`}
                                      title={isVocab ? translateChinese("点我查看拼音与翻译", chineseMode) : undefined}
                                    >
                                      {/* Play Pinyin positioned exactly above character if not hidden */}
                                      {!hidePinyin && block.pinyin ? (
                                        <span className="text-[11px] md:text-sm font-mono font-black tracking-wider text-amber-600/90 lowercase h-4 block mb-1 max-w-[150px] truncate leading-none">
                                          {block.pinyin}
                                        </span>
                                      ) : (
                                        <span className="h-4 block mb-1 leading-none" />
                                      )}

                                      {/* Chinese character block */}
                                      <span className={`text-lg md:text-2xl font-bold leading-none ${
                                        isVocab 
                                          ? "text-slate-900 border-b-[2.5px] border-dashed border-amber-500 pb-0.5 hover:border-amber-700 font-extrabold" 
                                          : "text-slate-800"
                                      }`}>
                                        {translateChinese(block.chars, chineseMode)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Translation and Speak Control Bar */}
                              <div className="flex items-center justify-between border-t border-slate-100 pt-4 gap-4 flex-wrap">
                                <p className="text-xs md:text-sm text-slate-500 font-medium italic">
                                  {line.translation}
                                </p>

                                <button
                                  id={`play-speaker-for-line-${idx}`}
                                  onClick={() => playSingleLine(idx, line.character)}
                                  className={`p-3 rounded-2xl transition-all shrink-0 cursor-pointer flex items-center space-x-2 ${
                                    isLinePlaying
                                      ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                                      : "bg-white hover:bg-slate-100 text-slate-500 hover:text-amber-600 border border-slate-200"
                                  }`}
                                  title="朗读本段"
                                >
                                  <Volume2 className="w-4 h-4" />
                                  <span className="text-xs font-black">{isLinePlaying ? "播放中" : "单段朗读"}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Otherwise, render normal structured dialogue
                    return (
                      <div
                        id={`text-line-wrapper-${idx}`}
                        key={idx}
                        className={`group p-4 md:p-5 rounded-2xl transition-all border ${
                          isLinePlaying
                            ? "bg-amber-50/50 border-amber-200 shadow-sm shadow-amber-100"
                            : "bg-slate-50/45 hover:bg-slate-100/45 border-transparent hover:border-slate-100"
                        }`}
                      >
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch">
                          <div className="flex-1 flex justify-between items-start space-x-3">
                            <div className="space-y-3.5 flex-1 overflow-hidden">
                              
                              {/* Chinese words with Pinyin directly above them (Pinyin Align-box) */}
                              <div className="flex flex-wrap items-end gap-x-2 gap-y-3 pt-1">
                                {alignedBlocks.map((block, bIdx) => {
                                  // Match vocabulary items
                                  const matchedVocab = activeLesson.vocab.find(v => 
                                    block.chars === v.word || 
                                    v.word === block.chars ||
                                    (block.chars.length > 1 && v.word.includes(block.chars))
                                  );
                                  const isVocab = !!matchedVocab;

                                  return (
                                    <div
                                      key={bIdx}
                                      onClick={isVocab ? (e) => handleVocabClick(e, matchedVocab) : undefined}
                                      className={`inline-flex flex-col items-center select-none ${
                                        isVocab 
                                          ? "cursor-pointer group/vocab hover:bg-amber-100 hover:text-amber-950 px-1 rounded-xl transition-all py-0.5" 
                                          : ""
                                      }`}
                                      title={isVocab ? translateChinese("点我查看拼音与翻译", chineseMode) : undefined}
                                    >
                                      {/* Play Pinyin positioned exactly above character if not hidden */}
                                      {!hidePinyin && block.pinyin ? (
                                        <span className="text-[10px] md:text-xs font-mono font-bold tracking-wide text-amber-600/90 lowercase h-4 block mb-0.5 max-w-[100px] truncate leading-none">
                                          {block.pinyin}
                                        </span>
                                      ) : (
                                        <span className="h-4 block mb-0.5 leading-none" />
                                      )}

                                      {/* Chinese character block */}
                                      <span className={`text-base md:text-xl font-bold leading-none ${
                                        isVocab 
                                          ? "text-slate-900 border-b-[2px] border-dashed border-amber-500 pb-0.5 hover:border-amber-700 font-extrabold" 
                                          : "text-slate-800"
                                      }`}>
                                        {translateChinese(block.chars, chineseMode)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* English translation */}
                              <p className="text-xs md:text-xs text-slate-500 font-normal italic pt-1 pl-0.5">
                                {line.translation}
                              </p>
                            </div>

                            {/* Sound trigger button per line */}
                            <button
                              id={`play-speaker-for-line-${idx}`}
                              onClick={() => playSingleLine(idx, line.character)}
                              className={`p-2.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                                isLinePlaying
                                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                                  : "bg-white hover:bg-slate-150 text-slate-400 hover:text-amber-600 border border-slate-100/80"
                              }`}
                              title="朗读本段"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Line Picture on the right */}
                          {line.imageUrl && (
                            <div className="md:w-44 md:h-28 w-full h-40 shrink-0 rounded-xl overflow-hidden border border-slate-100 shadow-xs relative group bg-slate-50 flex items-center justify-center self-center">
                              <img
                                src={line.imageUrl}
                                alt={`illustration for ${line.character.substring(0, 10)}`}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Prose specific Pagination Controls */}
                  {activeLesson.lessonType === "prose" && activeLesson.lines.length >= 1 && (
                    <div className="flex items-center justify-between pt-5 border-t border-slate-100 flex-wrap gap-3 mt-6">
                      <button
                        type="button"
                        id="prose-prev-page-btn"
                        onClick={() => {
                          if (prosePageIndex > 0) {
                            setProsePageIndex(prev => prev - 1);
                            handleStopAudio();
                          }
                        }}
                        disabled={prosePageIndex === 0}
                        className={`flex items-center space-x-1.5 px-4.5 py-2.5 rounded-2xl text-xs font-black border transition-all ${
                          prosePageIndex === 0
                            ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                            : "bg-white hover:bg-slate-100 text-slate-700 hover:text-amber-700 border-slate-200 cursor-pointer hover:shadow-xs active:scale-95"
                        }`}
                      >
                        <span>← 上一页 (Prev)</span>
                      </button>

                      <div className="text-center font-bold text-xs text-amber-900 font-mono bg-amber-50 border border-amber-100/80 px-4 py-2 rounded-full shadow-3xs">
                        <span>{prosePageIndex + 1} / {activeLesson.lines.length} 段</span>
                      </div>

                      <button
                        type="button"
                        id="prose-next-page-btn"
                        onClick={() => {
                          if (prosePageIndex < activeLesson.lines.length - 1) {
                            setProsePageIndex(prev => prev + 1);
                            handleStopAudio();
                          }
                        }}
                        disabled={prosePageIndex === activeLesson.lines.length - 1}
                        className={`flex items-center space-x-1.5 px-4.5 py-2.5 rounded-2xl text-xs font-black border transition-all ${
                          prosePageIndex === activeLesson.lines.length - 1
                            ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                            : "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 cursor-pointer hover:shadow-sm active:scale-95"
                        }`}
                      >
                        <span>下一页 (Next) →</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Vocabulary List summary bar */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <h4 className="text-slate-800 font-bold text-sm mb-3">本课包含的生词 / Key Vocabulary</h4>
              {activeLesson.vocab.length === 0 ? (
                <p className="text-slate-400 text-xs italic">本课尚未添加生词 / No vocabulary registered yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {activeLesson.vocab.map((item) => (
                    <button
                      id={`bottom-vocab-shortcut-${item.id}`}
                      key={item.id}
                      onClick={(e) => handleVocabClick(e, item)}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-900 transition-colors text-xs font-semibold text-slate-600 flex items-center space-x-1 cursor-pointer"
                    >
                      <span>{translateChinese(item.word, chineseMode)}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({item.pinyin})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-slate-100 flex flex-col justify-center items-center">
            <HelpCircle className="w-12 h-12 text-slate-300 animate-bounce" />
            <p className="mt-3 text-slate-500 text-sm font-medium">请先在控制台添加课程或点击左侧目录</p>
          </div>
        )}
      </div>

      {/* Pop-up Interactive Card Overlay */}
      {popupVocab && popupPosition && (
        <div
          id="vocab-bubble-popup"
          className="absolute z-50 bg-white p-4.5 rounded-2xl shadow-xl shadow-amber-900/10 border-2 border-amber-500/30 w-[240px] md:w-[280px] -translate-x-1/2 flex flex-col space-y-2.5 animate-in fade-in zoom-in-95 duration-100 text-left"
          style={{
            left: `${popupPosition.x}px`,
            top: `${popupPosition.y}px`,
            transform: "translate(-50%, -100%)",
          }}
          onClick={(e) => e.stopPropagation()} // Keep it visible on clicked card
        >
          {/* Caret pointing down */}
          <div className="absolute top-full left-1/2 -ml-2 -translate-y-px border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-white" />

          <div className="flex justify-between items-start">
            <div>
              <span className="text-2xl font-black text-slate-800 tracking-tight">{translateChinese(popupVocab.word, chineseMode)}</span>
              <p className="text-xs font-mono font-bold text-amber-600 uppercase tracking-wider mt-0.5">{popupVocab.pinyin}</p>
            </div>
            <button
              id="speak-vocab-popup-audio"
              onClick={() => speakChinese(popupVocab.word, speechRate)}
              className="p-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-full transition-colors cursor-pointer"
              title="发音"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          <div className="border-t border-slate-50 pt-2 text-xs text-slate-600 font-medium">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Meaning / 翻译</span>
            <p className="mt-0.5 text-slate-700">{popupVocab.translation}</p>
          </div>

          {popupVocab.exampleCh && (
            <div className="border-t border-slate-50 pt-2 text-[11px] text-slate-500">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Example / {translateChinese("例句", chineseMode)}</span>
              <p className="mt-0.5 font-bold text-slate-700">{translateChinese(popupVocab.exampleCh, chineseMode)}</p>
              {popupVocab.examplePy && <p className="font-mono text-[9px] text-amber-700">{popupVocab.examplePy}</p>}
              {popupVocab.exampleEn && <p className="italic text-[10px] text-slate-500 mt-0.5">{popupVocab.exampleEn}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
