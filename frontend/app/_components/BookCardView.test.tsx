import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BookCard } from "@/lib/types";
import { BookCardView } from "./BookCardView";

function buildBook(overrides: Partial<BookCard> = {}): BookCard {
  return {
    id: 1,
    title: "リーダブルコード",
    cover_image_url: null,
    status: "unread",
    position: 1,
    tags: [],
    ...overrides,
  };
}

describe("BookCardView", () => {
  it("タイトルを表示する", () => {
    render(<BookCardView book={buildBook()} />);

    expect(screen.getByRole("heading", { name: "リーダブルコード" })).toBeInTheDocument();
  });

  it("タグは2つまで表示し、残りは数だけ表示する", () => {
    const tags = ["技術書", "設計", "名著", "再読"].map((name, index) => ({ id: index + 1, name }));
    render(<BookCardView book={buildBook({ tags })} />);

    const items = screen.getAllByRole("listitem").map((item) => item.textContent);
    expect(items).toEqual(["#技術書", "#設計", "+2"]);
  });

  it("タグがなければタグの欄を表示しない", () => {
    render(<BookCardView book={buildBook()} />);

    expect(screen.queryByRole("list", { name: "タグ" })).not.toBeInTheDocument();
  });

  it("書影URLがなければプレースホルダを表示する", () => {
    render(<BookCardView book={buildBook()} />);

    expect(screen.getByRole("img", { name: "書影なし" })).toBeInTheDocument();
  });

  it("書影を読み込めなかった場合はプレースホルダに切り替える", () => {
    const { container } = render(
      <BookCardView book={buildBook({ cover_image_url: "https://example.com/broken.jpg" })} />,
    );
    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", "https://example.com/broken.jpg");

    fireEvent.error(image!);

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("img", { name: "書影なし" })).toBeInTheDocument();
  });
});
