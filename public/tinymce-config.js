// تكوين TinyMCE مع دعم اللغة العربية والاتجاه RTL بشكل صحيح
tinymce.init({
  selector: '#myTextarea',
  language: 'ar',
  directionality: 'rtl',
  plugins: [
    'directionality', 'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
    'searchreplace', 'visualblocks', 'code', 'fullscreen',
    'insertdatetime', 'media', 'table', 'help', 'wordcount',
    'emoticons'
  ],
  toolbar: 'undo redo | formatselect | bold italic | ' +
    'alignright aligncenter alignleft | bullist numlist | ' +
    'link image | forecolor backcolor | fontselect fontsizeselect | ' +
    'rtl ltr | removeformat help',
  font_formats: 'Cairo=Cairo,sans-serif;Tajawal=Tajawal,sans-serif;Arial=arial;Times New Roman=times new roman',
  forced_root_block: 'p',  // استخدام p للفقرات
  force_br_newlines: false,  // عدم استخدام <br> عند الضغط على Enter
  force_p_newlines: true,   // استخدام <p> للأسطر الجديدة
  content_style: `
    @import url(https://fonts.googleapis.com/css2?family=Cairo&display=swap); 
    
    html, body, div, p, h1, h2, h3, h4, h5, h6, ul, ol, li, table, tr, td, th {
      direction: rtl !important;
      text-align: right !important;
      unicode-bidi: embed !important;
    }
    
    body { 
      font-family: Cairo, sans-serif; 
      padding: 10px;
      direction: rtl !important;
      text-align: right !important;
      line-height: 0 !important;
    }
    
    /* تصحيح قوائم النقاط */
    ul, ol {
      padding-right: 20px !important;
      padding-left: 0 !important;
    }
    
    /* تصحيح محاذاة الأزرار والأدوات */
    .tox-toolbar__primary {
      direction: rtl !important;
      justify-content: flex-end !important;
    }
    
    /* إلغاء المسافات بين الفقرات تماماً */
    p, div {
      margin: 0 0 0.5em 0 !important;
      padding: 0 !important;
      line-height: 1.5 !important;
    }
    
    /* تحسين الفواصل السطرية */
    br {
      display: block !important;
      content: " " !important;
      margin-top: 0.5em !important;
      line-height: 150% !important;
    }

    /* Fix for RTL tables */
    table {
      direction: rtl !important;
      text-align: right !important;
    }

    /* Fix for inputs in dialogs */
    .tox-dialog input, .tox-dialog textarea, .tox-dialog select {
      direction: rtl !important;
      text-align: right !important;
    }

    /* Fix for URL dialog */
    .tox-dialog__body-content {
      direction: rtl !important; 
      text-align: right !important;
    }
  `,
  browser_spellcheck: true,
  contextmenu: false,
  skin: 'oxide',
  resize: true,
  setup: function(editor) {
    editor.on('init', function() {
      // التأكد من ضبط الاتجاه للوثيقة كاملة
      editor.getDoc().documentElement.setAttribute('dir', 'rtl');
      editor.getDoc().documentElement.setAttribute('lang', 'ar');
      
      // التأكد من ضبط الاتجاه لعنصر body
      editor.getBody().setAttribute('dir', 'rtl');
      editor.getBody().style.direction = 'rtl';
      editor.getBody().style.textAlign = 'right';
      editor.getBody().style.lineHeight = '0';
      
      // تطبيق الاتجاه RTL على جميع العناصر الموجودة
      const allElements = editor.getBody().querySelectorAll('*');
      allElements.forEach(function(element) {
        if (element.nodeType === 1) { // عنصر DOM
          element.setAttribute('dir', 'rtl');
          element.style.textAlign = 'right';
          element.style.direction = 'rtl';
          element.style.lineHeight = '0';
          
          // تقليل المسافة بين الفقرات إذا كان العنصر فقرة
          if (element.tagName === 'P' || element.tagName === 'DIV') {
            element.style.margin = '0';
            element.style.padding = '0';
            element.style.lineHeight = '0';
          }
        }
      });
    });
    
    // معالجة الكتابة لضمان اتجاه صحيح للحروف
    editor.on('input', function() {
      const selection = editor.selection;
      const node = selection.getNode();
      if (node) {
        node.dir = 'rtl';
        node.style.direction = 'rtl';
        node.style.textAlign = 'right';
        node.style.lineHeight = '0';
      }
    });
    
    // معالجة مفتاح Enter - هنا التحسين الرئيسي
    editor.on('keydown', function(e) {
      if (e.key === 'Enter') {
        if (!e.shiftKey) {
          e.preventDefault(); // منع السلوك الافتراضي
          
          // إدراج فقرة جديدة مع تعيين نمط السطر إلى صفر
          editor.execCommand('mceInsertContent', false, '<p dir="rtl" style="text-align: right; direction: rtl; line-height: 0; margin: 0; padding: 0;">&nbsp;</p>');
          
          // ضمان وضع المؤشر في الفقرة الجديدة
          const rng = editor.selection.getRng();
          rng.selectNodeContents(editor.selection.getNode());
          rng.collapse(false);
          editor.selection.setRng(rng);
          
          return false;
        }
      }
    });
    
    // معالجة اللصق لضمان اتجاه النص صحيح
    editor.on('paste', function() {
      setTimeout(function() {
        // تطبيق RTL على كل العناصر الملصوقة
        const allElements = editor.getBody().querySelectorAll('*');
        allElements.forEach(function(element) {
          if (element.nodeType === 1) {
            element.setAttribute('dir', 'rtl');
            element.style.textAlign = 'right';
            element.style.direction = 'rtl';
            element.style.lineHeight = '0';
            
            // تقليل المسافة بين الفقرات
            if (element.tagName === 'P' || element.tagName === 'DIV') {
              element.style.margin = '0';
              element.style.padding = '0';
              element.style.lineHeight = '0';
            }
          }
        });
        
        // تنظيف الأسطر الفارغة المتعددة
        const content = editor.getContent();
        const cleanedContent = content
          .replace(/(<p>\s*<\/p>){2,}/gi, '<p dir="rtl" style="text-align: right; direction: rtl; line-height: 0; margin: 0; padding: 0;">&nbsp;</p>')
          .replace(/(<br\s*\/?>){2,}/gi, '<br>');
        
        editor.setContent(cleanedContent);
      }, 50);
    });
    
    // معالجة تغيير العقدة الحالية
    editor.on('NodeChange', function() {
      // تطبيق RTL على جسم المستند
      editor.getBody().dir = 'rtl';
      editor.getBody().style.direction = 'rtl';
      editor.getBody().style.textAlign = 'right';
      editor.getBody().style.lineHeight = '0';
      
      // تطبيق RTL على العقدة الحالية
      const node = editor.selection.getNode();
      if (node && node.style) {
        node.dir = 'rtl';
        node.style.direction = 'rtl';
        node.style.textAlign = 'right';
        node.style.lineHeight = '0';
      }
      
      // تقليل المسافة بين الفقرات
      const allParagraphs = editor.getBody().querySelectorAll('p, div');
      allParagraphs.forEach(function(p) {
        p.style.margin = '0';
        p.style.padding = '0';
        p.style.lineHeight = '0';
      });
    });
  }
});