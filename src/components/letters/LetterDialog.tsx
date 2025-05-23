import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import moment from 'moment-hijri'
import { useAuth } from '../../lib/auth'
import { lazy, Suspense } from 'react'
import { TemplateSelector } from './TemplateSelector'

const LetterPreview = lazy(() => import('./LetterPreview'))

const MONTHS_AR = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
  'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
]

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function LetterDialog({ isOpen, onClose, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [templateId, setTemplateId] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [content, setContent] = useState<{ [key: string]: string }>({
    date: moment().format('iDD/iMM/iYYYY')
  })
  
  const { dbUser } = useAuth()
  const [currentYear] = useState(new Date().getFullYear())
  const [nextNumber, setNextNumber] = useState<number | null>(null)

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('letter_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    }
  })

  useEffect(() => {
    if (templateId) {
      loadNextNumber()
    }
  }, [templateId])

  async function loadNextNumber() {
    try {
      const { data, error } = await supabase
        .from('letters')
        .select('number')
        .eq('year', currentYear)
        .order('number', { ascending: false })
        .limit(1)

      if (error) throw error

      const nextNum = data && data.length > 0 ? data[0].number + 1 : 1
      setNextNumber(nextNum)
      setContent(prev => ({ ...prev, number: String(nextNum) }))
    } catch (error) {
      console.error('Error loading next number:', error)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('letters')
        .insert({
          user_id: dbUser?.id,
          template_id: templateId,
          status: 'draft',
          content,
          number: nextNumber,
          year: currentYear
        })

      if (error) throw error

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error:', error)
      alert('حدث خطأ أثناء إنشاء الخطاب')
    } finally {
      setIsLoading(false)
    }
  }

  function handleDateClick() {
    setShowDatePicker(true)
  }

  function handleDateSelect(day: number, month: number, year: number) {
    const date = moment()
      .iYear(year)
      .iMonth(month)
      .iDate(day)
      .format('iDD/iMM/iYYYY')
    setContent(prev => ({ ...prev, date }))
    setShowDatePicker(false)
  }

  if (!isOpen) return null

  const selectedTemplate = templates.find(t => t.id === templateId)

  const today = moment()
  const currentHijriYear = today.iYear()
  const currentHijriMonth = today.iMonth()
  const currentHijriDay = today.iDate()
  const daysInMonth = today.iDaysInMonth()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">إنشاء خطاب جديد</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-4">اختر قالباً</h3>
            <TemplateSelector
              templates={templates}
              selectedId={templateId}
              onSelect={setTemplateId}
            />
          </div>

          {selectedTemplate && (
            <Suspense fallback={
              <div className="w-full h-[842px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            }>
              <LetterPreview
                template={selectedTemplate}
                content={content}
                onContentChange={setContent}
                showDatePicker={showDatePicker}
                onDateSelect={handleDateSelect}
                currentHijriDay={currentHijriDay}
                currentHijriMonth={currentHijriMonth}
                currentHijriYear={currentHijriYear}
                daysInMonth={daysInMonth}
                MONTHS_AR={MONTHS_AR}
              />
            </Suspense>
                <div className="absolute inset-0">
                  <input
                    type="text"
                    value={content.number ?? ''}
                    readOnly
                    className="absolute top-[25px] left-[120px] w-40 p-1 text-base font-semibold bg-transparent text-center border-b border-gray-300"
                    placeholder="الرقم"
                  />
                  <input
                    type="text"
                    value={content.date ?? ''}
                    onClick={handleDateClick}
                    className="absolute top-[60px] left-[120px] w-40 p-1 text-base font-semibold bg-transparent text-center border-b border-gray-300"
                    placeholder="التاريخ"
                    readOnly
                  />
                  {showDatePicker && (
                    <div className="absolute top-[90px] left-[120px] w-64 bg-white rounded-lg shadow-lg border p-2 z-10">
                      <div className="text-center mb-2 font-semibold">
                        {MONTHS_AR[currentHijriMonth]} {currentHijriYear}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => handleDateSelect(day, currentHijriMonth, currentHijriYear)}
                            className={`p-1 text-sm rounded hover:bg-gray-100 ${
                              day === currentHijriDay ? 'bg-primary text-white hover:bg-primary/90' : ''
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <textarea
                    value={content.body ?? ''}
                    onChange={(e) => setContent(prev => ({ ...prev, body: e.target.value }))}
                    className="absolute top-[120px] right-[90px] left-[90px] h-[610px] p-6 text-base bg-transparent focus:outline-none focus:border-primary resize-none leading-8"
                    placeholder="محتوى الخطاب"
                    dir="rtl"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-x-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border rounded-lg"
              disabled={isLoading}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg"
              disabled={isLoading}
            >
              {isLoading ? 'جارٍ الإنشاء...' : 'إنشاء'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}