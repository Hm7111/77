import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { Letter } from '../../../types/database';

// Helper to show loading indicator
function showLoading(): HTMLElement {
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
  loadingDiv.innerHTML = `
    <div class="bg-white rounded-lg p-4 flex items-center gap-x-3">
      <div class="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      <span>جاري تجهيز الخطاب...</span>
    </div>
  `;
  document.body.appendChild(loadingDiv);
  return loadingDiv;
}

// Helper to hide loading indicator
function hideLoading(loadingDiv: HTMLElement) {
  if (loadingDiv && loadingDiv.parentNode) {
    loadingDiv.parentNode.removeChild(loadingDiv);
  }
}

// Helper to wait for image to load
async function waitForImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
    if (img.complete) resolve(img);
  });
}

// Helper to wait for font to load
async function waitForFont(): Promise<void> {
  await document.fonts.ready;
  return new Promise(resolve => setTimeout(resolve, 800));
}

// Create letter element for PDF export
function createLetterElement(letter: Letter, withTemplate: boolean = true): HTMLDivElement {
  const container = document.createElement('div');
  container.style.cssText = `
    width: 595px;
    height: 842px;
    position: fixed;
    left: -9999px;
    top: 0;
    background-color: white;
    font-family: 'Cairo', sans-serif;
    direction: rtl;
  `;
  
  // Get template data
  const templateData = letter.template_snapshot || letter.letter_templates;
  
  // Create template background if needed
  if (withTemplate && templateData && templateData.image_url) {
    const bgLayer = document.createElement('div');
    bgLayer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: url('${templateData.image_url}');
      background-size: 100% 100%;
      background-repeat: no-repeat;
      background-position: center;
      z-index: 0;
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
    `;
    container.appendChild(bgLayer);
  }
  
  // Content layer
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
  
  // Letter number
  if (letter.number) {
    const numberElement = document.createElement('div');
    numberElement.style.cssText = `
      position: absolute;
      top: 25px;
      left: 85px;
      width: 40px;
      text-align: center;
      font-size: 14px;
      font-weight: 600;
      font-family: 'Cairo', sans-serif;
      direction: ltr;
    `;
    numberElement.textContent = letter.number?.toString() || '';
    contentLayer.appendChild(numberElement);
  }
  
  // Letter date
  if (letter.content.date) {
    const dateElement = document.createElement('div');
    dateElement.style.cssText = `
      position: absolute;
      top: 60px;
      left: 40px;
      width: 120px;
      text-align: center;
      font-size: 14px;
      font-weight: 600;
      font-family: 'Cairo', sans-serif;
      direction: ltr;
    `;
    dateElement.textContent = letter.content.date || '';
    contentLayer.appendChild(dateElement);
  }
  
  // Letter content
  if (letter.content.body) {
    const textElement = document.createElement('div');
    textElement.style.cssText = `
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
      word-break: break-word;
      color: #000;
      overflow-wrap: break-word;
      white-space: pre-wrap;
    `;
    
    textElement.innerHTML = letter.content.body || '';
    contentLayer.appendChild(textElement);
  }
  
  // QR code
  if (letter.verification_url || letter.content.verification_url) {
    const verificationUrl = letter.verification_url || letter.content.verification_url;
    
    const qrContainer = document.createElement('div');
    qrContainer.style.cssText = `
      position: absolute;
      bottom: 40px;
      right: 40px;
      text-align: center;
    `;
    
    const qrWrapperElement = document.createElement('div');
    qrWrapperElement.style.cssText = `
      width: 80px;
      height: 80px;
      padding: 4px;
      background: white;
      border-radius: 4px;
      margin: 0 auto;
    `;
    
    const qrImage = document.createElement('img');
    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      `${window.location.origin}/verify/${verificationUrl}`
    )}`;
    qrImage.alt = 'رمز التحقق';
    qrImage.style.cssText = `
      width: 72px;
      height: 72px;
      object-fit: contain;
    `;
    
    qrWrapperElement.appendChild(qrImage);
    qrContainer.appendChild(qrWrapperElement);
    
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

// Function to optimize the cloned document
function optimizeClonedDocument(clonedDoc: Document) {
  const styleElement = clonedDoc.createElement('style');
  styleElement.innerHTML = `
    * {
      text-rendering: optimizeLegibility !important;
      -webkit-font-smoothing: antialiased !important;
      -moz-osx-font-smoothing: grayscale !important;
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
  
  return new Promise(resolve => setTimeout(resolve, 800));
}

// Export letter to PDF
export async function exportLetterToPDF(letter: Letter, withTemplate: boolean = true) {
  const EXPORT_TIMEOUT = 30000; // 30 seconds timeout
  const pendingExports = new Set<string>();
  
  // Check if already exporting
  if (letter.id && pendingExports.has(letter.id)) {
    throw new Error('جاري تصدير الخطاب، يرجى الانتظار');
  }

  const loadingDiv = showLoading();
  if (letter.id) {
    pendingExports.add(letter.id);
  }
  
  const exportTimeout = setTimeout(() => {
    if (letter.id) {
      pendingExports.delete(letter.id);
    }
    hideLoading(loadingDiv);
    throw new Error('انتهت مهلة التصدير');
  }, EXPORT_TIMEOUT);
  
  try {
    // Check connection
    const isOnline = await fetch(window.location.origin, { method: 'HEAD' })
      .then(response => response.ok)
      .catch(() => false);
      
    if (!isOnline) {
      clearTimeout(exportTimeout);
      throw new Error('لا يوجد اتصال بالإنترنت');
    }

    // Load fonts and template image
    await document.fonts.ready;
    
    const templateData = letter.template_snapshot || letter.letter_templates;
    
    if (withTemplate && templateData?.image_url) {
      await waitForImage(templateData.image_url);
    }
    
    // Create letter element
    const letterElement = createLetterElement(letter, withTemplate);
    document.body.appendChild(letterElement);
    
    // Convert to canvas
    const canvas = await html2canvas(letterElement, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#FFFFFF',
      letterRendering: true, 
      logging: false,
      onclone: optimizeClonedDocument
    });
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
      compress: true,
      putOnlyUsedFonts: true,
      floatPrecision: 16
    });
    
    // Add image to PDF
    pdf.addImage({
      imageData: canvas.toDataURL('image/jpeg', 0.95),
      format: 'JPEG',
      x: 0,
      y: 0,
      width: 595,
      height: 842,
      compression: 'NONE'
    });
    
    // Remove temporary element
    document.body.removeChild(letterElement);
    
    // Save PDF
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
    hideLoading(loadingDiv);
    if (letter.id) {
      pendingExports.delete(letter.id);
    }
    clearTimeout(exportTimeout);
  }
}

export default {
  exportLetterToPDF
};