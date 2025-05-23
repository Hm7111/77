import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Trash2, Edit2, Eye, RefreshCw, WifiOff } from 'lucide-react'
import { useLetters } from '../../hooks/useLetters'

interface Filters {
  status: 'all' | 'draft' | 'completed'
  date: 'all' | 'today' | 'week' | 'month'
}

interface SortOption {
  field: 'created_at' | 'number'
  direction: 'asc' | 'desc'
}

export function Letters() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [connectionError, setConnectionError] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    date: 'all'
  })
  const [sort, setSort] = useState<SortOption>({
    field: 'created_at',
    direction: 'desc'
  })
  const { letters, isLoading, isOffline, reloadAfterExport } = useLetters()

  // تحسين وظيفة التحديث
  async function handleRefresh() {
    setIsRefreshing(true)
    try {
      await queryClient.invalidateQueries({ queryKey: ['letters'] })
      setConnectionError(false)
      
      // إظهار رسالة نجاح
      const notification = document.createElement('div')
      notification.className = 'fixed bottom-4 left-4 bg-green-100 text-green-800 px-4 py-2 rounded-lg shadow-lg'
      notification.textContent = 'تم تحديث البيانات بنجاح'
      document.body.appendChild(notification)
      setTimeout(() => notification.remove(), 3000)
      
    } catch (error) {
      console.error('Error refreshing data:', error)
      setConnectionError(true)
    } finally {
      setIsRefreshing(false)
    }
  }

  const filteredLetters = letters
    .filter(letter =>
      letter.number?.toString().includes(searchQuery) ||
      letter.content?.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      letter.content?.to?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(letter => {
      if (filters.status === 'all') return true
      return letter.status === filters.status
    })
    .filter(letter => {
      const date = new Date(letter.created_at)
      const now = new Date()
      
      switch (filters.date) {
        case 'today':
          return date.toDateString() === now.toDateString()
        case 'week':
          const weekAgo = new Date(now.setDate(now.getDate() - 7))
          return date >= weekAgo
        case 'month':
          const monthAgo = new Date(now.setMonth(now.getMonth() - 1))
          return date >= monthAgo
        default:
          return true
      }
    })
    .sort((a, b) => {
      const direction = sort.direction === 'asc' ? 1 : -1
      
      if (sort.field === 'number') {
        return (a.number! - b.number!) * direction
      }
      
      return (
        new Date(a[sort.field]).getTime() - 
        new Date(b[sort.field]).getTime()
      ) * direction
    })

async function handlePrint(letterId: string) {
  try {
    const { data: letter, error } = await supabase
      .from('letters')
      .select('*, letter_templates(*)')
      .eq('id', letterId)
      .single()

    if (error) throw error

    // إنشاء عنصر مؤقت لعرض الخطاب
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>طباعة الخطاب</title>
          <link href="https://fonts.googleapis.com/css2?family=Cairo&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Cairo', sans-serif;
              margin: 0;
              padding: 0;
            }
            .letter-container {
              width: 21cm;
              height: 29.7cm;
              margin: 0 auto;
              position: relative;
              background-image: url('${letter.letter_templates.image_url}');
              background-size: 100% 100%;
              background-repeat: no-repeat;
            }
            .letter-content {
              position: absolute;
              top: 120px;
              right: 35px;
              left: 40px;
              padding: 24px;
              font-size: 15px;
              line-height: 1.5;
              text-align: justify;
            }
            @media print {
              body { margin: 0; }
              .letter-container {
                width: 100%;
                height: 100vh;
              }
            }
          </style>
        </head>
        <body>
          <div class="letter-container">
            <div class="letter-content">${letter.content.body || ''}</div>
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 500)
  } catch (error) {
    console.error('Error:', error)
    alert('حدث خطأ أثناء الطباعة')
  }
}

