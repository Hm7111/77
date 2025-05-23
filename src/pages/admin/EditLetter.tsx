import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Save, Eye, Settings } from 'lucide-react'
import { useLetters } from '../../hooks/useLetters'
import { RichTextEditor } from '../../components/letters/RichTextEditor'
import { supabase } from '../../lib/supabase'
import moment from 'moment-hijri'
import type { Letter, Template } from '../../types/database'

const MONTHS_AR = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
  'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
]

export function EditLetter() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const { updateLetter } = useLetters()
  const [letter, setLetter] = useState<Letter | null>(null)
  const [template, setTemplate] = useState<Template | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [content, setContent] = useState<Record<string, string>>({})
  const [showGuides, setShowGuides] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)

  useEffect(() => {
    loadLetter()
  }, [id])

  async function loadLetter() {
    try {
      const { data: letter, error } = await supabase
        .from('letters')
        .select('*, letter_templates(*)')
        .eq('id', id)
        .single()

      if (error) throw error

      setLetter(letter)
      setTemplate(letter.letter_templates)
      setContent(letter.content)
    } catch (error) {
      console.error('Error:', error)
      alert('حدث خطأ أثناء تحميل الخطاب')
      navigate('/admin/letters')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!letter) return

    setIsLoading(true)
    try {
      await updateLetter({
        id: letter.id,
        content,
        status: 'draft',
        updated_at: new Date().toISOString()
      })

      navigate('/admin/letters')
    } catch (error) {
      console.error('Error:', error)
      alert('حدث خطأ أثناء حفظ الخطاب')
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

  if (!letter || !template) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const today = moment()
  const currentHijriYear = today.iYear()
  const currentHijriMonth = today.iMonth()
  const currentHijriDay = today.iDate()
  const daysInMonth = today.iDaysInMonth()

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-x-2">
          <button
            onClick={() => navigate('/admin/letters')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">تعديل الخطاب</h1>
        </div>
        <div className="flex items-center gap-x-2">
          <button
            onClick={() => setShowGuides(!showGuides)}
            className={`p-2 rounded-lg ${
              showGuides ? 'bg-yellow-500 text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
            title={showGuides ? 'إخفاء النقاط الإرشادية' : 'إظهار النقاط الإرشادية'}
          >
            <Settings className="h-5 w-5" />
          </button>
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`p-2 rounded-lg ${
              previewMode ? 'bg-primary text-primary-foreground' : 'text-gray-600 hover:text-gray-900'
            }`}
            title={previewMode ? 'تحرير' : 'معاينة'}
          >
            <Eye className="h-5 w-5" />
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex items-center gap-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isLoading ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex gap-x-6">
          {/* محرر النصوص */}
          <div className="flex-1" style={{ display: previewMode ? 'none' : 'block' }}>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">موضوع الخطاب</label>
                <input
                  type="text"
                  value={content.subject ?? ''}
                  onChange={(e) => setContent(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                  placeholder="أدخل موضوع الخطاب"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">صادر إلى</label>
                <input
                  type="text"
                  value={content.to ?? ''}
                  onChange={(e) => setContent(prev => ({ ...prev, to: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                  placeholder="أدخل الجهة المرسل إليها"
                />
              </div>
            </div>

            <h3 className="text-lg font-semibold mb-4">محرر النصوص</h3>
            <RichTextEditor
              value={content.body ?? ''}
              onChange={(value) => setContent(prev => ({ ...prev, body: value }))}
            />
          </div>

          {/* معاينة القالب */}
          <div className={previewMode ? 'w-full' : 'flex-1'}>
            <h3 className="text-lg font-semibold mb-4">معاينة القالب</h3>
            <div 
              className={`${previewMode ? 'mx-auto' : ''} w-[595px] h-[842px] bg-white rounded-lg shadow relative`}
              style={{
                backgroundImage: `url(${template.image_url})`,
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                direction: 'rtl'
              }}
            >
              <div className="absolute inset-0">
                {showGuides && (
                  <>
                    <div className="absolute top-[48px] left-[100px] w-8 h-6 border-2 border-yellow-500 rounded pointer-events-none" />
                    <div className="absolute top-[83px] left-[100px] w-24 h-6 border-2 border-yellow-500 rounded pointer-events-none" />
                    <div className="absolute top-[200px] right-[60px] left-[60px] h-[520px] border-2 border-yellow-500 rounded pointer-events-none" />
                    <div className="absolute top-[48px] left-[100px] -translate-x-full whitespace-nowrap text-xs text-yellow-600">
                      موقع الرقم
                    </div>
                    <div className="absolute top-[83px] left-[100px] -translate-x-full whitespace-nowrap text-xs text-yellow-600">
                      موقع التاريخ
                    </div>
                    <div className="absolute top-[200px] right-[60px] -translate-y-6 text-xs text-yellow-600">
                      منطقة المحتوى
                    </div>
                  </>
                )}
                <input
                  type="text"
                  value={letter.number ?? ''}
                  readOnly
                  className="absolute top-[25px] left-[85px] w-8 p-3 text-sm font-semibold bg-transparent text-center"
                />
                <input
                  type="text"
                  value={content.date ?? ''}
                  onClick={handleDateClick}
                  readOnly={previewMode}
                  className="absolute top-[60px] left-[40px] w-32 p-1 text-sm font-semibold bg-transparent text-center cursor-pointer"
                />
                {showDatePicker && !previewMode && (
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
                <div 
                  dangerouslySetInnerHTML={{ __html: content.body ?? '' }}
                  className="absolute top-[120px] right-[35px] left-[40px] h-[700px] p-6 text-sm bg-transparent text-justify"
                  style={{
                    fontFamily: 'Cairo',
                    fontSize: '15px',
                    lineHeight: '1.5',
                    letterSpacing: '0.3px',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    whiteSpace: 'pre-wrap'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}