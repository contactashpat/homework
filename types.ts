export interface Flashcard {
  id: string;
  front: string;
  back: string;
  learned?: boolean;
  categoryId: string;
}

export interface FlashcardCategory {
  id: string;
  name: string;
  locked: boolean;
  createdAt: string;
  parentId?: string | null;
}
