import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import type { Letter } from '../types/database'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

// تكوين PDF محسن
export interface PDFOptions {
  scale?: number;
  quality?: number;
  useCompression?: boolean;
  embedFonts?: boolean;
}

// النظام المتكامل لتصدير PDF عالي الجودة
export async function generateHighQualityPDF(
  letter: Letter, 
  options: PDFOptions = {}
): Promise<Uint8Array> {
  // توحيد الإعدادات
  const config = {
    scale: options.scale || 3.0,           // عامل تكبير عالي لتحسين الدقة
    quality: options.quality || 0.98,      // جودة عالية جداً للصورة
    useCompression: options.useCompression !== false, // استخدم الضغط افتراضياً
    embedFonts: options.embedFonts !== false          // تضمين الخطوط افتراضياً
  }

  try {
    // تحميل الصور والخطوط أولاً
    await Promise.all([
      preloadImage(letter.letter_templates.image_url),
      loadFonts()
    ])

    // إنشاء عنصر DOM للخطاب
    const letterElement = await createLetterElement(letter)
    document.body.appendChild(letterElement)

    try {
      // تحويل العنصر إلى صورة باستخدام html2canvas
      const canvas = await html2canvas(letterElement, {
        scale: config.scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: 'white',
        letterRendering: true,
        logging: false,
        onclone: optimizeClonedDocument
      })

      // إنشاء PDF باستخدام صورة عالية الجودة
      return await createPDFFromCanvas(canvas, letter, config)
    } finally {
      // إزالة العنصر المؤقت
      document.body.removeChild(letterElement)
    }
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw new Error('حدث خطأ أثناء إنشاء ملف PDF')
  }
}

// إنشاء عنصر DOM للخطاب
async function createLetterElement(letter: Letter): Promise<HTMLElement> {
  const container = document.createElement('div')
  container.style.cssText = `
    width: 595px;
    height: 842px;
    position: fixed;
    left: -9999px;
    top: 0;
    background-color: white;
    overflow: hidden;
  `
  container.dir = 'rtl'

  // إضافة صورة القالب عالية الجودة
  const backgroundDiv = document.createElement('div')
  backgroundDiv.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url(${letter.letter_templates.image_url});
    background-size: cover;
    background-position: center;
    z-index: 0;
  `
  container.appendChild(backgroundDiv)

  // إضافة رقم الخطاب
  const numberElement = document.createElement('div')
  numberElement.style.cssText = `
    position: absolute;
    top: 25px;
    left: 85px;
    width: 40px;
    text-align: center;
    font-size: 14px;
    font-weight: 600;
    direction: ltr;
    z-index: 1;
    font-family: 'Cairo', sans-serif;
  `
  numberElement.textContent = letter.number?.toString() || ''
  container.appendChild(numberElement)

  // إضافة تاريخ الخطاب
  const dateElement = document.createElement('div')
  dateElement.style.cssText = `
    position: absolute;
    top: 60px;
    left: 40px;
    width: 120px;
    text-align: center;
    font-size: 14px;
    font-weight: 600;
    direction: ltr;
    z-index: 1;
    font-family: 'Cairo', sans-serif;
  `
  dateElement.textContent = letter.content.date || ''
  container.appendChild(dateElement)

  // إضافة محتوى الخطاب
  const contentElement = document.createElement('div')
  contentElement.style.cssText = `
    position: absolute;
    top: 120px;
    right: 35px;
    left: 40px;
    bottom: 120px;
    padding: 24px;
    font-size: 15px;
    line-height: 1.8;
    text-align: right;
    direction: rtl;
    z-index: 1;
    font-family: 'Cairo', sans-serif;
    white-space: pre-wrap;
    word-break: break-word;
  `
  contentElement.innerHTML = letter.content.body || ''
  container.appendChild(contentElement)

  // إضافة رمز QR
  if (letter.verification_url || letter.content.verification_url) {
    const verificationUrl = letter.verification_url || letter.content.verification_url
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
      `${window.location.origin}/verify/${verificationUrl}`
    )}`
    
    const qrContainer = document.createElement('div')
    qrContainer.style.cssText = `
      position: absolute;
      bottom: 40px;
      left: 90px;
      text-align: center;
      z-index: 1;
    `
    
    const qrElement = document.createElement('div')
    qrElement.style.cssText = `
      width: 80px;
      height: 80px;
      padding: 4px;
      background: white;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    `
    
    const qrImage = document.createElement('img')
    qrImage.src = qrUrl
    qrImage.alt = 'رمز التحقق'
    qrImage.style.width = '72px'
    qrImage.style.height = '72px'
    
    qrElement.appendChild(qrImage)
    qrContainer.appendChild(qrElement)
    
    const qrLabel = document.createElement('div')
    qrLabel.style.cssText = `
      font-size: 10px;
      color: #444;
      margin-top: 4px;
      font-family: 'Cairo', sans-serif;
    `
    qrLabel.textContent = 'رمز التحقق'
    qrContainer.appendChild(qrLabel)
    
    container.appendChild(qrContainer)
  }

  return container
}

