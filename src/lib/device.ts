/**
 * 画面のフォームファクタ。サムネイルの縦横比と生成時のビューポートを決める。
 * docs/AI-GENERATION.md §3 を参照。
 */
export type DeviceType = "desktop" | "mobile";

export const DEVICE_OPTIONS: {
  value: DeviceType;
  label: string;
  /** キャンバスカードのアスペクト比に使う Tailwind クラス */
  aspectClass: string;
  /** キャプチャ時の想定ビューポート幅と上部クロップ高（M2で使用） */
  capture: { width: number; height: number };
}[] = [
  {
    value: "desktop",
    label: "PC",
    aspectClass: "aspect-[16/10]",
    capture: { width: 1440, height: 900 },
  },
  {
    value: "mobile",
    label: "スマホ",
    aspectClass: "aspect-[9/16]",
    capture: { width: 390, height: 694 },
  },
];

export const DEFAULT_DEVICE: DeviceType = "desktop";

export function isDeviceType(value: unknown): value is DeviceType {
  return value === "desktop" || value === "mobile";
}

export function deviceAspectClass(device: string): string {
  return (
    DEVICE_OPTIONS.find((d) => d.value === device)?.aspectClass ??
    "aspect-[16/10]"
  );
}

export function deviceLabel(device: string): string {
  return DEVICE_OPTIONS.find((d) => d.value === device)?.label ?? device;
}
