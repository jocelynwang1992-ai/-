/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BookOpen, Edit, FileText, Languages, Plus, Save, Trash2, UserPlus, Users, X, AlertCircle, ChevronDown, ChevronUp, Award, HelpCircle, Eye } from "lucide-react";
import React, { useState } from "react";
import { Lesson, User, VocabItem, TextLine, ChoiceQuestion, BlankQuestion, DialogueQuestion } from "../types";
import { translateChinese } from "../utils/chineseConverter";
import ImageUploadWidget from "./ImageUploadWidget";

interface TeacherDashboardProps {
  lessons: Lesson[];
  users: User[];
  onRefreshAllData: () => void;
  chineseMode: "simplified" | "traditional";
}

export default function TeacherDashboard({ lessons, users, onRefreshAllData, chineseMode }: TeacherDashboardProps) {
  // Navigation tabs of administrator dashboard: "lessons" | "students" | "quizzes"
  const [adminTab, setAdminTab] = useState<"lessons" | "students" | "quizzes">("lessons");

  // --- CUSTOM POPUP/CONFIRMATION MODAL STATE ---
  const [customConfirm, setCustomConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isAlert?: boolean; // True if it's just an informative alert with an OK button
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    isAlert: false,
    onConfirm: () => {},
  });

  // 4. MANUAL QUIZZES STATES
  const [selectedQuizLessonId, setSelectedQuizLessonId] = useState<string>("");
  // Choice form input fields
  const [choiceQText, setChoiceQText] = useState("");
  const [choiceCorrect, setChoiceCorrect] = useState("");
  const [choiceOpt1, setChoiceOpt1] = useState("");
  const [choiceOpt2, setChoiceOpt2] = useState("");
  const [choiceOpt3, setChoiceOpt3] = useState("");
  const [choiceOpt4, setChoiceOpt4] = useState("");

  const [currChoiceType, setCurrChoiceType] = useState<"choice" | "matching" | "word-bank" | "true-false">("choice");
  const [choiceQImage, setChoiceQImage] = useState("");
  const [choiceOptImg1, setChoiceOptImg1] = useState("");
  const [choiceOptImg2, setChoiceOptImg2] = useState("");
  const [choiceOptImg3, setChoiceOptImg3] = useState("");
  const [choiceOptImg4, setChoiceOptImg4] = useState("");

  // Matching questions state fields
  const [matchLeft1, setMatchLeft1] = useState("");
  const [matchRight1, setMatchRight1] = useState("");
  const [matchLeft2, setMatchLeft2] = useState("");
  const [matchRight2, setMatchRight2] = useState("");
  const [matchLeft3, setMatchLeft3] = useState("");
  const [matchRight3, setMatchRight3] = useState("");
  const [matchLeft4, setMatchLeft4] = useState("");
  const [matchRight4, setMatchRight4] = useState("");

  // Blank form input fields
  const [blankSentence, setBlankSentence] = useState("");
  const [blankCorrect, setBlankCorrect] = useState("");
  const [blankHintEn, setBlankHintEn] = useState("");

  // Dialogue flow answers
  const [dialoguePrevLine, setDialoguePrevLine] = useState("");
  const [dialogueCorrect, setDialogueCorrect] = useState("");
  const [dialogueOpt1, setDialogueOpt1] = useState("");
  const [dialogueOpt2, setDialogueOpt2] = useState("");
  const [dialogueOpt3, setDialogueOpt3] = useState("");
  const [dialogueOpt4, setDialogueOpt4] = useState("");

  // Keep selected quiz lesson ID loaded
  React.useEffect(() => {
    if (lessons.length > 0 && !selectedQuizLessonId) {
      setSelectedQuizLessonId(lessons[0].id);
    }
  }, [lessons, selectedQuizLessonId]);

  // Expanded student learning logs state
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [revealPasswords, setRevealPasswords] = useState<Record<string, boolean>>({});

  // Selection of active lesson to edit
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);

  // Error notifications
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. ADD / EDIT LESSON STATES
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [lessonFormId, setLessonFormId] = useState<string | null>(null); // Null to Create, non-null to Update
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonPinyin, setLessonPinyin] = useState("");
  const [lessonDesc, setLessonDesc] = useState("");
  const [lessonImage, setLessonImage] = useState("");
  const [lessonType, setLessonType] = useState<"dialogue" | "prose">("dialogue");

  // Dialogue Line array state
  const [lessonLines, setLessonLines] = useState<TextLine[]>([]);
  const [openImageUploaderIdx, setOpenImageUploaderIdx] = useState<number | null>(null);

  const getParagraphLabel = (idx: number) => {
    const chineseNums = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十"];
    const num = idx + 1;
    if (num <= 20) {
      return `第${chineseNums[num]}段`;
    }
    return `第 ${num} 段`;
  };

  // 2. VOCAB EDITION STATES
  const [showVocabModal, setShowVocabModal] = useState(false);
  const [currVocabLessonId, setCurrVocabLessonId] = useState<string>("");
  const [vocabFormId, setVocabFormId] = useState<string | null>(null); // Null to Create
  const [vocabWord, setVocabWord] = useState("");
  const [vocabPinyin, setVocabPinyin] = useState("");
  const [vocabTrans, setVocabTrans] = useState("");
  const [vocabExCh, setVocabExCh] = useState("");
  const [vocabExPy, setVocabExPy] = useState("");
  const [vocabExEn, setVocabExEn] = useState("");
  const [vocabImage, setVocabImage] = useState("");

  // 3. STUDENT REGISTRATION STATES
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [studentUsername, setStudentUsername] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentPassword, setStudentPassword] = useState("");

  // Clear states
  const resetNotifications = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // --- ACTIONS FOR LESSONS ---
  const triggerNewLessonModal = () => {
    resetNotifications();
    setLessonFormId(null);
    setLessonTitle("");
    setLessonPinyin("");
    setLessonDesc("");
    setLessonImage("");
    setLessonType("dialogue");
    setLessonLines([
      { character: "老师，你好！", pinyin: "Lǎoshī, nǐ hǎo!", translation: "Teacher, hello!" }
    ]);
    setOpenImageUploaderIdx(null);
    setShowLessonModal(true);
  };

  const triggerEditLessonModal = (lesson: Lesson) => {
    resetNotifications();
    setLessonFormId(lesson.id);
    setLessonTitle(lesson.title);
    setLessonPinyin(lesson.pinyinTitle);
    setLessonDesc(lesson.description);
    setLessonImage(lesson.imageUrl || "");
    setLessonType(lesson.lessonType || "dialogue");
    setLessonLines(lesson.lines && lesson.lines.length > 0 ? [...lesson.lines] : []);
    setOpenImageUploaderIdx(null);
    setShowLessonModal(true);
  };

  const handleAddLineRow = () => {
    setLessonLines([...lessonLines, { character: "", pinyin: "", translation: "" }]);
  };

  const handleRemoveLineRow = (index: number) => {
    const updated = [...lessonLines];
    updated.splice(index, 1);
    setLessonLines(updated);
  };

  const handleDialogueLineChange = (index: number, field: keyof TextLine, val: string) => {
    const updated = [...lessonLines];
    updated[index] = { ...updated[index], [field]: val };
    setLessonLines(updated);
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle.trim()) {
      setErrorMessage("课文名称不能为空");
      return;
    }

    // Clean empty lines
    const cleanedLines = lessonLines.filter(l => l.character.trim() !== "");

    const payload = {
      title: lessonTitle.trim(),
      pinyinTitle: lessonPinyin.trim(),
      description: lessonDesc.trim(),
      lines: cleanedLines,
      imageUrl: lessonImage.trim(),
      lessonType: lessonType
    };

    try {
      let response;
      if (lessonFormId) {
        // UPDATE
        response = await fetch(`/api/lessons/${lessonFormId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        // CREATE
        response = await fetch("/api/lessons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (response.ok) {
        setSuccessMessage("课文及对话成功保存并全班同步！");
        setShowLessonModal(false);
        onRefreshAllData();
      } else {
        const d = await response.json();
        setErrorMessage(d.error || "保存失败");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("连接服务器超时，请重试");
    }
  };

  const handleDeleteLesson = (id: string, name: string) => {
    setCustomConfirm({
      isOpen: true,
      title: "确认删除课程",
      message: `确定要彻底删除 “${name}” 吗？\n所有关联的生词与对话数据将被清空，且不可恢复！`,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/lessons/${id}`, { method: "DELETE" });
          if (response.ok) {
            setSuccessMessage("成功删除该课文！");
            onRefreshAllData();
          } else {
            const d = await response.json();
            setErrorMessage(d.error || "删除失败");
          }
        } catch (err) {
          console.error(err);
          setErrorMessage("无法连接到服务端");
        }
      }
    });
  };

  // --- ACTIONS FOR VOCABULARY ---
  const triggerNewVocabModal = (lessonId: string) => {
    resetNotifications();
    setCurrVocabLessonId(lessonId);
    setVocabFormId(null);
    setVocabWord("");
    setVocabPinyin("");
    setVocabTrans("");
    setVocabExCh("");
    setVocabExPy("");
    setVocabExEn("");
    setVocabImage("");
    setShowVocabModal(true);
  };

  const triggerEditVocabModal = (lessonId: string, item: VocabItem) => {
    resetNotifications();
    setCurrVocabLessonId(lessonId);
    setVocabFormId(item.id);
    setVocabWord(item.word);
    setVocabPinyin(item.pinyin);
    setVocabTrans(item.translation);
    setVocabExCh(item.exampleCh || "");
    setVocabExPy(item.examplePy || "");
    setVocabExEn(item.exampleEn || "");
    setVocabImage(item.imageUrl || "");
    setShowVocabModal(true);
  };

  const handleSaveVocab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vocabWord.trim() || !vocabTrans.trim()) {
      setErrorMessage("生词词组与释义意思不可为空");
      return;
    }

    const lesson = lessons.find(l => l.id === currVocabLessonId);
    if (!lesson) return;

    let updatedVocabList = lesson.vocab ? [...lesson.vocab] : [];

    if (vocabFormId) {
      // Edit existing vocab item in active array
      updatedVocabList = updatedVocabList.map(v => 
        v.id === vocabFormId
          ? {
              ...v,
              word: vocabWord.trim(),
              pinyin: vocabPinyin.trim(),
              translation: vocabTrans.trim(),
              exampleCh: vocabExCh.trim() || undefined,
              examplePy: vocabExPy.trim() || undefined,
              exampleEn: vocabExEn.trim() || undefined,
              imageUrl: vocabImage.trim() || undefined
            }
          : v
      );
    } else {
      // Add new vocab item
      const newItem: VocabItem = {
        id: `v-${currVocabLessonId}-${Date.now()}`,
        word: vocabWord.trim(),
        pinyin: vocabPinyin.trim(),
        translation: vocabTrans.trim(),
        exampleCh: vocabExCh.trim() || undefined,
        examplePy: vocabExPy.trim() || undefined,
        exampleEn: vocabExEn.trim() || undefined,
        imageUrl: vocabImage.trim() || undefined
      };
      updatedVocabList.push(newItem);
    }

    try {
      const response = await fetch(`/api/lessons/${currVocabLessonId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vocab: updatedVocabList })
      });

      if (response.ok) {
        setSuccessMessage("生词词条成功更新并已对学生端进行云端同步！");
        setShowVocabModal(false);
        onRefreshAllData();
      } else {
        const d = await response.json();
        setErrorMessage(d.error || "生词保存失败");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("保存生词发生错误");
    }
  };

  const handleDeleteVocab = (lessonId: string, vocabId: string, wordStr: string) => {
    setCustomConfirm({
      isOpen: true,
      title: "删除生词确认",
      message: `确定要从本节课字典中删除生词 “${wordStr}” 吗？`,
      onConfirm: async () => {
        const lesson = lessons.find(l => l.id === lessonId);
        if (!lesson) return;

        const filtered = lesson.vocab.filter(v => v.id !== vocabId);

        try {
          const response = await fetch(`/api/lessons/${lessonId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vocab: filtered })
          });

          if (response.ok) {
            setSuccessMessage("生词已被成功删除！");
            onRefreshAllData();
          } else {
            const d = await response.json();
            setErrorMessage(d.error || "删除失败");
          }
        } catch (err) {
          console.error(err);
          setErrorMessage("无法删除该词组");
        }
      }
    });
  };

  // --- ACTIONS FOR STUDENTS CREDENTIALS ---
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentUsername.trim() || !studentName.trim() || !studentPassword.trim()) {
      setErrorMessage("请填入完整的学号、姓名与初始密码！");
      return;
    }

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: studentUsername.trim().toLowerCase(),
          name: studentName.trim(),
          password: studentPassword.trim(),
          role: "student"
        })
      });

      if (response.ok) {
        setSuccessMessage("成功注册新学生成员！现在他们可以使用该账号与密码登录平台了。");
        setShowStudentModal(false);
        setStudentUsername("");
        setStudentName("");
        setStudentPassword("");
        onRefreshAllData();
      } else {
        const d = await response.json();
        setErrorMessage(d.error || "账号创建失败");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("连接超时，无法注册");
    }
  };

  const handleDeleteStudent = (username: string, dispName: string) => {
    setCustomConfirm({
      isOpen: true,
      title: "注销学生账号确认",
      message: `确定要将学生成员 “${dispName}” 的账号注销吗？\n注销后该名学生将无法再次登录并清除其对应状态。`,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/users/${username}`, { method: "DELETE" });
          if (response.ok) {
            setSuccessMessage("该学生账号已被成功注销。");
            onRefreshAllData();
          } else {
            const d = await response.json();
            setErrorMessage(d.error || "注销失败");
          }
        } catch (err) {
          console.error(err);
          setErrorMessage("删除受阻，服务器失去联络");
        }
      }
    });
  };

  // --- ACTIONS FOR CUSTOM QUIZZES ---
  const handleAddCustomChoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuizLessonId) return;

    if (!choiceQText.trim()) {
      setErrorMessage("请填写测验题目光干问题描述。");
      return;
    }

    const lesson = lessons.find(l => l.id === selectedQuizLessonId);
    if (!lesson) return;

    let finalOptions: string[] = [];
    let finalCorrect = choiceCorrect.trim();
    let matchingPairsList: { left: string; right: string }[] = [];

    if (currChoiceType === "true-false") {
      finalOptions = ["正确 (True)", "错误 (False)"];
      if (finalCorrect !== "正确 (True)" && finalCorrect !== "错误 (False)" && finalCorrect !== "正确" && finalCorrect !== "错误") {
        finalCorrect = "正确 (True)";
      } else if (finalCorrect === "正确") {
        finalCorrect = "正确 (True)";
      } else if (finalCorrect === "错误") {
        finalCorrect = "错误 (False)";
      }
    } else if (currChoiceType === "matching") {
      // Collect matching pairs
      if (matchLeft1.trim() && matchRight1.trim()) matchingPairsList.push({ left: matchLeft1.trim(), right: matchRight1.trim() });
      if (matchLeft2.trim() && matchRight2.trim()) matchingPairsList.push({ left: matchLeft2.trim(), right: matchRight2.trim() });
      if (matchLeft3.trim() && matchRight3.trim()) matchingPairsList.push({ left: matchLeft3.trim(), right: matchRight3.trim() });
      if (matchLeft4.trim() && matchRight4.trim()) matchingPairsList.push({ left: matchLeft4.trim(), right: matchRight4.trim() });

      if (matchingPairsList.length === 0) {
        setErrorMessage("请至少填写一组配对的关系选项！");
        return;
      }
      // Combine them into a human readable description for fallback display
      finalCorrect = matchingPairsList.map(p => `${p.left} - ${p.right}`).join(", ");
    } else {
      // Choice and word-bank
      if (!choiceCorrect.trim() || !choiceOpt1.trim() || !choiceOpt2.trim()) {
        setErrorMessage("请填入正确的答案以及至少两个选项（选项A/B为必填）！");
        return;
      }
      finalOptions = [choiceOpt1.trim(), choiceOpt2.trim()];
      if (choiceOpt3.trim()) finalOptions.push(choiceOpt3.trim());
      if (choiceOpt4.trim()) finalOptions.push(choiceOpt4.trim());
    }

    const newChoice: ChoiceQuestion = {
      id: `choice-${selectedQuizLessonId}-${Date.now()}`,
      type: "custom",
      questionText: choiceQText.trim(),
      correctAnswer: finalCorrect,
      options: finalOptions,
      extendedType: currChoiceType,
      questionImage: choiceQImage.trim() || undefined,
      optionImages: (choiceOptImg1 || choiceOptImg2 || choiceOptImg3 || choiceOptImg4)
        ? [choiceOptImg1.trim(), choiceOptImg2.trim(), choiceOptImg3.trim(), choiceOptImg4.trim()]
        : undefined,
      matchingPairs: currChoiceType === "matching" ? matchingPairsList : undefined
    };

    const updatedChoices = lesson.customChoices ? [...lesson.customChoices, newChoice] : [newChoice];

    try {
      const response = await fetch(`/api/lessons/${selectedQuizLessonId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customChoices: updatedChoices })
      });

      if (response.ok) {
        setSuccessMessage("成功添加并保存测验新题目！");
        setChoiceQText("");
        setChoiceCorrect("");
        setChoiceOpt1("");
        setChoiceOpt2("");
        setChoiceOpt3("");
        setChoiceOpt4("");
        setChoiceQImage("");
        setChoiceOptImg1("");
        setChoiceOptImg2("");
        setChoiceOptImg3("");
        setChoiceOptImg4("");
        setMatchLeft1(""); setMatchRight1("");
        setMatchLeft2(""); setMatchRight2("");
        setMatchLeft3(""); setMatchRight3("");
        setMatchLeft4(""); setMatchRight4("");
        onRefreshAllData();
      } else {
        setErrorMessage("测验题保存失败");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("连接服务器超时");
    }
  };

  const handleAddCustomBlank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuizLessonId) return;

    if (!blankSentence.trim() || !blankCorrect.trim()) {
      setErrorMessage("请填入句干（含下划线）与对应的正确中文汉字答案！");
      return;
    }

    if (!blankSentence.includes("____")) {
      setErrorMessage("句干中必须包含四个或更多下划线 '____' 来表示填空位置！");
      return;
    }

    const lesson = lessons.find(l => l.id === selectedQuizLessonId);
    if (!lesson) return;

    const newBlank: BlankQuestion = {
      vocabWord: blankCorrect.trim(),
      sentenceWithBlank: blankSentence.trim(),
      correctAnswer: blankCorrect.trim(),
      hintEn: blankHintEn.trim() || "Type correct Chinese characters"
    };

    const updatedBlanks = lesson.customBlanks ? [...lesson.customBlanks, newBlank] : [newBlank];

    try {
      const response = await fetch(`/api/lessons/${selectedQuizLessonId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customBlanks: updatedBlanks })
      });

      if (response.ok) {
        setSuccessMessage("成功添加并保存填空题！");
        setBlankSentence("");
        setBlankCorrect("");
        setBlankHintEn("");
        onRefreshAllData();
      } else {
        setErrorMessage("填空题保存失败");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("连接服务器超时");
    }
  };

  const handleAddCustomDialogue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuizLessonId) return;

    if (!dialoguePrevLine.trim() || !dialogueCorrect.trim() || !dialogueOpt1.trim() || !dialogueOpt2.trim() || !dialogueOpt3.trim() || !dialogueOpt4.trim()) {
      setErrorMessage("请填写完整的上一行对话内容、正确回复选项以及多达4个对话候选分支！");
      return;
    }

    const lesson = lessons.find(l => l.id === selectedQuizLessonId);
    if (!lesson) return;

    const newDialogue: DialogueQuestion = {
      previousLineCharacter: dialoguePrevLine.trim(),
      correctAnswerCharacter: dialogueCorrect.trim(),
      options: [dialogueOpt1.trim(), dialogueOpt2.trim(), dialogueOpt3.trim(), dialogueOpt4.trim()]
    };

    const updatedDialogues = lesson.customDialogues ? [...lesson.customDialogues, newDialogue] : [newDialogue];

    try {
      const response = await fetch(`/api/lessons/${selectedQuizLessonId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customDialogues: updatedDialogues })
      });

      if (response.ok) {
        setSuccessMessage("成功添加并保存情境对话题！");
        setDialoguePrevLine("");
        setDialogueCorrect("");
        setDialogueOpt1("");
        setDialogueOpt2("");
        setDialogueOpt3("");
        setDialogueOpt4("");
        onRefreshAllData();
      } else {
        setErrorMessage("对话回复题保存失败");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("服务器未响应，请稍候再试");
    }
  };

  const handleDeleteQuizItem = async (type: "choices" | "blanks" | "dialogues", itemIndex: number) => {
    if (!selectedQuizLessonId) return;
    const lesson = lessons.find(l => l.id === selectedQuizLessonId);
    if (!lesson) return;

    let payload: any = {};
    if (type === "choices" && lesson.customChoices) {
      const filtered = lesson.customChoices.filter((_, idx) => idx !== itemIndex);
      payload = { customChoices: filtered };
    } else if (type === "blanks" && lesson.customBlanks) {
      const filtered = lesson.customBlanks.filter((_, idx) => idx !== itemIndex);
      payload = { customBlanks: filtered };
    } else if (type === "dialogues" && lesson.customDialogues) {
      const filtered = lesson.customDialogues.filter((_, idx) => idx !== itemIndex);
      payload = { customDialogues: filtered };
    } else {
      return;
    }

    try {
      const response = await fetch(`/api/lessons/${selectedQuizLessonId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setSuccessMessage("测验试题已成功移除！");
        onRefreshAllData();
      } else {
        setErrorMessage("删除试题失败");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("通信错误，无法删除试题");
    }
  };

  const handlePublishQuiz = async (publish: boolean) => {
    if (!selectedQuizLessonId) return;
    try {
      const response = await fetch(`/api/lessons/${selectedQuizLessonId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizPublished: publish })
      });
      if (response.ok) {
        setSuccessMessage(publish ? "测验已成功发布并上传！现在学生通过“作业缴交与测验”可以看到这一课的题目了 ✨" : "已撤销发布该测验，学生端将无法查看此测验 🚫");
        onRefreshAllData();
      } else {
        setErrorMessage("更新测验发布状态失败");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("连接服务器超时，无法发布测验");
    }
  };

  const handleClearAllQuizzes = () => {
    if (!selectedQuizLessonId) return;
    setCustomConfirm({
      isOpen: true,
      title: "确认清空自定义测试题",
      message: "确定要删除本单元所有的自定义试题并恢复成系统自适应默认试题吗？该操作不可撤销！",
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/lessons/${selectedQuizLessonId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customChoices: [],
              customBlanks: [],
              customDialogues: []
            })
          });

          if (response.ok) {
            setSuccessMessage("本单元所有自定义测试题已被完全清空，重置为系统智能适应题库。");
            onRefreshAllData();
          } else {
            setErrorMessage("重置测试题失败");
          }
        } catch (err) {
          console.error(err);
          setErrorMessage("通信故障");
        }
      }
    });
  };

  const handleAutoRecommendQuizzes = async () => {
    if (!selectedQuizLessonId) return;
    const lesson = lessons.find(l => l.id === selectedQuizLessonId);
    if (!lesson) return;

    const vocabs = lesson.vocab || [];
    const lines = lesson.lines || [];

    if (vocabs.length === 0) {
      setErrorMessage("生词词典中无内容，无法基于生词生成推荐测试题，请先添加一些本课生词！");
      return;
    }

    // 1. Choices generator based on vocabs
    const recommendedChoices: ChoiceQuestion[] = [];
    const sampleVocabs = [...vocabs].slice(0, 3);
    sampleVocabs.forEach((v, idx) => {
      const isPy = idx % 2 === 0;
      const otherVocabs = vocabs.filter(item => item.id !== v.id);
      if (isPy) {
        const distractors = otherVocabs.map(ov => ov.pinyin).slice(0, 3);
        while (distractors.length < 3) distractors.push(v.pinyin + "x");
        const options = [...distractors, v.pinyin].sort(() => 0.5 - Math.random());
        recommendedChoices.push({
          id: `rec-choice-py-${Date.now()}-${idx}`,
          type: "custom",
          questionText: `请问汉字 “${v.word}” 的正确拼音是什么？`,
          correctAnswer: v.pinyin,
          options
        });
      } else {
        const distractors = otherVocabs.map(ov => ov.translation).slice(0, 3);
        while (distractors.length < 3) distractors.push("to learn/study");
        const options = [...distractors, v.translation].sort(() => 0.5 - Math.random());
        recommendedChoices.push({
          id: `rec-choice-tr-${Date.now()}-${idx}`,
          type: "custom",
          questionText: `生词 “${v.word}” 的英文意思是什么？`,
          correctAnswer: v.translation,
          options
        });
      }
    });

    // 2. Blanks generator based on sentences
    const recommendedBlanks: BlankQuestion[] = [];
    vocabs.forEach((v) => {
      if (v.exampleCh && v.exampleCh.includes(v.word) && recommendedBlanks.length < 3) {
        recommendedBlanks.push({
          vocabWord: v.word,
          sentenceWithBlank: v.exampleCh.replace(v.word, "________"),
          correctAnswer: v.word,
          hintEn: v.exampleEn || v.translation
        });
      }
    });
    // Fallbacks if no sentences found
    if (recommendedBlanks.length === 0) {
      vocabs.slice(0, 3).forEach((v) => {
        recommendedBlanks.push({
          vocabWord: v.word,
          sentenceWithBlank: `请写出拼音为 “${v.pinyin}” 的中文汉字首尾完整写法：________ (意思: ${v.translation})`,
          correctAnswer: v.word,
          hintEn: "Please fill with standard Chinese characters"
        });
      });
    }

    // 3. Dialogues generator based on actual lesson dialogue rows
    const recommendedDialogues: DialogueQuestion[] = [];
    if (lines.length >= 2) {
      for (let i = 0; i < Math.min(lines.length - 1, 3); i++) {
        const row = lines[i];
        const answer = lines[i + 1];
        const distractors = [
          "没关系，我们下次再去！",
          "请问现在是几点？",
          "这是我的家。",
          "不客气，老师再见！"
        ].filter(d => d !== answer.character).slice(0, 3);

        const options = [...distractors, answer.character].sort(() => 0.5 - Math.random());
        recommendedDialogues.push({
          previousLineCharacter: row.character,
          correctAnswerCharacter: answer.character,
          options
        });
      }
    } else {
      recommendedDialogues.push({
        previousLineCharacter: "王老师，您今天好吗？",
        correctAnswerCharacter: "我今天很好，谢谢你的关心！",
        options: ["我叫大卫。", "现在九点钟。", "今天星期五。", "我今天很好，谢谢你的关心！"].sort(() => 0.5 - Math.random())
      });
    }

    try {
      const response = await fetch(`/api/lessons/${selectedQuizLessonId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customChoices: recommendedChoices,
          customBlanks: recommendedBlanks,
          customDialogues: recommendedDialogues
        })
      });

      if (response.ok) {
        setSuccessMessage("🎉 智慧一键布题成功！已基于本单元生词及对话推荐了 3道单选题、3道填空题 和 精选对话接龙题！您可以随意调整。");
        onRefreshAllData();
      } else {
        setErrorMessage("一键生成布置失败");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("请求超时，请重试");
    }
  };

  return (
    <div id="teacher-dashboard-view" className="space-y-6">
      {/* Visual Banners */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center space-x-2">
            <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Languages className="w-5 h-5" />
            </span>
            <span>教师控制台 / Classroom Administration</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            您拥有所有编辑与添加的管理员权限。您的任何改动会在云端实时存储，并全教室的学生端客户端进行即时同步。
          </p>
        </div>

        {/* Dashboard sub-sections tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl space-x-1 shrink-0 self-start md:self-center">
          <button
            id="tab-manage-lessons"
            onClick={() => { setAdminTab("lessons"); resetNotifications(); }}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              adminTab === "lessons" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>课文与生词库</span>
          </button>
          <button
            id="tab-manage-students"
            onClick={() => { setAdminTab("students"); resetNotifications(); }}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              adminTab === "students" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>学生与进度</span>
          </button>
          <button
            id="tab-manage-quizzes"
            onClick={() => { setAdminTab("quizzes"); resetNotifications(); }}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              adminTab === "quizzes" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>测验布置区</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div id="admin-error-box" className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-start space-x-2 text-xs font-medium">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div id="admin-success-box" className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl flex items-start space-x-2 text-xs font-bold">
          <span className="p-0.5 bg-emerald-200 text-emerald-800 rounded-md shrink-0">✓</span>
          <span>{successMessage}</span>
        </div>
      )}

      {/* VIEW A: LESSONS & DIALOGUE DICTIONARIES */}
      {adminTab === "lessons" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-xl">
            <span className="text-xs font-bold font-mono text-slate-300">ACTIVE CURRICULUM ({lessons.length} LESSONS)</span>
            <button
              id="add-new-lesson-btn"
              onClick={triggerNewLessonModal}
              className="flex items-center space-x-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black px-3.5 py-2 rounded-lg shadow-md hover:scale-102 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新建一课 / Add Lesson</span>
            </button>
          </div>

          {lessons.length === 0 ? (
            <div className="text-center bg-white p-12 rounded-2xl border border-slate-100">
              <span className="text-slate-300 text-4xl block">📚</span>
              <p className="text-slate-500 text-sm mt-3">暂无课文内容。点击上面 “新建一课” 开始编写！</p>
            </div>
          ) : (
            <div className="space-y-6">
              {lessons.map((lesson) => {
                const isSelected = editingLessonId === lesson.id;

                return (
                  <div
                    id={`admin-lesson-card-${lesson.id}`}
                    key={lesson.id}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
                  >
                    {/* Header bar */}
                    <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-base">{lesson.title}</h4>
                        <p className="text-xs font-mono text-amber-600 mt-0.5 font-bold tracking-wide">{lesson.pinyinTitle || "未标注拼音"}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 self-start md:self-center">
                        <button
                          id={`toggle-vocab-edit-${lesson.id}`}
                          onClick={() => setEditingLessonId(isSelected ? null : lesson.id)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-amber-500 hover:text-white rounded-lg text-slate-600 text-xs font-bold transition-all cursor-pointer"
                        >
                          {isSelected ? "收起生词词典" : "管理本课生词"}
                        </button>

                        <button
                          id={`edit-lesson-meta-${lesson.id}`}
                          onClick={() => triggerEditLessonModal(lesson)}
                          className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                          title="编辑课文说明与对话内容"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          id={`delete-lesson-meta-${lesson.id}`}
                          onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                          className="p-1.5 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="删除本节课"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Dialogue Line summaries within header overview */}
                    <div className="p-4 bg-white border-b border-slate-50">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase font-mono tracking-wider block mb-2">
                        Dialogue Content / 课文对话预览 ({lesson.lines?.length || 0} 行)
                      </span>
                      <div className="space-y-1">
                        {lesson.lines && lesson.lines.slice(0, 3).map((l, lIdx) => (
                          <p key={lIdx} className="text-xs text-slate-600 truncate flex items-center space-x-1">
                            <span className="text-[10px] font-mono text-amber-500 shrink-0 font-bold">[{lIdx + 1}]</span>
                            <span className="font-semibold text-slate-700">{l.character}</span>
                            <span className="text-slate-400 text-[11px] font-light">| {l.pinyin}</span>
                          </p>
                        ))}
                        {lesson.lines && lesson.lines.length > 3 && (
                          <span className="inline-block text-[10px] text-amber-600 italic font-semibold pt-1">
                            还有 {lesson.lines.length - 3} 行未显示...
                          </span>
                        )}
                      </div>
                    </div>

                    {/* COLLAPSIBLE AREA: VOCABULARY DICTIONARY EDITION */}
                    {isSelected && (
                      <div className="bg-amber-50/20 border-t border-slate-100 p-4 space-y-4 animate-in slide-in-from-top-3 duration-200">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-slate-800 flex items-center space-x-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span>生词库管理 / Vocabulary List ({lesson.vocab?.length || 0} 个生词)</span>
                          </span>
                          <button
                            id="add-vocab-lexicon-btn"
                            onClick={() => triggerNewVocabModal(lesson.id)}
                            className="flex items-center space-x-1 text-amber-700 hover:text-amber-800 bg-amber-100 hover:bg-amber-200 text-xs font-extrabold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>添加生词 / Add Vocab</span>
                          </button>
                        </div>

                        {lesson.vocab && lesson.vocab.length === 0 ? (
                          <div className="py-6 text-center text-slate-400 italic text-xs border border-dashed border-slate-200 bg-white rounded-xl">
                            本课暂无生词。在阅读课文前，建议先添加一些核心词汇，生词会自动在右侧课文中高亮显示。
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {lesson.vocab?.map((v) => (
                              <div
                                id={`admin-vocab-card-${v.id}`}
                                key={v.id}
                                className="bg-white p-3.5 border border-slate-200/60 rounded-xl relative flex justify-between items-start group shadow-sm"
                              >
                                <div>
                                  <div className="flex items-baseline space-x-2">
                                    <span className="text-lg font-black text-slate-800">{v.word}</span>
                                    <span className="text-xs font-mono font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded uppercase tracking-wide">
                                      {v.pinyin}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-600 mt-1.5 font-medium">意义: {v.translation}</p>
                                  {v.exampleCh && (
                                    <div className="mt-2 text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 max-w-[320px]">
                                      <p className="font-bold text-slate-700">例: {v.exampleCh}</p>
                                      {v.examplePy && <p className="font-mono text-amber-700">{v.examplePy}</p>}
                                      {v.exampleEn && <p className="italic text-slate-500 mt-0.5">{v.exampleEn}</p>}
                                    </div>
                                  )}
                                </div>

                                <div className="flex space-x-1">
                                  <button
                                    id={`edit-vocab-btn-${v.id}`}
                                    onClick={() => triggerEditVocabModal(lesson.id, v)}
                                    className="p-1 px-2 border border-slate-100 hover:border-slate-200 rounded text-slate-400 hover:text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                                  >
                                    编辑
                                  </button>
                                  <button
                                    id={`delete-vocab-btn-${v.id}`}
                                    onClick={() => handleDeleteVocab(lesson.id, v.id, v.word)}
                                    className="p-1 text-red-500 hover:text-red-700 px-2 hover:bg-red-50 rounded text-xs font-semibold cursor-pointer"
                                  >
                                    删除
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW B: STUDENT MEMBERS LIST CREDENTIALING */}
      {adminTab === "students" && (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-5">
          <div className="flex justify-between items-center pb-3 border-b border-slate-50">
            <div>
              <h4 className="font-extrabold text-slate-800 text-sm">教室学生成员管理与学习进度</h4>
              <p className="text-xs text-slate-500">教师可以在此查看学生的账号、密码、历次作业成绩、写错哪些题以及缴交时间状态</p>
            </div>
            <button
              id="show-student-modal-btn"
              onClick={() => { resetNotifications(); setShowStudentModal(true); }}
              className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black px-3.5 py-2 rounded-lg shadow-md cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>添加学生 / Register Student</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-black text-slate-400 uppercase tracking-wider">
                    姓名 / Name
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-black text-slate-400 uppercase tracking-wider">
                    账号 / Username
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-black text-slate-400 uppercase tracking-wider">
                    密码 / Password
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-black text-slate-400 uppercase tracking-wider">
                    角色 / Role
                  </th>
                  <th scope="col" className="px-4 py-3 text-center font-black text-slate-400 uppercase tracking-wider">
                    小测验与进度 / Quizzes Progress
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    操作 / Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {users.map((item) => {
                  const subCount = item.submissions?.length || 0;
                  const isExpanded = expandedStudent === item.username;
                  const isPassRevealed = !!revealPasswords[item.username];

                  return (
                    <React.Fragment key={item.username}>
                      <tr id={`table-user-row-${item.username}`} className="hover:bg-slate-50/55 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-800">
                          {item.name}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">
                          {item.username}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2 font-mono">
                            <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-extrabold">
                              {isPassRevealed ? (item.password || "123456") : "••••••"}
                            </span>
                            <button
                              type="button"
                              onClick={() => setRevealPasswords(prev => ({ ...prev, [item.username]: !isPassRevealed }))}
                              className="text-slate-400 hover:text-amber-500 cursor-pointer pointer-cursor bg-transparent p-1"
                              title="显示/隐藏密码"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                            item.role === 'teacher' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {item.role === 'teacher' ? '教师' : '学生'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.role === 'teacher' ? (
                            <span className="text-slate-400 italic">管理员不受限</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setExpandedStudent(isExpanded ? null : item.username)}
                              className={`px-3 py-1 rounded-full text-[10px] font-extrabold transition-all flex items-center space-x-1 mx-auto cursor-pointer ${
                                subCount > 0
                                  ? "bg-emerald-500 text-white shadow-sm hover:bg-emerald-600"
                                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              }`}
                            >
                              <span>已完成: {subCount} 次 / Submissions</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {item.username === "teacher" ? (
                            <span className="text-[10px] text-slate-400 italic">系统预设</span>
                          ) : (
                            <button
                              type="button"
                              id={`delete-user-table-btn-${item.username}`}
                              onClick={() => handleDeleteStudent(item.username, item.name)}
                              className="text-red-500 hover:text-red-700 font-extrabold hover:underline bg-transparent cursor-pointer transition"
                            >
                              注销账号
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Progress Analytics Panel */}
                      {item.role !== "teacher" && isExpanded && (
                        <tr id={`expanded-user-analytics-${item.username}`}>
                          <td colSpan={6} className="bg-slate-50/50 p-6 border-b border-t border-slate-100">
                            <div className="space-y-4">
                              <div className="flex items-center space-x-2 pb-1.5 border-b border-slate-200/60">
                                <Users className="w-4 h-4 text-amber-500" />
                                <h5 className="font-extrabold text-slate-800 text-xs">
                                  【{item.name}】的小测验答题明细与缴交历史 / Study Record Analysis
                                </h5>
                              </div>

                              {!item.submissions || item.submissions.length === 0 ? (
                                <div className="bg-white p-6 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400 font-medium text-xs">
                                  🛌 该学生目前尚未完成任何生词配对或单项选择测试。
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {item.submissions.map((sub, sIdx) => {
                                    if (sub.submissionType === "assignment") {
                                      return (
                                        <div key={sIdx} className="bg-gradient-to-br from-indigo-50/20 to-white p-4.5 rounded-2xl shadow-sm border border-indigo-100/50 space-y-3.5">
                                          <div className="flex justify-between items-start">
                                            <div>
                                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-150 font-black uppercase tracking-wide">
                                                <span>📝 {translateChinese("课外手写与拼写作文作业", chineseMode)}</span>
                                              </span>
                                              <h6 className="font-extrabold text-slate-800 text-xs mt-1.5">{sub.lessonTitle}</h6>
                                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                缴交时间: {new Date(sub.submittedAt || Date.now()).toLocaleString("zh-CN", { hour12: false })}
                                              </p>
                                            </div>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
                                              已交作业 / Handed In
                                            </span>
                                          </div>

                                          {/* Student text input answer */}
                                          {sub.textAnswer && (
                                            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                                              <span className="text-[9px] font-extrabold text-slate-400 block tracking-wider uppercase mb-1">
                                                学生短文/造句内容 (STUDENT ESSAY TEXT)
                                              </span>
                                              <p className="text-xs text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">{sub.textAnswer}</p>
                                            </div>
                                          )}

                                          {/* Hand-in photo file attachment */}
                                          {sub.fileUrl ? (
                                            <div className="space-y-1.5">
                                              <span className="text-[9px] font-extrabold text-slate-400 block tracking-wider uppercase">
                                                📸 手写拍照附件 (WORK PHOTO ATTACHMENT)
                                              </span>
                                              <div className="relative rounded-xl overflow-hidden border border-slate-200 group bg-slate-100 max-w-[280px]">
                                                <img
                                                  src={sub.fileUrl}
                                                  alt="Student work submission"
                                                  className="w-full max-h-[160px] object-cover hover:scale-105 transition-transform duration-300"
                                                />
                                                <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[9px] px-2 py-1 truncate font-mono font-bold">
                                                  {sub.fileName || "attachment_handwrite.jpg"}
                                                </div>
                                              </div>
                                              <div className="pt-1">
                                                <a
                                                  href={sub.fileUrl}
                                                  download={sub.fileName || "attached_homework.png"}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="inline-flex items-center space-x-1 text-indigo-600 hover:text-indigo-800 text-[10px] font-bold underline cursor-pointer"
                                                >
                                                  <span>查看及下载学生大图 / Open Full Size</span>
                                                </a>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="text-[10px] text-slate-400 font-bold italic">
                                              📔 学生未上传课本拍照附件，仅提交拼写文字 / Text essay only
                                            </div>
                                          )}
                                        </div>
                                      );
                                    }

                                    const wrongCount = sub.wrongAnswers?.length || 0;
                                    return (
                                      <div key={sIdx} className="bg-white p-4.5 rounded-2xl shadow-sm border border-slate-100 space-y-3.5">
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <span className="text-[10px] font-mono font-bold text-amber-600 uppercase tracking-widest block">
                                              SCORE CARD / 单元测验
                                            </span>
                                            <h6 className="font-black text-slate-800 text-xs mt-0.5">{sub.lessonTitle}</h6>
                                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                              缴交时间: {new Date(sub.submittedAt).toLocaleString("zh-CN", { hour12: false })}
                                            </p>
                                          </div>
                                          <div className="text-right">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-black inline-block ${
                                              sub.score >= 80 ? "bg-emerald-50 text-emerald-800 border border-emerald-100" :
                                              sub.score >= 60 ? "bg-amber-50 text-amber-800 border border-amber-100" :
                                              "bg-red-50 text-red-800 border border-red-100"
                                            }`}>
                                              {sub.score}% / 100
                                            </span>
                                          </div>
                                        </div>

                                        {/* Visual score horizontal bar gauge weight */}
                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full rounded-full transition-all duration-300 ${
                                              sub.score >= 80 ? "bg-emerald-500" :
                                              sub.score >= 60 ? "bg-amber-500" : "bg-red-500"
                                            }`}
                                            style={{ width: `${sub.score}%` }}
                                          />
                                        </div>

                                        {/* Wrong answers detail analysis block */}
                                        <div className="space-y-1.5 pt-1">
                                          <span className="text-[10px] font-extrabold text-slate-400 block tracking-wider uppercase">
                                            错题及写错的答案 ({wrongCount})
                                          </span>
                                          {wrongCount === 0 ? (
                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100/50 px-2 py-1 rounded-md inline-block">
                                              🎉 表现卓越，本次测验满分，无写错题！
                                            </span>
                                          ) : (
                                            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                                              {sub.wrongAnswers.map((w, wIdx) => (
                                                <div key={wIdx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[10.5px]">
                                                  <p className="text-slate-700 font-bold">题干: {w.questionText}</p>
                                                  <div className="grid grid-cols-2 gap-2 mt-1.5 font-bold leading-none">
                                                    <span className="text-red-600 bg-red-50 p-1.5 rounded truncate block text-center">
                                                      学生答: {w.submittedAnswer}
                                                    </span>
                                                    <span className="text-emerald-700 bg-emerald-50 p-1.5 rounded truncate block text-center">
                                                      正确答案: {w.correctAnswer}
                                                    </span>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {adminTab === "quizzes" && (
        <div id="admin-custom-quizzes-zone" className="space-y-6">
          {/* Controls Panel */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">选择需要布题或改动测验的课程单元</h4>
                <p className="text-xs text-slate-500 mt-1">您在此添加的单选题、填空题和情境对话题会立即生效，并取代学生端的自动生成预设试题。</p>
                
                {/* Publish Status Indicator */}
                <div className="mt-2 flex items-center space-x-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">发布状态:</span>
                  {lessons.find(l => l.id === selectedQuizLessonId)?.quizPublished ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 font-sans">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>已上传并发布 / Published</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 font-sans">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      <span>草稿 (未发布) / Unpublished Draft</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <select
                  id="quiz-lesson-select"
                  className="p-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white"
                  value={selectedQuizLessonId}
                  onChange={(e) => {
                    setSelectedQuizLessonId(e.target.value);
                    resetNotifications();
                  }}
                >
                  {lessons.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  id="btn-auto-recommend-quizzes"
                  onClick={handleAutoRecommendQuizzes}
                  className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-lg text-xs flex items-center space-x-1 shadow-sm shrink-0 transition-all cursor-pointer"
                  title="自动基于该课的生词和对话行智能地生成一套高质量的填空题与选择题，为您省去布题打字时间！"
                >
                  <span>一键智能出题 ✨</span>
                </button>

                <button
                  type="button"
                  id="btn-clear-quizzes"
                  onClick={handleClearAllQuizzes}
                  className="px-3 py-2 bg-slate-100 hover:bg-red-50 hover:text-red-700 border border-slate-200/60 rounded-lg text-slate-500 text-xs font-bold transition-all cursor-pointer mr-1.5"
                >
                  清空自定义
                </button>

                {/* Upload & Publish Toggle Button */}
                {lessons.find(l => l.id === selectedQuizLessonId)?.quizPublished ? (
                  <button
                    type="button"
                    id="btn-unpublish-quiz"
                    onClick={() => handlePublishQuiz(false)}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center space-x-1 hover:shadow-xs"
                    title="撤回发布，使测验不在学生端可见"
                  >
                    <span>撤回发布 🚫</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    id="btn-publish-quiz"
                    onClick={() => handlePublishQuiz(true)}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white border border-amber-600 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center space-x-1 shadow-sm hover:shadow active:scale-95"
                    title="上传发布当前测验，学生才能在作业区看到并作答"
                  >
                    <span>上传并发布当前测验 🚀</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Active Custom Quizzes list for selectedLessonId */}
          {(() => {
            const activeLesson = lessons.find(l => l.id === selectedQuizLessonId);
            if (!activeLesson) return null;

            const choices = activeLesson.customChoices || [];
            const blanks = activeLesson.customBlanks || [];
            const dialogues = activeLesson.customDialogues || [];

            return (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* COLUMN 1: MULTIPLE CHOICE & COMPREHENSIVE CHALLENGES */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="border-b border-slate-50 pb-2">
                    <h5 className="font-extrabold text-slate-800 text-xs flex items-center justify-between">
                      <span>1. 自定义综合题库 ({choices.length} 题)</span>
                      <span className="text-[10px] font-mono font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">QUIZ MAKER</span>
                    </h5>
                  </div>

                  {/* Add Choice Form */}
                  <form onSubmit={handleAddCustomChoice} className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">➕ 组装高级试题</span>
                      <select
                        className="text-[10px] font-bold p-1 bg-white border border-slate-200 rounded text-amber-700 focus:outline-none"
                        value={currChoiceType}
                        onChange={(e) => setCurrChoiceType(e.target.value as any)}
                      >
                        <option value="choice">单项选择题</option>
                        <option value="true-false">判断对错题</option>
                        <option value="matching">配对连线题</option>
                        <option value="word-bank">选词填空题</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 mb-0.5">题干问题描述 (Stem)</label>
                        <input
                          type="text"
                          required
                          placeholder={
                            currChoiceType === "matching"
                              ? "配对说明 (e.g. 请将左侧项与右侧项连线关联)"
                              : currChoiceType === "word-bank"
                              ? "填空题干 (e.g. 同学们 ____ (like) 学习中文。)"
                              : "选择题干 (e.g. 以下哪个是‘Hello’的正确中文？)"
                          }
                          className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800"
                          value={choiceQText}
                          onChange={(e) => setChoiceQText(e.target.value)}
                        />
                      </div>

                      <ImageUploadWidget
                        label="多媒体题干插图（可本地上传或由云盘、链接导入）"
                        value={choiceQImage}
                        onChange={setChoiceQImage}
                        randomPlaceholderSeed={`qimg-${Date.now()}`}
                        onGenerateRandom={() => setChoiceQImage(`https://picsum.photos/seed/qimg-${Date.now() % 1000}/500/350`)}
                      />

                      {/* TRUE / FALSE DETAILS */}
                      {currChoiceType === "true-false" && (
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-0.5">设定正确答案 (Correct Answer)</label>
                          <select
                            className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none"
                            value={choiceCorrect}
                            onChange={(e) => setChoiceCorrect(e.target.value)}
                          >
                            <option value="">-- 请选择正确答案 --</option>
                            <option value="正确 (True)">正确 (True)</option>
                            <option value="错误 (False)">错误 (False)</option>
                          </select>
                        </div>
                      )}

                      {/* MATCHING PAIRS DETAILS */}
                      {currChoiceType === "matching" && (
                        <div className="space-y-1.5 p-2 bg-amber-50/50 rounded-lg border border-amber-100">
                          <span className="text-[9px] font-extrabold text-amber-800 block">左右项连线配对 (必填 1 組，最多 4 組)</span>
                          <div className="space-y-1 text-[10px]">
                            <div className="flex space-x-1">
                              <input type="text" placeholder="左侧项 1 (e.g. 谢谢)" className="w-1/2 p-1.5 border rounded bg-white" value={matchLeft1} onChange={(e) => setMatchLeft1(e.target.value)} />
                              <input type="text" placeholder="右侧项 1 (e.g. Thank you)" className="w-1/2 p-1.5 border rounded bg-white" value={matchRight1} onChange={(e) => setMatchRight1(e.target.value)} />
                            </div>
                            <div className="flex space-x-1">
                              <input type="text" placeholder="左侧项 2..." className="w-1/2 p-1.5 border rounded bg-white" value={matchLeft2} onChange={(e) => setMatchLeft2(e.target.value)} />
                              <input type="text" placeholder="右侧项 2..." className="w-1/2 p-1.5 border rounded bg-white" value={matchRight2} onChange={(e) => setMatchRight2(e.target.value)} />
                            </div>
                            <div className="flex space-x-1">
                              <input type="text" placeholder="左侧项 3..." className="w-1/2 p-1.5 border rounded bg-white" value={matchLeft3} onChange={(e) => setMatchLeft3(e.target.value)} />
                              <input type="text" placeholder="右侧项 3..." className="w-1/2 p-1.5 border rounded bg-white" value={matchRight3} onChange={(e) => setMatchRight3(e.target.value)} />
                            </div>
                            <div className="flex space-x-1">
                              <input type="text" placeholder="左侧项 4..." className="w-1/2 p-1.5 border rounded bg-white" value={matchLeft4} onChange={(e) => setMatchLeft4(e.target.value)} />
                              <input type="text" placeholder="右侧项 4..." className="w-1/2 p-1.5 border rounded bg-white" value={matchRight4} onChange={(e) => setMatchRight4(e.target.value)} />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* OPTION FOR CHOICE OR WORD BANK */}
                      {(currChoiceType === "choice" || currChoiceType === "word-bank") && (
                        <div className="space-y-2">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 mb-0.5">设定正确答案选项的值 (需完全匹配其中一个选项)</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. 喜欢"
                              className="w-full text-xs p-2 bg-amber-50/50 border border-amber-200 rounded-lg text-slate-800 focus:outline-none placeholder-amber-950/40"
                              value={choiceCorrect}
                              onChange={(e) => setChoiceCorrect(e.target.value)}
                            />
                          </div>

                          <div className="space-y-1 bg-white p-2 border border-slate-100 rounded-lg">
                            <span className="text-[9px] font-extrabold text-slate-500 block">设定干扰候选项与选项插图 (Options and Option Images)</span>
                            
                            <div className="space-y-1.5 text-xs">
                              <div className="space-y-0.5">
                                <input type="text" required placeholder="选项 A (必填)" className="w-full p-1.5 border border-slate-200 rounded text-[11px]" value={choiceOpt1} onChange={(e) => setChoiceOpt1(e.target.value)} />
                                <input type="text" placeholder="选项 A 插图 URL (选填)" className="w-full p-1 border border-slate-100 rounded text-[9px] bg-slate-50/30" value={choiceOptImg1} onChange={(e) => setChoiceOptImg1(e.target.value)} />
                              </div>

                              <div className="space-y-0.5">
                                <input type="text" required placeholder="选项 B (必填)" className="w-full p-1.5 border border-slate-200 rounded text-[11px]" value={choiceOpt2} onChange={(e) => setChoiceOpt2(e.target.value)} />
                                <input type="text" placeholder="选项 B 插图 URL (选填)" className="w-full p-1 border border-slate-100 rounded text-[9px] bg-slate-50/30" value={choiceOptImg2} onChange={(e) => setChoiceOptImg2(e.target.value)} />
                              </div>

                              <div className="space-y-0.5">
                                <input type="text" placeholder="选项 C (选填)" className="w-full p-1.5 border border-slate-200 rounded text-[11px]" value={choiceOpt3} onChange={(e) => setChoiceOpt3(e.target.value)} />
                                <input type="text" placeholder="选项 C 插图 URL (选填)" className="w-full p-1 border border-slate-100 rounded text-[9px] bg-slate-50/30" value={choiceOptImg3} onChange={(e) => setChoiceOptImg3(e.target.value)} />
                              </div>

                              <div className="space-y-0.5">
                                <input type="text" placeholder="选项 D (选填)" className="w-full p-1.5 border border-slate-200 rounded text-[11px]" value={choiceOpt4} onChange={(e) => setChoiceOpt4(e.target.value)} />
                                <input type="text" placeholder="选项 D 插图 URL (选填)" className="w-full p-1 border border-slate-100 rounded text-[9px] bg-slate-50/30" value={choiceOptImg4} onChange={(e) => setChoiceOptImg4(e.target.value)} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold rounded-lg text-xs shadow transition-all cursor-pointer"
                    >
                      保存并添加此试题
                    </button>
                  </form>

                  {/* Choice Lists */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {choices.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-6 bg-slate-50/50 rounded-lg border border-dashed">
                        本课暂无自定义选择题，会自动根据生词进行智能拼音及词义配对。
                      </p>
                    ) : (
                      choices.map((q, idx) => (
                        <div key={idx} className="bg-white p-3 border border-slate-200/80 rounded-xl text-xs space-y-1.5 relative">
                          <button
                            type="button"
                            onClick={() => handleDeleteQuizItem("choices", idx)}
                            className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold"
                          >
                            ✕
                          </button>
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-200/50 px-1.5 py-0.5 rounded font-extrabold">
                              {q.extendedType === "true-false" ? "判断题 ❓" : q.extendedType === "matching" ? "配对连线 🔗" : q.extendedType === "word-bank" ? "选词填空 📝" : "四选一单选题 🎯"}
                            </span>
                            {q.questionImage && <span className="text-[9px] bg-sky-50 text-sky-700 border border-sky-100 px-1 rounded font-medium">🖼️ 附题干图</span>}
                            {q.optionImages && q.optionImages.some(img => !!img) && <span className="text-[9px] bg-purple-50 text-purple-700 border border-purple-100 px-1 rounded font-medium">🎨 附选项图</span>}
                          </div>
                          <p className="font-bold text-slate-800 pr-5">问: {q.questionText}</p>
                          <p className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold w-fit">
                            答: {q.correctAnswer}
                          </p>
                          <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500 font-mono">
                            {q.options.map((opt, oIdx) => (
                              <span key={oIdx} className="truncate">· {opt}</span>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* COLUMN 2: FILL IN THE BLANK */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="border-b border-slate-50 pb-2">
                    <h5 className="font-extrabold text-slate-800 text-xs flex items-center justify-between">
                      <span>2. 课文例句填空 ({blanks.length} 题)</span>
                      <span className="text-[10px] font-mono font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">BLANK</span>
                    </h5>
                  </div>

                  {/* Add Blank Form */}
                  <form onSubmit={handleAddCustomBlank} className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-3">
                    <span className="text-[10px] font-black text-slate-500 block uppercase tracking-wider">➕ 新建一条填空题 / Create GAPFILL</span>
                    
                    <div className="space-y-2">
                      <input
                        type="text"
                        required
                        placeholder="带空下划线的整句 (必须含 '____' 符号)"
                        className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800"
                        value={blankSentence}
                        onChange={(e) => setBlankSentence(e.target.value)}
                      />
                      <input
                        type="text"
                        required
                        placeholder="正确填入的汉字字词 (e.g. 欢迎)"
                        className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800"
                        value={blankCorrect}
                        onChange={(e) => setBlankCorrect(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="英文释义提示 (e.g. to welcome)"
                        className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800"
                        value={blankHintEn}
                        onChange={(e) => setBlankHintEn(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-lg text-xs shadow transition-colors cursor-pointer"
                    >
                      添加填空题
                    </button>
                  </form>

                  {/* Blank Lists */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {blanks.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-6 bg-slate-50/50 rounded-lg border border-dashed">
                        本课暂无自定义填空题，系统会自动抽取包含本课生词的例句供填空。
                      </p>
                    ) : (
                      blanks.map((q, idx) => (
                        <div key={idx} className="bg-white p-3 border border-slate-200/80 rounded-xl text-xs space-y-1.5 relative">
                          <button
                            type="button"
                            onClick={() => handleDeleteQuizItem("blanks", idx)}
                            className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold"
                          >
                            ✕
                          </button>
                          <p className="font-semibold text-slate-800 pr-5">
                            句干: <span className="font-mono bg-slate-50 px-1 py-0.5 rounded border">{q.sentenceWithBlank}</span>
                          </p>
                          <p className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold w-fit">
                            填入值: {q.correctAnswer}
                          </p>
                          {q.hintEn && (
                            <p className="text-[10px] text-slate-400 italic">提示语 (En): {q.hintEn}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* COLUMN 3: DIALOGUE FLOW */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="border-b border-slate-50 pb-2">
                    <h5 className="font-extrabold text-slate-800 text-xs flex items-center justify-between">
                      <span>3. 情境对话接龙 ({dialogues.length} 题)</span>
                      <span className="text-[10px] font-mono font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">DIALOGUE</span>
                    </h5>
                  </div>

                  {/* Add Dialogue Form */}
                  <form onSubmit={handleAddCustomDialogue} className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-3">
                    <span className="text-[10px] font-black text-slate-500 block uppercase tracking-wider">➕ 新建一条对话回复 / Create DIALOGUE</span>
                    
                    <div className="space-y-2">
                      <input
                        type="text"
                        required
                        placeholder="上句对话 (e.g. “今天晚上一起吃中国菜好吗？”)"
                        className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800"
                        value={dialoguePrevLine}
                        onChange={(e) => setDialoguePrevLine(e.target.value)}
                      />
                      <input
                        type="text"
                        required
                        placeholder="正确接话回复 (必须是包含在选项中的那个正确值)"
                        className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800"
                        value={dialogueCorrect}
                        onChange={(e) => setDialogueCorrect(e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <input
                          type="text"
                          required
                          placeholder="选项 1"
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                          value={dialogueOpt1}
                          onChange={(e) => setDialogueOpt1(e.target.value)}
                        />
                        <input
                          type="text"
                          required
                          placeholder="选项 2"
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                          value={dialogueOpt2}
                          onChange={(e) => setDialogueOpt2(e.target.value)}
                        />
                        <input
                          type="text"
                          required
                          placeholder="选项 3"
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                          value={dialogueOpt3}
                          onChange={(e) => setDialogueOpt3(e.target.value)}
                        />
                        <input
                          type="text"
                          required
                          placeholder="选项 4"
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                          value={dialogueOpt4}
                          onChange={(e) => setDialogueOpt4(e.target.value)}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-lg text-xs shadow transition-colors cursor-pointer"
                    >
                      添加对话题
                    </button>
                  </form>

                  {/* Dialogue Lists */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {dialogues.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-6 bg-slate-50/50 rounded-lg border border-dashed">
                        本课暂无自定义对话题，系统会自动提取课文对话上下文做接对话配对。
                      </p>
                    ) : (
                      dialogues.map((q, idx) => (
                        <div key={idx} className="bg-white p-3 border border-slate-200/80 rounded-xl text-xs space-y-1.5 relative">
                          <button
                            type="button"
                            onClick={() => handleDeleteQuizItem("dialogues", idx)}
                            className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold"
                          >
                            ✕
                          </button>
                          <p className="font-bold text-slate-700">上一句: {q.previousLineCharacter}</p>
                          <p className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold w-fit">
                            正确答: {q.correctAnswerCharacter}
                          </p>
                          <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500 font-mono">
                            {q.options.map((opt, oIdx) => (
                              <span key={oIdx} className="truncate">· {opt}</span>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            );
          })()}
        </div>
      )}

      {/* MODAL 1: ADD / EDIT LESSON OVERLAY */}
      {showLessonModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              id="close-lesson-modal-btn"
              onClick={() => setShowLessonModal(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-slate-800 mb-4 pb-2 border-b">
              {lessonFormId ? "编辑课文设置" : "新建课程单元"}
            </h3>

            <form onSubmit={handleSaveLesson} className="space-y-4 flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">课文标题-中文 (e.g. 第一课：问好)</label>
                  <input
                    type="text"
                    required
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">标题拼音 (e.g. Dì-yī Kè: Wènhǎo)</label>
                  <input
                    type="text"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    value={lessonPinyin}
                    onChange={(e) => setLessonPinyin(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">课文导读 / 学习描述</label>
                <textarea
                  rows={2}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={lessonDesc}
                  onChange={(e) => setLessonDesc(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">课文类型 / Lesson Type</label>
                  <select
                    value={lessonType}
                    onChange={(e) => setLessonType(e.target.value as "dialogue" | "prose")}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                  >
                    <option value="dialogue">💬 对话课文 (Dialogue Lesson)</option>
                    <option value="prose">📝 短文课文 (Prose/Essay Lesson)</option>
                  </select>
                </div>
                <div className="flex flex-col justify-end">
                  <span className="text-[10px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-medium leading-relaxed">
                    💡 对话课文角色逐句唱答，短文课文更适合散文、故事或长段落拼音精读。
                  </span>
                </div>
              </div>

              <ImageUploadWidget
                label="课文插图选择（可传本地电脑图片或浏览云端硬盘）"
                value={lessonImage}
                onChange={setLessonImage}
                randomPlaceholderSeed={`lesson-${Date.now()}`}
                onGenerateRandom={() => setLessonImage(`https://picsum.photos/seed/lesson-${Date.now() % 1000}/600/400`)}
              />

              {/* Dialogue Rows List */}
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-1 border-b border-slate-50">
                  <span className="text-xs font-extrabold text-slate-600 block">
                    {lessonType === "dialogue" ? "课文内容行管理 (每行对应一句对话)" : "课文短文段落管理 (每行对应一段或一长句)"}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLineRow}
                    className="flex items-center space-x-1 text-emerald-700 hover:text-emerald-800 font-bold text-xs bg-emerald-50 px-2 py-1 rounded cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{lessonType === "prose" ? "添加一段" : "添加一行"}</span>
                  </button>
                </div>

                {lessonLines.length === 0 ? (
                  <p className="text-slate-400 italic text-xs py-3 text-center bg-slate-50 rounded-xl">
                    {lessonType === "prose" ? "短文段落当前为空，请添加段落" : "对话行当前为空，请添加对话"}
                  </p>
                ) : (
                  <div className="space-y-4 max-h-[440px] overflow-y-auto pr-1">
                    {lessonLines.map((line, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col space-y-3 relative">
                        {/* Title and delete action row */}
                        <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
                          <span className="text-[11px] font-black text-slate-700 bg-amber-100/75 text-amber-950 px-2.5 py-0.5 rounded-lg font-sans">
                            {lessonType === "prose" ? getParagraphLabel(idx) : `Dialogue Row #${idx + 1}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveLineRow(idx)}
                            className="text-red-500 hover:text-red-700 text-xs font-semibold bg-white hover:bg-red-50 border border-slate-200 shadow-3xs px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                            title="删除此行"
                          >
                            ✕ {translateChinese("删除", chineseMode)}
                          </button>
                        </div>

                        {/* Split layout: inputs vs inline picture uploader widget */}
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                          {/* Left inputs column */}
                          <div className="lg:col-span-3 space-y-3">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-bold mb-1">
                                ✍️ {lessonType === "prose" ? "短文段落汉字内容" : "中文对话汉字"}
                              </span>
                              <textarea
                                required
                                rows={2}
                                placeholder={lessonType === "prose" ? `输入${getParagraphLabel(idx)}的中文正文...` : "e.g. 很高兴认识你！本周六你有空吗？"}
                                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold"
                                value={line.character}
                                onChange={(e) => handleDialogueLineChange(idx, "character", e.target.value)}
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <span className="text-[10px] text-slate-400 block font-bold mb-1">
                                  拼音 Annotation Pinyin
                                </span>
                                <input
                                  type="text"
                                  placeholder={lessonType === "prose" ? "段落拼音注解..." : "e.g. Hěn gāoxìng rènshi nǐ!"}
                                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                                  value={line.pinyin || ""}
                                  onChange={(e) => handleDialogueLineChange(idx, "pinyin", e.target.value)}
                                />
                              </div>

                              <div>
                                <span className="text-[10px] text-slate-400 block font-bold mb-1">
                                  英文翻译 English Translation
                                </span>
                                <input
                                  type="text"
                                  placeholder={lessonType === "prose" ? "段落意思翻译..." : "e.g. Nice to meet you!"}
                                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                                  value={line.translation || ""}
                                  onChange={(e) => handleDialogueLineChange(idx, "translation", e.target.value)}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Right side companion picture upload uploader for the paragraph */}
                          <div className="bg-white p-3 rounded-xl border border-slate-150 flex flex-col justify-between space-y-2">
                            <div>
                              <span className="text-[10px] font-black text-slate-500 block uppercase tracking-wider mb-1 text-center lg:text-left">
                                🖼️ {translateChinese("段落配图", chineseMode)}
                              </span>
                              
                              {line.imageUrl ? (
                                <div className="space-y-1.5">
                                  <img
                                    src={line.imageUrl}
                                    alt="Paragraph thumbnail"
                                    referrerPolicy="no-referrer"
                                    className="w-full h-16 object-cover rounded-xl border border-slate-200 shadow-3xs bg-slate-50"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleDialogueLineChange(idx, "imageUrl", "")}
                                    className="w-full text-[9px] text-red-600 bg-red-50 hover:bg-red-100 py-1.5 rounded-lg font-black text-center transition-colors cursor-pointer"
                                  >
                                    删除图片 ✕
                                  </button>
                                </div>
                              ) : (
                                <div className="border border-dashed border-slate-200 rounded-xl p-3 text-center bg-slate-50/50 flex flex-col items-center justify-center min-h-[85px]">
                                  <p className="text-[9px] text-slate-400 font-bold mb-2">未添加段落图</p>
                                  <div className="space-y-1 w-full">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenImageUploaderIdx(openImageUploaderIdx === idx ? null : idx);
                                      }}
                                      className="w-full text-[9px] text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100/85 py-1 px-1.5 rounded-md font-black block transition cursor-pointer text-center"
                                    >
                                      {openImageUploaderIdx === idx ? "关闭面板 ✕" : "添加图片 ➕"}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {openImageUploaderIdx === idx && !line.imageUrl && (
                              <div className="pt-2 border-t border-slate-100 space-y-1">
                                <ImageUploadWidget
                                  label="加载网络地址或上传本地电脑插图"
                                  value={line.imageUrl || ""}
                                  onChange={(newVal) => {
                                    handleDialogueLineChange(idx, "imageUrl", newVal);
                                    setOpenImageUploaderIdx(null); // Auto close after pick
                                  }}
                                  randomPlaceholderSeed={`parg-seed-${idx}-${Date.now()}`}
                                  onGenerateRandom={() => {
                                    handleDialogueLineChange(idx, "imageUrl", `https://picsum.photos/seed/parg-${idx}-${Date.now() % 1000}/600/400`);
                                    setOpenImageUploaderIdx(null);
                                  }}
                                />
                              </div>
                            )}

                            {line.imageUrl && (
                              <div className="space-y-1">
                                <span className="text-[8px] text-slate-400 block font-mono">图片URL地址:</span>
                                <input
                                  type="text"
                                  className="w-full text-[8px] p-1 border border-slate-100 rounded focus:outline-none font-mono text-slate-500 bg-slate-50"
                                  value={line.imageUrl}
                                  onChange={(e) => handleDialogueLineChange(idx, "imageUrl", e.target.value)}
                                  placeholder="网络大图网址..."
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowLessonModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-500 font-semibold rounded-xl text-xs cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl text-xs flex items-center space-x-1.5 shadow-md cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>保存设置</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT VOCABULARY OVERLAY */}
      {showVocabModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              id="close-vocab-modal-btn"
              onClick={() => setShowVocabModal(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-slate-800 mb-4 pb-2 border-b">
              {vocabFormId ? "修改生词词汇" : "添加生词字典条目"}
            </h3>

            <form onSubmit={handleSaveVocab} className="space-y-4 flex-1 overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">生词词汇-中文汉字 *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 欢迎"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={vocabWord}
                  onChange={(e) => setVocabWord(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">词组拼音 Checkpoint *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. huānyíng"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={vocabPinyin}
                  onChange={(e) => setVocabPinyin(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">英文释义 / 意思 *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. to welcome; welcome"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={vocabTrans}
                  onChange={(e) => setVocabTrans(e.target.value)}
                />
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-3">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase font-mono tracking-wider block">例句设计 / Example Context (Optional)</span>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">例句汉字</label>
                  <input
                    type="text"
                    placeholder="e.g. 欢迎来到中国！"
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                    value={vocabExCh}
                    onChange={(e) => setVocabExCh(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">例句拼音</label>
                  <input
                    type="text"
                    placeholder="e.g. Huānyíng lái dào Zhōngguó!"
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                    value={vocabExPy}
                    onChange={(e) => setVocabExPy(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">例句翻译</label>
                  <input
                    type="text"
                    placeholder="e.g. Welcome to China!"
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                    value={vocabExEn}
                    onChange={(e) => setVocabExEn(e.target.value)}
                  />
                </div>

                <ImageUploadWidget
                  label="生词配图选择（可电脑本地上传或浏览云盘）"
                  value={vocabImage}
                  onChange={setVocabImage}
                  randomPlaceholderSeed={`vocab-${vocabWord}`}
                  onGenerateRandom={() => setVocabImage(`https://picsum.photos/seed/vocab-${vocabWord || Date.now() % 1000}/400/400`)}
                />
              </div>

              <div className="pt-4 border-t flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowVocabModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-500 font-semibold rounded-xl text-xs cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl text-xs flex items-center space-x-1.5 shadow-md cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>添加并保存</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REGISTER STUDENT PROFILE OVERLAY */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              id="close-student-modal-btn"
              onClick={() => setShowStudentModal(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-md font-extrabold text-slate-800 mb-4 pb-2 border-b">
              在教室加入新的学生成员
            </h3>

            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">学号 / 登录账号 Username *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. student3"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={studentUsername}
                  onChange={(e) => setStudentUsername(e.target.value)}
                />
                <p className="text-[10px] text-slate-400 mt-1">* 账号名将统一转为小写字母，不允许重复。</p>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">姓名 / Student's Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 李明 (Li Ming)"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">登录密码 / Initial Password *</label>
                <input
                  type="text"
                  required
                  placeholder="初始访问密码"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={studentPassword}
                  onChange={(e) => setStudentPassword(e.target.value)}
                />
              </div>

              <div className="pt-4 border-t flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-500 font-semibold rounded-xl text-xs cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-extrabold rounded-xl text-xs cursor-pointer"
                >
                  注册该学生
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION OR ALERT SYSTEM MODAL */}
      {customConfirm.isOpen && (
        <div id="custom-confirmation-modal" className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative border border-slate-100 transform scale-100 transition-all">
            <div className="flex items-center space-x-2 text-amber-600 mb-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <h3 className="text-sm font-black text-slate-800">{customConfirm.title || "请确认您的操作"}</h3>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line mb-5">
              {customConfirm.message}
            </p>

            <div className="flex items-center justify-end space-x-2 border-t border-slate-100 pt-4">
              {!customConfirm.isAlert && (
                <button
                  type="button"
                  id="confirm-modal-cancel"
                  onClick={() => setCustomConfirm(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  取消
                </button>
              )}
              <button
                type="button"
                id="confirm-modal-submit"
                onClick={async () => {
                  const targetAction = customConfirm.onConfirm;
                  setCustomConfirm(prev => ({ ...prev, isOpen: false }));
                  if (targetAction) {
                    await targetAction();
                  }
                }}
                className={`px-4 py-2 text-white font-black rounded-xl text-xs shadow-md transition-colors cursor-pointer ${
                  customConfirm.isAlert ? "bg-slate-800 hover:bg-slate-900" : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {customConfirm.isAlert ? "我知道了" : "确认执行"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
