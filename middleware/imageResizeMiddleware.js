const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

/**
 * Middleware для автоматического ресайза изображений
 * Параметры URL: ?w=width&h=height&q=quality&f=format
 */
const imageResizeMiddleware = async (req, res, next) => {
  // Проверяем, является ли запрос изображением
  const ext = path.extname(req.path).toLowerCase()
  const supportedFormats = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
  
  if (!supportedFormats.includes(ext)) {
    return next()
  }

  // Получаем параметры из query string
  const { w: width, h: height, q: quality = 85, f: format } = req.query
  
  // Если нет параметров ресайза, передаем дальше
  if (!width && !height) {
    return next()
  }

  try {
    // Путь к оригинальному файлу
    const originalPath = path.join(__dirname, '../static', req.path)
    
    // Проверяем существование файла
    if (!fs.existsSync(originalPath)) {
      return res.status(404).json({ error: 'Image not found' })
    }

    // Генерируем имя кэшированного файла
    const parsedPath = path.parse(originalPath)
    const cacheFileName = `${parsedPath.name}_${width || 'auto'}x${height || 'auto'}_q${quality}.${format || 'webp'}`
    const cachePath = path.join(parsedPath.dir, 'cache', cacheFileName)

    // Создаем папку кэша если её нет
    const cacheDir = path.dirname(cachePath)
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true })
    }

    // Если кэшированный файл существует, отдаем его
    if (fs.existsSync(cachePath)) {
      return res.sendFile(cachePath)
    }

    // Получаем метаданные оригинального изображения
    const metadata = await sharp(originalPath).metadata() 
    
    // Создаем Sharp pipeline
    let sharpPipeline = sharp(originalPath)

    // Применяем ресайз ВСЕГДА если указаны параметры (но не увеличиваем)
    if (width || height) {
      const targetWidth = width ? parseInt(width) : undefined
      const targetHeight = height ? parseInt(height) : undefined
      
      const resizeOptions = {
        width: targetWidth,
        height: targetHeight,
        fit: 'cover',
        position: 'center',
        withoutEnlargement: true // Никогда не увеличиваем изображение
      }
      sharpPipeline = sharpPipeline.resize(resizeOptions)
    }

    // Применяем качество и формат
    const outputFormat = format || 'webp'
    const qualityValue = Math.max(10, Math.min(100, parseInt(quality)))

    switch (outputFormat) {
      case 'webp':
        sharpPipeline = sharpPipeline.webp({ quality: qualityValue })
        break
      case 'jpeg':
      case 'jpg':
        sharpPipeline = sharpPipeline.jpeg({ quality: qualityValue })
        break
      case 'png':
        sharpPipeline = sharpPipeline.png({ quality: qualityValue })
        break
      default:
        sharpPipeline = sharpPipeline.webp({ quality: qualityValue })
    }

    // Обрабатываем и отправляем изображение напрямую
    sharpPipeline
      .toBuffer()
      .then(async (buffer) => {
        // Сохраняем в кэш для будущих запросов
        fs.writeFileSync(cachePath, buffer)
        
        // Получаем метаданные обработанного изображения
        const processedMetadata = await sharp(buffer).metadata()
        
        // Устанавливаем правильные заголовки
        res.setHeader('Content-Type', `image/${outputFormat}`)
        res.setHeader('Cache-Control', 'public, max-age=31536000') // 1 год
        res.setHeader('Content-Length', buffer.length.toString())
        res.setHeader('X-Image-Width', processedMetadata.width.toString())
        res.setHeader('X-Image-Height', processedMetadata.height.toString())
        res.setHeader('X-Original-Size', `${metadata.width}x${metadata.height}`)
        res.setHeader('X-Processed-Size', `${processedMetadata.width}x${processedMetadata.height}`)
        
        // Отправляем обработанное изображение
        res.end(buffer)
      })
      .catch((error) => {
        console.error('Error processing image:', error)
        // В случае ошибки отдаем оригинал
        res.sendFile(originalPath)
      })

  } catch (error) {
    console.error('Image resize middleware error:', error)
    next()
  }
}

module.exports = imageResizeMiddleware
