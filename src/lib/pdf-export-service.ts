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

// تخزين مؤقت للصور
const imageCache = new Map<string, HTMLImageElement>();

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
    const quality = options.quality || 0.99; // أعلى جودة ممكنة
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
        const pdfBytes = await pdfDoc.save();
        
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
    // التحقق من التخزين المؤقت أولاً
    if (imageCache.has(url)) {
      return imageCache.get(url) as HTMLImageElement;
    }
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // إضافة الصورة للتخزين المؤقت
        imageCache.set(url, img);
        resolve(img);
      };
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
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * إنشاء عنصر DOM للخطاب
   */
  private async createLetterElement(letter: Letter, withTemplate: boolean): Promise<HTMLElement> {
    // استخدام template_snapshot إذا كان متاحاً، وإلا استخدام letter_templates
    const templateData = letter.template_snapshot || letter.letter_templates;
    
    // الحصول على موضع QR من القالب أو استخدام القيم الافتراضية
    const qrPosition = templateData?.qr_position || {
      x: 40,
      y: 760,
      size: 80,
      alignment: 'right'
    };
    
    // الحصول على مواضع العناصر المخصصة من القالب
    const letterElements = templateData?.letter_elements || {
      letterNumber: { x: 85, y: 25, width: 32, alignment: 'right', enabled: true },
      letterDate: { x: 40, y: 60, width: 120, alignment: 'center', enabled: true },
      signature: { x: 40, y: 700, width: 150, height: 80, alignment: 'center', enabled: true }
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
    if (withTemplate && templateData?.image_url) {
      // استخدام عنصر الخلفية بدلاً من استخدام الخلفية المباشرة لتجنب مشاكل التوافق
      const bgDiv = document.createElement('div');
      bgDiv.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-image: url(${templateData.image_url});
        background-size: 100% 100%;
        background-position: center;
        background-repeat: no-repeat;
        z-index: 0;
      `;
      container.appendChild(bgDiv);
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
    
    // مرجع الخطاب - استخدام الموضع المخصص
    if (letterElements.letterNumber.enabled) {
      const numberDiv = document.createElement('div');
      numberDiv.style.cssText = `
        position: absolute;
        top: ${letterElements.letterNumber.y}px;
        left: ${letterElements.letterNumber.x}px;
        width: ${letterElements.letterNumber.width}px;
        text-align: ${letterElements.letterNumber.alignment};
        font-size: 14px;
        font-weight: 600;
        direction: ltr;
        font-family: 'Cairo', sans-serif;
      `;
      numberDiv.textContent = letter.letter_reference || `${letter.branch_code || ''}-${letter.number}/${letter.year}`;
      contentLayer.appendChild(numberDiv);
    }
    
    // تاريخ الخطاب - استخدام الموضع المخصص
    if (letterElements.letterDate.enabled) {
      const dateDiv = document.createElement('div');
      dateDiv.style.cssText = `
        position: absolute;
        top: ${letterElements.letterDate.y}px;
        left: ${letterElements.letterDate.x}px;
        width: ${letterElements.letterDate.width}px;
        text-align: ${letterElements.letterDate.alignment};
        font-size: 14px;
        font-weight: 600;
        direction: ltr;
        font-family: 'Cairo', sans-serif;
      `;
      dateDiv.textContent = letter.content.date || '';
      contentLayer.appendChild(dateDiv);
    }

    // محتوى الخطاب
    const content = document.createElement('div');
    content.style.cssText = `
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
      font-family: 'Cairo', sans-serif;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: break-word;
      color: #000;
    `;
    content.innerHTML = letter.content.body || '';
    contentLayer.appendChild(content);
    
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
      `;
      
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        `${window.location.origin}/verify/${verificationUrl}`
      )}`;
      
      // تحميل صورة QR مسبقًا
      await this.preloadImage(qrUrl);
      
      const qrImage = document.createElement('img');
      qrImage.src = qrUrl;
      qrImage.alt = 'رمز التحقق';
      qrImage.style.cssText = `
        width: ${qrPosition.size}px;
        height: ${qrPosition.size}px;
        padding: 4px;
        background: white;
        border-radius: 4px;
      `;
      qrContainer.appendChild(qrImage);
      
      const qrText = document.createElement('div');
      qrText.style.cssText = `
        font-size: 10px;
        color: #444;
        margin-top: 4px;
        font-family: 'Cairo', sans-serif;
      `;
      qrText.textContent = 'رمز التحقق';
      qrContainer.appendChild(qrText);
      
      contentLayer.appendChild(qrContainer);
    }
    
    // إضافة التوقيع إذا كان الخطاب معتمداً
    if (letter.signature_id && letter.workflow_status === 'approved' && letterElements.signature.enabled) {
      try {
        // استعلام للحصول على رابط التوقيع
        const { data, error } = await supabase
          .from('signatures')
          .select('signature_url')
          .eq('id', letter.signature_id)
          .maybeSingle();
        
        if (data?.signature_url) {
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
          await this.preloadImage(data.signature_url);
          
          const signatureImg = document.createElement('img');
          signatureImg.src = data.signature_url;
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
    return new Promise(resolve => setTimeout(resolve, 500));
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