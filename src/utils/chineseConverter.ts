/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Unique dictionary for 1-to-1 Simplified to Traditional Chinese character rendering
const S_TO_T_MAP: Record<string, string> = {
  "汉": "漢", "语": "語", "欣": "欣", "学": "學", "习": "習", "师": "師", "老": "老", "自": "自",
  "课": "課", "外": "外", "愿": "願", "复": "複", "终": "終", "端": "端", "效": "效", "双": "雙",
  "丽": "麗", "声": "聲", "绩": "績", "历": "歷", "史": "史", "说": "說", "话": "話", "读": "讀",
  "写": "寫", "听": "聽", "练": "練", "测": "測", "验": "驗",
  "作": "作", "业": "業", "成": "成", "错": "錯", "缴": "繳", "交": "交", "状": "狀", "态": "態",
  "简": "簡", "繁": "繁", "体": "體", "客": "客", "户": "戶", "密": "密", "码": "碼", "登": "登",
  "录": "錄", "入": "入", "创": "創", "建": "建", "删": "刪", "除": "除", "新": "新", "旧": "舊",
  "东": "東", "西": "西", "南": "南", "北": "北", "京": "京", "国": "國", "们": "們", "高": "高",
  "兴": "興", "认": "認", "识": "識", "会": "會", "饭": "飯", "店": "店", "点": "點", "菜": "菜",
  "厅": "廳", "餐": "餐", "肴": "餚", "名": "名", "称": "稱", "账": "賬", "单": "單", "这": "這",
  "儿": "兒", "饺": "餃", "特": "特", "别": "別", "棒": "棒", "那": "那", "盘": "盤", "还": "還",
  "杯": "杯", "热": "熱", "慢": "慢", "用": "用", "买": "買", "时": "時", "候": "候", "问": "問",
  "好": "好", "结": "結", "朋": "朋", "友": "友", "绍": "紹", "介": "介", "乐": "樂", "欢": "歡",
  "迎": "迎", "来": "來", "到": "到", "谁": "誰", "什": "什", "么": "麼", "岁": "歲", "几": "幾",
  "多": "多", "少": "少", "钱": "錢", "贵": "貴", "个": "個", "只": "隻", "头": "頭", "条": "條",
  "张": "張", "书": "書", "笔": "筆", "纸": "紙", "电": "電", "脑": "腦", "视": "視", "机": "機",
  "车": "車", "飞": "飛", "船": "船", "路": "路", "号": "號", "门": "門", "开": "開", "关": "關",
  "没": "沒", "有": "有", "无": "無", "两": "兩", "百": "百", "千": "千", "万": "萬", "亿": "億",
  "钟": "鐘", "分": "分", "秒": "秒", "天": "天", "年": "年", "月": "月", "日": "日",
  "期": "期", "星": "星", "礼": "禮", "拜": "拜", "谢": "謝", "对": "對", "不": "不", "起": "起",
  "系": "系", "再": "再", "见": "見", "请": "請", "与": "與", "及": "及", "实": "實", "存": "存",
  "储": "儲", "全": "全", "班": "班", "同": "同", "步": "步", "改": "改", "动": "動", "云": "雲",
  "即": "即", "拥": "擁", "编": "編", "辑": "輯", "销": "銷",

  "便宜": "便宜",
  "谢谢": "謝謝",
  "教师": "教師", "学生": "學生", "名单": "名單", "密码": "密碼", "进度": "進度", "小测验": "小測驗",
  "成绩": "成績", "错题": "錯题", "状态": "狀態", "提交": "提交", "登出": "登出", "登录": "登錄",
  "自修": "自修", "平台": "平台", "课文": "課文", "生词": "生詞", "闪卡": "閃卡", "练习": "練習",
  "控制": "控制", "后台": "后台", "管理": "管理", "注册": "註冊", "姓名": "姓名", "拼音": "拼音",
  "翻译": "翻譯", "例句": "例句", "释义": "釋義", "自我": "自我", "介绍": "介紹", "基本": "基本",
  "结交": "結交"
};

// Generates reverse traditional to simplified just in case (though we default to Simplified in the raw code)
const T_TO_S_MAP: Record<string, string> = {};
Object.entries(S_TO_T_MAP).forEach(([s, t]) => {
  T_TO_S_MAP[t] = s;
});

// @ts-ignore
import * as OpenCC from "opencc-js";

let s2tConverter: any = null;

function getConverter() {
  if (s2tConverter) return s2tConverter;
  try {
    // opencc-js exports differently depending on ESM/CJS and environment
    if (OpenCC && typeof OpenCC.Converter === "function") {
      s2tConverter = OpenCC.Converter({ from: "cn", to: "tw" });
    } else if (OpenCC && (OpenCC as any).default && typeof (OpenCC as any).default.Converter === "function") {
      s2tConverter = (OpenCC as any).default.Converter({ from: "cn", to: "tw" });
    } else if (typeof OpenCC === "function") {
      s2tConverter = (OpenCC as any)({ from: "cn", to: "tw" });
    }
  } catch (err) {
    console.warn("Failed loading full OpenCC converter:", err);
  }
  return s2tConverter;
}

/**
 * Transforms Chinese string between Simplified and Traditional based on active preference
 */
export function translateChinese(text: string | undefined | null, mode: "simplified" | "traditional"): string {
  if (!text) return "";
  if (mode === "simplified") {
    // String is authored in simplified; we can leave as-is or replace backwards if needed
    return text;
  }

  // Attempt full-accuracy dictionary conversion using opencc-js
  try {
    const converter = getConverter();
    if (converter) {
      return converter(text);
    }
  } catch (err) {
    console.warn("OpenCC conversion error, reverting to localized char-mapping fallback:", err);
  }

  // Convert character-by-character while matching multi-character phrases in the dictionary first (Fallback)
  let result = text;
  
  // Try to replace common terms first to avoid split-character issues
  const multiCharPhrases = Object.keys(S_TO_T_MAP).filter(k => k.length > 1).sort((a, b) => b.length - a.length);
  multiCharPhrases.forEach(phrase => {
    result = result.replaceAll(phrase, S_TO_T_MAP[phrase]);
  });

  // Then convert single characters
  let charArray = Array.from(result);
  for (let i = 0; i < charArray.length; i++) {
    const char = charArray[i];
    if (S_TO_T_MAP[char]) {
      charArray[i] = S_TO_T_MAP[char];
    }
  }

  return charArray.join("");
}
