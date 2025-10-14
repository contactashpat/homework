import type { FlashcardCategory } from "../types";

export type CategoryMeta = {
  name: string;
  locked: boolean;
  parentId: string | null;
  path: string;
};

export const buildCategoryMetaMap = (
  categories: FlashcardCategory[],
): Map<string, CategoryMeta> => {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const pathCache = new Map<string, string>();

  const computePath = (category: FlashcardCategory): string => {
    if (pathCache.has(category.id)) {
      return pathCache.get(category.id)!;
    }
    const parent = category.parentId ? byId.get(category.parentId) : undefined;
    const path = parent ? `${computePath(parent)} › ${category.name}` : category.name;
    pathCache.set(category.id, path);
    return path;
  };

  const meta = new Map<string, CategoryMeta>();
  categories.forEach((category) => {
    meta.set(category.id, {
      name: category.name,
      locked: category.locked,
      parentId: category.parentId ?? null,
      path: computePath(category),
    });
  });

  return meta;
};
