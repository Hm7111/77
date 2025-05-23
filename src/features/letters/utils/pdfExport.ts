import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { Letter } from '../../../types/database';

/**
 * دالة لتصدير الخطاب كملف PDF
 */
export async function exportLetterToPDF(letter: Letter, withTemplate: boolean = true): Promise<boolean> {
  const EXPORT_TIMEOUT = 30000; // 30 seconds timeout
  const pendingExports = new Set<string>();
  
  // التحقق من وجود عملية تصدير جارية
  if (letter.id && pendingExports.has(letter.id)) {
    throw new Error('جاري تصدير الخطاب، يرجى الانتظار');
  }

  // إظهار مؤشر التحميل
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
  loadingDiv.innerHTML = `
    <div class="bg-white rounded-lg p-4 flex items-center gap-x-3">
      <div class="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      <span>جاري تجهيز الخطاب...</span>
    </div>
  `;
  document.body.appendChild(loadingDiv);
  
  if (letter.id) {
    pendingExports.add(letter.id);
  }
  
  const exportTimeout = setTimeout(() => {
    if (letter.id) {
      pendingExports.delete(letter.id);
    }
    document.body.removeChild(loadingDiv);
    throw new Error('انتهت مهلة التصدير');
  }, EXPORT_TIMEOUT);
  
  try {
    // التحقق من حالة الاتصال
    const isOnline = await fetch(window.location.origin, { method: 'HEAD' })
      .then(response => response.ok)
      .catch(() => false);
      
    if (!isOnline) {
      clearTimeout(exportTimeout);
      throw new Error('لا يوجد اتصال بالإنترنت');
    }

    // تحميل الخطوط
    await document.fonts.ready;
    
    // استخدام template_snapshot إذا كان متاحاً، وإلا استخدام letter_templates
    const templateData = letter.template_snapshot || letter.letter_templates;
    
    // تحميل صورة القالب إذا كانت مطلوبة
    if (withTemplate && templateData?.image_url) {
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = templateData.image_url;
      });
    }
    
    // إنشاء عنصر الخطاب
    const letterElement = createLetterElement(letter, withTemplate);
    document.body.appendChild(letterElement);
    
    // تحويل إلى canvas
    const canvas = await html2canvas(letterElement, {
      scale: 3, // جودة عالية
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#FFFFFF',
      letterRendering: true, 
      logging: false,
      onclone: optimizeClonedDocument
    });
    
    // إنشاء PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
      compress: true,
      putOnlyUsedFonts: true,
      floatPrecision: 16
    });
    
    // إضافة الصورة إلى PDF
    pdf.addImage({
      imageData: canvas.toDataURL('image/jpeg', 0.95),
      format: 'JPEG',
      x: 0,
      y: 0,
      width: 595,
      height: 842,
      compression: 'NONE'
    });
    
    // إزالة العنصر المؤقت
    document.body.removeChild(letterElement);
    
    // حفظ الملف
    pdf.save(`خطاب-${letter.number}-${letter.year}.pdf`);
    
    return true;
  } catch (error) {
    console.error('Error exporting PDF:', error);
    if (error instanceof Error) {
      throw new Error(`حدث خطأ أثناء تصدير الملف: ${error.message}`);
    } else {
      throw new Error('حدث خطأ أثناء تصدير الملف');
    }
  } finally {
    if (document.body.contains(loadingDiv)) {
      document.body.removeChild(loadingDiv);
    }
    if (letter.id) {
      pendingExports.delete(letter.id);
    }
    clearTimeout(exportTimeout);
  }
}

/**
 * إنشاء عنصر DOM للخطاب
 */
