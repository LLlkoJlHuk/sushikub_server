const path = require('path');
const uuid = require('uuid');
const {Product, Type, Category} = require('../models/models');	
const ApiError = require('../error/ApiError');
const sequelize = require('../db');

// Функция для санитизации строк
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>]/g, '').trim();
};

// Функция для валидации цены
const validatePrice = (price) => {
  const numPrice = parseInt(price);
  return !isNaN(numPrice) && numPrice > 0 && numPrice <= 100000;
};

// Функция для валидации веса
const validateWeight = (weight) => {
  if (!weight || weight === '' || weight === '0') return true;
  const numWeight = parseInt(weight);
  return !isNaN(numWeight) && numWeight > 0 && numWeight <= 10000;
};

// Функция для валидации артикула
const validateArticle = (article) => {
  const numArticle = parseInt(article);
  return !isNaN(numArticle) && numArticle >= 0;
};

// Функция для определения расширения файла на основе MIME-типа
const getFileExtension = (mimetype) => {
  const mimeToExt = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp'
  };
  
  return mimeToExt[mimetype] || '.jpg';
};

// Функция для проверки, что файл действительно является изображением
const validateImageFile = (file) => {
  // Проверяем MIME-тип
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return false;
  }
  
  // Проверяем размер файла (минимум 100 байт, максимум 50MB)
  if (file.size < 100 || file.size > 50 * 1024 * 1024) {
    return false;
  }
  
  // Проверяем расширение файла
  const fileName = file.name || '';
  const fileExtension = path.extname(fileName).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  
  if (fileExtension && !allowedExtensions.includes(fileExtension)) {
    return false;
  }
  
  return true;
};

class ProductController {
	async createProduct(req, res, next) {
		try {
			const {name, description, price, article, weight, categoryId, typeId, inStock, order} = req.body;
			const {img} = req.files;
			
			// Валидация обязательных полей
			if (!name || !name.trim() || !price || !article || !categoryId || !typeId) {
				return next(ApiError.badRequest('Missing required fields'));
			}
			
			// Валидация и санитизация данных
			const sanitizedName = sanitizeString(name);
			if (sanitizedName.length < 2 || sanitizedName.length > 100) {
				return next(ApiError.badRequest('Invalid product name length'));
			}
			
			if (!price || price === '' || !validatePrice(price)) {
				return next(ApiError.badRequest('Invalid price'));
			}
			
			if (!article || article === '' || !validateArticle(article)) {
				return next(ApiError.badRequest('Invalid article number'));
			}
			
			if (!categoryId || categoryId === '') {
				return next(ApiError.badRequest('Category is required'));
			}
			
			if (!typeId || typeId === '') {
				return next(ApiError.badRequest('Type is required'));
			}
			
			if (weight && weight !== '' && weight !== '0' && !validateWeight(weight)) {
				return next(ApiError.badRequest('Invalid weight'));
			}
			
			// Валидация файла
			if (!img) {
				return next(ApiError.badRequest('Image is required'));
			}
			
			// Проверка файла изображения
			if (!validateImageFile(img)) {
				return next(ApiError.badRequest('Invalid image file. Please upload a valid JPEG, PNG or WebP image.'));
			}
			
			// Преобразуем inStock в булево значение
			const inStockBoolean = inStock === 'true' || inStock === true;
			
			let fileName = uuid.v4() + getFileExtension(img.mimetype);
			const filePath = path.resolve(__dirname, '..', 'static', fileName);
			
			// Безопасное сохранение файла
			await img.mv(filePath);
	
			const product = await Product.create({
				name: sanitizedName, 
				price: parseInt(price), 
				description: (description && description.trim() !== '') ? sanitizeString(description) : null, 
				article: (article && article !== '') ? parseInt(article) : null, 
				weight: (weight && weight !== '' && weight !== '0') ? parseInt(weight) : null, 
				categoryId: parseInt(categoryId), 
				typeId: parseInt(typeId), 
				inStock: inStockBoolean, 
				img: fileName, 
				order: (order && order !== '') ? parseInt(order) : 0
			});
			
			return res.json(product);		
				
		} catch (error) {
			console.error('Error creating product:', error);
			next(ApiError.badRequest(error.message));
		}
	}

	async getAllProducts(req, res, next) {
		try {
			const { categoryId, typeId, inStock, search } = req.query;
			const { Op } = require('sequelize');
			
			// Валидация и санитизация параметров запроса
			let whereConditions = {};
			
			if (categoryId) {
				const numCategoryId = parseInt(categoryId);
				if (isNaN(numCategoryId) || numCategoryId <= 0) {
					return next(ApiError.badRequest('Invalid category ID'));
				}
				whereConditions.categoryId = numCategoryId;
			}
			
			if (typeId) {
				const numTypeId = parseInt(typeId);
				if (isNaN(numTypeId) || numTypeId <= 0) {
					return next(ApiError.badRequest('Invalid type ID'));
				}
				whereConditions.typeId = numTypeId;
			}
			
			if (inStock !== undefined) {
				if (typeof inStock === 'string') {
					whereConditions.inStock = inStock === 'true';
				} else {
					whereConditions.inStock = Boolean(inStock);
				}
			}
			
			// Определяем порядок сортировки в зависимости от наличия поиска
			let orderClause = [['order', 'ASC'], ['id', 'ASC']]; // По умолчанию
			
			// Добавляем поиск по названию
			if (search) {
				const sanitizedSearch = sanitizeString(search);
				if (sanitizedSearch.length > 0) {
					whereConditions.name = {
						[Op.iLike]: `%${sanitizedSearch}%`
					};
					
					// Для поиска используем простую сортировку по алфавиту
					orderClause = [
						['name', 'ASC'],
						['order', 'ASC']
					];
				}
			}
			
			// Загружаем все товары без пагинации
			const products = await Product.findAll({
				where: whereConditions,
				include: [
					{model: Type, as: 'type'}, 
					{model: Category, as: 'category'}
				],
				order: orderClause
			});
			
			return res.json(products); 
		} catch (error) {
			console.error('Error in getAllProducts:', error);
			next(error);
		}
	}

