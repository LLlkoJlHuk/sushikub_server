const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

/**
 * Скрипт для массового сжатия и оптимизации изображений
 */

const STATIC_DIR = path.join(__dirname, '../static')
const BACKUP_DIR = path.join(__dirname, '../static_backup')

// Настройки сжатия (более агрессивные для лучшего результата)
const COMPRESSION_SETTINGS = {
  webp: {
    quality: 80,
    effort: 6,
    smartSubsample: true,
    lossless: false
  },
  jpeg: {
    quality: 80,
    progressive: true,
    mozjpeg: true
  },
  png: {
    quality: 80,
    progressive: true,
    compressionLevel: 9,
    adaptiveFiltering: true
  }
}

// Размеры для предварительной генерации
const PRESET_SIZES = {
  // Карточки продуктов
  product_small: { width: 120, height: 70 },
  product_medium: { width: 180, height: 105 },
  product_large: { width: 240, height: 140 },
  
  // Карточки меню
  menu_small: { width: 100, height: 58 },
  menu_medium: { width: 150, height: 88 },
  menu_large: { width: 220, height: 128 },
  
  // Баннеры
  banner_mobile: { width: 320, height: 400 },
  banner_tablet: { width: 480, height: 600 },
  banner_desktop: { width: 1035, height: 450 },
  
  // Корзина
  basket_small: { width: 80, height: 47 },
  basket_medium: { width: 100, height: 58 },
  basket_large: { width: 120, height: 70 },
  
  // Логотип
  logo_small: { width: 45, height: 45 },
  logo_medium: { width: 60, height: 60 },
  logo_large: { width: 80, height: 80 }
}

/**
 * Создает резервную копию статической папки
 */
async function createBackup() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('Создание резервной копии...')
    await fs.promises.cp(STATIC_DIR, BACKUP_DIR, { recursive: true })
    console.log('Резервная копия создана в:', BACKUP_DIR)
  } else {
    console.log('Резервная копия уже существует')
  }
}

/**
 * Получает все файлы изображений рекурсивно
 */
function getAllImageFiles(dir, files = []) {
  const items = fs.readdirSync(dir)
  
  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)
    
    if (stat.isDirectory() && item !== 'cache') {
      getAllImageFiles(fullPath, files)
    } else if (stat.isFile()) {
      const ext = path.extname(item).toLowerCase()
      if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        files.push(fullPath)
      }
    }
  }
  
  return files
}

/**
 * Сжимает одно изображение
 */