function createLetterElement(letter: Letter, withTemplate: boolean = true): HTMLDivElement {
  const container = document.createElement('div');
  container.style.cssText = `
    width: 595px;
    height: 842px;
    position: fixed;
    left: -9999px;
    background-color: white;
    font-family: Cairo, sans-serif;
    direction: rtl;
  `;

  // استخدام template_snapshot إذا كان متاحاً، وإلا استخدام letter_templates
  const templateData = letter.template_snapshot || letter.letter_templates;

  if (withTemplate && templateData) {
    container.style.backgroundImage = `url(${templateData.image_url})`;
    container.style.backgroundSize = '100% 100%';
    container.style.backgroundRepeat = 'no-repeat';
  }

  // إنشاء عناصر الخطاب
  
  // رقم الخطاب
  const numberDiv = document.createElement('div');
  numberDiv.style.cssText = `
    position: absolute;
    top: 25px;
    left: 85px;
    width: 40px;
    text-align: center;
    font-size: 14px;
    font-weight: 600;
    direction: ltr;
  `;
  numberDiv.textContent = letter.number?.toString() || '';
  container.appendChild(numberDiv);
  
  // تاريخ الخطاب
  const dateDiv = document.createElement('div');
  dateDiv.style.cssText = `
    position: absolute;
    top: 60px;
    left: 40px;
    width: 120px;
    text-align: center;
    font-size: 14px;
    font-weight: 600;
    direction: ltr;
  `;
  dateDiv.textContent = letter.content.date || '';
  container.appendChild(dateDiv);

  // محتوى الخطاب
  const content = document.createElement('div');
  content.style.cssText = `
    position: absolute;
    top: 120px;
    right: 35px;
    left: 40px;
    bottom: 120px;
    padding: 24px;
    font-size: 15px;
    line-height: 1.2;
    text-align: right;
    direction: rtl;
    font-family: 'Cairo', sans-serif;
    white-space: pre-wrap;
    word-break: break-word;
    overflow-wrap: break-word;
  `;
  content.innerHTML = letter.content.body || '';
  container.appendChild(content);
  
  // رمز QR
  if (letter.verification_url || letter.content.verification_url) {
    const qrContainer = document.createElement('div');
    qrContainer.style.cssText = `
      position: absolute;
      bottom: 40px;
      right: 40px;
      text-align: center;
    `;
    
    const qrImage = document.createElement('img');
    const verificationUrl = letter.verification_url || letter.content.verification_url;
    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(
      `${window.location.origin}/verify/${verificationUrl}`
    )}`;
    qrImage.style.cssText = `
      width: 80px;
      height: 80px;
      padding: 4px;
      background: white;
      border-radius: 4px;
    `;
    qrContainer.appendChild(qrImage);
    
    const qrText = document.createElement('div');
    qrText.style.cssText = `
      font-size: 10px;
      color: #666;
      margin-top: 4px;
    `;
    qrText.textContent = 'رمز التحقق';
    qrContainer.appendChild(qrText);
    
    container.appendChild(qrContainer);
  }

  return container;
}

/**
 * تحسين المستند المستنسخ قبل التصدير
 */
function optimizeClonedDocument(clonedDoc: Document) {
  // تحسين عرض النصوص العربية
  const styleElement = clonedDoc.createElement('style');
  styleElement.innerHTML = `
    * {
      text-rendering: optimizeLegibility !important;
      -webkit-font-smoothing: antialiased !important;
      -moz-osx-font-smoothing: grayscale !important;
    }
    
    img {
      image-rendering: -webkit-optimize-contrast !important;
      image-rendering: crisp-edges !important;
    }

    @font-face {
      font-family: 'Cairo';
      src: url('/fonts/cairo/Cairo-Regular.ttf') format('truetype');
      font-weight: normal;
      font-style: normal;
    }
    
    @font-face {
      font-family: 'Cairo';
      src: url('/fonts/cairo/Cairo-Bold.ttf') format('truetype');
      font-weight: bold;
      font-style: normal;
    }
    
    @font-face {
      font-family: 'Cairo';
      src: url('/fonts/cairo/Cairo-SemiBold.ttf') format('truetype');
      font-weight: 600;
      font-style: normal;
    }
    
    /* تحسين عرض الأسطر الفارغة */
    br {
      display: block !important;
      content: "" !important;
      margin-top: 0.3em !important;
    }
    
    /* تأكيد اتجاه النصوص للغة العربية */
    html, body {
      direction: rtl !important;
      text-align: right !important;
    }
    
    div, p, span, h1, h2, h3, h4, h5, h6, li, ul, ol {
      direction: rtl !important;
      text-align: right !important;
      unicode-bidi: embed !important;
    }
  `;
  clonedDoc.head.appendChild(styleElement);
  
  // إضافة وقت إضافي لتحميل الخطوط
  return new Promise(resolve => setTimeout(resolve, 800));
}

export default {
  exportLetterToPDF
};