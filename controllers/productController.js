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
  if (!weight) return true;
  const numWeight = parseInt(weight);
  return !isNaN(numWeight) && numWeight > 0 && numWeight <= 10000;
};

// Функция для валидации артикула
const validateArticle = (article) => {
  const numArticle = parseInt(article);
  return !isNaN(numArticle) && numArticle >= 0;
};

class ProductController {
	async createProduct(req, res, next) {
		try {
			const {name, description, price, article, weight, categoryId, typeId, inStock, order} = req.body;
			const {img} = req.files;
			
			// Валидация обязательных полей
			if (!name || !price || !article || !categoryId || !typeId) {
				return next(ApiError.badRequest('Missing required fields'));
			}
			
			// Валидация и санитизация данных
			const sanitizedName = sanitizeString(name);
			if (sanitizedName.length < 2 || sanitizedName.length > 100) {
				return next(ApiError.badRequest('Invalid product name length'));
			}
			
			if (!validatePrice(price)) {
				return next(ApiError.badRequest('Invalid price'));
			}
			
			if (!validateArticle(article)) {
				return next(ApiError.badRequest('Invalid article number'));
			}
			
			if (weight && !validateWeight(weight)) {
				return next(ApiError.badRequest('Invalid weight'));
			}
			
			// Валидация файла
			if (!img) {
				return next(ApiError.badRequest('Image is required'));
			}
			
			// Проверка типа файла
			const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
			if (!allowedMimeTypes.includes(img.mimetype)) {
				return next(ApiError.badRequest('Invalid file type. Only JPEG, PNG and WebP are allowed.'));
			}
			
			// Преобразуем inStock в булево значение
			const inStockBoolean = inStock === 'true' || inStock === true;
			
			let fileName = uuid.v4() + path.extname(img.name);
			const filePath = path.resolve(__dirname, '..', 'static', fileName);
			
			// Безопасное сохранение файла
			await img.mv(filePath);
	
			const product = await Product.create({
				name: sanitizedName, 
				price: parseInt(price), 
				description: description ? sanitizeString(description) : null, 
				article: parseInt(article), 
				weight: weight ? parseInt(weight) : null, 
				categoryId: parseInt(categoryId), 
				typeId: parseInt(typeId), 
				inStock: inStockBoolean, 
				img: fileName, 
				order: order ? parseInt(order) : 0
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
				const sanitizedName = sanitizeString(name);
				if (sanitizedName.length < 2 || sanitizedName.length > 100) {
					return next(ApiError.badRequest('Invalid product name length'));
				}
				updateData.name = sanitizedName;
			}
			
			if (description !== undefined) {
				updateData.description = description ? sanitizeString(description) : null;
			}
			
			if (price !== undefined) {
				if (!validatePrice(price)) {
					return next(ApiError.badRequest('Invalid price'));
				}
				updateData.price = parseInt(price);
			}
			
			if (article !== undefined) {
				if (!validateArticle(article)) {
					return next(ApiError.badRequest('Invalid article number'));
				}
				updateData.article = parseInt(article);
			}
			
			if (weight !== undefined) {
				if (weight && !validateWeight(weight)) {
					return next(ApiError.badRequest('Invalid weight'));
				}
				updateData.weight = weight ? parseInt(weight) : null;
			}
			
			if (categoryId !== undefined) {
				const numCategoryId = parseInt(categoryId);
				if (isNaN(numCategoryId) || numCategoryId <= 0) {
					return next(ApiError.badRequest('Invalid category ID'));
				}
				updateData.categoryId = numCategoryId;
			}
			
			if (typeId !== undefined) {
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
				updateData.order = order ? parseInt(order) : 0;
			}
			
			// Если загружено новое изображение
			if (req.files && req.files.img) {
				const {img} = req.files;
				
				// Проверка типа файла
				const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
				if (!allowedMimeTypes.includes(img.mimetype)) {
					return next(ApiError.badRequest('Invalid file type. Only JPEG, PNG and WebP are allowed.'));
				}
				
				let fileName = uuid.v4() + path.extname(img.name);
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