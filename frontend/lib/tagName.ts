/**
 * 表記ゆれをそろえて、同じタグかどうかを判定するキーを作る（docs/database.md 3.3.1）
 * バックエンドの Tag.normalize_name と同じルールにする（テストケースも同じ）
 * 1. 前後の空白を取り除き、連続する空白を1つにする
 * 2. NFKC で全角英数字を半角に、半角カタカナを全角にそろえる
 * 3. 英字を小文字にそろえる
 * 4. カタカナをひらがなにそろえる
 */
export function normalizeTagName(name: string): string {
  return squish(name)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

/** 前後の空白を取り除き、連続する空白を1つにする（全角の空白も含む） */
export function squish(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}
