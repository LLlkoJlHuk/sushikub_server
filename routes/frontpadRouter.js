const Router = require('express')
const router = new Router()
const frontpadController = require('../controllers/frontpadController')

// Отправка заказа в Frontpad
router.post('/send-order', frontpadController.sendOrder)



// Получение списка товаров из Frontpad
router.get('/products', frontpadController.getProducts)

// Получение стоп-листа из Frontpad
router.get('/stops', frontpadController.getStops)

module.exports = router

