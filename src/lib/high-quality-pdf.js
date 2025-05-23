/**
 * نظام تصدير PDF عالي الجودة
 * 
 * هذا الملف يوفر وظائف متقدمة لتصدير PDF بجودة عالية مع دعم كامل للغة العربية
 * يستخدم html2canvas لتحويل العناصر إلى صور ثم تحويلها إلى PDF باستخدام jsPDF
 */

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * تحميل صورة مع انتظار اكتمال التحميل
 * @param {string} src - مسار الصورة
 * @returns {Promise<HTMLImageElement>} عنصر الصورة
 */
export async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    
    // تحسين جودة الصورة
    img.style.imageRendering = '-webkit-optimize-contrast';
    
    img.src = src;
  });
}

/**
 * تحميل الخطوط والتأكد من اكتمال التحميل
 * @returns {Promise<void>}
 */
export async function loadFonts() {
  // التأكد من تحميل خط Cairo
  if (!document.fonts.check('bold 16px Cairo')) {
    // إضافة الخط إذا لم يكن محملاً
    const fontLink = document.createElement('link');
    fontLink.href = '/fonts/cairo/cairo.css';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);
  }
  
  // انتظار تحميل الخطوط
  await document.fonts.ready;
  
  // إعطاء وقت إضافي للتأكد من تحميل الخطوط بشكل صحيح
  return new Promise(resolve => setTimeout(resolve, 1000));
}

/**
 * إنشاء عنصر DOM للخطاب
 * @param {Object} letter - بيانات الخطاب
 * @returns {HTMLElement} عنصر الخطاب
 */
export function createLetterElement(letter) {
  // إنشاء الحاوية الرئيسية
  const container = document.createElement('div');
  container.style.cssText = `
    width: 595px;
    height: 842px;
    position: fixed;
    left: -9999px;
    top: 0;
    background-color: white;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    box-sizing: border-box;
  `;
  container.dir = 'rtl';

  // طبقة صورة القالب
  const templateLayer = document.createElement('div');
  templateLayer.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url('${letter.letter_templates.image_url}');
    background-size: 100% 100%;
    background-position: center;
    background-repeat: no-repeat;
    z-index: 0;
  `;
  container.appendChild(templateLayer);

  // طبقة المحتوى
  const contentLayer = document.createElement('div');
  contentLayer.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
  `;

  // رقم الخطاب
  const numberElement = document.createElement('div');
  numberElement.style.cssText = `
    position: absolute;
    top: 25px;
    left: 85px;
    width: 40px;
    text-align: center;
    font-size: 14px;
    font-weight: 600;
    direction: ltr;
    font-family: 'Cairo', sans-serif;
  `;
  numberElement.textContent = letter.number || '';
  contentLayer.appendChild(numberElement);

  // تاريخ الخطاب
  const dateElement = document.createElement('div');
  dateElement.style.cssText = `
    position: absolute;
    top: 60px;
    left: 40px;
    width: 120px;
    text-align: center;
    font-size: 14px;
    font-weight: 600;
    direction: ltr;
    font-family: 'Cairo', sans-serif;
  `;
  dateElement.textContent = letter.content.date || '';
  contentLayer.appendChild(dateElement);

  // محتوى الخطاب
  const bodyElement = document.createElement('div');
  bodyElement.style.cssText = `
    position: absolute;
    top: 120px;
    right: 35px;
    left: 40px;
    height: 602px;
    padding: 24px;
    font-size: 15px;
    line-height: 1.8;
    text-align: right;
    direction: rtl;
    font-family: 'Cairo', sans-serif;
    white-space: pre-wrap;
    word-break: break-word;
    overflow-wrap: break-word;
    color: #000000;
  `;
  bodyElement.innerHTML = letter.content.body || '';
  contentLayer.appendChild(bodyElement);

  // رمز QR
  if (letter.verification_url || letter.content.verification_url) {
    const qrContainer = document.createElement('div');
    qrContainer.style.cssText = `
      position: absolute;
      bottom: 40px;
      left: 90px;
      text-align: center;
    `;
    
    const qrCode = document.createElement('div');
    qrCode.style.cssText = `
      width: 80px;
      height: 80px;
      padding: 4px;
      background: white;
      border-radius: 4px;
      margin: 0 auto;
    `;
    
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      `${window.location.origin}/verify/${letter.verification_url || letter.content.verification_url}`
    )}`;
    
    const qrImage = document.createElement('img');
    qrImage.src = qrUrl;
    qrImage.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: contain;
    `;
    
    qrCode.appendChild(qrImage);
    qrContainer.appendChild(qrCode);
    
    const qrLabel = document.createElement('div');
    qrLabel.style.cssText = `
      font-size: 10px;
      color: #444;
      margin-top: 4px;
      font-family: 'Cairo', sans-serif;
    `;
    qrLabel.textContent = 'رمز التحقق';
    qrContainer.appendChild(qrLabel);
    
    contentLayer.appendChild(qrContainer);
  }

  container.appendChild(contentLayer);
  return container;
}

/**
 * تحسين المستند المستنسخ
 * @param {Document} clonedDoc - المستند المستنسخ
 * @returns {Promise<void>}
 */
export async function optimizeDocument(clonedDoc) {
  // إضافة أنماط CSS لتحسين جودة العرض
  const style = clonedDoc.createElement('style');
  style.textContent = `
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

    * {
      text-rendering: optimizeLegibility !important;
      -webkit-font-smoothing: antialiased !important;
      -moz-osx-font-smoothing: grayscale !important;
      font-smooth: always !important;
    }

    div {
      box-sizing: border-box;
    }
    
    img {
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
    }
  `;
  clonedDoc.head.appendChild(style);
  
  // انتظار تحميل الخطوط
  return new Promise(resolve => setTimeout(resolve, 800));
}

/**
 * تصدير عنصر DOM إلى PDF
 * @param {HTMLElement} element - العنصر المراد تصديره
 * @param {Object} options - خيارات التصدير
 * @returns {Promise<void>}
 */
export async function exportElementToPDF(element, options = {}) {
  const {
    scale = 3.0,
    fileName = 'document.pdf',
    quality = 0.98,
    removeElement = true
  } = options;
  
  // إضافة العنصر إلى الصفحة إذا لم يكن مضافاً
  let wasAppended = false;
  if (!document.body.contains(element)) {
    document.body.appendChild(element);
    wasAppended = true;
  }
  
  try {
    // انتظار تحميل الخطوط
    await document.fonts.ready;
    
    // تحويل العنصر إلى صورة
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#FFFFFF',
      letterRendering: true,
      logging: false,
      onclone: optimizeDocument
    });
    
    // إنشاء PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
      compress: true
    });
    
    // إضافة الصورة إلى PDF
    pdf.addImage({
      imageData: canvas.toDataURL('image/jpeg', quality),
      format: 'JPEG',
      x: 0,
      y: 0,
      width: 595,
      height: 842,
      compression: 'NONE'
    });
    
    // تصدير الملف
    pdf.save(fileName);
  } finally {
    // إزالة العنصر إذا تمت إضافته
    if (wasAppended && removeElement) {
      document.body.removeChild(element);
    }
  }
}