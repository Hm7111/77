import { BranchesList } from '../../components/branches/BranchesList'
import { useAuth } from '../../lib/auth'

export function Branches() {
  const { isAdmin } = useAuth()

  if (!isAdmin) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
        عذراً، يجب أن تكون مديراً للوصول إلى هذه الصفحة
      </div>
    )
  }

  return <BranchesList />
}