// تحميل الخطوط مسبقاً
async function loadFonts() {
  // التحقق من تحميل خط Cairo
  if (!document.fonts.check('16px Cairo')) {
    // إضافة الخط إذا لم يكن محملاً
    const fontLink = document.createElement('link')
    fontLink.href = '/fonts/cairo/cairo.css'
    fontLink.rel = 'stylesheet'
    document.head.appendChild(fontLink)
    
    // انتظار تحميل الخطوط
    await document.fonts.ready
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}

// تحميل الصورة مسبقاً
async function preloadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

// تحسين المستند المستنسخ للحصول على أفضل جودة
function optimizeClonedDocument(clonedDoc: Document) {
  // تحسين أداء الخطوط
  const style = clonedDoc.createElement('style')
  style.textContent = `
    * {
      text-rendering: optimizeLegibility !important;
      -webkit-font-smoothing: antialiased !important;
      -moz-osx-font-smoothing: grayscale !important;
    }
  `
  clonedDoc.head.appendChild(style)
  
  // تحسين صورة القالب
  const backgroundDiv = clonedDoc.querySelector('[style*="background-image"]')
  if (backgroundDiv) {
    backgroundDiv.setAttribute('data-html2canvas-ignore', 'false')
  }
  
  // انتظار لحظة لتطبيق التحسينات
  return new Promise(resolve => setTimeout(resolve, 300))
}

// إنشاء PDF من لوحة الرسم
async function createPDFFromCanvas(
  canvas: HTMLCanvasElement, 
  letter: Letter, 
  config: Required<PDFOptions>
): Promise<Uint8Array> {
  // إنشاء ملف PDF باستخدام jsPDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
    compress: config.useCompression,
    putOnlyUsedFonts: config.embedFonts,
    floatPrecision: 16
  })

  // إضافة الصورة بجودة عالية
  pdf.addImage({
    imageData: canvas.toDataURL('image/jpeg', config.quality),
    format: 'JPEG',
    x: 0,
    y: 0,
    width: 595,
    height: 842,
    compression: 'FAST'
  })

  // الحصول على ملف PDF كمصفوفة بايتات
  const pdfBytes = pdf.output('arraybuffer')
  
  // تحسين وضغط ملف PDF باستخدام pdf-lib
  return await optimizePDFSize(pdfBytes)
}

// تحسين حجم ملف PDF باستخدام pdf-lib
async function optimizePDFSize(pdfBytes: ArrayBuffer): Promise<Uint8Array> {
  // تحميل ملف PDF
  const pdfDoc = await PDFDocument.load(pdfBytes)
  
  // ضبط البيانات الوصفية
  pdfDoc.setTitle('خطاب')
  pdfDoc.setAuthor('نظام إدارة الخطابات')
  pdfDoc.setSubject('خطاب رسمي')
  pdfDoc.setKeywords(['خطاب', 'رسمي', 'وثيقة'])
  pdfDoc.setLanguage('ar')
  
  // ضبط خيارات الضغط
  const compressedPdfBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    useObjectStreams: true
  })
  
  return compressedPdfBytes
}

// دالة مساعدة لتحويل إلى كائن Uint8Array
function toUint8Array(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer)
}