	async getOneProduct(req, res, next) {
		try {
			const {id} = req.params;
			
			// Валидация ID
			const numId = parseInt(id);
			if (isNaN(numId) || numId <= 0) {
				return next(ApiError.badRequest('Invalid product ID'));
			}
			
			const product = await Product.findOne({
				where: {id: numId}, 
				include: [
					{model: Type, as: 'type'}, 
					{model: Category, as: 'category'}
				]
			});
			
			if (!product) {
				return next(ApiError.notFound('Product not found'));
			}
			
			return res.json(product);
		} catch (error) {
			console.error('Error getting product:', error);
			next(error);
		}
	}

	async deleteProduct(req, res, next) {
		try {
			const {id} = req.params;
			
			// Валидация ID
			const numId = parseInt(id);
			if (isNaN(numId) || numId <= 0) {
				return next(ApiError.badRequest('Invalid product ID'));
			}
			
			const product = await Product.findByPk(numId);
			if (!product) {
				return next(ApiError.notFound('Product not found'));
			}
			
			await Product.destroy({where: {id: numId}});
			return res.json({message: "Product deleted"});
		} catch (error) {
			console.error('Error deleting product:', error);
			next(error);
		}
	}

	async updateProduct(req, res, next) {
		try {
			const {id} = req.params;
			const {name, description, price, article, weight, categoryId, typeId, inStock, order} = req.body;
			
			// Валидация ID
			const numId = parseInt(id);
			if (isNaN(numId) || numId <= 0) {
				return next(ApiError.badRequest('Invalid product ID'));
			}
			
			// Проверяем существование продукта
			const existingProduct = await Product.findByPk(numId);
			if (!existingProduct) {
				return next(ApiError.notFound('Product not found'));
			}
			
			// Валидация и санитизация данных
			let updateData = {};
			
			if (name !== undefined) {
				if (!name || name.trim() === '') {
					return next(ApiError.badRequest('Product name is required'));
				}
				const sanitizedName = sanitizeString(name);
				if (sanitizedName.length < 2 || sanitizedName.length > 100) {
					return next(ApiError.badRequest('Invalid product name length'));
				}
				updateData.name = sanitizedName;
			}
			
			if (description !== undefined) {
				updateData.description = (description && description.trim() !== '') ? sanitizeString(description) : null;
			}
			
			if (price !== undefined) {
				if (!price || price === '' || !validatePrice(price)) {
					return next(ApiError.badRequest('Invalid price'));
				}
				updateData.price = parseInt(price);
			}
			
			if (article !== undefined) {
				if (!article || article === '' || !validateArticle(article)) {
					return next(ApiError.badRequest('Invalid article number'));
				}
				updateData.article = parseInt(article);
			}
			
			if (weight !== undefined) {
				if (weight !== '' && weight !== '0' && !validateWeight(weight)) {
					return next(ApiError.badRequest('Invalid weight'));
				}
				updateData.weight = (weight && weight !== '' && weight !== '0') ? parseInt(weight) : null;
			}
			
			if (categoryId !== undefined) {
				if (!categoryId || categoryId === '') {
					return next(ApiError.badRequest('Category is required'));
				}
				const numCategoryId = parseInt(categoryId);
				if (isNaN(numCategoryId) || numCategoryId <= 0) {
					return next(ApiError.badRequest('Invalid category ID'));
				}
				updateData.categoryId = numCategoryId;
			}
			
			if (typeId !== undefined) {
				if (!typeId || typeId === '') {
					return next(ApiError.badRequest('Type is required'));
				}
				const numTypeId = parseInt(typeId);
				if (isNaN(numTypeId) || numTypeId <= 0) {
					return next(ApiError.badRequest('Invalid type ID'));
				}
				updateData.typeId = numTypeId;
			}
			
			if (inStock !== undefined) {
				updateData.inStock = inStock === 'true' || inStock === true;
			}
			
			if (order !== undefined) {
				updateData.order = (order && order !== '') ? parseInt(order) : 0;
			}
			
			// Если загружено новое изображение
			if (req.files && req.files.img) {
				const {img} = req.files;
				
				// Проверка файла изображения
				if (!validateImageFile(img)) {
					return next(ApiError.badRequest('Invalid image file. Please upload a valid JPEG, PNG or WebP image.'));
				}
				
				let fileName = uuid.v4() + getFileExtension(img.mimetype);
				const filePath = path.resolve(__dirname, '..', 'static', fileName);
				
				// Безопасное сохранение файла
				await img.mv(filePath);
				updateData.img = fileName;
			}
			
			const product = await Product.update(updateData, {where: {id: numId}});
			
			return res.json(product);
		} catch (error) {
			console.error('Error updating product:', error);
			next(ApiError.badRequest(error.message));
		}
	}
}

module.exports = new ProductController();		