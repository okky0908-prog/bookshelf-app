import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest の globals を使わない設定では Testing Library が自動で後片付けしないため、テストごとに描画を消す
afterEach(() => {
  cleanup();
});
