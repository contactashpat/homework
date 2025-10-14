import { FlashcardForm } from '../../components/FlashcardForm'
import { FlashcardList } from '../../components/FlashcardList'

export default function FlashcardsPage() {
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-900 dark:text-white">
        Flashcards
      </h1>
      <FlashcardForm />
      <FlashcardList />
    </div>
  )
}
