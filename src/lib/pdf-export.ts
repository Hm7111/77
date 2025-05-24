import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Letter } from '../types/database';
import 'canvas-to-blob';

/**
 * نظام تصدير PDF عالي الدقة محسن للأداء
 * يضمن أن ما تراه في المعاينة هو ما تحصل عليه بالضبط في التصدير
 */

/**
 * خيارات التصدير
 */
interface ExportPDFOptions {
  filename?: string;
  scale?: number;
  quality?: number;
  withTemplate?: boolean;
  showProgress?: (progress: number) => void;
}

// تخزين مؤقت للصور والخطوط
const imageCache = new Map<string, HTMLImageElement>();
let fontLoaded = false;

/**
 * تصدير خطاب كملف PDF بجودة عالية ومطابقة للمعاينة
 * @param letter الخطاب المراد تصديره
 * @param options خيارات التصدير
 * @returns وعد يتم حله عند اكتمال عملية التصدير
 */
export async function exportToPDF(letter: Letter, options: ExportPDFOptions = {}): Promise<void> {
  // الإعدادات الافتراضية
  const filename = options.filename || `${letter.letter_reference || `خطاب-${letter.number}-${letter.year}`}.pdf`;
  const scale = options.scale || 3.0; // تحسين: تقليل الدقة من 4.0 إلى 3.0 للتوازن بين الجودة والأداء
  const quality = options.quality || 0.95; // تحسين: تقليل الجودة من 0.99 إلى 0.95
  const withTemplate = options.withTemplate !== undefined ? options.withTemplate : true;
  const showProgress = options.showProgress || (() => {});
  
  // تعيين مهلة للإلغاء في حالة استغراق وقت طويل
  let exportTimeout: number | null = setTimeout(() => {
    // إزالة عناصر التحميل
    const loadingElements = document.querySelectorAll('.pdf-export-loading');
    loadingElements.forEach(el => el.parentNode?.removeChild(el));
    throw new Error('استغرقت عملية التصدير وقتًا طويلًا جدًا');
  }, 30000) as unknown as number; // 30 ثانية كحد أقصى
  
  // إظهار مؤشر التحميل
  const loadingElement = document.createElement('div');
  loadingElement.className = 'fixed inset-0 bg-black/60 flex items-center justify-center z-50 pdf-export-loading';
  loadingElement.innerHTML = `
    <div class="bg-white rounded-lg p-6 flex flex-col items-center gap-4">
      <div class="w-12 h-12 border-4 border-t-primary border-primary/30 rounded-full animate-spin"></div>
      <p class="text-center font-medium">جاري إنشاء ملف PDF<br><span id="export-progress" class="text-sm text-gray-500">0%</span></p>
    </div>
  `;
  document.body.appendChild(loadingElement);
  
  try {
    showProgress(0.1);
    updateProgressUI('10%');
    
    // 1. تحميل الخطوط قبل أي شيء آخر (مع تخزين مؤقت)
    if (!fontLoaded) {
      await loadFonts();
      fontLoaded = true;
    } else {
      // تأكيد جاهزية الخطوط
      await document.fonts.ready;
    }
    
    showProgress(0.2);
    updateProgressUI('20%');
    
    // 2. إنشاء عنصر الخطاب المؤقت (مع تخزين مؤقت للصور)
    const letterElement = await createLetterElement(letter, withTemplate);
    document.body.appendChild(letterElement);
    
    // 3. انتظار فترة قصيرة للتأكد من تحميل العناصر بشكل صحيح
    await new Promise(resolve => setTimeout(resolve, 200));
    
    showProgress(0.3);
    updateProgressUI('30%');
    
    // 4. تحسين إعدادات html2canvas
    const canvas = await html2canvas(letterElement, {
      scale: scale,
      useCORS: true,
      allowTaint: false, // تحسين: false يسمح بتحسين الأداء عند تقليص المسافة المتبقية
      backgroundColor: '#FFFFFF',
      letterRendering: true, // ضروري للغة العربية
      logging: false, // إيقاف السجلات لتحسين الأداء
      onclone: optimizeClonedDocument,
      imageTimeout: 5000, // تحديد مهلة تحميل الصور
      removeContainer: true, // إزالة الحاويات المؤقتة تلقائيًا
    });
    
    showProgress(0.7);
    updateProgressUI('70%');
    
    // 5. إنشاء PDF باستخدام jsPDF مع تحسين الإعدادات
    const jspdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
      compress: true, // تفعيل الضغط
      putOnlyUsedFonts: true, // تضمين الخطوط المستخدمة فقط
      floatPrecision: 8 // تحسين: تقليل الدقة من 16 إلى 8 لتقليل حجم الملف
    });
    
    // 6. إضافة البيانات الوصفية
    jspdf.setProperties({
      title: `${letter.letter_reference || `خطاب-${letter.number}-${letter.year}`}`,
      subject: letter.content.subject || 'خطاب',
      author: letter.creator_name || 'نظام الخطابات',
      keywords: 'خطاب, رسمي',
      creator: 'نظام إدارة الخطابات'
    });
    
    // 7. أبعاد صفحة A4 بالنقاط
    const pageWidth = 595;
    const pageHeight = 842;
    
    // 8. إضافة صورة Canvas إلى PDF مع تحسين الضغط
    jspdf.addImage({
      imageData: canvas.toDataURL('image/jpeg', quality),
      format: 'JPEG', // تحسين: استخدام JPEG بدلاً من PNG للحصول على حجم أصغر
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      compression: 'FAST' // تحسين: استخدام ضغط أسرع
    });
    
    showProgress(0.9);
    updateProgressUI('90%');
    
    // 9. حفظ ملف PDF
    jspdf.save(filename);
    
    showProgress(1.0);
    updateProgressUI('100%');
  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw new Error('حدث خطأ أثناء تصدير ملف PDF');
  } finally {
    // تنظيف العناصر المؤقتة
    if (exportTimeout) {
      clearTimeout(exportTimeout);
      exportTimeout = null;
    }
    
    if (document.body.contains(loadingElement)) {
      document.body.removeChild(loadingElement);
    }
    
    // التأكد من إزالة العنصر المؤقت للخطاب
    const tempElement = document.querySelector('div[style*="left: -9999px"]');
    if (tempElement && tempElement.parentNode) {
      tempElement.parentNode.removeChild(tempElement);
    }
  }
}

