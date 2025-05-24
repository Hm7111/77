const fs = require('fs');
const path = require('path');

// المسارات
const migrationsDir = path.join(__dirname, 'supabase/migrations');
const archiveDir = path.join(migrationsDir, '_archived');

// إنشاء مجلد الأرشيف إذا لم يكن موجودًا
if (!fs.existsSync(archiveDir)) {
  fs.mkdirSync(archiveDir, { recursive: true });
  console.log('✅ تم إنشاء مجلد الأرشيف: _archived');
}

// قراءة جميع ملفات الهجرة
const allMigrationFiles = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql') && !file.startsWith('_'))
  .sort((a, b) => b.localeCompare(a)); // ترتيب تنازلي بناءً على الاسم

// الاحتفاظ بآخر 5 ملفات فقط
const filesToKeep = allMigrationFiles.slice(0, 5);
const filesToArchive = allMigrationFiles.slice(5);

console.log(`🔹 إجمالي ملفات الهجرة: ${allMigrationFiles.length}`);
console.log(`🔹 الملفات التي سيتم الاحتفاظ بها: ${filesToKeep.length}`);
console.log(`🔹 الملفات التي سيتم أرشفتها: ${filesToArchive.length}`);

// نقل الملفات إلى الأرشيف
let archivedCount = 0;
for (const file of filesToArchive) {
  const sourcePath = path.join(migrationsDir, file);
  const destPath = path.join(archiveDir, file);
  
  // تجاهل المجلدات (مثل مجلد _archived نفسه)
  if (fs.statSync(sourcePath).isDirectory()) {
    continue;
  }
  
  try {
    fs.renameSync(sourcePath, destPath);
    archivedCount++;
    console.log(`📦 تمت أرشفة: ${file}`);
  } catch (err) {
    console.error(`❌ خطأ في أرشفة ${file}: ${err.message}`);
  }
}

console.log(`\n✅ تمت العملية بنجاح!`);
console.log(`📊 تم أرشفة ${archivedCount} ملف`);
console.log(`📂 الملفات المتبقية في المجلد الرئيسي: ${filesToKeep.length}`);
console.log(`🔍 يمكنك العثور على الملفات المؤرشفة في: supabase/migrations/_archived`);