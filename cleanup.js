// Script para limpiar y optimizar el proyecto
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Directorios a limpiar
const dirsToClean = [
  '.bolt/tmp',
  '.bolt/supabase_discarded_migrations',
  'coverage',
  'dist',
  'build'
];

// Extensiones de archivos temporales a eliminar
const tempExtensions = ['.log', '.tmp', '.temp'];

// Función para eliminar directorios
function cleanDirectories() {
  console.log('🧹 Limpiando directorios temporales...');
  
  dirsToClean.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    
    if (fs.existsSync(dirPath)) {
      console.log(`  - Limpiando: ${dir}`);
      try {
        if (process.platform === 'win32') {
          // En Windows, usamos comando específico
          execSync(`if exist "${dirPath}" rmdir /s /q "${dirPath}"`);
        } else {
          // En Unix/Linux
          execSync(`rm -rf "${dirPath}"`);
        }
        console.log(`    ✅ Limpiado correctamente`);
      } catch (err) {
        console.error(`    ❌ Error al limpiar ${dir}:`, err.message);
      }
    } else {
      console.log(`  - Directorio no encontrado: ${dir}`);
    }
  });
}

// Función para eliminar archivos temporales
function cleanTempFiles() {
  console.log('🔍 Buscando y eliminando archivos temporales...');
  
  const searchAndDelete = (dir) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // Ignorar node_modules, .git y otros directorios específicos
        if (entry.isDirectory()) {
          if (!['node_modules', '.git', 'dist', 'build', 'coverage'].includes(entry.name)) {
            searchAndDelete(fullPath);
          }
        } else if (tempExtensions.some(ext => entry.name.endsWith(ext))) {
          console.log(`  - Eliminando: ${fullPath}`);
          fs.unlinkSync(fullPath);
        }
      }
    } catch (err) {
      console.error(`  ❌ Error al procesar ${dir}:`, err.message);
    }
  };
  
  searchAndDelete(process.cwd());
}

// Ejecutar limpieza
cleanDirectories();
cleanTempFiles();

console.log('\n✨ Limpieza completa! El proyecto debería ocupar menos espacio ahora.');
console.log('🔄 Para reducir aún más el tamaño, prueba ejecutando "node archive-migrations.js"');