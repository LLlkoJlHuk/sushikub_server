const {Category} = require('../models/models');
const ApiError = require('../error/ApiError');

// Функция для транслитерации русских названий в латиницу
const transliterate = (text) => {
  const transliterationMap = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '',
    'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
    'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
    'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
    'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch', 'Ъ': '',
    'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
  };

  return text
    .split('')
    .map(char => transliterationMap[char] || char)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Удаляем все символы кроме букв, цифр, пробелов и дефисов
    .replace(/\s+/g, '-') // Заменяем пробелы на дефисы
    .replace(/-+/g, '-') // Убираем множественные дефисы
    .replace(/^-|-$/g, ''); // Убираем дефисы в начале и конце
};

class CategoryController {
	async createCategory(req, res, next) {
		try {
			const {name, order} = req.body;
			
			// Проверяем, что файл загружен
			if (!req.files || !req.files.img) {
				return next(ApiError.badRequest('Не загружено изображение'));
			}
			
			const {img} = req.files;
			
			// Проверяем тип файла
			if (!img.mimetype.startsWith('image/')) {
				return next(ApiError.badRequest('Загруженный файл не является изображением'));
			}
			
			// Получаем расширение файла
			const fileExtension = img.name.split('.').pop();
			
			// Создаем транслитерированное название на основе имени категории
			const transliteratedName = transliterate(name);
			
			// Генерируем уникальное имя файла
			const fileName = `${transliteratedName}_${Date.now()}.${fileExtension}`;
			
			// Перемещаем файл в папку static
			await img.mv(`./static/${fileName}`);
			
			// Создаем категорию с путем к файлу и порядком
			const category = await Category.create({
				name,
				preview: fileName,
				order: order ? parseInt(order) : null
			});
			
			return res.json(category);
		} catch (error) {
			console.error('Error creating category:', error);
			return next(ApiError.internal('Ошибка при создании категории'));
		}
	}

	async deleteCategory(req, res) {
		const {id} = req.params;
		const category = await Category.destroy({where: {id}});
		return res.json(category);
	}

	async updateCategory(req, res, next) {
		try {
			const {id} = req.params;
			const {name, order} = req.body;
			
			// Проверяем, что категория существует
			const existingCategory = await Category.findOne({where: {id}});
			if (!existingCategory) {
				return next(ApiError.badRequest('Категория не найдена'));
			}
			
			let updateData = {name};
			
			// Добавляем порядок, если он передан
			if (order !== undefined) {
				updateData.order = order ? parseInt(order) : null;
			}
			
			// Если загружено новое изображение
			if (req.files && req.files.img) {
				const {img} = req.files;
				
				// Проверяем тип файла
				if (!img.mimetype.startsWith('image/')) {
					return next(ApiError.badRequest('Загруженный файл не является изображением'));
				}
				
				// Получаем расширение файла
				const fileExtension = img.name.split('.').pop();
				
				// Создаем транслитерированное название на основе имени категории
				const transliteratedName = transliterate(name);
				
				// Генерируем уникальное имя файла
				const fileName = `${transliteratedName}_${Date.now()}.${fileExtension}`;
				
				// Перемещаем файл в папку static
				await img.mv(`./static/${fileName}`);
				
				updateData.preview = fileName;
			}
			
			// Обновляем категорию
			const category = await Category.update(updateData, {where: {id}});
			return res.json(category);
		} catch (error) {
			console.error('Error updating category:', error);
			return next(ApiError.internal('Ошибка при обновлении категории'));
		}
	}

	async getAllCategories(req, res) {
		const categories = await Category.findAll();
		return res.json(categories);
	}

	async getOneCategory(req, res) {
		const {id} = req.params;
		const category = await Category.findOne({where: {id}});
		return res.json(category);
	}
}

module.exports = new CategoryController();	