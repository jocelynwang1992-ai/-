/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Award, CheckCircle, ChevronLeft, ChevronRight, RefreshCw, Sparkles, Volume2, XCircle, Trophy, HelpCircle, GraduationCap } from "lucide-react";
import { useState, useEffect } from "react";
import { Lesson, VocabItem, QuizQuestion, User } from "../types";
import { speakChinese } from "./AudioTTS";
import { translateChinese } from "../utils/chineseConverter";

interface VocabularySectionProps {
  lessons: Lesson[];
  currentUser: User | null;
  chineseMode: "simplified" | "traditional";
}

export default function VocabularySection({ lessons, currentUser, chineseMode }: VocabularySectionProps) {
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");

  // Derive activeLesson directly from props to avoid reference mismatch/reset loops on polling
  const activeLesson = lessons.find(l => l.id === selectedLessonId) || lessons[0] || null;

  // Layout Tab: "flashcards" | "match-quiz" | "choice-quiz"
  const [activeTab, setActiveTab] = useState<"flashcards" | "match-quiz" | "choice-quiz">("flashcards");

  // Flashcards state
  const [currentCardIdx, setCurrentCardIdx] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  // Match modes toggle: "translation" (English definitions) or "pinyin" (Pinyin readings)
  const [matchMode, setMatchMode] = useState<"translation" | "pinyin">("translation");

  // Matching game state
  const [matchPairs, setMatchPairs] = useState<{ left: string; right: string; matched: boolean }[]>([]);
  const [leftOptions, setLeftOptions] = useState<string[]>([]);
  const [rightOptions, setRightOptions] = useState<string[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [mismatchedLeft, setMismatchedLeft] = useState<string | null>(null);
  const [mismatchedRight, setMismatchedRight] = useState<string | null>(null);
  const [matchScore, setMatchScore] = useState<number>(0);
  const [matchedCount, setMatchedCount] = useState<number>(0);

  // Choice quiz state
  const [choiceQuestions, setChoiceQuestions] = useState<QuizQuestion[]>([]);
  const [currentChoiceIdx, setCurrentChoiceIdx] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  const [scoreCoins, setScoreCoins] = useState<number>(0);
  const [choiceQuizDone, setChoiceQuizDone] = useState<boolean>(false);
  const [wrongAnswersList, setWrongAnswersList] = useState<{
    questionText: string;
    submittedAnswer: string;
    correctAnswer: string;
  }[]>([]);
  const [quizLessonId, setQuizLessonId] = useState<string>("");

  // Initialize lesson selection
  useEffect(() => {
    if (lessons.length > 0) {
      if (!selectedLessonId || !lessons.some(l => l.id === selectedLessonId)) {
        setSelectedLessonId(lessons[0].id);
      }
    }
  }, [lessons, selectedLessonId]);

  // Reset games/cards whenever selected lesson or match mode changes
  useEffect(() => {
    resetFlashcards();
    resetMatchingGame();
    resetChoiceQuiz(true); // force reload when lesson or mode is explicitly changed
  }, [selectedLessonId, matchMode]);

  // Safety trigger: if on the choice tab and questions are empty but lesson is loaded, generate them
  useEffect(() => {
    if (activeTab === "choice-quiz" && choiceQuestions.length === 0 && activeLesson && activeLesson.vocab.length >= 2) {
      resetChoiceQuiz();
    }
  }, [activeTab, selectedLessonId, choiceQuestions.length]);

  // FLASHCARDS ACTIONS
  const resetFlashcards = () => {
    setCurrentCardIdx(0);
    setIsFlipped(false);
  };

  const handlePrevCard = () => {
    if (!activeLesson) return;
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIdx((prev) => (prev === 0 ? activeLesson.vocab.length - 1 : prev - 1));
    }, 150);
  };

  const handleNextCard = () => {
    if (!activeLesson) return;
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIdx((prev) => (prev === activeLesson.vocab.length - 1 ? 0 : prev + 1));
    }, 150);
  };

  const speakCurrentCard = (wordStr: string) => {
    speakChinese(wordStr);
  };

  // MATCHING GAME LOGIC
  const resetMatchingGame = () => {
    if (!activeLesson || activeLesson.vocab.length === 0) return;

    const vocabList = activeLesson.vocab;
    // Cap at 6 words per match round to avoid overloading
    const sliceWords = [...vocabList].sort(() => 0.5 - Math.random()).slice(0, 6);

    const pairs = sliceWords.map((v) => ({
      left: v.word,
      right: matchMode === "pinyin" ? v.pinyin : v.translation,
      matched: false,
    }));

    setMatchPairs(pairs);
    setLeftOptions(pairs.map((p) => p.left).sort(() => 0.5 - Math.random()));
    setRightOptions(pairs.map((p) => p.right).sort(() => 0.5 - Math.random()));
    setSelectedLeft(null);
    setSelectedRight(null);
    setMismatchedLeft(null);
    setMismatchedRight(null);
    setMatchedCount(0);
  };

  const handleLeftSelect = (word: string) => {
    if (mismatchedLeft || mismatchedRight) return;
    setSelectedLeft(word);
    speakChinese(word);

    // If an item on the right is already selected, check matching
    if (selectedRight) {
      checkMatching(word, selectedRight);
    }
  };

  const handleRightSelect = (translation: string) => {
    if (mismatchedLeft || mismatchedRight) return;
    setSelectedRight(translation);

    // If an item on the left is already selected, check matching
    if (selectedLeft) {
      checkMatching(selectedLeft, translation);
    }
  };

  const checkMatching = (lhWord: string, rhTrans: string) => {
    const pair = matchPairs.find((p) => p.left === lhWord && p.right === rhTrans);
    if (pair) {
      // CORRECT MATCH!
      setMatchPairs((prev) =>
        prev.map((p) => (p.left === lhWord ? { ...p, matched: true } : p))
      );
      setMatchedCount((prev) => prev + 1);
      setMatchScore((prev) => prev + 10);
      setSelectedLeft(null);
      setSelectedRight(null);
    } else {
      // MISMATCH!
      setMismatchedLeft(lhWord);
      setMismatchedRight(rhTrans);
      setTimeout(() => {
        setSelectedLeft(null);
        setSelectedRight(null);
        setMismatchedLeft(null);
        setMismatchedRight(null);
      }, 1000);
    }
  };

  // MULTIPLE CHOICE QUIZ ENGINE
  const resetChoiceQuiz = (force: boolean = false) => {
    if (!activeLesson || activeLesson.vocab.length === 0) {
      setChoiceQuestions([]);
      setQuizLessonId("");
      return;
    }

    // Preserve existing questions and progress if they match the current lesson, unless forced
    if (choiceQuestions.length > 0 && quizLessonId === activeLesson.id && !force) {
      return;
    }

    const vocabList = activeLesson.vocab;
    const questions: QuizQuestion[] = [];

    // Form procedural questions:
    vocabList.forEach((item, idx) => {
      // Question Type 1: Hanzi -> Translation
      // Question Type 2: Pinyin -> Hanzi (or Hanzi -> Pinyin)
      // Pick random type
      const typeSeed = Math.random();

      if (typeSeed < 0.5) {
        // Type 1: Word to Meaning
        const incorrect = vocabList
          .filter((v) => v.id !== item.id)
          .map((v) => v.translation)
          .sort(() => 0.5 - Math.random())
          .slice(0, 3);
        const options = [item.translation, ...incorrect].sort(() => 0.5 - Math.random());

        questions.push({
          id: `q-${idx}-1`,
          type: "single-choice",
          questionText: `请选出 “${item.word}” 的正确意思 / What does it mean?`,
          options,
          correctAnswer: item.translation,
        });
      } else {
        // Type 2: Word to Pinyin
        const incorrect = vocabList
          .filter((v) => v.id !== item.id)
          .map((v) => v.pinyin)
          .sort(() => 0.5 - Math.random())
          .slice(0, 3);
        const options = [item.pinyin, ...incorrect].sort(() => 0.5 - Math.random());

        questions.push({
          id: `q-${idx}-2`,
          type: "single-choice",
          questionText: `请为 “${item.word}” 选出正确的拼音 / What is the Pinyin?`,
          options,
          correctAnswer: item.pinyin,
        });
      }
    });

    // Shuffle and cap at 10 requests max to avoid overwhelming students
    const randomizedQuestions = questions.sort(() => 0.5 - Math.random()).slice(0, 10);
    setChoiceQuestions(randomizedQuestions);
    setQuizLessonId(activeLesson.id);
    setCurrentChoiceIdx(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setChoiceQuizDone(false);
    setWrongAnswersList([]);
  };

  const submitChoiceAnswer = (option: string) => {
    if (isAnswerSubmitted) return;
    setSelectedAnswer(option);
    setIsAnswerSubmitted(true);

    const isCorrect = option === choiceQuestions[currentChoiceIdx].correctAnswer;
    if (isCorrect) {
      setScoreCoins((prev) => prev + 10);
    } else {
      setWrongAnswersList((prev) => [
        ...prev,
        {
          questionText: choiceQuestions[currentChoiceIdx].questionText,
          submittedAnswer: option,
          correctAnswer: choiceQuestions[currentChoiceIdx].correctAnswer || "",
        },
      ]);
    }
  };

  const submitQuizResults = async (finalWrongList: typeof wrongAnswersList) => {
    if (!currentUser || currentUser.role !== "student" || !activeLesson) return;
    try {
      const scorePercent = choiceQuestions.length > 0 
        ? Math.round(((choiceQuestions.length - finalWrongList.length) / choiceQuestions.length) * 100) 
        : 100;
      await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUser.username,
          submission: {
            lessonId: activeLesson.id,
            lessonTitle: activeLesson.title,
            score: scorePercent,
            totalQuestions: choiceQuestions.length,
            wrongAnswers: finalWrongList,
            status: "completed"
          }
        })
      });
      console.log("Submission successfully saved in Roster!");
    } catch (err: any) {
      console.warn("Failed to sync student scores:", err?.message || err);
    }
  };

  const handleNextChoice = () => {
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    if (currentChoiceIdx < choiceQuestions.length - 1) {
      setCurrentChoiceIdx((prev) => prev + 1);
    } else {
      setChoiceQuizDone(true);
      submitQuizResults(wrongAnswersList);
    }
  };

  return (
    <div id="vocabulary-section-box" className="space-y-6">
      {/* Lesson Selection top bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-2.5">
          <GraduationCap className="w-5.5 h-5.5 text-amber-500" />
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">选择课文进行生词练习 / Flashcards & Quizzes</h3>
            <p className="text-xs text-slate-500">Pick a dialogue lesson folder to load interactive quizzes</p>
          </div>
        </div>
        <select
          id="quiz-lesson-picker"
          value={selectedLessonId}
          onChange={(e) => setSelectedLessonId(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-slate-700 py-1.5 px-3 rounded-xl text-xs font-semibold focus:ring-amber-500 focus:border-amber-500 outline-none w-full md:w-[240px] cursor-pointer"
        >
          {lessons.map((l) => (
            <option key={l.id} value={l.id}>
              {translateChinese(l.title, chineseMode)}
            </option>
          ))}
        </select>
      </div>

      {activeLesson && activeLesson.vocab.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Practice Tabs (Flashcards / Match quiz / Multiple choice) */}
          <div className="lg:col-span-1 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col space-y-2">
            <span className="text-slate-400 font-mono text-[10px] font-bold uppercase tracking-wider px-2">
              Review Modules
            </span>
            <button
              id="tab-flashcards"
              onClick={() => setActiveTab("flashcards")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "flashcards"
                  ? "bg-amber-500/10 text-amber-800 border-l-4 border-amber-500"
                  : "hover:bg-slate-50 text-slate-600"
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0 text-amber-600" />
              <span>生词闪卡 / Flashcards</span>
            </button>

            <button
              id="tab-match"
              onClick={() => {
                setActiveTab("match-quiz");
                resetMatchingGame();
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "match-quiz"
                  ? "bg-amber-500/10 text-amber-800 border-l-4 border-amber-500"
                  : "hover:bg-slate-50 text-slate-600"
              }`}
            >
              <RefreshCw className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>生词连线题 / Match Pairs</span>
            </button>

            <button
              id="tab-choice"
              onClick={() => {
                setActiveTab("choice-quiz");
                resetChoiceQuiz();
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "choice-quiz"
                  ? "bg-amber-500/10 text-amber-800 border-l-4 border-amber-500"
                  : "hover:bg-slate-50 text-slate-600"
              }`}
            >
              <HelpCircle className="w-4 h-4 shrink-0 text-blue-600" />
              <span>单项选择题 / Scored Quiz</span>
            </button>
          </div>

          {/* Interactive Playground Workspace */}
          <div className="lg:col-span-3">
            {/* SCREEN 1: FLASHCARDS CAROUSEL */}
            {activeTab === "flashcards" && (
              <div className="flex flex-col items-center space-y-6">
                {/* Visual Flashcard Flip Frame */}
                <div
                  id="vocab-card-interactive-box"
                  onClick={() => setIsFlipped(!isFlipped)}
                  style={{ perspective: "1000px" }}
                  className="w-full max-w-[420px] h-[260px] cursor-pointer group select-none relative"
                >
                  <div
                    style={{ transformStyle: "preserve-3d" }}
                    className={`w-full h-full rounded-3xl relative duration-500 transition-transform ${
                      isFlipped ? "[transform:rotateY(180deg)]" : ""
                    }`}
                  >
                    {/* Front Face: Character Only */}
                    <div
                      style={{ backfaceVisibility: "hidden" }}
                      className="absolute inset-0 bg-white border border-slate-100 rounded-3xl shadow-md px-6 py-8 flex flex-col justify-between items-center text-center [transform:rotateY(0deg)]"
                    >
                      <div className="flex justify-between w-full text-slate-300">
                        <span className="text-[10px] font-mono tracking-wider font-bold">FRONT / 点击翻面</span>
                        <Volume2
                          className="w-5 h-5 text-amber-500 hover:scale-110 active:scale-95 transition-transform"
                          onClick={(e) => {
                            e.stopPropagation();
                            speakCurrentCard(activeLesson.vocab[currentCardIdx].word);
                          }}
                        />
                      </div>
                      <div className="my-auto flex flex-col items-center space-y-4">
                        {activeLesson.vocab[currentCardIdx].imageUrl && (
                          <img 
                            src={activeLesson.vocab[currentCardIdx].imageUrl} 
                            alt={activeLesson.vocab[currentCardIdx].word}
                            referrerPolicy="no-referrer"
                            className="w-24 h-24 object-cover rounded-2xl border border-slate-100 shadow-sm transition-transform duration-200 group-hover:scale-105"
                          />
                        )}
                        <span className="text-5xl font-black text-slate-800 tracking-tight">
                          {translateChinese(activeLesson.vocab[currentCardIdx].word, chineseMode)}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-medium bg-amber-50 border border-amber-100 px-3 py-1 rounded-full flex items-center space-x-1">
                        <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                        <span>{translateChinese("查看释义与例句", chineseMode)} (Click to Flip)</span>
                      </span>
                    </div>

                    {/* Back Face: Translations and Details */}
                    <div
                      style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                      className="absolute inset-0 bg-gradient-to-br from-amber-50/90 to-amber-100/10 border border-amber-100 rounded-3xl shadow-md p-6 flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-center text-slate-400">
                        <span className="text-[10px] font-mono tracking-wider font-bold">BACK / 点击翻面</span>
                        <Volume2
                          className="w-5 h-5 text-amber-600 cursor-pointer hover:scale-110"
                          onClick={(e) => {
                            e.stopPropagation();
                            speakCurrentCard(activeLesson.vocab[currentCardIdx].word);
                          }}
                        />
                      </div>

                      <div className="text-center my-auto space-y-2">
                        {activeLesson.vocab[currentCardIdx].imageUrl && (
                          <img 
                            src={activeLesson.vocab[currentCardIdx].imageUrl} 
                            alt={activeLesson.vocab[currentCardIdx].word}
                            referrerPolicy="no-referrer"
                            className="mx-auto w-12 h-12 object-cover rounded-xl border border-amber-200 shadow-sm mb-1"
                          />
                        )}
                        <span className="text-3xl font-black text-slate-800 block">
                          {translateChinese(activeLesson.vocab[currentCardIdx].word, chineseMode)}
                        </span>
                        <span className="text-sm font-mono font-bold text-amber-600 block uppercase tracking-wide">
                          {activeLesson.vocab[currentCardIdx].pinyin}
                        </span>
                        <p className="text-base text-slate-700 font-semibold max-w-[300px] mx-auto py-1.5 border-t border-b border-amber-200/40">
                          {activeLesson.vocab[currentCardIdx].translation}
                        </p>
                      </div>

                      {activeLesson.vocab[currentCardIdx].exampleCh ? (
                        <div className="bg-white/80 rounded-xl p-2.5 border border-amber-200/20 text-left">
                          <span className="text-[9px] font-bold text-amber-700 block uppercase font-mono tracking-wider">
                            Example Sentence / {translateChinese("例句", chineseMode)}
                          </span>
                          <p className="text-xs font-bold text-slate-700 mt-0.5">
                            {translateChinese(activeLesson.vocab[currentCardIdx].exampleCh, chineseMode)}
                          </p>
                          {activeLesson.vocab[currentCardIdx].exampleEn && (
                            <p className="text-[10px] text-slate-500 italic mt-0.5">
                              {activeLesson.vocab[currentCardIdx].exampleEn}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-center text-slate-400 italic">No example registered.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Controls Button Row */}
                <div className="flex items-center space-x-6">
                  <button
                    id="prev-flashcard-button"
                    onClick={handlePrevCard}
                    className="p-2.5 rounded-full bg-white shadow-sm border border-slate-100 hover:bg-slate-50 hover:text-amber-600 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <span className="text-xs text-slate-500 font-mono font-bold uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
                    {currentCardIdx + 1} / {activeLesson.vocab.length}
                  </span>

                  <button
                    id="next-flashcard-button"
                    onClick={handleNextCard}
                    className="p-2.5 rounded-full bg-white shadow-sm border border-slate-100 hover:bg-slate-50 hover:text-amber-600 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* SCREEN 2: SCRAMBLED MATCH CONNECT PUZZLE */}
            {activeTab === "match-quiz" && (
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-3">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                      <span>{translateChinese("生词智能配对游戏", chineseMode)}</span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.5 rounded font-mono">MATCHING</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      {matchMode === "pinyin"
                        ? translateChinese("点击左侧中文生词，再点击右侧对应汉语拼音消除它们", chineseMode)
                        : translateChinese("点击左侧中文生词，再点击右侧对应英文意思消除它们", chineseMode)
                      }
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 self-start sm:self-auto shrink-0">
                    <div className="inline-flex bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/50">
                      <button
                        type="button"
                        id="btn-match-mode-eng"
                        onClick={() => setMatchMode("translation")}
                        className={`px-3 py-1 text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                          matchMode === "translation"
                            ? "bg-white text-slate-800 shadow-3xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {translateChinese("汉字配英文", chineseMode)}
                      </button>
                      <button
                        type="button"
                        id="btn-match-mode-py"
                        onClick={() => setMatchMode("pinyin")}
                        className={`px-3 py-1 text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                          matchMode === "pinyin"
                            ? "bg-white text-slate-800 shadow-3xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {translateChinese("汉字配拼音", chineseMode)}
                      </button>
                    </div>

                    <button
                      type="button"
                      id="restart-matching-action"
                      onClick={resetMatchingGame}
                      className="flex items-center space-x-1 text-slate-500 hover:text-amber-600 text-[11px] font-extrabold px-2.5 py-1.5 bg-slate-50 border border-slate-100 rounded-lg hover:bg-amber-50 cursor-pointer transition-all"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>{translateChinese("重打乱", chineseMode)}</span>
                    </button>
                  </div>
                </div>

                {matchedCount === matchPairs.length ? (
                  <div className="py-12 flex flex-col justify-center items-center text-center">
                    <Trophy className="w-14 h-14 text-amber-500 animate-bounce" />
                    <h5 className="font-extrabold text-slate-800 text-base mt-4">{translateChinese("太棒了！全部配对成功！", chineseMode)}</h5>
                    <p className="text-xs text-slate-500 mt-1">{translateChinese("恭喜您完成这一轮的生词记忆挑战", chineseMode)}</p>
                    <button
                      id="rematch-win-action"
                      onClick={resetMatchingGame}
                      className="mt-5 px-5 py-2 hover:bg-amber-600 bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      再玩一次 / Match Again
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Left Hand: Chinese Hanzi Options */}
                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-400 font-black uppercase font-mono px-1 block text-center">
                        Hanzi / 汉字
                      </span>
                      {leftOptions.map((word) => {
                        const isMatched = matchPairs.find((p) => p.left === word)?.matched;
                        const isSelected = selectedLeft === word;
                        const isErr = mismatchedLeft === word;

                        return (
                          <button
                            id={`match-left-${word}`}
                            key={word}
                            disabled={isMatched}
                            onClick={() => handleLeftSelect(word)}
                            className={`w-full text-center py-4 rounded-xl text-sm font-semibold transition-all border outline-none cursor-pointer ${
                              isMatched
                                ? "bg-emerald-50 text-emerald-300 border-emerald-100 line-through opacity-40"
                                : isErr
                                ? "bg-red-50 text-red-700 border-red-200 animate-shake"
                                : isSelected
                                ? "bg-amber-500 text-white border-amber-600 shadow-md scale-98"
                                : "bg-slate-50 hover:bg-slate-100/80 text-slate-700 border-slate-100 hover:border-amber-300"
                            }`}
                          >
                            {word}
                          </button>
                        );
                      })}
                    </div>

                    {/* Right Hand: Choice Options */}
                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-400 font-black uppercase font-mono px-1 block text-center">
                        {matchMode === "pinyin" ? "Pinyin / 拼音" : "English / 英文"}
                      </span>
                      {rightOptions.map((trans) => {
                        const isMatched = matchPairs.find((p) => p.right === trans)?.matched;
                        const isSelected = selectedRight === trans;
                        const isErr = mismatchedRight === trans;

                        return (
                          <button
                            id={`match-right-${trans}`}
                            key={trans}
                            disabled={isMatched}
                            onClick={() => handleRightSelect(trans)}
                            className={`w-full text-center py-4 px-2 rounded-xl text-xs font-semibold transition-all border outline-none cursor-pointer ${
                              isMatched
                                ? "bg-emerald-50 text-emerald-300 border-emerald-100 line-through opacity-40"
                                : isErr
                                ? "bg-red-50 text-red-700 border-red-200 animate-shake"
                                : isSelected
                                ? "bg-amber-500 text-white border-amber-600 shadow-md scale-98"
                                : "bg-slate-50 hover:bg-slate-100/80 text-slate-700 border-slate-100 hover:border-amber-300"
                            }`}
                          >
                            {trans}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SCREEN 3: MULTIPLE CHOICE SCORED QUIZ */}
            {activeTab === "choice-quiz" && (
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm">{translateChinese("单选练习题", chineseMode)}</h4>
                    <p className="text-xs text-slate-500">{translateChinese("检测你这一课的拼音注音和词义理解能力", chineseMode)}</p>
                  </div>
                  <div className="flex items-center space-x-2 bg-amber-50 border border-amber-100 px-3 py-1 rounded-full text-amber-700 text-xs font-bold">
                    <Award className="w-3.5 h-3.5" />
                    <span>{translateChinese("得分", chineseMode)}: {scoreCoins} XP</span>
                  </div>
                </div>

                {choiceQuestions.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 italic text-xs">
                    本课生词量不足，无法生成单选题 (至少需要2个生词)
                  </div>
                ) : choiceQuizDone ? (
                  <div className="py-12 flex flex-col justify-center items-center text-center">
                    <Trophy className="w-14 h-14 text-amber-500 animate-bounce" />
                    <h5 className="font-extrabold text-slate-800 text-base mt-4">{translateChinese("挑战完成！你的总得分为", chineseMode)} {scoreCoins}</h5>
                    <p className="text-xs text-slate-500 mt-1">
                      {translateChinese("成功完成了", chineseMode)} {choiceQuestions.length} {translateChinese("道单项选择选择题练习", chineseMode)}
                    </p>
                    <button
                      id="restart-choice-win-action"
                      onClick={() => {
                        resetChoiceQuiz(true);
                        setScoreCoins(0);
                      }}
                      className="mt-5 px-5 py-2 hover:bg-amber-600 bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      重新挑战 / Retry Quiz
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Progress Indicator */}
                    <div className="flex justify-between items-center text-[10px] font-mono tracking-wider font-extrabold text-slate-400 uppercase">
                      <span>Question {currentChoiceIdx + 1} of {choiceQuestions.length}</span>
                      <span className="bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full font-bold">
                        PROGRESS: {Math.round(((currentChoiceIdx + 1) / choiceQuestions.length) * 100)}%
                      </span>
                    </div>

                    {/* Question Bubble text */}
                    <div className="bg-slate-50 p-4 font-bold text-slate-800 text-sm md:text-base rounded-2xl border border-slate-100">
                      {translateChinese(choiceQuestions[currentChoiceIdx].questionText, chineseMode)}
                    </div>

                    {/* Dynamic choices options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {choiceQuestions[currentChoiceIdx].options?.map((option, oIdx) => {
                        const isCorrectAnswer = option === choiceQuestions[currentChoiceIdx].correctAnswer;
                        const isSelected = selectedAnswer === option;

                        let cardStyle = "bg-slate-50 hover:bg-slate-100/80 text-slate-700 border-slate-100 hover:border-amber-300";
                        if (isAnswerSubmitted) {
                          if (isCorrectAnswer) {
                            cardStyle = "bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold";
                          } else if (isSelected) {
                            cardStyle = "bg-red-50 border border-red-300 text-red-800 font-bold";
                          } else {
                            cardStyle = "bg-slate-50 text-slate-400 border-slate-50 opacity-40";
                          }
                        }

                        return (
                          <button
                            id={`choice-option-${oIdx}`}
                            key={oIdx}
                            disabled={isAnswerSubmitted}
                            onClick={() => submitChoiceAnswer(option)}
                            className={`w-full text-left py-3.5 px-4 rounded-xl text-xs font-semibold border transition-all relative flex items-center justify-between ${cardStyle} ${
                              !isAnswerSubmitted ? "cursor-pointer" : ""
                            }`}
                          >
                            <span>{option}</span>
                            {isAnswerSubmitted && isCorrectAnswer && (
                              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                            )}
                            {isAnswerSubmitted && isSelected && !isCorrectAnswer && (
                              <XCircle className="w-4 h-4 text-red-600 shrink-0 ml-2" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Option Feedback / Exposes Explanation */}
                    {isAnswerSubmitted && (
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-4 border-t border-slate-50">
                        <div id="choice-answer-feedback">
                          {selectedAnswer === choiceQuestions[currentChoiceIdx].correctAnswer ? (
                            <p className="text-emerald-700 text-xs font-black flex items-center space-x-1">
                              <span>{translateChinese("🎉 回答正确！+10 XP", chineseMode)}</span>
                            </p>
                          ) : (
                            <p className="text-red-700 text-xs font-bold">
                              {translateChinese("❌ 答错了。正确答案是：“", chineseMode)}{translateChinese(choiceQuestions[currentChoiceIdx].correctAnswer || "", chineseMode)}”
                            </p>
                          )}
                        </div>
                        <button
                          id="proceed-next-choice"
                          onClick={handleNextChoice}
                          className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer shrink-0 text-center"
                        >
                          下一题 / Next Question
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-slate-100 flex flex-col justify-center items-center">
          <HelpCircle className="w-12 h-12 text-slate-300 animate-bounce" />
          <p className="mt-3 text-slate-500 text-sm font-medium">请先等教师端加入生词或者点击其他分类</p>
        </div>
      )}
    </div>
  );
}
