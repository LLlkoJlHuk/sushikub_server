const fs = require('fs');
const path = require('path');

/**
 * Скрипт для очистки старых кэш-файлов изображений
 * Удаляет файлы старше 30 дней для экономии места на диске
 */

const CACHE_DIR = path.join(__dirname, '../static/cache');
const MAX_AGE_DAYS = 30;

function clearOldCache() {
  console.log('🧹 Starting image cache cleanup...');
  
  if (!fs.existsSync(CACHE_DIR)) {
    console.log('❌ Cache directory not found');
    return;
  }
  
  const now = Date.now();
  const maxAgeMs = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  let deletedCount = 0;
  let totalSize = 0;
  
  function processDirectory(dirPath) {
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          processDirectory(itemPath);
        } else if (stats.isFile()) {
          const age = now - stats.mtime.getTime();
          
          if (age > maxAgeMs) {
            try {
              fs.unlinkSync(itemPath);
              deletedCount++;
              totalSize += stats.size;
              console.log(`🗑️ Deleted: ${itemPath}`);
            } catch (err) {
              console.error(`❌ Error deleting ${itemPath}:`, err.message);
            }
          }
        }
      }
    } catch (err) {
      console.error(`❌ Error processing directory ${dirPath}:`, err.message);
    }
  }
  
  processDirectory(CACHE_DIR);
  
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
  console.log(`✅ Cache cleanup completed!`);
  console.log(`📊 Deleted ${deletedCount} files`);
  console.log(`💾 Freed ${totalSizeMB} MB of disk space`);
}

// Запускаем очистку если скрипт вызван напрямую
if (require.main === module) {
  clearOldCache();
}

module.exports = { clearOldCache };
