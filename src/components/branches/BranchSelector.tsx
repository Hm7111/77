import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Branch } from '../../types/database'

interface BranchSelectorProps {
  value: string | null | undefined
  onChange: (value: string | null) => void
  disabled?: boolean
  required?: boolean
  placeholder?: string
  showAll?: boolean
  className?: string
  error?: string
}

export function BranchSelector({ 
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder = 'اختر الفرع',
  showAll = false,
  className = '',
  error
}: BranchSelectorProps) {
  const [selectedValue, setSelectedValue] = useState<string | null | undefined>(value)

  useEffect(() => {
    setSelectedValue(value)
  }, [value])

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('name')
      
      if (error) throw error
      return data as Branch[]
    }
  })

  // تحميل الفروع النشطة فقط، إلا إذا كان showAll مفعلاً
  const filteredBranches = showAll 
    ? branches 
    : branches.filter(branch => branch.is_active)

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value === '' ? null : e.target.value
    setSelectedValue(newValue)
    onChange(newValue)
  }

  return (
    <div className="relative">
      <select
        value={selectedValue || ''}
        onChange={handleChange}
        disabled={disabled || isLoading}
        required={required}
        className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
          error ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : ''
        } ${className}`}
      >
        <option value="">{isLoading ? 'جاري تحميل الفروع...' : placeholder}</option>
        {filteredBranches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name} ({branch.code})
          </option>
        ))}
      </select>
      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
    </div>
  )
}