import { memo } from 'react'
import QRCode from 'qrcode.react'
import type { Template } from '../../types/database'

interface Props {
  template: Template
  content: Record<string, string>
  onContentChange: (content: Record<string, string>) => void
  showPreview?: boolean
  showDatePicker: boolean
  onDateSelect: (day: number, month: number, year: number) => void
  currentHijriDay: number
  currentHijriMonth: number
  currentHijriYear: number
  daysInMonth: number
  MONTHS_AR: string[]
}

const LetterPreview = memo(function LetterPreview({
  template,
  content,
  onContentChange,
  showDatePicker,
  onDateSelect,
  currentHijriDay,
  currentHijriMonth,
  currentHijriYear,
  daysInMonth,
  MONTHS_AR,
  showPreview = false
}: Props) {
  const qrValue = content.id ? 
    `${window.location.origin}/verify/${content.verification_url}` : 
    'سيتم إنشاء رمز QR بعد حفظ الخطاب'

  return (
    <div className="relative">
      <div 
        className="w-full h-[842px] bg-white rounded-lg shadow relative"
        style={{
          backgroundImage: `url(${template.image_url})`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
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
            onClick={() => onContentChange({ ...content, showDatePicker: true })}
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
                    onClick={() => onDateSelect(day, currentHijriMonth, currentHijriYear)}
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
            onChange={(e) => onContentChange({ ...content, body: e.target.value })}
            className="absolute top-[120px] right-[90px] left-[90px] h-[520px] p-6 text-base bg-transparent focus:outline-none focus:border-primary resize-none leading-8"
            placeholder="محتوى الخطاب"
            dir="rtl"
          />
          
          {/* منطقة رمز QR */}
          <div className="absolute bottom-[40px] left-[90px] flex flex-col items-center gap-2">
            <QRCode
              value={content.verification_url ? 
                `${window.location.origin}/verify/${content.verification_url}` :
                'pending'}
              size={120}
              level="H"
              includeMargin
              className={`bg-white p-2 rounded transition-opacity duration-200 ${
                content.verification_url ? 'opacity-100' : 'opacity-50'
              }`}
              renderAs="svg"
            />
            <span className="text-xs text-gray-500">
              {content.verification_url ? 'رمز التحقق' : 'سيتم إنشاء رمز التحقق بعد حفظ الخطاب'}
            </span>
          </div>

          {/* منطقة التوقيع */}
          <div className="absolute bottom-[40px] right-[90px] w-[200px] text-center">
            <div className="border-b border-gray-300 pb-2 mb-2">
              {content.signature || 'التوقيع'}
            </div>
            <div className="text-sm text-gray-600">
              {content.signedBy || 'المدير التنفيذي'}
            </div>
          </div>
        </div>
      </div>
      
      {/* نظام التعليقات */}
      {!showPreview && (
        <div className="mt-4 border-t pt-4">
          <h4 className="text-sm font-medium mb-2">التعليقات</h4>
          <div className="space-y-2">
            {content.comments?.map((comment: any, index: number) => (
              <div key={index} className="bg-gray-50 p-3 rounded-lg text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{comment.author}</span>
                  <span className="text-gray-500 text-xs">
                    {new Date(comment.date).toLocaleDateString('ar-SA')}
                  </span>
                </div>
                <p className="text-gray-600">{comment.text}</p>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="أضف تعليقاً..."
                className="flex-1 p-2 text-sm border rounded-lg"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value) {
                    const newComment = {
                      text: e.currentTarget.value,
                      author: 'المستخدم الحالي',
                      date: new Date().toISOString()
                    }
                    onContentChange({
                      ...content,
                      comments: [...(content.comments || []), newComment]
                    })
                    e.currentTarget.value = ''
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

export default LetterPreview