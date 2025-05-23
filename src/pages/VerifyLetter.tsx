import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CheckCircle, AlertCircle } from 'lucide-react'

export function VerifyLetter() {
  const { code } = useParams()
  const [letter, setLetter] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function verifyLetter() {
      try {
        const { data, error } = await supabase
          .rpc('verify_letter', { verification_code: code })
          .single()

        if (error) throw error
        setLetter(data)
      } catch (err) {
        console.error('Error:', err)
        setError('لم نتمكن من التحقق من صحة هذا الخطاب')
      } finally {
        setLoading(false)
      }
    }

    if (code) {
      verifyLetter()
    }
  }, [code])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 relative overflow-hidden">
        {/* خلفية متحركة */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/5 rounded-full blur-2xl" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-primary/5 rounded-full blur-2xl" />
        
        {/* المحتوى */}
        <div className="relative">
          {/* الشعار */}
          <div className="flex justify-center mb-6">
            <img 
              src="https://hbxalipjrbcrqljddxfp.supabase.co/storage/v1/object/public/templates//logo.png" 
              alt="الجمعية السعودية للإعاقة السمعية" 
              className="h-20 animate-fade-in object-contain"
            />
          </div>

          {error ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">فشل التحقق</h1>
              <p className="text-gray-600">{error}</p>
            </div>
          ) : (
            <>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">تم التحقق من صحة الخطاب</h1>
                <p className="text-gray-600 mb-6">
                  هذا الخطاب صادر رسمياً من الجمعية السعودية للإعاقة السمعية
                </p>
              </div>

              <div className="space-y-4 border-t pt-6">
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">رقم الخطاب</div>
                  <div className="text-lg font-semibold text-gray-900 font-mono">
                    {letter.number}/{letter.year}
                  </div>
                </div>

                {letter.creator_name && (
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-1">محرر الخطاب</div>
                    <div className="text-gray-900">{letter.creator_name}</div>
                  </div>
                )}

                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">تاريخ الإصدار</div>
                  <div className="text-gray-900">
                    {new Date(letter.created_at).toLocaleDateString('ar-SA')}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">الرقم التسلسلي</div>
                  <div className="text-sm font-mono bg-gray-50 p-2 rounded-lg border border-gray-200 break-all">
                    {letter.verification_url}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}