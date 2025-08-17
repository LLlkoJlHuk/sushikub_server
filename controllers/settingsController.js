const { Settings } = require('../models/models');
const ApiError = require('../error/ApiError');

class SettingsController {
	async createSetting(req, res, next) {
		try {
			const { key, value, type, description, order } = req.body;
			
			// Валидация типа значения
			let validatedValue = value;
			if (type === 'number') {
				validatedValue = Number(value);
				if (isNaN(validatedValue)) {
					return next(ApiError.badRequest('Invalid number value'));
				}
			} else if (type === 'boolean') {
				validatedValue = value === 'true' || value === true;
			} else if (type === 'json') {
				try {
					validatedValue = JSON.stringify(value);
				} catch (error) {
					return next(ApiError.badRequest('Invalid JSON value'));
				}
			}

			const setting = await Settings.create({
				key,
				value: validatedValue,
				type,
				description,
				order: order || 0
			});
			
			return res.json(setting);
		} catch (error) {
			next(ApiError.badRequest(error.message));
		}
	}

	async getAllSettings(req, res, next) {
		try {
			const settings = await Settings.findAll({
				order: [['order', 'ASC'], ['id', 'ASC']]
			});
			
			// Преобразуем значения в соответствующие типы
			const formattedSettings = settings.map(setting => {
				let formattedValue = setting.value;
				
				if (setting.type === 'number') {
					formattedValue = Number(setting.value);
				} else if (setting.type === 'boolean') {
					formattedValue = setting.value === 'true' || setting.value === true;
				} else if (setting.type === 'json') {
					try {
						formattedValue = JSON.parse(setting.value);
					} catch (error) {
						formattedValue = setting.value;
					}
				}
				
				return {
					...setting.toJSON(),
					value: formattedValue
				};
			});
			
			return res.json(formattedSettings);
		} catch (error) {
			next(error);
		}
	}

	async getSettingByKey(req, res, next) {
		try {
			const { key } = req.params;
			const setting = await Settings.findOne({ where: { key } });
			
			if (!setting) {
				return next(ApiError.notFound('Setting not found'));
			}
			
			// Преобразуем значение в соответствующий тип
			let formattedValue = setting.value;
			if (setting.type === 'number') {
				formattedValue = Number(setting.value);
			} else if (setting.type === 'boolean') {
				formattedValue = setting.value === 'true' || setting.value === true;
			} else if (setting.type === 'json') {
				try {
					formattedValue = JSON.parse(setting.value);
				} catch (error) {
					formattedValue = setting.value;
				}
			}
			
			return res.json({
				...setting.toJSON(),
				value: formattedValue
			});
		} catch (error) {
			next(error);
		}
	}

	async updateSetting(req, res, next) {
		try {
			const { id } = req.params;
			const { key, value, type, description, order } = req.body;
			
			// Валидация типа значения
			let validatedValue = value;
			if (type === 'number') {
				validatedValue = Number(value);
				if (isNaN(validatedValue)) {
					return next(ApiError.badRequest('Invalid number value'));
				}
			} else if (type === 'boolean') {
				validatedValue = value === 'true' || value === true;
			} else if (type === 'json') {
				try {
					validatedValue = JSON.stringify(value);
				} catch (error) {
					return next(ApiError.badRequest('Invalid JSON value'));
				}
			}
			
			const updateData = { key, value: validatedValue, type, description, order };
			
			const setting = await Settings.update(updateData, { where: { id } });
			return res.json(setting);
		} catch (error) {
			next(ApiError.badRequest(error.message));
		}
	}

	async deleteSetting(req, res, next) {
		try {
			const { id } = req.params;
			await Settings.destroy({ where: { id } });
			return res.json({ message: "Setting deleted" });
		} catch (error) {
			next(error);
		}
	}

	// Метод для получения всех настроек в виде объекта (для удобства использования в коде)
	async getSettingsObject(req, res, next) {
		try {
			const settings = await Settings.findAll({
				order: [['order', 'ASC'], ['id', 'ASC']]
			});
			
			const settingsObject = {};
			settings.forEach(setting => {
				let value = setting.value;
				
				if (setting.type === 'number') {
					value = Number(setting.value);
				} else if (setting.type === 'boolean') {
					value = setting.value === 'true' || setting.value === true;
				} else if (setting.type === 'json') {
					try {
						value = JSON.parse(setting.value);
					} catch (error) {
						value = setting.value;
					}
				}
				
				settingsObject[setting.key] = value;
			});
			
			return res.json(settingsObject);
		} catch (error) {
			next(error);
		}
	}
}

module.exports = new SettingsController();
