// سكريبت لأرشفة ملفات الهجرة القديمة لـ Supabase
const fs = require('fs');
const path = require('path');

// تحديد المسارات
const migrationsDir = path.join(process.cwd(), 'supabase/migrations');
const archiveDir = path.join(process.cwd(), 'supabase/migrations_archive');

// التأكد من وجود مجلد الأرشيف
if (!fs.existsSync(archiveDir)) {
  fs.mkdirSync(archiveDir, { recursive: true });
  console.log(`تم إنشاء مجلد الأرشيف: ${archiveDir}`);
}

// الحصول على قائمة ملفات الهجرة
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort(); // ترتيب الملفات

// تحديد عدد الملفات التي سيتم الاحتفاظ بها في المجلد الرئيسي
// يمكن تعديل هذا الرقم حسب الحاجة
const keepLatest = 10;

// تحديد الملفات التي سيتم نقلها إلى الأرشيف
const filesToArchive = migrationFiles.slice(0, migrationFiles.length - keepLatest);

console.log(`إجمالي ملفات الهجرة: ${migrationFiles.length}`);
console.log(`سيتم الاحتفاظ بـ ${keepLatest} ملفات في المجلد الرئيسي`);
console.log(`سيتم أرشفة ${filesToArchive.length} ملفات`);

// إنشاء ملف .gitignore في مجلد الأرشيف لتجنب تتبع الملفات المؤرشفة
fs.writeFileSync(path.join(archiveDir, '.gitignore'), '*\n!.gitignore\n');

// نقل الملفات إلى الأرشيف
let archivedCount = 0;
filesToArchive.forEach(file => {
  const sourcePath = path.join(migrationsDir, file);
  const destPath = path.join(archiveDir, file);
  
  try {
    // نسخ الملف إلى الأرشيف
    fs.copyFileSync(sourcePath, destPath);
    
    // التحقق من نجاح النسخ قبل حذف الملف الأصلي
    if (fs.existsSync(destPath)) {
      // حذف الملف من المجلد الأصلي
      fs.unlinkSync(sourcePath);
      archivedCount++;
      console.log(`تمت أرشفة: ${file}`);
    }
  } catch (error) {
    console.error(`خطأ في أرشفة الملف ${file}:`, error);
  }
});

console.log(`تمت أرشفة ${archivedCount} ملفات بنجاح`);
console.log(`يمكنك العثور على الملفات المؤرشفة في: ${archiveDir}`);