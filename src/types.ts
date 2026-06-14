/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface QuizSubmission {
  id: string;
  lessonId: string;
  lessonTitle: string;
  score: number; // e.g. 80 out of 100
  totalQuestions: number;
  wrongAnswers: {
    questionText: string;
    submittedAnswer: string;
    correctAnswer: string;
  }[];
  submittedAt: string; // ISO date string
  status: "completed" | "submitted";
  submissionType?: "quiz" | "assignment"; // Type of submission
  textAnswer?: string; // Standard written text for homework assignments
  fileUrl?: string; // Picture uploader attachment
  fileName?: string; // Raw attachment filename
}

export type UserRole = "student" | "teacher";

export interface User {
  username: string;
  name: string;
  role: UserRole;
  password?: string;
  submissions?: QuizSubmission[];
}

export interface VocabItem {
  id: string;
  word: string; // e.g. "欢迎"
  pinyin: string; // e.g. "huānyíng"
  translation: string; // e.g. "to welcome"
  exampleCh?: string; // e.g. "欢迎来到北京！"
  examplePy?: string; // e.g. "Huānyíng lái dào Běijīng!"
  exampleEn?: string; // e.g. "Welcome to Beijing!"
  audioUrl?: string; // optional, for custom recording upload
  imageUrl?: string; // Image URL for the vocabulary word
}

export interface TextLine {
  character: string; // e.g. "你好！我是大卫。"
  pinyin: string; // e.g. "Nǐ hǎo! Wǒ shì Dàwèi."
  translation: string; // e.g. "Hello! I am David."
  imageUrl?: string; // Optional image paired with this specific line/paragraph
}

export interface ChoiceQuestion {
  id: string;
  type: "pinyin" | "translation" | "custom";
  questionText: string;
  correctAnswer: string;
  options: string[];
  extendedType?: "choice" | "matching" | "word-bank" | "true-false"; // New question types
  questionImage?: string; // Image attached to the question
  optionImages?: string[]; // Images correlate with options
  matchingPairs?: { left: string; right: string }[]; // For matching questions
}

export interface BlankQuestion {
  vocabWord: string;
  sentenceWithBlank: string; // e.g. "你叫什么____？"
  correctAnswer: string;
  hintEn: string;
}

export interface DialogueQuestion {
  previousLineCharacter: string;
  correctAnswerCharacter: string;
  options: string[];
}

export interface Lesson {
  id: string;
  title: string;          // e.g. "第一课：第一次见面"
  pinyinTitle: string;    // e.g. "Dì-yī kè: Dì-yī cì jiànmiàn"
  description: string;
  lines: TextLine[];
  vocab: VocabItem[];
  audioUrl?: string;      // optional custom audio path
  imageUrl?: string;      // Image URL for the lesson
  lessonType?: "dialogue" | "prose"; // Lesson layout option: conversation or essay/short text
  customChoices?: ChoiceQuestion[];
  customBlanks?: BlankQuestion[];
  customDialogues?: DialogueQuestion[];
  quizPublished?: boolean;
}

export interface DatabaseState {
  users: User[];
  lessons: Lesson[];
}

export interface QuizQuestion {
  id: string;
  type: "single-choice" | "matching";
  questionText: string;
  options?: string[]; // For single-choice
  correctAnswer?: string; // For single-choice
  matchingPairs?: { left: string; right: string }[]; // For matching (e.g. left Chinese word, right translation)
}
