/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Award, BookOpen, CheckCircle, ChevronLeft, ChevronRight, RefreshCw, Send, Sparkles, Trophy, HelpCircle, GraduationCap, XCircle, FileText, Check } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Lesson, VocabItem, User, ChoiceQuestion, BlankQuestion, DialogueQuestion } from "../types";
import { translateChinese } from "../utils/chineseConverter";

interface AssignmentZoneProps {
  lessons: Lesson[];
  currentUser: User | null;
  chineseMode: "simplified" | "traditional";
}

export default function AssignmentZone({ lessons, currentUser, chineseMode }: AssignmentZoneProps) {
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  // Homework flow status: "landing" | "testing" | "submitted"
  const [flowStatus, setFlowStatus] = useState<"landing" | "testing" | "submitted">("landing");
  
  // Progress step: 0: Matching, 1: Single Choice, 2: Fill Blank, 3: Dialogue Complete
  const [currentStep, setCurrentStep] = useState<number>(0);

  // --- 1. Matching Game States ---
  const [matchPairs, setMatchPairs] = useState<{ left: string; right: string; matched: boolean }[]>([]);
  const [leftOptions, setLeftOptions] = useState<string[]>([]);
  const [rightOptions, setRightOptions] = useState<string[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matchedPairsList, setMatchedPairsList] = useState<{ left: string; right: string }[]>([]);
  const [matchingScore, setMatchingScore] = useState<number>(0);

  // --- 2. Multiple Choice States ---
  const [choiceQuestions, setChoiceQuestions] = useState<ChoiceQuestion[]>([]);
  const [choiceAnswers, setChoiceAnswers] = useState<Record<string, string>>({}); // questionId -> submittedOption
  const [qMatchingPairs, setQMatchingPairs] = useState<Record<string, { left: string; right: string }[]>>({});
  const [qMatchingSelectedLeft, setQMatchingSelectedLeft] = useState<Record<string, string>>({});

  // --- 3. Fill in Blanks States ---
  const [blankQuestions, setBlankQuestions] = useState<BlankQuestion[]>([]);
  const [blankAnswers, setBlankAnswers] = useState<Record<number, string>>({}); // index -> submitted text

  // --- 4. Dialogue Flow Completion States ---
  const [dialogueQuestions, setDialogueQuestions] = useState<DialogueQuestion[]>([]);
  const [dialogueAnswers, setDialogueAnswers] = useState<Record<number, string>>({}); // index -> submitted response option

  // Submission results
  const [submittedResponse, setSubmittedResponse] = useState<any>(null);
  const [isSubmittingToDB, setIsSubmittingToDB] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Sub-tabs: "assignment" (作业缴交) or "quiz" (测验)
  const [zoneSubTab, setZoneSubTab] = useState<"assignment" | "quiz">("assignment");

  // Custom Assignment Hand-in Workspace states
  const [essayText, setEssayText] = useState<string>("");
  const [attachmentFile, setAttachmentFile] = useState<{ name: string; size: number; base64?: string } | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [assignmentSubmitted, setAssignmentSubmitted] = useState<boolean>(false);

  // Initialize Lesson selection
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

  // Clean testing states on lesson shift
  useEffect(() => {
    setFlowStatus("landing");
    setCurrentStep(0);
    setSubmittedResponse(null);
    setErrorMessage("");
    setEssayText("");
    setAttachmentFile(null);
    setAssignmentSubmitted(false);
  }, [selectedLessonId]);

  // Generators for dynamic testing questions based on selected lesson
  const generateExercises = () => {
    if (!activeLesson) return;

    // A. Matching Setup
    const vocabs = activeLesson.vocab || [];
    const chosenVocabs = [...vocabs].sort(() => 0.5 - Math.random()).slice(0, 6);
    const pairs = chosenVocabs.map(v => ({
      left: v.word,
      right: v.translation,
      matched: false
    }));
    setMatchPairs(pairs);
    setLeftOptions(pairs.map(p => p.left).sort(() => 0.5 - Math.random()));
    setRightOptions(pairs.map(p => p.right).sort(() => 0.5 - Math.random()));
    setSelectedLeft(null);
    setSelectedRight(null);
    setMatchedPairsList([]);
    setMatchingScore(0);

    // B. Multiple Choice Setup
    setChoiceAnswers({});
    setQMatchingPairs({});
    setQMatchingSelectedLeft({});
    if (activeLesson.customChoices && activeLesson.customChoices.length > 0) {
      setChoiceQuestions(activeLesson.customChoices);
    } else {
      const generatedChoices: ChoiceQuestion[] = [];
      chosenVocabs.forEach((v, idx) => {
        // 55% generate Pinyin question, 45% English translation definition
        const isPinyinQ = Math.random() > 0.45;
        const otherVocabs = vocabs.filter(item => item.id !== v.id);

        if (isPinyinQ) {
          const wrongPinyins = otherVocabs.map(ov => ov.pinyin).slice(0, 3);
          while (wrongPinyins.length < 3) wrongPinyins.push(v.pinyin + "g"); // fallback
          const options = [...wrongPinyins, v.pinyin].sort(() => 0.5 - Math.random());
          generatedChoices.push({
            id: `choice-${idx}`,
            type: "pinyin",
            questionText: `请问汉字“${v.word}”对应的正确拼音是什么？`,
            correctAnswer: v.pinyin,
            options
          });
        } else {
          const wrongTrans = otherVocabs.map(ov => ov.translation).slice(0, 3);
          while (wrongTrans.length < 3) wrongTrans.push("to learn/study well"); 
          const options = [...wrongTrans, v.translation].sort(() => 0.5 - Math.random());
          generatedChoices.push({
            id: `choice-${idx}`,
            type: "translation",
            questionText: `请问生词“${v.word}”的意思是什么？`,
            correctAnswer: v.translation,
            options
          });
        }
      });
      setChoiceQuestions(generatedChoices);
    }
    setChoiceAnswers({});

    // C. Fill in the Blank Setup (using custom exampleCh of vocabulary with masked word)
    if (activeLesson.customBlanks && activeLesson.customBlanks.length > 0) {
      setBlankQuestions(activeLesson.customBlanks);
    } else {
      const generatedBlanks: BlankQuestion[] = [];
      vocabs.forEach(v => {
        if (v.exampleCh && v.exampleCh.includes(v.word)) {
          const sentenceWithBlank = v.exampleCh.replace(v.word, "________");
          generatedBlanks.push({
            vocabWord: v.word,
            sentenceWithBlank,
            correctAnswer: v.word,
            hintEn: v.exampleEn || v.translation
          });
        }
      });

      // Fallbacks if vocab does not have perfect self-referencing example sentences
      if (generatedBlanks.length === 0 && vocabs.length > 0) {
        vocabs.slice(0, 4).forEach(v => {
          generatedBlanks.push({
            vocabWord: v.word,
            sentenceWithBlank: `请写出对应的中文汉字拼写：“${v.pinyin}” (${v.translation}) -> ________`,
            correctAnswer: v.word,
            hintEn: v.exampleCh || "Type the exact characters"
          });
        });
      }
      setBlankQuestions(generatedBlanks.slice(0, 5));
    }
    setBlankAnswers({});

    // D. Dialogue Flow setup (using consecutive dialogue lines in the lesson!)
    if (activeLesson.customDialogues && activeLesson.customDialogues.length > 0) {
      setDialogueQuestions(activeLesson.customDialogues);
    } else {
      const generatedDialogues: DialogueQuestion[] = [];
      const lines = activeLesson.lines || [];
      for (let i = 0; i < lines.length - 1; i++) {
        const qLine = lines[i];
        const ansLine = lines[i + 1];
        
        // Distractors from other sentences or lessons
        const distractors = [
          "需要买单的时候叫我。",
          "我的名字叫大卫。",
          "我们在这家饭店点菜。",
          "老师好！我是新来的学生。"
        ].filter(d => d !== ansLine.character).slice(0, 3);

        const options = [...distractors, ansLine.character].sort(() => 0.5 - Math.random());

        generatedDialogues.push({
          previousLineCharacter: qLine.character,
          correctAnswerCharacter: ansLine.character,
          options
        });
      }
      setDialogueQuestions(generatedDialogues.slice(0, 3));
    }
    setDialogueAnswers({});

    // Lock status to active tests
    setFlowStatus("testing");
    setCurrentStep(0);
    setErrorMessage("");
  };

  // 1. MATCHING CARD SELECTION LOGIC
  const selectLeftMatch = (word: string) => {
    setSelectedLeft(word);
    if (selectedRight) {
      evaluateMatch(word, selectedRight);
    }
  };

  const selectRightMatch = (translation: string) => {
    setSelectedRight(translation);
    if (selectedLeft) {
      evaluateMatch(selectedLeft, translation);
    }
  };

  const evaluateMatch = (leftWord: string, rightTrans: string) => {
    const originalPair = matchPairs.find(p => p.left === leftWord && p.right === rightTrans);
    
    if (originalPair) {
      // Correct Match!
      setMatchPairs(prev => prev.map(p => p.left === leftWord ? { ...p, matched: true } : p));
      setMatchedPairsList(p => [...p, { left: leftWord, right: rightTrans }]);
      setMatchingScore(s => s + 1);
      setSelectedLeft(null);
      setSelectedRight(null);
    } else {
      // Incompatible. Clear selections with brief warning flash effect
      setSelectedLeft(null);
      setSelectedRight(null);
    }
  };

  // SUBMIT COMPREHENSIVE GRADES
  const finalizeSubmission = async () => {
    if (!currentUser) {
      setErrorMessage("请先在右上角登录您的学生账号，然后再提交作业");
      return;
    }
    if (currentUser.role !== "student") {
      setErrorMessage("只有学生账号（Student Role）可以提交作业成绩，教师不需要写作业！");
      return;
    }

    setIsSubmittingToDB(true);
    setErrorMessage("");

    try {
      // Compute correct counts across all four modes
      // 1. Matching correctness
      const finalMatchingCorrectCount = matchingScore;
      const totalMatchingQuestions = matchPairs.length || 1;

      // 2. Choice correctness
      let choiceCorrectCount = 0;
      const wrongChoiceList: any[] = [];
      choiceQuestions.forEach(q => {
        const ans = choiceAnswers[q.id];
        if (q.extendedType === "matching") {
          const studentPairs = qMatchingPairs[q.id] || [];
          const correctPairs = q.matchingPairs || [];
          if (studentPairs.length === correctPairs.length && studentPairs.length > 0) {
            const allMatch = studentPairs.every(sp => 
              correctPairs.some(cp => cp.left === sp.left && cp.right === sp.right)
            );
            if (allMatch) {
              choiceCorrectCount++;
            } else {
              wrongChoiceList.push({
                questionText: q.questionText,
                submittedAnswer: studentPairs.map(p => `${p.left} ↔ ${p.right}`).join(", ") || "(配对有误 / Incorrect Match)",
                correctAnswer: correctPairs.map(p => `${p.left} ↔ ${p.right}`).join(", ")
              });
            }
          } else {
            wrongChoiceList.push({
              questionText: q.questionText,
              submittedAnswer: studentPairs.map(p => `${p.left} ↔ ${p.right}`).join(", ") || "(未完成配对 / Incomplete)",
              correctAnswer: correctPairs.map(p => `${p.left} ↔ ${p.right}`).join(", ")
            });
          }
        } else {
          if (ans === q.correctAnswer) {
            choiceCorrectCount++;
          } else {
            wrongChoiceList.push({
              questionText: q.questionText,
              submittedAnswer: ans || "(未回答 / Unanswered)",
              correctAnswer: q.correctAnswer
            });
          }
        }
      });
      const totalChoiceQuestions = choiceQuestions.length || 1;

      // 3. Fill Blank correctness
      let blankCorrectCount = 0;
      const wrongBlankList: any[] = [];
      blankQuestions.forEach((q, idx) => {
        const submitted = (blankAnswers[idx] || "").trim();
        if (submitted === q.correctAnswer) {
          blankCorrectCount++;
        } else {
          wrongBlankList.push({
            questionText: `填句：${q.sentenceWithBlank}`,
            submittedAnswer: submitted || "(未填写 / Unanswered)",
            correctAnswer: q.correctAnswer
          });
        }
      });
      const totalBlankQuestions = blankQuestions.length || 1;

      // 4. Dialogue Flow correctness
      let dialogueCorrectCount = 0;
      const wrongDialogueList: any[] = [];
      dialogueQuestions.forEach((q, idx) => {
        const submitted = dialogueAnswers[idx];
        if (submitted === q.correctAnswerCharacter) {
          dialogueCorrectCount++;
        } else {
          wrongDialogueList.push({
            questionText: `接话: ${q.previousLineCharacter}`,
            submittedAnswer: submitted || "(未选择 / Unanswered)",
            correctAnswer: q.correctAnswerCharacter
          });
        }
      });
      const totalDialogueQuestions = dialogueQuestions.length || 1;

      // Calculate aggregated average score percent weights
      const matchScorePercent = (finalMatchingCorrectCount / totalMatchingQuestions) * 100;
      const choiceScorePercent = (choiceCorrectCount / totalChoiceQuestions) * 100;
      const blankScorePercent = (blankCorrectCount / totalBlankQuestions) * 100;
      const dialogueScorePercent = (dialogueCorrectCount / totalDialogueQuestions) * 100;

      const finalAggregatedScore = Math.round(
        (matchScorePercent + choiceScorePercent + blankScorePercent + dialogueScorePercent) / 4
      );

      // Collect all wrongs for teacher-side inspect dashboard
      const combinedWrongAnswers = [
        ...wrongChoiceList,
        ...wrongBlankList,
        ...wrongDialogueList
      ];

      // POST submission
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUser.username,
          submission: {
            lessonId: activeLesson?.id,
            lessonTitle: activeLesson?.title,
            score: finalAggregatedScore,
            totalQuestions: totalChoiceQuestions + totalBlankQuestions + totalDialogueQuestions,
            wrongAnswers: combinedWrongAnswers,
            status: "submitted"
          }
        })
      });

      if (!response.ok) {
        throw new Error("同步失败，请检查连线状态");
      }

      const resData = await response.json();
      setSubmittedResponse({
        score: finalAggregatedScore,
        wrongs: combinedWrongAnswers,
        matchingScorePercent: Math.round(matchScorePercent),
        choiceScorePercent: Math.round(choiceScorePercent),
        blankScorePercent: Math.round(blankScorePercent),
        dialogueScorePercent: Math.round(dialogueScorePercent)
      });
      setFlowStatus("submitted");
    } catch (err: any) {
      setErrorMessage(err.message || "提交异常，请稍后刷新重试");
    } finally {
      setIsSubmittingToDB(false);
    }
  };

  const handleAssignmentHandIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setErrorMessage("请先在右上角登录您的学生账号，然后再提交作业");
      return;
    }
    if (currentUser.role !== "student") {
      setErrorMessage("只有学生账号（Student Role）可以提交作业，教师不需要写作业！");
      return;
    }
    if (!essayText.trim() && !attachmentFile) {
      setErrorMessage("请先输入作业拼写文字，或拖拽/选择一张作业手抄、手写拍照图片上传");
      return;
    }

    setIsSubmittingToDB(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUser.username,
          submission: {
            lessonId: activeLesson?.id,
            lessonTitle: activeLesson?.title,
            score: 100, // completion score
            totalQuestions: 1,
            wrongAnswers: [],
            status: "submitted",
            submissionType: "assignment",
            textAnswer: essayText.trim(),
            fileName: attachmentFile?.name ?? undefined,
            fileUrl: attachmentFile?.base64 ?? undefined
          }
        })
      });

      if (!response.ok) {
        throw new Error("提交失败，微服务状态故障");
      }

      setAssignmentSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err.message || "提交异常，请检查连线状态后重试");
    } finally {
      setIsSubmittingToDB(false);
    }
  };

  return (
    <div id="assignment-module-box" className="space-y-6">
      {/* Lesson Selection Picker header bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center space-x-2">
            <FileText className="w-5 h-5 text-amber-500" />
            <span>作业缴交与小测验区 / Assignment submission Zone</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            本课测验包含生词配对、单选题、汉字填空及情境完成对话，全部完成后一键呈交作业至教师名单后台！
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-xs font-bold text-slate-500 font-mono">选择课文:</span>
          <select
            id="assignment-lesson-selector"
            value={selectedLessonId}
            onChange={(e) => setSelectedLessonId(e.target.value)}
            className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
          >
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {translateChinese(l.title, chineseMode)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeLesson == null ? (
        <div className="bg-white rounded-2xl p-12 text-center text-slate-400 font-bold text-sm">
          暂无课文，请先在管理员后台添加课程！
        </div>
      ) : (
        <>
          {/* Sub-tab selection */}
          <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-3xs max-w-md mx-auto">
            <button
              type="button"
              id="subtab-handin"
              onClick={() => setZoneSubTab("assignment")}
              className={`flex-1 py-2.5 text-center text-xs font-black transition-all rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer ${
                zoneSubTab === "assignment"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{translateChinese("作业缴交 / Homework Submit", chineseMode)}</span>
            </button>
            <button
              type="button"
              id="subtab-quizzes"
              onClick={() => {
                setZoneSubTab("quiz");
                setFlowStatus("landing");
              }}
              className={`flex-1 py-2.5 text-center text-xs font-black transition-all rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer ${
                zoneSubTab === "quiz"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>{translateChinese("课堂小测验 / Quizzes", chineseMode)}</span>
            </button>
          </div>

          {/* Render sub-tab content */}
          {zoneSubTab === "assignment" ? (
            /* Custom Written/File Assignment Workspace */
            <div id="assignment-handin-workspace" className="space-y-6 max-w-xl mx-auto pt-2">
              {errorMessage && (
                <div className="bg-red-50 text-red-700 border border-red-200 p-4 rounded-xl text-xs font-semibold">
                  {translateChinese(errorMessage, chineseMode)}
                </div>
              )}

              {assignmentSubmitted ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center py-12 space-y-5">
                  <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
                  <h3 className="text-xl font-extrabold text-slate-800">
                    {translateChinese("课后作业缴交成功！", chineseMode)}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {translateChinese("您的文字或手写图片作业已成功上传并归档至控制后台。王老师可以通过控制台查看您的成果并给予点评！", chineseMode)}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAssignmentSubmitted(false);
                      setEssayText("");
                      setAttachmentFile(null);
                    }}
                    className="px-6 py-2.5 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    再交一次作业 / Submit New Assignment
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAssignmentHandIn} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                  {/* Task Instructions */}
                  <div className="space-y-2 border-b border-slate-50 pb-4">
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 bg-amber-50 rounded-full text-[10px] font-black text-amber-800 border border-amber-100">
                      <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                      <span>{translateChinese("单元作业要求 / Assignment Instructions", chineseMode)}</span>
                    </span>
                    <h3 className="font-extrabold text-slate-800 text-sm">
                      【{translateChinese(activeLesson.title, chineseMode)}】{translateChinese("汉字手写、默写与短文创作", chineseMode)}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                      {translateChinese("请结合本单元所学，直接在下方输入一段拼写、短文或者造句练习（50字以上）。如果您完成了纸质手写作业，可以拍照并通过下方进行上传，王老师就可以在教师端看到你的杰作并打分点评哦！", chineseMode)}
                    </p>
                  </div>

                  {/* Text Input Area */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-extrabold text-slate-700 font-sans">
                      ✍️ {translateChinese("作业拼写/写作内容 (Type Assignment Text)", chineseMode)}
                    </label>
                    <textarea
                      rows={5}
                      className="w-full text-xs p-3.5 bg-slate-50 border border-slate-150 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-400 font-semibold text-slate-800 transition-all placeholder:text-slate-400"
                      placeholder={translateChinese("例：你好！我的名字叫小强，很高兴学习中文。大卫是我的好朋友，我们一起认识汉字...", chineseMode)}
                      value={essayText}
                      onChange={(e) => setEssayText(e.target.value)}
                    />
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono font-bold">
                      <span>{translateChinese("支持拼音及汉字输入（可结合生词和例句）", chineseMode)}</span>
                      <span>{essayText.length} {translateChinese("个字符", chineseMode)}</span>
                    </div>
                  </div>

                  {/* Drag and Drop File Uploader Zone */}
                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold text-slate-700 font-sans">
                      📸 {translateChinese("附件图片上传 (Attach Homework Photo)", chineseMode)}
                    </label>
                    
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOver(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            setAttachmentFile({
                              name: file.name,
                              size: file.size,
                              base64: reader.result as string
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      onClick={() => {
                        document.getElementById("assignment-file-picker")?.click();
                      }}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
                        isDragOver
                          ? "border-amber-400 bg-amber-50/50"
                          : "border-slate-200 hover:border-amber-400 hover:bg-slate-50/30"
                      }`}
                    >
                      <input
                        type="file"
                        id="assignment-file-picker"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              setAttachmentFile({
                                name: file.name,
                                size: file.size,
                                base64: reader.result as string
                              });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      
                      {attachmentFile ? (
                        <div className="relative w-full max-w-[200px] mx-auto group">
                          {attachmentFile.base64 && (
                            <img
                              src={attachmentFile.base64}
                              alt="Upload preview"
                              className="w-full h-24 object-cover rounded-xl border border-slate-150 shadow-3xs"
                            />
                          )}
                          <div className="mt-1 text-[10px] font-mono text-slate-500 truncate text-center font-bold">
                            {attachmentFile.name} ({(attachmentFile.size / 1024).toFixed(1)} KB)
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAttachmentFile(null);
                            }}
                            className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white p-1 rounded-full hover:bg-rose-600 shadow-xs cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                            <Send className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-extrabold text-slate-700">
                              {translateChinese("拖拽文件到此处，或点击浏览上传本地图片", chineseMode)}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                              {translateChinese("支持 PNG、JPG、JPEG 画质照片，方便老师核对纸张默写情况", chineseMode)}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Submit Button Row */}
                  <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                    <div>
                      {currentUser ? (
                        <p className="text-[10px] font-mono font-bold text-slate-400">
                          {translateChinese("提交账号", chineseMode)}: <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-black">{currentUser.name} ({currentUser.username})</span>
                        </p>
                      ) : (
                        <p className="text-[10px] text-rose-500 font-extrabold flex items-center space-x-1">
                          <XCircle className="w-3 h-3 shrink-0" />
                          <span>{translateChinese("未登录学生账号，将无法提交", chineseMode)}</span>
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingToDB || (!essayText.trim() && !attachmentFile) || !currentUser || currentUser.role !== "student"}
                      className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-100 disabled:text-slate-400 text-white font-black rounded-xl text-xs flex items-center space-x-1.5 shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer"
                    >
                      {isSubmittingToDB ? (
                        <span>{translateChinese("提交中...", chineseMode)}</span>
                      ) : (
                        <>
                          <span>{translateChinese("确认提交手抄/短文作业", chineseMode)}</span>
                          <Send className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* Quiz / Lesson Quizzes sub-tab */
            (() => {
              const quizPublished = activeLesson?.quizPublished || false;
              if (!quizPublished) {
                return (
                  <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center max-w-lg mx-auto py-12 space-y-4 pt-2 mt-4">
                    <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                      <HelpCircle className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="space-y-1.5 max-w-sm mx-auto">
                      <h4 className="font-extrabold text-slate-800 text-sm">
                        🔒 【{translateChinese(activeLesson.title, chineseMode)}】{translateChinese("小测验暂未上传开放", chineseMode)}
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                        {translateChinese("王老师正在为此单元编制及调整自定义测试题。一旦老师点击「上传发布当前测验」，您就可以在此开始您的答题挑战了。请稍作等待，先选择其他单元或者前往「生词拼读」大显身手吧！", chineseMode)}
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                flowStatus === "landing" ? (
                  /* Landing Welcome Screen */
                  <div id="assignment-landing-card" className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center max-w-xl mx-auto space-y-6 py-12">
          <GraduationCap className="w-16 h-16 text-amber-500 mx-auto animate-bounce mt-2" />
          <div className="space-y-1.5">
            <span className="bg-amber-100/60 text-amber-800 text-[10px] uppercase font-mono px-3 py-1 rounded-full font-black tracking-widest">
              Ready to Practice
            </span>
            <h3 className="text-xl font-extrabold text-slate-800">
              【{translateChinese(activeLesson.title, chineseMode)}】单元作业小测试
            </h3>
            <p className="text-xs text-slate-400">
              测试将评估您的生词短语、拼写、例句和现实中对话接话理解能力。答题记录将存档供王老师评价。
            </p>
          </div>

          <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100/80 text-left space-y-3">
            <h4 className="text-xs font-black text-slate-700 tracking-wider block">✍️ 测试结构 / Homework blueprint:</h4>
            <ul className="text-xs font-medium text-slate-500 space-y-2 leading-relaxed">
              <li className="flex items-center space-x-1.5">
                <Check className="w-3.5 h-3.5 text-amber-500" />
                <span>1. 生词意思及拼写配对 (Word Pairing MATCH)</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <Check className="w-3.5 h-3.5 text-amber-500" />
                <span>2. 单项选择辨识测试 (Phonetic Multiple-choice)</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <Check className="w-3.5 h-3.5 text-amber-500" />
                <span>3. 课文例句生词填空 (Contextual Character Gap-fill)</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <Check className="w-3.5 h-3.5 text-amber-500" />
                <span>4. 情境对话接话完成 (Interactive Dialogue flow)</span>
              </li>
            </ul>
          </div>

          {currentUser ? (
            <div className="space-y-3">
              <button
                id="start-homework-challenge-btn"
                onClick={generateExercises}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-6 rounded-xl text-xs sm:text-sm tracking-wide shadow-md shadow-amber-500/20 active:scale-95 transition-all pointer-cursor cursor-pointer"
              >
                开始练习写作业 / Start Homework Now
              </button>
              <p className="text-[10px] text-slate-400 font-mono font-bold">
                当前登录学号: <span className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-extrabold">{currentUser.username}</span>
              </p>
            </div>
          ) : (
            <div className="bg-rose-50 text-rose-800 border border-rose-100 p-4 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2">
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>注意：您当前处于“自修自测游客模式”。请在右上角登录您的【学生账号】来获取作业缴交提交权限。</span>
            </div>
          )}
        </div>
      ) : flowStatus === "testing" ? (
        /* Questionnaire Testing stepper container */
        <div id="assignment-testing-flow" className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Step Tracker */}
          <div className="lg:col-span-1 bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col space-y-2 h-fit">
            <span className="text-[10px] font-bold text-slate-400 font-mono tracking-widest block pb-1 border-b border-slate-50 uppercase">
              Section PROGRESS
            </span>
            {[
              { label: "1. 词义配对 (Paring Match)", percentage: "25%" },
              { label: "2. 单项选择 (Multichoice)", percentage: "50%" },
              { label: "3. 句意填空 (Gap Filling)", percentage: "75%" },
              { label: "4. 完成对话 (Dialogue Flow)", percentage: "100%" }
            ].map((step, sIdx) => (
              <div
                key={sIdx}
                className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold transition-all ${
                  currentStep === sIdx
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : sIdx < currentStep
                    ? "bg-slate-50 text-emerald-700 border-slate-100"
                    : "bg-white text-slate-400 border-transparent"
                }`}
              >
                <span>{translateChinese(step.label, chineseMode)}</span>
                <span className="text-[9px] font-mono opacity-80">{step.percentage}</span>
              </div>
            ))}
          </div>

          {/* Stepper Active Area Cards */}
          <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            
            {/* STEP 0: MATCHING */}
            {currentStep === 0 && (
              <div id="quiz-step-matching" className="space-y-5">
                <div className="pb-2.5 border-b border-emerald-50">
                  <h4 className="font-extrabold text-slate-800 text-sm">第一阶段：生词意思消消乐配对</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    点击左侧中文词汇，再点击右侧对应的英文字意思来配对。配对正确后它们将变为绿色配对。
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Left Column Chinese */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 block tracking-wider font-mono">CHINESE CHARACTERS</span>
                    {leftOptions.map((opt, oIdx) => {
                      const isMatched = matchedPairsList.some(p => p.left === opt);
                      const isSelected = selectedLeft === opt;
                      return (
                        <button
                          key={oIdx}
                          onClick={() => !isMatched && selectLeftMatch(opt)}
                          disabled={isMatched}
                          className={`w-full p-3 font-extrabold text-xs sm:text-sm rounded-xl text-center border transition-all truncate cursor-pointer pointer-cursor ${
                            isMatched
                              ? "bg-emerald-50 text-emerald-700 border-emerald-150 line-through opacity-70"
                              : isSelected
                              ? "bg-amber-500 text-white border-amber-500 shadow-sm animate-pulse"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-100"
                          }`}
                        >
                          {translateChinese(opt, chineseMode)}
                        </button>
                      );
                    })}
                  </div>

                  {/* Right Column Translation */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 block tracking-wider font-mono">ENGLISH DEFINITIONS</span>
                    {rightOptions.map((opt, oIdx) => {
                      const isMatched = matchedPairsList.some(p => p.right === opt);
                      const isSelected = selectedRight === opt;
                      return (
                        <button
                          key={oIdx}
                          onClick={() => !isMatched && selectRightMatch(opt)}
                          disabled={isMatched}
                          className={`w-full p-3 font-semibold text-xs rounded-xl text-center border transition-all truncate cursor-pointer pointer-cursor ${
                            isMatched
                              ? "bg-emerald-50 text-emerald-700 border-emerald-150 line-through opacity-70"
                              : isSelected
                              ? "bg-amber-500 text-white border-amber-500 shadow-sm animate-pulse"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-100"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-100/50 rounded-xl flex justify-between items-center text-xs font-extrabold text-amber-800">
                  <span>已成功配对（Matched Progress）: {matchingScore} / {matchPairs.length}</span>
                  {matchingScore === matchPairs.length && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-black animate-bounce flex items-center space-x-1">
                      <span>✓ 全部配对完成！</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* STEP 1: COMPREHENSIVE CHALLENGES (CHOICE, TF, WORD BANK, MATCHING) */}
            {currentStep === 1 && (
              <div id="quiz-step-choice" className="space-y-5">
                <div className="pb-2.5 border-b border-slate-50 flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm">第二阶段：综合应用与智能连线测验</h4>
                    <p className="text-xs text-slate-500 mt-1">包含单选题、判断题、选词填空与中英匹配组合。仔细读图和选项进行作答。</p>
                  </div>
                  <span className="text-[10px] bg-amber-500 text-white font-extrabold px-2.5 py-1 rounded-full font-mono animate-pulse">STAGE 2</span>
                </div>

                <div className="space-y-6">
                  {choiceQuestions.map((q, idx) => {
                    const chosen = choiceAnswers[q.id];
                    return (
                      <div key={q.id} className="bg-slate-50/50 p-4.5 rounded-2xl border border-slate-100 space-y-3.5 text-left transition-all">
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-slate-800 font-extrabold text-xs sm:text-xs">
                            {idx + 1}. <span className="bg-amber-100 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded-md font-extrabold text-[9px] uppercase tracking-wider mr-1.5">
                              {q.extendedType === "true-false" ? "判断对错" : q.extendedType === "matching" ? "趣味连线" : q.extendedType === "word-bank" ? "选词填空" : "单项选择"}
                            </span>
                            {q.questionText}
                          </p>
                        </div>

                        {/* Question Stem Image */}
                        {q.questionImage && (
                          <div className="my-2 max-w-[240px] border border-slate-100 rounded-xl overflow-hidden shadow-sm bg-white p-1">
                            <img 
                              src={q.questionImage} 
                              alt="Question Stem Illustration" 
                              referrerPolicy="no-referrer"
                              className="w-full h-auto max-h-[160px] object-cover rounded-lg" 
                            />
                          </div>
                        )}

                        {/* RENDER ACCORDING TO TYPE */}
                        {q.extendedType === "matching" ? (
                          <div className="space-y-3 bg-white p-3 rounded-xl border border-slate-200/50">
                            <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg text-[10px] text-slate-500 font-bold">
                              <span>🔗 互动配对连线区域</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setQMatchingPairs(prev => ({ ...prev, [q.id]: [] }));
                                  setQMatchingSelectedLeft(prev => ({ ...prev, [q.id]: "" }));
                                  setChoiceAnswers(prev => ({ ...prev, [q.id]: "" }));
                                }}
                                className="text-red-500 hover:text-red-700 bg-red-50 border border-red-100/50 px-2 py-0.5 rounded cursor-pointer text-[9px]"
                              >
                                重置配对 ✕
                              </button>
                            </div>

                            {/* Current Matched Pairs lists */}
                            {((qMatchingPairs[q.id] || []).length > 0) && (
                              <div className="flex flex-wrap gap-1.5 p-1.5 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                                {(qMatchingPairs[q.id] || []).map((pair, pIdx) => (
                                  <span key={pIdx} className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                                    {pair.left} ↔ {pair.right}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Selectable matching lists */}
                            <div className="grid grid-cols-2 gap-4">
                              {/* Left items column */}
                              <div className="space-y-1.5">
                                <span className="text-[9px] font-black text-slate-400 block mb-1">左侧项目 Group A</span>
                                {(q.matchingPairs || []).map((pair) => {
                                  const isAssigned = (qMatchingPairs[q.id] || []).some(p => p.left === pair.left);
                                  const isSelected = qMatchingSelectedLeft[q.id] === pair.left;
                                  return (
                                    <button
                                      key={pair.left}
                                      type="button"
                                      disabled={isAssigned}
                                      onClick={() => setQMatchingSelectedLeft(prev => ({ ...prev, [q.id]: pair.left }))}
                                      className={`w-full p-2 text-xs text-left rounded-lg border transition-all cursor-pointer font-bold ${
                                        isAssigned
                                          ? "bg-slate-100 text-slate-400 border-transparent cursor-not-allowed line-through"
                                          : isSelected
                                          ? "bg-amber-100 border-amber-400 text-amber-800 scale-102 font-extrabold shadow-sm"
                                          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:scale-101"
                                      }`}
                                    >
                                      {pair.left}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Right items column */}
                              <div className="space-y-1.5">
                                <span className="text-[9px] font-black text-slate-400 block mb-1">右侧项目 Group B</span>
                                {(q.matchingPairs || []).map((pair) => {
                                  const isAssigned = (qMatchingPairs[q.id] || []).some(p => p.right === pair.right);
                                  const activeLeft = qMatchingSelectedLeft[q.id];
                                  return (
                                    <button
                                      key={pair.right}
                                      type="button"
                                      disabled={isAssigned || !activeLeft}
                                      onClick={() => {
                                        if (!activeLeft) return;
                                        const oldPairs = qMatchingPairs[q.id] || [];
                                        const newPairs = [...oldPairs, { left: activeLeft, right: pair.right }];
                                        setQMatchingPairs(prev => ({ ...prev, [q.id]: newPairs }));
                                        setQMatchingSelectedLeft(prev => ({ ...prev, [q.id]: "" }));
                                        // Once fully matched, mark the question as complete
                                        if (newPairs.length === (q.matchingPairs || []).length) {
                                          setChoiceAnswers(prev => ({ ...prev, [q.id]: "Completed matching" }));
                                        }
                                      }}
                                      className={`w-full p-2 text-xs text-left rounded-lg border transition-all font-bold ${
                                        isAssigned
                                          ? "bg-slate-100 text-slate-400 border-transparent cursor-not-allowed line-through"
                                          : activeLeft
                                          ? "bg-white hover:bg-amber-50 border-amber-300 text-slate-700 hover:scale-101 cursor-pointer animate-pulse"
                                          : "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed"
                                      }`}
                                    >
                                      {pair.right}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ) : q.extendedType === "true-false" ? (
                          <div className="flex space-x-3 mt-2">
                            {q.options.map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setChoiceAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                className={`flex-1 p-3 text-center text-xs rounded-xl border font-extrabold transition-all cursor-pointer ${
                                  chosen === opt
                                    ? "bg-amber-500 text-white border-amber-500 shadow-md font-black"
                                    : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        ) : (
                          // CHOICE OR WORD-BANK QUESTION LAYOUT with Option Images support
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {q.options.map((opt, oIdx) => {
                              const optImage = q.optionImages?.[oIdx];
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setChoiceAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                  className={`p-3 text-xs rounded-xl text-left border flex items-center space-x-3 transition-all cursor-pointer ${
                                    chosen === opt
                                      ? "bg-amber-500 text-white border-amber-500 font-bold shadow-md"
                                      : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                                  }`}
                                >
                                  {optImage && (
                                    <img 
                                      src={optImage} 
                                      alt="option illustration" 
                                      referrerPolicy="no-referrer"
                                      className="w-12 h-12 object-cover rounded-lg border border-slate-200/50 flex-shrink-0 bg-slate-50" 
                                    />
                                  )}
                                  <div className="font-semibold">{opt}</div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: FILL IN THE BLANK */}
            {currentStep === 2 && (
              <div id="quiz-step-gapfilling" className="space-y-5">
                <div className="pb-2.5 border-b border-slate-50">
                  <h4 className="font-extrabold text-slate-800 text-sm">第三阶段：情境句意生词拼写填空</h4>
                  <p className="text-xs text-slate-500 mt-1">仔细阅读上下文和英文提示，并在输入框中打字书写填入正确的【中文汉字】（Simplified/Traditional均可）。</p>
                </div>

                <div className="space-y-5">
                  {blankQuestions.map((q, idx) => {
                    const value = blankAnswers[idx] || "";
                    return (
                      <div key={idx} className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3 text-left">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400 font-mono">QUESTION {idx + 1}</span>
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-mono font-bold">Hint Meaning: {q.hintEn}</span>
                        </div>
                        <div className="text-slate-800 font-black text-sm py-2">
                          {translateChinese(q.sentenceWithBlank, chineseMode)}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-500 font-mono shrink-0">输入汉字回答:</span>
                          <input
                            type="text"
                            placeholder="在此输入中文..."
                            value={value}
                            onChange={(e) => setBlankAnswers(prev => ({ ...prev, [idx]: e.target.value }))}
                            className="flex-1 bg-white border border-slate-150 rounded-lg py-1.5 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 3: DIALOGUE COMPLETE */}
            {currentStep === 3 && (
              <div id="quiz-step-dialogue" className="space-y-5">
                <div className="pb-2.5 border-b border-slate-50">
                  <h4 className="font-extrabold text-slate-800 text-sm">第四阶段：课文对话接话理解完成</h4>
                  <p className="text-xs text-slate-500 mt-1">根据说话人A的前言和情境角色交互，为说话人B选择最合逻辑、最诚挚通顺的下一句中文对话响应。</p>
                </div>

                <div className="space-y-5">
                  {dialogueQuestions.length === 0 ? (
                    <div className="text-slate-400 italic text-xs py-4 text-center">本节课句数太少，无充足对话上下文，可以直接进行提交。</div>
                  ) : (
                    dialogueQuestions.map((q, idx) => {
                      const selected = dialogueAnswers[idx];
                      return (
                        <div key={idx} className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3.5 text-left text-xs">
                          <div className="flex items-center space-x-2 font-bold">
                            <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded uppercase font-mono tracking-wider">对话人 A:</span>
                            <span className="text-slate-800 text-sm font-extrabold">“ {translateChinese(q.previousLineCharacter, chineseMode)} ”</span>
                          </div>

                          <div className="text-slate-400 font-mono tracking-wide">
                            对话人 B 接话: ____________________ (请在下方选择最合适的一句)
                          </div>

                          <div className="grid grid-cols-1 gap-2 pl-3">
                            {q.options.map((opt) => (
                              <button
                                key={opt}
                                onClick={() => setDialogueAnswers(prev => ({ ...prev, [idx]: opt }))}
                                className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                                  selected === opt
                                    ? "bg-amber-500 text-white border-amber-500 font-bold"
                                    : "bg-white hover:bg-slate-50 text-slate-600 border-slate-105"
                                }`}
                              >
                                {translateChinese(opt, chineseMode)}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {errorMessage && (
                  <div className="bg-rose-50 text-rose-800 p-3.5 rounded-xl border border-rose-100 text-xs font-semibold">
                    ⚠️ {errorMessage}
                  </div>
                )}
              </div>
            )}

            {/* Stepper Footer Controls */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-50">
              <button
                id="assignment-prev-step-btn"
                onClick={() => currentStep > 0 && setCurrentStep(currentStep - 1)}
                disabled={currentStep === 0}
                className="flex items-center space-x-1 hover:bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-30 cursor-pointer pointer-cursor bg-transparent"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>上一阶段 / Previous</span>
              </button>

              {currentStep < 3 ? (
                <button
                  id="assignment-next-step-btn"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="flex items-center space-x-1 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm shadow-amber-500/10 cursor-pointer pointer-cursor"
                >
                  <span>下一阶段 / Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  id="assignment-finish-submit-btn"
                  onClick={finalizeSubmission}
                  disabled={isSubmittingToDB}
                  className="flex items-center space-x-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs sm:text-xs font-black shadow-md shadow-emerald-500/10 cursor-pointer pointer-cursor disabled:opacity-50"
                >
                  {isSubmittingToDB ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>呈交中 / Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>一键交作业 / Submit Homework</span>
                    </>
                  )}
                </button>
              )}
            </div>

          </div>
        </div>
      ) : (
        /* Submission Outcome Page with Score Board and Grade Details */
        <div id="assignment-submitted-success" className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm text-center max-w-2xl mx-auto space-y-6">
          <Trophy className="w-14 h-14 text-amber-500 mx-auto animate-bounce mt-2" />
          
          <div className="space-y-1.5">
            <span className="bg-emerald-100 text-emerald-800 text-[10px] uppercase font-mono px-3 py-1 rounded-full font-black tracking-widest">
              Successfully Submitted
            </span>
            <h3 className="text-xl font-extrabold text-slate-800">
              本单元课后作业小测验缴交成功！
            </h3>
            <p className="text-xs text-slate-400">
              作业已成功归档到 【{translateChinese(activeLesson.title, chineseMode)}】 栏目，王老师可从控制台查看。
            </p>
          </div>

          {/* Metric Dashboard score gauge count */}
          {submittedResponse && (
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-150/50 space-y-4">
              <div className="flex flex-col items-center justify-center space-y-1">
                <span className="text-[10px] text-slate-400 font-mono tracking-wider block uppercase">FINAL SCORING CARD</span>
                <span className="text-4xl font-black text-amber-600">{submittedResponse.score} %</span>
                <span className="text-slate-500 text-xs font-bold">综合评级: {
                  submittedResponse.score >= 90 ? "优秀 (Grade A)" :
                  submittedResponse.score >= 75 ? "良好 (Grade B)" :
                  submittedResponse.score >= 60 ? "及格 (Grade C)" : "需要再复习 (Needs Practice)"
                }</span>
              </div>

              {/* Individual Section Score breakup meters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold pt-4 border-t border-slate-205/60 text-slate-500">
                <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-mono">1. 生词配对</p>
                  <p className="text-slate-800 font-extrabold mt-1">{submittedResponse.matchingScorePercent}%</p>
                </div>
                <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-mono">2. 单选识别</p>
                  <p className="text-slate-800 font-extrabold mt-1">{submittedResponse.choiceScorePercent}%</p>
                </div>
                <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-mono">3. 例句填空</p>
                  <p className="text-slate-800 font-extrabold mt-1">{submittedResponse.blankScorePercent}%</p>
                </div>
                <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-mono">4. 对话接话</p>
                  <p className="text-slate-800 font-extrabold mt-1">{submittedResponse.dialogueScorePercent}%</p>
                </div>
              </div>
            </div>
          )}

          {submittedResponse && submittedResponse.wrongs?.length > 0 ? (
            <div className="text-left space-y-3 p-4 bg-rose-50/50 border border-rose-100 rounded-2xl">
              <span className="text-slate-700 font-black text-xs block font-mono">📝 错题自测及纠正建议 (Wrong answers log):</span>
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {submittedResponse.wrongs.map((w: any, wIdx: number) => (
                  <div key={wIdx} className="bg-white p-3 rounded-xl border border-slate-100 text-xs">
                    <p className="text-slate-800 font-bold">题干: {w.questionText}</p>
                    <div className="grid grid-cols-2 gap-4 mt-2 font-bold leading-normal">
                      <span className="text-red-600 bg-red-50 p-1.5 rounded truncate text-center">
                        您的回答: {translateChinese(w.submittedAnswer, chineseMode)}
                      </span>
                      <span className="text-emerald-700 bg-emerald-50 p-1.5 rounded truncate text-center">
                        正确答案: {translateChinese(w.correctAnswer, chineseMode)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-150 text-xs font-semibold">
              🎉 太了不起了！本次作业全部答对，满分完成！继续保持哦！
            </div>
          )}

          <div className="pt-2">
            <button
              id="assignment-retake-btn"
              onClick={() => {
                setFlowStatus("landing");
                setSubmittedResponse(null);
              }}
              className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              再写一次作业 / Try Homework Again
            </button>
          </div>
        </div>
              )
            );
          })()
        )}
      </>
    )}
    </div>
  );
}
