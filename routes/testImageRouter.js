const Router = require('express')
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const router = new Router()

// Тестовый эндпоинт для проверки обработки изображений
router.get('/test-resize/:imageName', async (req, res) => {
  try {
    const { imageName } = req.params
    const { w: width = 100, h: height = 100, q: quality = 75 } = req.query
    
    const imagePath = path.join(__dirname, '../static', imageName)
    
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image not found' })
    }
    
    console.log(`Processing test image: ${imageName}`)
    console.log(`Target size: ${width}x${height}`)
    
    // Получаем метаданные оригинала
    const originalMetadata = await sharp(imagePath).metadata()
    console.log(`Original: ${originalMetadata.width}x${originalMetadata.height}`)
    
    // Обрабатываем изображение
    const buffer = await sharp(imagePath)
      .resize(parseInt(width), parseInt(height), {
        fit: 'cover',
        position: 'center',
        withoutEnlargement: true
      })
      .webp({ quality: parseInt(quality) })
      .toBuffer()
    
    // Получаем метаданные результата
    const processedMetadata = await sharp(buffer).metadata()
    console.log(`Processed: ${processedMetadata.width}x${processedMetadata.height}`)
    console.log(`Size: ${(buffer.length / 1024).toFixed(1)}KB`)
    
    // Отправляем результат
    res.setHeader('Content-Type', 'image/webp')
    res.setHeader('X-Original-Size', `${originalMetadata.width}x${originalMetadata.height}`)
    res.setHeader('X-Processed-Size', `${processedMetadata.width}x${processedMetadata.height}`)
    res.setHeader('X-File-Size', buffer.length.toString())
    res.end(buffer)
    
  } catch (error) {
    console.error('Test resize error:', error)
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