async function handleExportPDF(letterId: string) {
  try {
    // إظهار مؤشر التحميل
    // إظهار مؤشر التحميل
    const loadingDiv = document.createElement('div')
    loadingDiv.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50'
    loadingDiv.innerHTML = `
      <div class="bg-white rounded-lg p-4 flex items-center gap-x-3">
        <div class="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        <span>جاري تصدير الملف...</span>
      </div>
    `
    document.body.appendChild(loadingDiv)

    // تحميل بيانات الخطاب
    const { data: letter, error } = await supabase
      .from('letters')
      .select('*, letter_templates(*)')
      .eq('id', letterId)
      .single()

    if (error) throw error

    // انتظار تحميل صورة القالب
    await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = resolve
      img.onerror = reject
      img.src = letter.letter_templates.image_url
    })

    // إنشاء عنصر مؤقت مع القالب
    const container = document.createElement('div')
    container.style.cssText = `
      width: 595px;
      height: 842px;
      position: fixed;
      left: -9999px;
      background-image: url(${letter.letter_templates.image_url});
      background-size: 100% 100%;
      background-repeat: no-repeat;
      font-family: Cairo, sans-serif;
      direction: rtl;
    `

    // إضافة الرقم والتاريخ
    const numberDiv = document.createElement('div')
    numberDiv.style.cssText = `
      position: absolute;
      top: 25px;
      left: 85px;
      width: 40px;
      text-align: center;
      font-size: 14px;
      font-weight: 600;
      direction: ltr;
    `
    numberDiv.textContent = letter.number?.toString() || ''
    
    const dateDiv = document.createElement('div')
    dateDiv.style.cssText = `
      position: absolute;
      top: 60px;
      left: 40px;
      width: 120px;
      text-align: center;
      font-size: 14px;
      font-weight: 600;
      direction: ltr;
    `
    dateDiv.textContent = letter.content.date || ''

    const content = document.createElement('div')
    content.style.cssText = `
      position: absolute;
      top: 120px;
      right: 35px;
      left: 40px;
      padding: 24px;
      font-size: 15px;
      line-height: 1.5;
      text-align: justify;
      direction: rtl;
      font-family: Cairo, sans-serif;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: break-word;
    `
    content.innerHTML = letter.content.body || ''

    container.appendChild(numberDiv)
    container.appendChild(dateDiv)
    container.appendChild(content)
    document.body.appendChild(container)

    // تحويل العنصر إلى صورة
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: null,
      logging: false,
      foreignObjectRendering: true,
      onclone: (clonedDoc) => {
        const clonedContainer = clonedDoc.querySelector('div[style*="left: -9999px"]')
        if (clonedContainer) {
          clonedContainer.style.transform = 'scale(1)'
          clonedContainer.style.transformOrigin = 'top left'
          // انتظار تحميل الخط
          return new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    })

    const pdf = new jsPDF('p', 'pt', 'a4')
    pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, 595, 842)
    pdf.save(`خطاب-${letter.number}-${letter.year}.pdf`)

    // تنظيف العناصر المؤقتة
    // تنظيف العناصر المؤقتة
    document.body.removeChild(container)
    
    // إعادة تحميل البيانات بعد التصدير
    await reloadAfterExport()
    
    
    // إعادة تحميل البيانات بعد التصدير
    await reloadAfterExport()
    
  } catch (error) {
    console.error('Error:', error)
    alert('حدث خطأ أثناء تصدير الملف')
  } finally {
    const loadingDiv = document.querySelector('.fixed.inset-0.bg-black\\/50')
    if (loadingDiv) {
      document.body.removeChild(loadingDiv)
    }
  }
}

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">إدارة الخطابات</h1>
        <div className="flex items-center gap-x-4">
          <div className="relative">
            <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برقم الخطاب أو نوع القالب..."
              className="w-64 pl-3 pr-10 py-2 border rounded-lg text-sm bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
            />
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`p-2 rounded-lg transition-colors ${
                connectionError 
                  ? 'bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/70' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title={connectionError ? 'فشل الاتصال - انقر للمحاولة مرة أخرى' : 'تحديث'}
            >
              {connectionError ? (
                <WifiOff className="h-5 w-5" />
              ) : (
                <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              )}
            </button>
          </div>
          <button
            onClick={() => navigate('new')}
            className="bg-primary text-primary-foreground px-3 py-2 rounded-lg flex items-center gap-x-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            إنشاء خطاب جديد
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : isOffline ? (
        <div className="bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 p-4 rounded-lg text-center">
          <WifiOff className="h-6 w-6 mx-auto mb-2" />
          <p>لا يوجد اتصال بالإنترنت</p>
          <p className="text-sm mt-1">جاري المحاولة مرة أخرى...</p>
        </div>
      ) : letters.length === 0 ? (
        <div>No letters found</div>
      ) : (
        <table className="w-full bg-white dark:bg-gray-900 shadow-sm rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">رقم الخطاب</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">الموضوع</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">صادر إلى</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">محرر الخطاب</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">القالب</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">الحالة</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">تاريخ الإنشاء</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 w-40">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredLetters.map((letter) => (
              <tr key={letter.id}>
                <td className="px-4 py-4 text-sm">
                  {letter.number ?? '-'}/{letter.year ?? '-'}
                </td>
                <td className="px-4 py-4 text-sm">
                  {letter.content?.subject ?? '-'}
                </td>
                <td className="px-4 py-4 text-sm">
                  {letter.content?.to ?? '-'}
                </td>
                <td className="px-4 py-4 text-sm">
                  {letter.creator_name ?? '-'}
                </td>
                <td className="px-4 py-4 text-sm">
                  {letter.letter_templates?.name ?? 'غير محدد'}
                </td>
                <td className="px-4 py-4 text-sm">
                  <span className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                    letter.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {letter.status === 'completed' ? 'مكتمل' : 'مسودة'}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm">
                  {new Date(letter.created_at).toLocaleDateString('ar-SA')}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-center gap-x-1">
                    <button
                      onClick={() => navigate(`view/${letter.id}`)}
                      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                      title="معاينة"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => navigate(`edit/${letter.id}`)}
                      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                      title="تعديل"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(letter.id)}
                      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                      title="حذف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}