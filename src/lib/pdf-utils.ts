import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import html2canvas from 'html2canvas'
import type { Letter } from '../types/database'

// دالة لتحسين PDF باستخدام pdf-lib
export async function enhancePDFBytes(pdfBytes: ArrayBuffer): Promise<Uint8Array> {
  // تحميل PDF
  const pdfDoc = await PDFDocument.load(pdfBytes)

  // ضبط البيانات الوصفية
  pdfDoc.setTitle('خطاب رسمي')
  pdfDoc.setAuthor('نظام إدارة الخطابات')
  pdfDoc.setSubject('خطاب')
  pdfDoc.setProducer('نظام إدارة الخطابات')
  pdfDoc.setCreator('نظام إدارة الخطابات')

  // ضغط وتحسين الملف
  return await pdfDoc.save({
    useObjectStreams: true
  })
}

// دالة لتصدير جزء من الصفحة كصورة عالية الجودة
export async function renderHTMLElementToImage(
  element: HTMLElement,
  options: {
    scale?: number;
    backgroundColor?: string;
    quality?: number;
    removeElement?: boolean;
  } = {}
): Promise<string> {
  // الإعدادات الافتراضية
  const {
    scale = 3,
    backgroundColor = '#FFFFFF',
    quality = 1.0,
    removeElement = false
  } = options

  // إضافة العنصر للصفحة إذا لم يكن مضافاً
  let wasAppended = false
  if (!document.body.contains(element)) {
    document.body.appendChild(element)
    wasAppended = true
  }

  try {
    // انتظار لحظة لضمان استقرار العنصر
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // انتظار تحميل الخطوط
    await document.fonts.ready
    
    // تحويل العنصر إلى صورة
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor,
      letterRendering: true,
      logging: false
    })
    
    // تحويل اللوحة إلى صورة بجودة عالية
    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    // إزالة العنصر إذا كان مضافاً سابقاً وتم طلب إزالته
    if (wasAppended && removeElement) {
      document.body.removeChild(element)
    }
  }
}

// دالة لتحميل نظام PDF.js
export function loadPDFJS() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib)
  
  return new Promise<any>((resolve, reject) => {
    // تحميل المكتبة الأساسية
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.min.js'
    script.onload = () => {
      // تعيين مسار العامل
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.js'
      resolve(window.pdfjsLib)
    }
    script.onerror = reject
    document.head.appendChild(script)
  })
}

// إضافة الأنواع لـ window
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

// دالة لإنشاء معاينة PDF
export async function createPDFPreview(pdfBytes: Uint8Array): Promise<HTMLCanvasElement> {
  // تحميل PDF.js إذا لم يكن محملاً
  const pdfjsLib = await loadPDFJS()
  
  // تحميل الملف
  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes })
  const pdf = await loadingTask.promise
  
  // الحصول على الصفحة الأولى
  const page = await pdf.getPage(1)
  
  // إنشاء مساحة العرض
  const viewport = page.getViewport({ scale: 1.0 })
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  
  canvas.height = viewport.height
  canvas.width = viewport.width
  
  // عرض الصفحة
  await page.render({
    canvasContext: context!,
    viewport
  }).promise
  
  return canvas
}