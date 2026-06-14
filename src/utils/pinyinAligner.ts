/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface PinyinBlock {
  chars: string;
  pinyin: string;
}

/**
 * Align Chinese characters with space-separated Pinyin words.
 * Handles punctuation and splits composite words into single characters where possible,
 * or serves word blocks for clean alignment above characters.
 */
export function alignPinyinAndChinese(chinese: string, pinyin: string): PinyinBlock[] {
  if (!chinese) return [];
  if (!pinyin) {
    return Array.from(chinese).map(c => ({ chars: c, pinyin: "" }));
  }

  // Clean and split pinyin into space-separated physical words
  const pinyinWords = pinyin.trim().split(/\s+/).filter(Boolean);
  const blocks: PinyinBlock[] = [];
  
  let pinyinIdx = 0;
  let charIdx = 0;

  // Simple and highly robust alignment engine
  while (charIdx < chinese.length) {
    const char = chinese[charIdx];

    // If it is punctuation / whitespace / non-Chinese character
    const isChinese = /[\u4e00-\u9fa5]/.test(char);
    if (!isChinese) {
      blocks.push({ chars: char, pinyin: "" });
      charIdx++;
      continue;
    }

    // If we still have Pinyin words left
    if (pinyinIdx < pinyinWords.length) {
      const pinyinWord = pinyinWords[pinyinIdx];
      // Strip punctuation to detect syllable weight
      const cleanPinyin = pinyinWord.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?！，。？（）"']/g, "");
      
      // Determine how many Chinese characters to swallow for this pinyin word.
      // Usually, standard Pinyin syllables are represented by sound clusters.
      // We count vowel clusters or tone-marked accents (ā, á, ǎ, à, etc.)
      const vowelMatches = cleanPinyin.toLowerCase().match(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜaeiouvü]+/g) || [];
      
      // We look at how many Chinese characters ahead are consecutive
      let consecutiveChineseCount = 0;
      while (charIdx + consecutiveChineseCount < chinese.length && 
             /[\u4e00-\u9fa5]/.test(chinese[charIdx + consecutiveChineseCount])) {
        consecutiveChineseCount++;
      }

      // We devour up to consecutiveChineseCount characters to align with this pinyinWord
      // Default to either vowel groups count (e.g. míngzi has 2 vowels, groups 2 characters) or 1
      let grabCount = 1;
      if (vowelMatches.length > 1) {
        grabCount = Math.min(vowelMatches.length, consecutiveChineseCount);
      } else {
        grabCount = 1;
      }

      const charsGroup = chinese.slice(charIdx, charIdx + grabCount);
      blocks.push({
        chars: charsGroup,
        pinyin: pinyinWord
      });

      charIdx += grabCount;
      pinyinIdx++;
    } else {
      // Out of pinyin words, just consume remainder as empty-pinyin blocks
      blocks.push({ chars: char, pinyin: "" });
      charIdx++;
    }
  }

  return blocks;
}
