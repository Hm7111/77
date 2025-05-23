import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import html2canvas from 'html2canvas';
import type { Letter } from '../types/database';

/**
 * واجهة خيارات التصدير
 */
export interface ExportOptions {
  filename?: string;
  scale?: number;
  quality?: number;
  showProgress?: (progress: number) => void;
  withTemplate?: boolean;
}

/**
 * خدمة تصدير الخطابات بجودة عالية
 * تستخدم pdf-lib للإنشاء المباشر لملفات PDF بجودة عالية مع دعم كامل للغة العربية
 */
class PDFExportService {
  private readonly PAGE_WIDTH = 595;
  private readonly PAGE_HEIGHT = 842;
  
  /**
   * تصدير خطاب كملف PDF عالي الجودة
   */
  public async exportLetter(letter: Letter, options: ExportOptions = {}): Promise<Uint8Array> {
    // الخيارات الافتراضية
    const filename = options.filename || `خطاب-${letter.number}-${letter.year}.pdf`;
    const scale = options.scale || 4.0; // زيادة الدقة لتحسين جودة الصورة
    const quality = options.quality || 0.99; // جودة عالية جداً
    const showProgress = options.showProgress || (() => {});
    const withTemplate = options.withTemplate !== undefined ? options.withTemplate : true;
    
    try {
      showProgress(0.1); // بداية العملية
      
      // استخدام template_snapshot إذا كان متاحاً، وإلا استخدام letter_templates
      const templateData = letter.template_snapshot || letter.letter_templates;
      
      // تحميل الخطوط والصور مسبقاً
      if (withTemplate && templateData?.image_url) {
        await this.preloadImage(templateData.image_url);
      }
      await this.loadFonts();
      
      showProgress(0.2);
      
      // إنشاء عناصر DOM للخطاب
      const letterElement = await this.createLetterElement(letter, withTemplate);
      document.body.appendChild(letterElement);
      
      try {
        showProgress(0.3);
        
        // إضافة وقت إضافي للتأكد من تحميل الخطوط
        await new Promise(resolve => setTimeout(resolve, 500));
        
        showProgress(0.4);
        
        // تحويل العنصر إلى صورة عالية الجودة
        const canvas = await html2canvas(letterElement, {
          scale: scale, // زيادة الدقة (4x للحصول على جودة عالية جداً)
          useCORS: true,
          allowTaint: true,
          backgroundColor: null, // شفافية للخلفية للحفاظ على جودة القالب
          letterRendering: true,
          imageRendering: true,
          logging: false,
          onclone: this.optimizeClonedDocument,
          y: -5, // تصحيح موضع النص للأعلى قليلاً
          x: 0
        });
        
        showProgress(0.7);
        
        // إنشاء PDF باستخدام pdf-lib
        const pdfDoc = await PDFDocument.create();
        pdfDoc.registerFontkit(fontkit);
        
        // إضافة صفحة A4
        const page = pdfDoc.addPage([this.PAGE_WIDTH, this.PAGE_HEIGHT]);
        
        // تحويل Canvas إلى صورة عالية الجودة
        const pngBytes = this.dataUrlToBytes(canvas.toDataURL('image/png', quality));
        const image = await pdfDoc.embedPng(pngBytes);
        
        // رسم الصورة على الصفحة بالحجم المناسب
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: this.PAGE_WIDTH,
          height: this.PAGE_HEIGHT
        });
        
        // إعداد البيانات الوصفية
        pdfDoc.setTitle(`خطاب رقم ${letter.number}/${letter.year}`);
        pdfDoc.setAuthor('نظام إدارة الخطابات');
        pdfDoc.setSubject(letter.content.subject || 'خطاب رسمي');
        pdfDoc.setKeywords(['خطاب', 'رسمي', 'وثيقة']);
        pdfDoc.setProducer('نظام إدارة الخطابات');
        pdfDoc.setCreator('نظام إدارة الخطابات');
        
        showProgress(0.9);
        
        // حفظ المستند بدقة عالية
        const pdfBytes = await pdfDoc.save({
          useObjectStreams: true,
          addDefaultPage: false
        });
        
        // حفظ الملف للمستخدم
        this.saveFile(pdfBytes, filename);
        
        showProgress(1.0);
        
        return pdfBytes;
      } finally {
        // إزالة العنصر المؤقت
        if (document.body.contains(letterElement)) {
          document.body.removeChild(letterElement);
        }
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      throw error instanceof Error ? error : new Error('حدث خطأ أثناء تصدير الملف');
    }
  }

  /**
   * إنشاء معاينة PDF
   */
  public async createPreview(letter: Letter): Promise<Uint8Array> {
    try {
      return await this.exportLetter(letter, {
        showProgress: () => {}, // لا حاجة لعرض التقدم في المعاينة
      });
    } catch (error) {
      console.error('Error creating PDF preview:', error);
      throw new Error('حدث خطأ أثناء إنشاء معاينة PDF');
    }
  }

  /**
   * تحميل الصورة مسبقاً
   */
  private async preloadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      // تحسين جودة الصورة
      img.style.imageRendering = 'high-quality';
      img.style.imageRendering = '-webkit-optimize-contrast';
      img.src = url;
    });
  }

  /**
   * تحميل الخطوط
   */
  private async loadFonts(): Promise<void> {
    // التأكد من تحميل خط Cairo
    if (!document.fonts.check('16px Cairo')) {
      const fontFace = new FontFace('Cairo', 'url(/fonts/cairo/Cairo-Regular.ttf)');
      await fontFace.load();
      document.fonts.add(fontFace);
      
      const fontFaceBold = new FontFace('Cairo', 'url(/fonts/cairo/Cairo-Bold.ttf)', { weight: 'bold' });
      await fontFaceBold.load();
      document.fonts.add(fontFaceBold);
    }
    
    // انتظار تحميل الخطوط
    await document.fonts.ready;
    // انتظار إضافي للتأكد من تحميل الخطوط بشكل كامل
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * إنشاء عنصر DOM للخطاب
   */
  private async createLetterElement(letter: Letter, withTemplate: boolean): Promise<HTMLElement> {
    // استخدام template_snapshot إذا كان متاحاً، وإلا استخدام letter_templates
    const templateData = letter.template_snapshot || letter.letter_templates;
    
    // الحصول على موضع QR من القالب أو استخدام القيم الافتراضية
    const qrPosition = templateData?.qr_position || {
      x: null,
      y: null,
      size: 80,
      alignment: 'right'
    };
    
    // إنشاء حاوية الخطاب
    const container = document.createElement('div');
    container.style.cssText = `
      width: ${this.PAGE_WIDTH}px;
      height: ${this.PAGE_HEIGHT}px;
      position: fixed;
      left: -9999px;
      top: 0;
      background-color: white;
      overflow: hidden;
      font-family: 'Cairo', sans-serif;
      direction: rtl;
      text-align: right;
      unicode-bidi: embed;
    `;
    
    // إضافة صورة القالب إذا كان مطلوباً
    if (withTemplate && templateData) {
      const backgroundImg = document.createElement('img');
      backgroundImg.crossOrigin = 'anonymous';
      backgroundImg.src = templateData.image_url;
      backgroundImg.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        z-index: 0;
        image-rendering: high-quality;
        image-rendering: -webkit-optimize-contrast;
      `;
      container.appendChild(backgroundImg);
      
      // تحميل الصورة قبل الاستمرار
      await new Promise<void>((resolve, reject) => {
        backgroundImg.onload = () => resolve();
        backgroundImg.onerror = () => reject(new Error('فشل تحميل صورة القالب'));
        if (backgroundImg.complete) resolve();
      });
    }
    
    // طبقة المحتوى
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
      color: #000;
      font-family: 'Cairo', sans-serif;
      transform: translateY(-5px); /* تصحيح موضع النص للأعلى */
    `;
    numberElement.textContent = letter.number?.toString() || '';
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
      color: #000;
      font-family: 'Cairo', sans-serif;
      transform: translateY(-5px); /* تصحيح موضع النص للأعلى */
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
      bottom: 120px;
      padding: 24px;
      font-size: 14px;
      line-height: ${letter.content.lineHeight || 1.5};
      text-align: right;
      direction: rtl;
      color: #000;
      font-family: 'Cairo', sans-serif;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: break-word;
      transform: translateY(-5px); /* تصحيح موضع النص للأعلى */
    `;
    
    // تعديل المحتوى للحفاظ على التنسيق المطابق
    bodyElement.innerHTML = letter.content.body || '';
    
    // معالجة محاذاة النصوص بشكل صحيح
    const paragraphs = bodyElement.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6');
    paragraphs.forEach(p => {
      // الحفاظ على المحاذاة الأصلية
      if (p.style.textAlign) {
        p.style.textAlign = p.style.textAlign;
      }
      
      // تصحيح ارتفاع السطر
      if (letter.content.lineHeight) {
        p.style.lineHeight = letter.content.lineHeight.toString();
      }
      
      // تصحيح المسافات
      p.style.margin = '0';
      p.style.padding = '0';
    });
    
    contentLayer.appendChild(bodyElement);
    
    // رمز QR
    if (letter.verification_url || letter.content.verification_url) {
      const verificationUrl = letter.verification_url || letter.content.verification_url;
      
      const qrContainer = document.createElement('div');
      qrContainer.style.cssText = `
        position: absolute;
        bottom: ${qrPosition?.y ? 'auto' : '40px'};
        top: ${qrPosition?.y ? qrPosition.y + 'px' : 'auto'};
        right: ${qrPosition?.alignment === 'right' ? '40px' : 'auto'};
        left: ${qrPosition?.alignment === 'left' ? '40px' : 'auto'};
        ${qrPosition?.alignment === 'center' ? 'left: 50%; transform: translateX(-50%);' : ''}
        ${qrPosition?.x ? 'left: ' + qrPosition.x + 'px' : ''}
        text-align: center;
        z-index: 2;
        transform: translateY(-5px); /* تصحيح موضع QR للأعلى */
      `;
      
      const qrElement = document.createElement('div');
      qrElement.style.cssText = `
        width: ${qrPosition.size || 80}px;
        height: ${qrPosition.size || 80}px;
        padding: 4px;
        background: white;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      
      const qrImage = document.createElement('img');
      qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        `${window.location.origin}/verify/${verificationUrl}`
      )}`;
      qrImage.alt = 'رمز التحقق';
      qrImage.style.width = '100%';
      qrImage.style.height = '100%';
      
      qrElement.appendChild(qrImage);
      qrContainer.appendChild(qrElement);
      
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
      
      // انتظار تحميل صورة QR
      if (!qrImage.complete) {
        await new Promise<void>((resolve) => {
          qrImage.onload = () => resolve();
          setTimeout(() => resolve(), 500); // حد أقصى للانتظار
        });
      }
    }
    
    container.appendChild(contentLayer);
    return container;
  }

  /**
   * تحسين المستند المستنسخ
   */
  private optimizeClonedDocument(clonedDoc: Document): Promise<void> {
    // تحسين عرض النصوص العربية
    const styleElement = clonedDoc.createElement('style');
    styleElement.innerHTML = `
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
      
      * {
        text-rendering: optimizeLegibility !important;
        -webkit-font-smoothing: antialiased !important;
        -moz-osx-font-smoothing: grayscale !important;
      }
      
      img {
        image-rendering: high-quality !important;
        image-rendering: -webkit-optimize-contrast !important;
        image-rendering: crisp-edges !important;
      }
      
      div, p, span, h1, h2, h3, h4, h5, h6 {
        direction: rtl !important;
        text-align: inherit !important;
        unicode-bidi: embed !important;
        font-family: 'Cairo', sans-serif !important;
        color: #000 !important;
        transform: translateY(-5px) !important; /* تصحيح موضع النص للأعلى */
      }
      
      /* تصحيح محاذاة النصوص */
      [style*="text-align: center"] {
        text-align: center !important;
      }
      
      [style*="text-align: right"] {
        text-align: right !important;
      }
      
      [style*="text-align: left"] {
        text-align: left !important;
      }
      
      [style*="text-align: justify"] {
        text-align: justify !important;
      }
    `;
    clonedDoc.head.appendChild(styleElement);
    
    // انتظار إضافي لتحميل الخطوط
    return new Promise(resolve => setTimeout(resolve, 800));
  }

  /**
   * تحويل DataURL إلى مصفوفة بايت
   */
  private dataUrlToBytes(dataUrl: string): Uint8Array {
    const base64 = dataUrl.split(',')[1];
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * حفظ الملف للمستخدم
   */
  private saveFile(data: Uint8Array, filename: string): void {
    const blob = new Blob([data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
    }, 100);
  }
}

// نسخة عامة للاستخدام في أنحاء التطبيق
export const pdfExportService = new PDFExportService();