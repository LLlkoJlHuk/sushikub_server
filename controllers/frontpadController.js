const axios = require('axios')

class FrontpadController {
  // Отправка заказа в Frontpad
  async sendOrder(req, res) {
    try {
      const {
        // Личные данные
        name,
        phone,
        email,
        
        // Адрес доставки
        typeIsDelivery,
        street,
        houseNumber,
        entrance,
        floor,
        apartmentNumber,
        
        // Самовывоз
        deliveryBranch,
        
        // Время доставки
        deliveryNow,
        time,
        
        // Комментарий
        comment,
        
        // Товары
        items, // массив товаров из корзины
        persons
        
      } = req.body

      const SECRET_KEY = process.env.FRONTPAD_SECRET
      
      if (!SECRET_KEY || SECRET_KEY === '###') {
        return res.status(503).json({
          success: false,
          message: 'Система заказов временно недоступна. Обратитесь к администратору.'
        })
      }
      
      // Подготовка данных для отправки
      const data = {
        secret: SECRET_KEY,
        name: name,
        phone: phone ? '+' + phone.replace(/\D/g, '').replace(/^8/, '7') : '',
        mail: email || '',
        descr: '',
        person: persons || 1
      }
      


      // Нормализуем typeIsDelivery для надежной проверки
      const isDeliveryOrder = typeIsDelivery === true || typeIsDelivery === 'true' || typeIsDelivery === 1
      
      // Формируем комментарий в зависимости от типа заказа
      let commentParts = []
      
      if (!isDeliveryOrder) {
        // Для самовывоза добавляем соответствующий комментарий
        commentParts.push('САМОВЫВОЗ')
      }
      
      // Добавляем пользовательский комментарий если есть
      if (comment) {
        commentParts.push(`Комментарий: ${comment}`)
      }
      
      // Объединяем все части комментария
      data.descr = commentParts.join('. ')
      
      // Добавляем адрес доставки если это доставка
      if (isDeliveryOrder) {
        data.street = street || ''
        data.home = houseNumber || ''
        data.pod = entrance || ''
        data.et = floor || ''
        data.apart = apartmentNumber || ''
      } else {
        // Для самовывоза добавляем информацию о филиале
        if (deliveryBranch === 'Ул. Лесопарковая, дом 27') {
          data.affiliate = 238
        } else if (deliveryBranch === 'Ул. Батурина, дом 30') {
          // Для Батурина не передаем affiliate (основной филиал)
        }
      }

      // Добавляем время доставки в комментарий если указано
      if (!deliveryNow && time) {
        if (time && time.includes(' ') && time.includes(':')) {
          const timeComment = `Клиент заказал на ${time}`
          if (data.descr) {
            data.descr = timeComment + '. ' + data.descr
          } else {
            data.descr = timeComment
          }
        }
      }

      // Подготовка товаров для отправки
      const products = []
      const productQuantities = []
      
      items.forEach((item, index) => {
        products[index] = item.article ? item.article.toString() : item.id.toString()
        productQuantities[index] = item.quantity.toString()
      })

      // Формирование строки запроса
      let queryString = ''
      
      // Добавляем основные параметры
      for (const [key, value] of Object.entries(data)) {
        // ВАЖНО: Для доставки НЕ передаем affiliate, даже если он есть в data
        if (isDeliveryOrder && key === 'affiliate') {
          continue
        }
        if (value !== null && value !== undefined && value !== '') {
          queryString += `&${key}=${encodeURIComponent(value)}`
        }
      }

      // Добавляем товары
      products.forEach((product, index) => {
        queryString += `&product[${index}]=${encodeURIComponent(product)}`
        queryString += `&product_kol[${index}]=${encodeURIComponent(productQuantities[index])}`
      })

      // Удаляем первый символ '&'
      queryString = queryString.substring(1)

      // Отправка запроса в Frontpad
      const response = await axios.post(
        'https://app.frontpad.ru/api/index.php?new_order',
        queryString,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 30000 // 30 секунд таймаут
        }
      )

      const frontpadResponse = response.data

      if (frontpadResponse.result === 'success') {
        // Успешная отправка
        return res.json({
          success: true,
          message: 'Заказ успешно отправлен в ресторан',
          frontpadOrderId: frontpadResponse.order_id,
          frontpadOrderNumber: frontpadResponse.order_number,
          warnings: frontpadResponse.warnings || null
        })
      } else {
        // Ошибка от Frontpad
        let errorMessage = 'Ошибка при отправке заказа'
        
        switch (frontpadResponse.error) {
          case 'cash_close':
            errorMessage = 'К сожалению, смена закрыта. Попробуйте оформить заказ позже.'
            break
          case 'invalid_product_keys':
            errorMessage = 'Некоторые товары из вашего заказа недоступны. Обновите страницу и попробуйте снова.'
            break
          case 'invalid_certificate':
            errorMessage = 'Неверный номер сертификата'
            break
          case 'invalid_secret':
            errorMessage = 'Ошибка конфигурации системы'
            break
          case 'requests_limit':
            errorMessage = 'Превышено количество запросов. Попробуйте через минуту.'
            break
          case 'api_off':
            errorMessage = 'Система временно недоступна'
            break
          default:
            errorMessage = `Ошибка: ${frontpadResponse.error}`
        }

        return res.status(400).json({
          success: false,
          message: errorMessage,
          error: frontpadResponse.error
        })
      }

    } catch (error) {
      console.error('Ошибка при отправке заказа в Frontpad:', error)
      
      if (error.code === 'ECONNABORTED') {
        return res.status(408).json({
          success: false,
          message: 'Превышено время ожидания ответа от ресторана. Попробуйте позже.'
        })
      }

      return res.status(500).json({
        success: false,
        message: 'Внутренняя ошибка сервера при отправке заказа'
      })
    }
  }



  // Получение списка товаров
  async getProducts(req, res) {
    try {
      const SECRET_KEY = process.env.FRONTPAD_SECRET
      
      if (!SECRET_KEY || SECRET_KEY === '###') {
        return res.status(503).json({
          success: false,
          message: 'Система получения товаров временно недоступна.'
        })
      }
      
      const queryString = `secret=${SECRET_KEY}`

      const response = await axios.post(
        'https://app.frontpad.ru/api/index.php?get_products',
        queryString,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000
        }
      )

      const frontpadResponse = response.data

      if (frontpadResponse.result === 'success') {
        // Преобразуем данные в удобный формат
        const products = []
        const productIds = frontpadResponse.product_id || {}
        const names = frontpadResponse.name || {}
        const prices = frontpadResponse.price || {}
        const sales = frontpadResponse.sale || {}

        Object.keys(productIds).forEach(key => {
          products.push({
            id: productIds[key],
            name: names[key],
            price: parseFloat(prices[key]) || 0,
            saleEnabled: sales[key] === '1'
          })
        })

        return res.json({
          success: true,
          products: products
        })
      } else {
        return res.status(404).json({
          success: false,
          message: 'Товары не найдены'
        })
      }

    } catch (error) {
      console.error('Ошибка при получении списка товаров:', error)
      return res.status(500).json({
        success: false,
        message: 'Ошибка при получении списка товаров'
      })
    }
  }

  // Получение стоп-листа
  async getStops(req, res) {
    try {
      const SECRET_KEY = process.env.FRONTPAD_SECRET
      
      if (!SECRET_KEY || SECRET_KEY === '###') {
        return res.status(503).json({
          success: false,
          message: 'Система получения стоп-листа временно недоступна.'
        })
      }
      
      const queryString = `secret=${SECRET_KEY}`

      const response = await axios.post(
        'https://app.frontpad.ru/api/index.php?get_stops',
        queryString,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000
        }
      )

      const frontpadResponse = response.data

      if (frontpadResponse.result === 'success') {
        if (frontpadResponse.error === 'no_stops') {
          return res.json({
            success: true,
            stops: [],
            message: 'Нет товаров в стоп-листе'
          })
        }

        // Преобразуем данные в удобный формат
        const stops = []
        const productIds = frontpadResponse.product_id || {}
        const names = frontpadResponse.name || {}
        const prices = frontpadResponse.price || {}

        Object.keys(productIds).forEach(key => {
          stops.push({
            id: productIds[key],
            name: names[key],
            price: parseFloat(prices[key]) || 0
          })
        })

        return res.json({
          success: true,
          stops: stops
        })
      } else {
        return res.status(500).json({
          success: false,
          message: 'Ошибка при получении стоп-листа'
        })
      }

    } catch (error) {
      console.error('Ошибка при получении стоп-листа:', error)
      return res.status(500).json({
        success: false,
        message: 'Ошибка при получении стоп-листа'
      })
    }
  }

  // Вспомогательные методы

  // Форматирование телефона для Frontpad
  formatPhone(phone) {
    if (!phone) return ''
    
    // Убираем все символы кроме цифр
    let cleanPhone = phone.replace(/\D/g, '')
    
    // Если номер начинается с 8, заменяем на 7
    if (cleanPhone.startsWith('8')) {
      cleanPhone = '+7' + cleanPhone.substring(1)
    }
    
    // Если номер не начинается с 7, добавляем 7
    if (!cleanPhone.startsWith('7')) {
      cleanPhone = '+7' + cleanPhone
    }
    
    // URL-кодируем знак +
    return '%2B' + cleanPhone
  }

  // Форматирование даты и времени для Frontpad
  formatDateTime(timeString) {
    if (!timeString) return ''
    
    try {
      // Ожидаем формат "DD.MM.YYYY HH:MM"
      const [datePart, timePart] = timeString.split(' ')
      const [day, month, year] = datePart.split('.')
      
      // Преобразуем в формат "YYYY-MM-DD HH:MM:SS"
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${timePart}:00`
    } catch (error) {
      console.error('Ошибка форматирования даты:', error)
      return ''
    }
  }

  // Получение ID филиала по названию
  getBranchId(branchName) {
    // Здесь нужно сопоставить названия филиалов с их ID в Frontpad
    // Эти значения нужно получить из справочника Frontpad
    const branchMapping = {
      'Филиал 1': 237, // пример ID из документации
      'Филиал 2': 238,
      // Добавьте остальные филиалы согласно вашим данным
    }
    
    return branchMapping[branchName] || null
  }
}

module.exports = new FrontpadController()

