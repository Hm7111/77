// سكريبت لاستعادة ملفات الهجرة من الأرشيف
const fs = require('fs');
const path = require('path');

// تحديد المسارات
const migrationsDir = path.join(process.cwd(), 'supabase/migrations');
const archiveDir = path.join(process.cwd(), 'supabase/migrations_archive');

// التأكد من وجود مجلد الأرشيف
if (!fs.existsSync(archiveDir)) {
  console.error('مجلد الأرشيف غير موجود!');
  process.exit(1);
}

// الحصول على قائمة ملفات الهجرة المؤرشفة
const archivedFiles = fs.readdirSync(archiveDir)
  .filter(file => file.endsWith('.sql'))
  .sort();

if (archivedFiles.length === 0) {
  console.log('لا توجد ملفات مؤرشفة لاستعادتها.');
  process.exit(0);
}

console.log(`تم العثور على ${archivedFiles.length} ملفات في الأرشيف.`);

// استعادة الملفات من الأرشيف
let restoredCount = 0;
archivedFiles.forEach(file => {
  const sourcePath = path.join(archiveDir, file);
  const destPath = path.join(migrationsDir, file);
  
  // تخطي الملفات الموجودة بالفعل في مجلد الهجرة
  if (fs.existsSync(destPath)) {
    console.log(`الملف ${file} موجود بالفعل في مجلد الهجرة، تم تخطيه.`);
    return;
  }
  
  try {
    // نسخ الملف من الأرشيف إلى مجلد الهجرة
    fs.copyFileSync(sourcePath, destPath);
    restoredCount++;
    console.log(`تمت استعادة: ${file}`);
  } catch (error) {
    console.error(`خطأ في استعادة الملف ${file}:`, error);
  }
});

console.log(`تمت استعادة ${restoredCount} ملفات بنجاح`);