async function compressImage(imagePath) {
  try {
    const ext = path.extname(imagePath).toLowerCase()
    const parsedPath = path.parse(imagePath)
    
    // Создаем папку для кэшированных версий
    const cacheDir = path.join(parsedPath.dir, 'cache')
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true })
    }

    // Получаем метаданные оригинального изображения
    const image = sharp(imagePath)
    const metadata = await image.metadata()
    
    console.log(`Обработка: ${path.relative(STATIC_DIR, imagePath)} (${metadata.width}x${metadata.height})`)

    // Определяем оптимальные настройки сжатия
    let compressionSettings
    let outputFormat = 'webp' // По умолчанию конвертируем в WebP
    
    if (ext === '.png' && metadata.hasAlpha) {
      // PNG с прозрачностью оставляем как PNG или конвертируем в WebP
      compressionSettings = COMPRESSION_SETTINGS.webp
      outputFormat = 'webp'
    } else if (ext === '.jpg' || ext === '.jpeg') {
      compressionSettings = COMPRESSION_SETTINGS.webp
      outputFormat = 'webp'
    } else {
      compressionSettings = COMPRESSION_SETTINGS.webp
      outputFormat = 'webp'
    }

    // Сжимаем оригинал
    const originalOutputPath = path.join(
      parsedPath.dir, 
      `${parsedPath.name}_original.${outputFormat}`
    )
    
    await image
      .webp(compressionSettings)
      .toFile(originalOutputPath)

    // Генерируем предустановленные размеры
    const stats = {
      original: { path: imagePath, size: fs.statSync(imagePath).size },
      compressed: { path: originalOutputPath, size: fs.statSync(originalOutputPath).size },
      variants: []
    }

    // Определяем, какие размеры нужны для этого изображения
    let sizesToGenerate = []
    
    // Если это большое изображение (вероятно продукт или баннер)
    if (metadata.width >= 500) {
      if (metadata.width >= 1000) {
        // Скорее всего баннер
        sizesToGenerate = ['banner_mobile', 'banner_tablet', 'banner_desktop']
      } else {
        // Скорее всего продукт
        sizesToGenerate = ['product_small', 'product_medium', 'product_large']
        sizesToGenerate.push(...['menu_small', 'menu_medium', 'menu_large'])
        sizesToGenerate.push(...['basket_small', 'basket_medium', 'basket_large'])
      }
    } else if (metadata.width >= 200) {
      // Средние изображения
      sizesToGenerate = ['product_small', 'product_medium', 'menu_small', 'menu_medium']
    } else {
      // Маленькие изображения (иконки, логотипы)
      sizesToGenerate = ['logo_small', 'logo_medium', 'logo_large']
    }

    // Генерируем варианты размеров
    for (const sizeKey of sizesToGenerate) {
      const size = PRESET_SIZES[sizeKey]
      if (!size) continue

      // Не генерируем размер больше оригинала
      if (size.width > metadata.width || size.height > metadata.height) continue

      const variantPath = path.join(
        cacheDir,
        `${parsedPath.name}_${size.width}x${size.height}_q85.${outputFormat}`
      )

      await sharp(imagePath)
        .resize(size.width, size.height, {
          fit: 'cover',
          position: 'center',
          withoutEnlargement: true // Никогда не увеличиваем изображение!
        })
        .webp({ quality: 85, effort: 6 })
        .toFile(variantPath)

      stats.variants.push({
        size: `${size.width}x${size.height}`,
        path: variantPath,
        fileSize: fs.statSync(variantPath).size
      })
    }

    const originalSize = stats.original.size
    const compressedSize = stats.compressed.size
    const savings = originalSize - compressedSize
    const savingsPercent = ((savings / originalSize) * 100).toFixed(1)

    console.log(`  Оригинал: ${(originalSize / 1024).toFixed(1)}KB`)
    console.log(`  Сжатый: ${(compressedSize / 1024).toFixed(1)}KB`)
    console.log(`  Экономия: ${(savings / 1024).toFixed(1)}KB (${savingsPercent}%)`)
    console.log(`  Создано вариантов: ${stats.variants.length}`)

    return stats
  } catch (error) {
    console.error(`Ошибка при сжатии ${imagePath}:`, error.message)
    return null
  }
}

/**
 * Основная функция сжатия
 */
async function compressAllImages() {
  console.log('Начинаем сжатие изображений...\n')
  
  // Создаем резервную копию
  await createBackup()
  
  // Получаем все файлы изображений
  const imageFiles = getAllImageFiles(STATIC_DIR)
  console.log(`Найдено изображений: ${imageFiles.length}\n`)
  
  let totalOriginalSize = 0
  let totalCompressedSize = 0
  let processedCount = 0
  const results = []
  
  // Обрабатываем каждое изображение
  for (const imagePath of imageFiles) {
    const result = await compressImage(imagePath)
    if (result) {
      results.push(result)
      totalOriginalSize += result.original.size
      totalCompressedSize += result.compressed.size
      processedCount++
    }
    console.log('') // Пустая строка для разделения
  }
  
  // Выводим итоговую статистику
  const totalSavings = totalOriginalSize - totalCompressedSize
  const totalSavingsPercent = ((totalSavings / totalOriginalSize) * 100).toFixed(1)
  
  console.log('='.repeat(50))
  console.log('ИТОГОВАЯ СТАТИСТИКА')
  console.log('='.repeat(50))
  console.log(`Обработано изображений: ${processedCount}`)
  console.log(`Общий размер до сжатия: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`)
  console.log(`Общий размер после сжатия: ${(totalCompressedSize / 1024 / 1024).toFixed(2)} MB`)
  console.log(`Общая экономия: ${(totalSavings / 1024 / 1024).toFixed(2)} MB (${totalSavingsPercent}%)`)
  
  // Подсчитываем общее количество созданных вариантов
  const totalVariants = results.reduce((sum, result) => sum + result.variants.length, 0)
  console.log(`Создано адаптивных вариантов: ${totalVariants}`)
  
  console.log('\nСжатие завершено успешно!')
  console.log(`Резервная копия сохранена в: ${BACKUP_DIR}`)
}

// Запускаем если файл вызван напрямую
if (require.main === module) {
  compressAllImages().catch(console.error)
}

module.exports = { compressAllImages, compressImage }