/**
 * تحديث مؤشر التقدم في واجهة المستخدم
 */
function updateProgressUI(progress: string) {
  const progressElement = document.getElementById('export-progress');
  if (progressElement) {
    progressElement.textContent = progress;
  }
}

/**
 * تحميل الخطوط قبل البدء بعملية التصدير
 * تحسين: تحميل الخطوط مرة واحدة فقط وتخزينها مؤقتًا
 */
async function loadFonts(): Promise<void> {
  // التحقق من تحميل خط Cairo
  if (!document.fonts.check('normal normal 14px Cairo')) {
    try {
      // تحميل الخط يدوياً
      const fontFace = new FontFace(
        'Cairo',
        'url(/fonts/cairo/Cairo-Regular.ttf)',
        { style: 'normal', weight: 'normal' }
      );
      
      const loadedFont = await fontFace.load();
      document.fonts.add(loadedFont);
      
      // تحميل النسخة السميكة من الخط
      const boldFontFace = new FontFace(
        'Cairo',
        'url(/fonts/cairo/Cairo-Bold.ttf)',
        { style: 'normal', weight: 'bold' }
      );
      
      const loadedBoldFont = await boldFontFace.load();
      document.fonts.add(loadedBoldFont);
    } catch (e) {
      console.warn('Failed to load fonts:', e);
      // استمر حتى مع وجود خطأ في تحميل الخط
    }
  }
  
  // انتظار تحميل الخطوط
  await document.fonts.ready;
  
  // انتظار إضافي أقصر للتأكد من تحميل الخطوط بشكل كامل
  return new Promise(resolve => setTimeout(resolve, 300));
}

