// مترجمات CKEditor للغة العربية
// تحميل هذا الملف في main.tsx أو App.tsx لضمان توفر الترجمات

// تعريف اللغة العربية للواجهة
window.CKEDITOR_TRANSLATIONS = {
  ar: {
    dictionary: {
      "Bold": "غامق",
      "Italic": "مائل",
      "Underline": "تسطير",
      "Strikethrough": "يتوسطه خط",
      "Align left": "محاذاة لليسار",
      "Align right": "محاذاة لليمين",
      "Center": "توسيط",
      "Justify": "ضبط",
      "Paragraph": "فقرة",
      "Heading 1": "عنوان 1",
      "Heading 2": "عنوان 2", 
      "Heading 3": "عنوان 3",
      "Bulleted List": "قائمة نقطية",
      "Numbered List": "قائمة رقمية",
      "Decrease indent": "تقليل المسافة البادئة",
      "Increase indent": "زيادة المسافة البادئة",
      "Link": "رابط",
      "Block quote": "اقتباس",
      "Insert table": "إدراج جدول",
      "Horizontal line": "خط أفقي",
      "Undo": "تراجع",
      "Redo": "إعادة",
      "Choose heading": "اختر العنوان",
      "Heading": "عنوان",
      "Font Family": "نوع الخط",
      "Font Size": "حجم الخط",
      "Font Color": "لون الخط",
      "Font Background Color": "لون خلفية النص",
      "Remove Format": "إزالة التنسيق",
      "Yellow marker": "تمييز أصفر",
      "Green marker": "تمييز أخضر",
      "Pink marker": "تمييز وردي",
      "Blue marker": "تمييز أزرق",
      "Red pen": "قلم أحمر",
      "Highlight": "تمييز النص",
      "Table": "جدول",
      "Rich Text Editor": "محرر نصوص متقدم",
      "Rich Text Editor, %0": "محرر نصوص متقدم، %0",
      "Save": "حفظ",
      "Cancel": "إلغاء",
      "Text alignment": "محاذاة النص",
      "Text alignment toolbar": "شريط محاذاة النص",
      "Dropdown toolbar": "شريط أدوات منسدل",
      "Edit block": "تحرير الكتلة",
      "Edit link": "تحرير الرابط"
    }
  }
};

// تخصيص بعض المصطلحات الإضافية
if (window.CKEDITOR_TRANSLATIONS.ar) {
  Object.assign(window.CKEDITOR_TRANSLATIONS.ar.dictionary, {
    "Insert image": "إدراج صورة",
    "Insert Image via URL": "إدراج صورة عبر الرابط",
    "Media URL": "رابط الوسائط",
    "URL": "الرابط",
    "Media URL must not be empty.": "يجب ألا يكون رابط الوسائط فارغًا.",
    "This media URL is not supported.": "رابط الوسائط هذا غير مدعوم.",
    "Insert": "إدراج",
    "Open in a new tab": "فتح في علامة تبويب جديدة",
    "Upload or Insert Image": "رفع أو إدراج صورة",
    "Upload": "رفع",
    "Alt Text": "النص البديل",
    "Back": "رجوع",
    "Change image text alternative": "تغيير النص البديل للصورة",
    "Image text alternative": "النص البديل للصورة",
    "Text alternative": "النص البديل",
    "Enter image caption": "أدخل تسمية توضيحية للصورة",
    "Caption": "تسمية توضيحية",
    "Insert image": "إدراج صورة"
  });
}