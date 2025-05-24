import html2canvas from 'html2canvas';
import { Letter } from '../types/database';
import { useToast } from '../hooks/useToast';
import 'canvas-to-blob';
import { exportToPDF } from './pdf-export';

// دالة للتحقق من حالة الاتصال
export async function checkConnection(): Promise<boolean> {
  try {
    const response = await fetch(window.location.origin, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

// طباعة الخطاب
export async function printLetter(letter: Letter, withTemplate: boolean = true) {
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
  
  try {
    // استخدام template_snapshot إذا كان متاحاً، وإلا استخدام letter_templates
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
    
    // انتظار تحميل الخط
    await document.fonts.ready;

    const printWindow = window.open('', '_blank');
    if (!printWindow) throw new Error('لم نتمكن من فتح نافذة الطباعة');

    // محتوى الصفحة
    let pageHtml = `
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <title>طباعة الخطاب</title>
          <meta charset="utf-8">
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4;
              margin: 0;
            }
            body { 
              margin: 0; 
              padding: 0;
              font-family: 'Cairo', sans-serif;
              text-rendering: optimizeLegibility;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            .toolbar {
              display: flex;
              gap: 10px;
              padding: 15px;
              background: white;
              border-radius: 8px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              margin: 20px 0;
            }
            button {
              padding: 8px 16px;
              background: #f3f4f6;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 6px;
              font-family: 'Cairo', sans-serif;
              transition: all 0.3s;
            }
            button:hover {
              background: #e5e7eb;
            }
            .btn-primary {
              background: #3b82f6;
              color: white;
            }
            .btn-primary:hover {
              background: #2563eb;
            }
            @media print {
              body { margin: 0; }
              .no-print {
                display: none !important;
              }
            }
    `;

    // جزء محتوى الخطاب استناداً إلى الخيار المحدد
    if (withTemplate && templateData?.image_url) {
      pageHtml += `
            .letter-container {
              width: 21cm;
              height: 29.7cm;
              margin: 0 auto;
              position: relative;
              background-image: url('${templateData.image_url}');
              background-size: 100% 100%;
              background-repeat: no-repeat;
            }
      `;
    } else {
      pageHtml += `
            .letter-container {
              width: 21cm;
              min-height: 29.7cm;
              margin: 0 auto;
              position: relative;
              background-color: white;
              padding: 3cm 2cm;
              box-sizing: border-box;
            }
            .letter-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 40px;
              border-bottom: 1px solid #eee;
              padding-bottom: 20px;
            }
            .letter-info {
              display: flex;
              flex-direction: column;
            }
            .letter-content {
              margin-bottom: 40px;
              font-size: 14px;
              line-height: 1.8;
              min-height: 500px;
              text-align: right;
              direction: rtl;
              white-space: pre-wrap;
            }
            .letter-footer {
              display: flex;
              justify-content: flex-end;
              margin-top: 30px;
              border-top: 1px solid #eee;
              padding-top: 20px;
            }
      `;
    }

    // إضافة نمط لعناصر الخطاب المخصصة
    pageHtml += `
            /* مرجع الخطاب المركب - يستخدم الموضع المخصص */
            .letter-number {
              position: absolute;
              top: ${letterElements.letterNumber.y}px;
              left: ${letterElements.letterNumber.x}px;
              width: ${letterElements.letterNumber.width}px;
              text-align: ${letterElements.letterNumber.alignment};
              font-size: 14px;
              font-weight: 600;
              font-family: 'Cairo', sans-serif;
            }
            
            /* تاريخ الخطاب - يستخدم الموضع المخصص */
            .letter-date {
              position: absolute;
              top: ${letterElements.letterDate.y}px;
              left: ${letterElements.letterDate.x}px;
              width: ${letterElements.letterDate.width}px;
              text-align: ${letterElements.letterDate.alignment};
              font-size: 14px;
              font-weight: 600;
            }
            
            /* محتوى الخطاب */
            .letter-content {
              position: absolute;
              top: 120px;
              right: 35px;
              left: 40px;
              padding: 24px;
              font-size: 14px;
              line-height: 1.8;
              text-align: right;
              direction: rtl;
              white-space: pre-wrap;
            }
            
            /* رمز QR */
            .qr-code {
              position: absolute;
              top: ${qrPosition.y}px;
              left: ${qrPosition.x}px;
              width: ${qrPosition.size}px;
              height: ${qrPosition.size}px;
              text-align: center;
            }
            
            .qr-code img {
              width: 100%;
              height: 100%;
              background: white;
              padding: 4px;
              border-radius: 4px;
            }
            
            /* التوقيع */
            .signature {
              position: absolute;
              top: ${letterElements.signature.y}px;
              left: ${letterElements.signature.x}px;
              width: ${letterElements.signature.width}px;
              height: ${letterElements.signature.height}px;
              text-align: ${letterElements.signature.alignment};
            }
            
            /* تحسين عرض الأسطر الفارغة */
            br {
              display: block !important;
              content: "" !important;
              margin-top: 0.3em !important;
            }
      `;
    
    pageHtml += `
          </style>
        </head>
        <body>
          <div class="toolbar no-print">
            <button onclick="window.print();" class="btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              طباعة
            </button>
            <button onclick="window.close();">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              إغلاق
            </button>
          </div>
    `;

    // جزء محتوى الخطاب استناداً إلى الخيار المحدد
    pageHtml += `
      <div class="letter-container">
    `;

    // مرجع الخطاب - استخدام الموضع المخصص
    if (letterElements.letterNumber.enabled) {
      pageHtml += `
        <div class="letter-number">${letter.letter_reference || `${letter.branch_code || ''}-${letter.number}/${letter.year}`}</div>
      `;
    }
    
    // تاريخ الخطاب - استخدام الموضع المخصص
    if (letterElements.letterDate.enabled) {
      pageHtml += `
        <div class="letter-date">${letter.content.date || ''}</div>
      `;
    }
    
    // محتوى الخطاب
    pageHtml += `
      <div class="letter-content">${letter.content.body || ''}</div>
    `;
    
    // التوقيع - إذا كان الخطاب معتمداً
    if (letter.signature_id && letter.workflow_status === 'approved' && letterElements.signature.enabled) {
      pageHtml += `
        <div class="signature">
          <img src="/signature-placeholder.png" alt="توقيع المعتمد" style="height: 80%; max-width: 100%; object-fit: contain;">
          <div style="font-size: 10px; margin-top: 4px; font-weight: bold;">توقيع المعتمد</div>
        </div>
      `;
    }
    
    // إضافة رمز QR
    if (letter.verification_url || letter.content.verification_url) {
      const verificationUrl = letter.verification_url || letter.content.verification_url;
      
      pageHtml += `
            <div class="qr-code">
              <img 
                src="https://api.qrserver.com/v1/create-qr-code/?size=${qrPosition.size}x${qrPosition.size}&data=${encodeURIComponent(
                  `${window.location.origin}/verify/${verificationUrl}`
                )}" 
                alt="رمز التحقق"
              >
              <div style="font-size: 10px; color: #666; margin-top: 4px;">رمز التحقق</div>
            </div>
      `;
    }
    
    // إغلاق الحاويات وإضافة نص البرمجة
    pageHtml += `
          </div>
          
          <script>
            // انتظار تحميل الصفحة والخطوط
            Promise.all([
              document.fonts.ready,
              ${withTemplate && templateData?.image_url ? `
              new Promise(resolve => {
                const img = new Image();
                img.onload = resolve;
                img.src = '${templateData.image_url}';
              })
              ` : 'Promise.resolve()'}
            ]).then(() => {
              // تأخير قصير قبل الطباعة للتأكد من تحميل كل شيء
              setTimeout(() => {
                document.querySelector('.toolbar').style.display = 'flex';
              }, 500);
            });
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(pageHtml);
    printWindow.document.close();
  } catch (error) {
    console.error('Error:', error);
    throw new Error('حدث خطأ أثناء الطباعة');
  } finally {
    hideLoading(loadingDiv);
  }
}

// إخفاء مؤشر التحميل
function hideLoading(loadingDiv: HTMLElement) {
  if (loadingDiv && loadingDiv.parentNode) {
    loadingDiv.parentNode.removeChild(loadingDiv);
  }
}

// تصدير الخطاب كملف PDF - استخدام الوظيفة الجديدة
export async function exportLetterToPDF(letter: Letter, withTemplate: boolean = true) {
  try {
    await exportToPDF(letter, {
      withTemplate: withTemplate,
      scale: 3.0,
      quality: 0.95,
      filename: `${letter.letter_reference || `خطاب-${letter.number}-${letter.year}`}.pdf`
    });
    return true;
  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw error;
  }
}