/**
 * تحميل الصورة من URL مع تخزين مؤقت
 * تحسين: استخدام تخزين مؤقت للصور
 */
async function preloadImage(url: string): Promise<HTMLImageElement> {
  // التحقق من وجود الصورة في التخزين المؤقت
  if (imageCache.has(url)) {
    return imageCache.get(url) as HTMLImageElement;
  }
  
  // تحميل الصورة
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // إضافة الصورة للتخزين المؤقت
      imageCache.set(url, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * إنشاء عنصر DOM للخطاب للتصدير
 * تحسين: ترميز أفضل وتقليل الوقت المستغرق
 */
async function createLetterElement(letter: Letter, withTemplate: boolean): Promise<HTMLElement> {
  // الحصول على بيانات القالب من template_snapshot إذا كانت متاحة، وإلا استخدام letter_templates
  const templateData = letter.template_snapshot || letter.letter_templates;
  
  // الحصول على مواضع العناصر المخصصة من القالب
  const letterElements = templateData?.letter_elements || {
    letterNumber: { x: 85, y: 25, width: 32, alignment: 'right', enabled: true },
    letterDate: { x: 40, y: 60, width: 120, alignment: 'center', enabled: true },
    signature: { x: 40, y: 700, width: 150, height: 80, alignment: 'center', enabled: true }
  };
  
  // الحصول على موضع QR من القالب أو استخدام القيم الافتراضية
  const qrPosition = templateData?.qr_position || {
    x: 40,
    y: 760, 
    size: 80,
    alignment: 'right'
  };
  
  // إنشاء حاوية الخطاب
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: 595px;
    height: 842px;
    background-color: white;
    overflow: hidden;
    direction: rtl;
    font-family: 'Cairo', sans-serif;
  `;
  
  // إضافة صورة خلفية القالب
  if (withTemplate && templateData?.image_url) {
    // تحسين: استخدام تخزين مؤقت للصور
    await preloadImage(templateData.image_url);
    
    const backgroundImg = document.createElement('img');
    backgroundImg.src = templateData.image_url;
    backgroundImg.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: fill;
      z-index: 0;
    `;
    container.appendChild(backgroundImg);
  }
  
  // إنشاء طبقة المحتوى
  const contentLayer = document.createElement('div');
  contentLayer.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    direction: rtl;
  `;
  
  // مرجع الخطاب المركب - استخدام الموضع المخصص
  if (letterElements.letterNumber.enabled) {
    const referenceElement = document.createElement('div');
    referenceElement.style.cssText = `
      position: absolute;
      top: ${letterElements.letterNumber.y}px;
      left: ${letterElements.letterNumber.x}px;
      width: ${letterElements.letterNumber.width}px;
      text-align: ${letterElements.letterNumber.alignment};
      font-size: 14px;
      font-weight: 600;
      font-family: 'Cairo', sans-serif;
      color: #000;
    `;
    referenceElement.textContent = letter.letter_reference || `${letter.branch_code || ''}-${letter.number}/${letter.year}`;
    contentLayer.appendChild(referenceElement);
  }
  
  // تاريخ الخطاب - استخدام الموضع المخصص
  if (letterElements.letterDate.enabled) {
    const dateElement = document.createElement('div');
    dateElement.style.cssText = `
      position: absolute;
      top: ${letterElements.letterDate.y}px;
      left: ${letterElements.letterDate.x}px;
      width: ${letterElements.letterDate.width}px;
      text-align: ${letterElements.letterDate.alignment};
      font-size: 14px;
      font-weight: 600;
      font-family: 'Cairo', sans-serif;
      color: #000;
      transform: translateY(-5px);
    `;
    dateElement.textContent = letter.content.date || '';
    contentLayer.appendChild(dateElement);
  }
  
  // محتوى الخطاب
  const bodyElement = document.createElement('div');
  bodyElement.className = 'letter-content';
  bodyElement.style.cssText = `
    position: absolute;
    top: 120px;
    right: 35px;
    left: 40px;
    height: 602px;
    padding: 24px;
    font-size: 14px;
    line-height: ${letter.content.lineHeight || 1.5};
    font-family: 'Cairo', sans-serif;
    text-align: right;
    direction: rtl;
    white-space: pre-wrap;
    word-break: break-word;
    overflow-wrap: break-word;
    color: #000;
    transform: translateY(-5px);
  `;
  
  // الحفاظ على المحاذاة الأصلية للنصوص
  bodyElement.innerHTML = letter.content.body || '';
  
  contentLayer.appendChild(bodyElement);
  
  // إضافة رمز QR إذا كان متاحاً
  if (letter.verification_url || letter.content.verification_url) {
    const verificationUrl = letter.verification_url || letter.content.verification_url;
    
    const qrContainer = document.createElement('div');
    qrContainer.style.cssText = `
      position: absolute;
      top: ${qrPosition.y}px;
      left: ${qrPosition.x}px;
      width: ${qrPosition.size}px;
      height: ${qrPosition.size}px;
      text-align: center;
      z-index: 2;
      transform: translateY(-5px);
    `;
    
    // إنشاء صورة QR - تحسين: استخدام صورة مسبقة التحميل
    const qrWrapper = document.createElement('div');
    qrWrapper.style.cssText = `
      width: ${qrPosition.size}px;
      height: ${qrPosition.size}px;
      padding: 4px;
      background: white;
      border-radius: 4px;
      margin: 0 auto;
    `;
    
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      `${window.location.origin}/verify/${verificationUrl}`
    )}`;
    
    // تحميل صورة QR مسبقًا
    await preloadImage(qrUrl);
    
    const qrImg = document.createElement('img');
    qrImg.src = qrUrl;
    qrImg.alt = 'رمز التحقق';
    qrImg.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: contain;
    `;
    
    qrWrapper.appendChild(qrImg);
    qrContainer.appendChild(qrWrapper);
    
    // إضافة تسمية QR
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
  
  // إضافة التوقيع إذا كان الخطاب معتمداً
  if (letter.signature_id && letter.workflow_status === 'approved' && letterElements.signature.enabled) {
    try {
      // استعلام للحصول على رابط التوقيع
      const { data: signatureData, error } = await supabase
        .from('signatures')
        .select('signature_url')
        .eq('id', letter.signature_id)
        .maybeSingle();
      
      if (!error && signatureData?.signature_url) {
        const signatureContainer = document.createElement('div');
        signatureContainer.style.cssText = `
          position: absolute;
          top: ${letterElements.signature.y}px;
          left: ${letterElements.signature.x}px;
          width: ${letterElements.signature.width}px;
          height: ${letterElements.signature.height}px;
          text-align: ${letterElements.signature.alignment};
          z-index: 2;
        `;
        
        // تحميل صورة التوقيع مسبقًا
        await preloadImage(signatureData.signature_url);
        
        const signatureImg = document.createElement('img');
        signatureImg.src = signatureData.signature_url;
        signatureImg.alt = "توقيع المعتمد";
        signatureImg.style.cssText = `
          height: 80%;
          max-width: 100%;
          object-fit: contain;
        `;
        
        signatureContainer.appendChild(signatureImg);
        
        // إضافة تسمية التوقيع
        const signatureLabel = document.createElement('div');
        signatureLabel.style.cssText = `
          font-size: 10px;
          color: #444;
          margin-top: 4px;
          font-family: 'Cairo', sans-serif;
          font-weight: bold;
        `;
        signatureLabel.textContent = 'توقيع المعتمد';
        signatureContainer.appendChild(signatureLabel);
        
        contentLayer.appendChild(signatureContainer);
      }
    } catch (err) {
      console.warn('Error adding signature to PDF:', err);
      // استمر بدون التوقيع إذا حدث خطأ
    }
  }
  
  container.appendChild(contentLayer);
  return container;
}

/**
 * تحسين المستند المستنسخ
 * تحسين: تبسيط وترميز فعال
 */
function optimizeClonedDocument(clonedDoc: Document): Promise<void> {
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
    
    /* تأكيد اتجاه النصوص للغة العربية */
    html, body {
      direction: rtl !important;
      text-align: right !important;
    }
    
    div, p, span, h1, h2, h3, h4, h5, h6, li, ul, ol {
      direction: rtl !important;
      text-align: inherit !important;
      unicode-bidi: embed !important;
      font-family: 'Cairo', sans-serif !important;
      color: #000 !important;
    }
    
    /* تحسين عرض الأسطر الفارغة */
    br {
      display: block !important;
      content: "" !important;
      margin-top: 0.3em !important;
    }
  `;
  clonedDoc.head.appendChild(styleElement);
  
  // تحسين: تقليل وقت الانتظار
  return new Promise(resolve => setTimeout(resolve, 150));
}

/**
 * تصدير عنصر DOM محدد كملف PDF
 * مفيدة للتصدير المباشر من واجهة المستخدم
 */
export async function exportElementToPDF(element: HTMLElement, options: Partial<ExportPDFOptions> = {}): Promise<void> {
  const filename = options.filename || 'document.pdf';
  const scale = options.scale || 3.0; // تحسين: تقليل الدقة
  const quality = options.quality || 0.95; // تحسين: تقليل الجودة
  
  // إظهار مؤشر التحميل
  const loadingElement = document.createElement('div');
  loadingElement.className = 'fixed inset-0 bg-black/60 flex items-center justify-center z-50';
  loadingElement.innerHTML = `
    <div class="bg-white rounded-lg p-6 flex flex-col items-center gap-4">
      <div class="w-12 h-12 border-4 border-t-primary border-primary/30 rounded-full animate-spin"></div>
      <p class="text-center font-medium">جاري إنشاء ملف PDF...<br><span class="text-sm text-gray-500">يرجى الانتظار</span></p>
    </div>
  `;
  document.body.appendChild(loadingElement);
  
  // تعيين مهلة للإلغاء في حالة استغراق وقت طويل
  const exportTimeout = setTimeout(() => {
    if (document.body.contains(loadingElement)) {
      document.body.removeChild(loadingElement);
    }
    throw new Error('استغرقت عملية التصدير وقتًا طويلًا جدًا');
  }, 30000); // 30 ثانية كحد أقصى
  
  try {
    // تحميل الخطوط أولاً (مع تخزين مؤقت)
    if (!fontLoaded) {
      await loadFonts();
      fontLoaded = true;
    } else {
      // تأكيد جاهزية الخطوط
      await document.fonts.ready;
    }
    
    // تخزين التحويل الأصلي واستعادته لاحقاً
    const originalTransform = element.style.transform;
    element.style.transform = 'scale(1)';
    
    // تعديل التنسيقات مؤقتاً للحصول على أفضل نتيجة
    const originalStyle = element.getAttribute('style') || '';
    element.style.overflow = 'hidden';
    element.style.pageBreakAfter = 'always';
    
    // تحويل العنصر إلى Canvas
    const canvas = await html2canvas(element, {
      scale: scale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#FFFFFF',
      letterRendering: true,
      logging: false,
      onclone: optimizeClonedDocument,
      imageTimeout: 5000, // تحديد مهلة تحميل الصور
    });
    
    // استعادة التنسيقات الأصلية
    element.style.transform = originalTransform;
    element.setAttribute('style', originalStyle);
    
    // إنشاء PDF بحجم A4
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
      compress: true
    });
    
    // أبعاد A4
    const pageWidth = 595;
    const pageHeight = 842;
    
    // إضافة Canvas إلى PDF مع تحسين الضغط
    pdf.addImage({
      imageData: canvas.toDataURL('image/jpeg', quality),
      format: 'JPEG', // تحسين: استخدام JPEG بدلاً من PNG للحصول على حجم أصغر
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      compression: 'FAST' // تحسين: استخدام ضغط أسرع
    });
    
    // حفظ PDF
    pdf.save(filename);
  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw new Error('حدث خطأ أثناء تصدير ملف PDF');
  } finally {
    // تنظيف
    clearTimeout(exportTimeout);
    if (document.body.contains(loadingElement)) {
      document.body.removeChild(loadingElement);
    }
  }
}