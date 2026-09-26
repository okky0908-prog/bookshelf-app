// ボタンの見た目（モックアップに合わせる）

const base = "h-10 rounded-lg px-4 disabled:cursor-default disabled:opacity-45";

export const buttonClass = {
  /** 保存など、主な操作 */
  primary: `${base} bg-accent px-5.5 font-bold text-white hover:bg-accent/90`,
  /** キャンセルなど */
  secondary: `${base} border border-field-line bg-surface text-ink hover:bg-ground`,
  /** 削除の確認ダイアログの［削除する］ */
  danger: `${base} bg-danger px-4.5 font-bold text-white hover:bg-danger/90`,
  /** モーダルの［削除］ */
  dangerOutline: `${base} border border-[#e3b7b1] bg-surface text-danger hover:bg-[#fbeeec]`,
};
