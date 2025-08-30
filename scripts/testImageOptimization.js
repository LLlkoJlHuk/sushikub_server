const fs = require('fs');
const path = require('path');

/**
 * Скрипт для тестирования оптимизации изображений
 * Проверяет, что middleware правильно работает
 */

const STATIC_DIR = path.join(__dirname, '../static');

function testImageOptimization() {
  console.log('🧪 Testing image optimization...');
  
  if (!fs.existsSync(STATIC_DIR)) {
    console.log('❌ Static directory not found');
    return;
  }
  
  // Ищем изображения товаров
  const productImages = [];
  
  function scanDirectory(dirPath, relativePath = '') {
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const itemRelativePath = path.join(relativePath, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          scanDirectory(itemPath, itemRelativePath);
        } else if (stats.isFile()) {
          const ext = path.extname(item).toLowerCase();
          if (['.webp', '.jpg', '.jpeg', '.png'].includes(ext)) {
            // Проверяем, является ли это изображением товара
            if (/\d{10,}/.test(item)) {
              productImages.push({
                path: itemRelativePath,
                size: stats.size,
                sizeKB: (stats.size / 1024).toFixed(1)
              });
            }
          }
        }
      }
    } catch (err) {
      console.error(`❌ Error scanning directory ${dirPath}:`, err.message);
    }
  }
  
  scanDirectory(STATIC_DIR);
  
  console.log(`📊 Found ${productImages.length} product images`);
  
  if (productImages.length > 0) {
    console.log('\n📋 Sample images for testing:');
    productImages.slice(0, 5).forEach(img => {
      console.log(`  - ${img.path} (${img.sizeKB} KB)`);
    });
    
    console.log('\n🔗 Test URLs:');
    productImages.slice(0, 3).forEach(img => {
      const baseUrl = `http://localhost:5000/${img.path}`;
      console.log(`  Original: ${baseUrl}`);
      console.log(`  Optimized: ${baseUrl}?w=120&h=70&q=85&f=webp`);
      console.log(`  Mobile: ${baseUrl}?w=100&h=58&q=80&f=webp`);
      console.log('');
    });
  }
  
  // Проверяем папку кэша
  const cacheDir = path.join(STATIC_DIR, 'cache');
  if (fs.existsSync(cacheDir)) {
    const cacheFiles = fs.readdirSync(cacheDir);
    console.log(`💾 Cache directory: ${cacheFiles.length} files`);
  } else {
    console.log('💾 Cache directory: not found (will be created automatically)');
  }
  
  console.log('\n✅ Test completed!');
  console.log('📝 Check server logs for middleware activity');
}

// Запускаем тест если скрипт вызван напрямую
if (require.main === module) {
  testImageOptimization();
}

module.exports = { testImageOptimization };
