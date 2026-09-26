import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

function renderCard(book: BookCard, onOpen = vi.fn()) {
  return render(<BookCardView book={book} onOpen={onOpen} />);
}

describe("BookCardView", () => {
  it("タイトルを表示し、クリックすると書籍IDを渡す", () => {
    const onOpen = vi.fn();
    renderCard(buildBook({ id: 7 }), onOpen);

    fireEvent.click(screen.getByRole("button", { name: /リーダブルコード/ }));

    expect(onOpen).toHaveBeenCalledWith(7);
  });

  it("タグは2つまで表示し、残りは数だけ表示する", () => {
    const tags = ["技術書", "設計", "名著", "再読"].map((name, index) => ({ id: index + 1, name }));
    renderCard(buildBook({ tags }));

    const card = screen.getByRole("button");
    expect(card).toHaveTextContent("#技術書#設計+2");
    expect(card).not.toHaveTextContent("名著");
  });

  it("書影URLがなければプレースホルダを表示する", () => {
    renderCard(buildBook());

    expect(screen.getByRole("img", { name: "書影なし" })).toBeInTheDocument();
  });

  it("書影を読み込めなかった場合はプレースホルダに切り替える", () => {
    const { container } = renderCard(
      buildBook({ cover_image_url: "https://example.com/broken.jpg" }),
    );
    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", "https://example.com/broken.jpg");

    fireEvent.error(image!);

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("img", { name: "書影なし" })).toBeInTheDocument();
  });
});
