import { describe, expect, it } from "vitest";
import { buildCategoryMetaMap } from "../../lib/category";
import type { FlashcardCategory } from "../../types";

const makeCategory = (
  overrides: Partial<FlashcardCategory> & Pick<FlashcardCategory, "id" | "name">,
): FlashcardCategory => ({
  id: overrides.id,
  name: overrides.name,
  locked: overrides.locked ?? false,
  createdAt: overrides.createdAt ?? "2024-01-01T00:00:00.000Z",
  parentId: overrides.parentId ?? null,
});

describe("buildCategoryMetaMap", () => {
  it("returns meta entries for every category", () => {
    const root = makeCategory({ id: "root", name: "Root" });
    const child = makeCategory({
      id: "child",
      name: "Child",
      parentId: root.id,
    });
    const meta = buildCategoryMetaMap([root, child]);

    expect(meta.size).toBe(2);
    expect(meta.get(root.id)).toMatchObject({
      name: "Root",
      path: "Root",
      locked: false,
      parentId: null,
    });
  });

  it("builds a readable breadcrumb path for nested categories", () => {
    const root = makeCategory({ id: "root", name: "Root" });
    const child = makeCategory({
      id: "child",
      name: "Child",
      parentId: root.id,
    });
    const grandchild = makeCategory({
      id: "grandchild",
      name: "Grandchild",
      parentId: child.id,
      locked: true,
    });

    const meta = buildCategoryMetaMap([grandchild, child, root]);
    const grandchildMeta = meta.get(grandchild.id);

    expect(grandchildMeta?.path).toBe("Root › Child › Grandchild");
    expect(grandchildMeta?.locked).toBe(true);
    expect(grandchildMeta?.parentId).toBe(child.id);
  });

  it("falls back to category name when parent is missing", () => {
    const orphan = makeCategory({
      id: "orphan",
      name: "Lost",
      parentId: "missing-parent",
    });

    const meta = buildCategoryMetaMap([orphan]);
    expect(meta.get(orphan.id)?.path).toBe("Lost");
  });
});
