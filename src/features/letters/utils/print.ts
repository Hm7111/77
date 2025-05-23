import type { Letter } from '../../../types/database';

/**
 * طباعة خطاب
 */
export async function printLetter(letter: Letter, withTemplate: boolean = true): Promise<void> {
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

    // فتح نافذة الطباعة
    const printWindow = window.open('', '_blank');
    if (!printWindow) throw new Error('لم نتمكن من فتح نافذة الطباعة');

    // إنشاء محتوى الصفحة
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
    `;

    // إضافة أنماط خاصة بالقالب أو بدون قالب
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
            .letter-number {
              position: absolute;
              top: 25px;
              left: 85px;
              width: 40px;
              text-align: center;
              font-size: 14px;
              font-weight: 600;
              direction: ltr;
            }
            .letter-date {
              position: absolute;
              top: 60px;
              left: 40px;
              width: 120px;
              text-align: center;
              font-size: 14px;
              font-weight: 600;
              direction: ltr;
            }
            .letter-content {
              position: absolute;
              top: 120px;
              right: 35px;
              left: 40px;
              padding: 24px;
              font-size: 15px;
              line-height: 1.5;
              text-align: right;
              direction: rtl;
              white-space: pre-wrap;
            }
            .qr-code {
              position: absolute;
              bottom: 40px;
              right: 40px;
              text-align: center;
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
            .letter-number {
              font-weight: 600;
              margin-bottom: 10px;
            }
            .letter-date {
              font-weight: 600;
            }
            .letter-content {
              margin-bottom: 40px;
              font-size: 15px;
              line-height: 1.8;
              min-height: 600px;
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
            .qr-code {
              display: flex;
              flex-direction: column;
              align-items: center;
            }
      `;
    }

    // إضافة أزرار الطباعة والإغلاق
    pageHtml += `
            .toolbar {
              position: fixed;
              top: 20px;
              right: 20px;
              display: flex;
              gap: 10px;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.15);
              padding: 10px;
              z-index: 100;
            }
            
            @media print {
              .toolbar { display: none !important; }
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
          </style>
        </head>
        <body>
          <div class="toolbar">
            <button onclick="window.print();" class="btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              طباعة
            </button>
            <button onclick="window.close();">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              إغلاق
            </button>
          </div>
    `;

    // إضافة محتوى الخطاب
    if (withTemplate && templateData?.image_url) {
      pageHtml += `
        <div class="letter-container">
          <div class="letter-number">${letter.number || ''}</div>
          <div class="letter-date">${letter.content.date || ''}</div>
          <div class="letter-content">${letter.content.body || ''}</div>
    `;
    } else {
      pageHtml += `
        <div class="letter-container">
          <div class="letter-header">
            <div class="letter-info">
              <div class="letter-number">رقم الخطاب: ${letter.number}/${letter.year}</div>
              <div class="letter-date">التاريخ: ${letter.content.date || ''}</div>
            </div>
          </div>
          <div class="letter-content">${letter.content.body || ''}</div>
          <div class="letter-footer">
    `;
    }
    
    // إضافة رمز QR
    if (letter.verification_url || letter.content.verification_url) {
      const verificationUrl = letter.verification_url || letter.content.verification_url;
      
      pageHtml += `
            <div class="qr-code">
              <img 
                src="https://api.qrserver.com/v1/create-qr-code/?size=${withTemplate ? '80x80' : '100x100'}&data=${encodeURIComponent(
                  `${window.location.origin}/verify/${verificationUrl}`
                )}" 
                alt="رمز التحقق"
              >
              <div style="margin-top: 4px; font-size: ${withTemplate ? '10px' : '12px'}; color: #666;">
                رمز التحقق
              </div>
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
                // تلقائي: window.print();
              }, 800);
            });
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(pageHtml);
    printWindow.document.close();
  } catch (error) {
    console.error('Error printing letter:', error);
    throw new Error('حدث خطأ أثناء الطباعة');
  } finally {
    if (document.body.contains(loadingDiv)) {
      document.body.removeChild(loadingDiv);
    }
  }
}

export default {
  printLetter
};