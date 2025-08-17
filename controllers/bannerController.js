const { Banners } = require("../models/models");
const path = require("path");
const fs = require("fs");

class BannerController {
	async createBanner(req, res) {
		try {
			const { link, order } = req.body;
			
			// Проверяем, что файлы загружены
			if (!req.files || !req.files.imgDesktop || !req.files.imgMobile) {
				return res.status(400).json({ message: "Необходимо загрузить изображения для десктопа и мобильного устройства" });
			}

			const imgDesktop = req.files.imgDesktop;
			const imgMobile = req.files.imgMobile;

			// Генерируем уникальные имена файлов
			const desktopFileName = `${Date.now()}_desktop_${imgDesktop.name}`;
			const mobileFileName = `${Date.now()}_mobile_${imgMobile.name}`;

			// Пути для сохранения файлов
			const desktopPath = path.resolve(__dirname, '../static', desktopFileName);
			const mobilePath = path.resolve(__dirname, '../static', mobileFileName);

			// Перемещаем файлы в статическую папку
			await imgDesktop.mv(desktopPath);
			await imgMobile.mv(mobilePath);

			// Сохраняем информацию о баннере в БД
			const banner = await Banners.create({ 
				imgDesktop: desktopFileName, 
				imgMobile: mobileFileName, 
				link, 
				order: parseInt(order) || 0 
			});

			return res.json(banner);
		} catch (error) {
			console.error('Error creating banner:', error);
			return res.status(500).json({ message: "Ошибка при создании баннера", error: error.message });
		}
	}

	async deleteBanner(req, res) {
		try {
			const { id } = req.params;
			
			// Получаем информацию о баннере перед удалением
			const banner = await Banners.findOne({ where: { id } });
			if (!banner) {
				return res.status(404).json({ message: "Баннер не найден" });
			}

			// Удаляем файлы с сервера
			const desktopPath = path.resolve(__dirname, '../static', banner.imgDesktop);
			const mobilePath = path.resolve(__dirname, '../static', banner.imgMobile);

			if (fs.existsSync(desktopPath)) {
				fs.unlinkSync(desktopPath);
			}
			if (fs.existsSync(mobilePath)) {
				fs.unlinkSync(mobilePath);
			}

			// Удаляем запись из БД
			await Banners.destroy({ where: { id } });
			return res.json({ message: "Баннер успешно удален" });
		} catch (error) {
			console.error('Error deleting banner:', error);
			return res.status(500).json({ message: "Ошибка при удалении баннера", error: error.message });
		}
	}

	async getAllBanners(req, res) {
		try {
			const banners = await Banners.findAll({
				order: [['order', 'ASC']]
			});
			return res.json(banners);
		} catch (error) {
			console.error('Error getting banners:', error);
			return res.status(500).json({ message: "Ошибка при получении баннеров", error: error.message });
		}
	}

	async getOneBanner(req, res) {
		try {
			const { id } = req.params;	
			const banner = await Banners.findOne({ where: { id } });
			if (!banner) {
				return res.status(404).json({ message: "Баннер не найден" });
			}
			return res.json(banner);
		} catch (error) {
			console.error('Error getting banner:', error);
			return res.status(500).json({ message: "Ошибка при получении баннера", error: error.message });
		}
	}

	async updateBanner(req, res) {
		try {
			const { id } = req.params;
			const { link, order } = req.body;
			
			// Получаем существующий баннер
			const existingBanner = await Banners.findOne({ where: { id } });
			if (!existingBanner) {
				return res.status(404).json({ message: "Баннер не найден" });
			}

			// Обновляем данные
			const updateData = {
				link: link || existingBanner.link,
				order: parseInt(order) || existingBanner.order
			};

			// Если загружены новые изображения
			if (req.files) {
				// Удаляем старые файлы
				if (req.files.imgDesktop) {
					const oldDesktopPath = path.resolve(__dirname, '../static', existingBanner.imgDesktop);
					if (fs.existsSync(oldDesktopPath)) {
						fs.unlinkSync(oldDesktopPath);
					}
					
					const imgDesktop = req.files.imgDesktop;
					const desktopFileName = `${Date.now()}_desktop_${imgDesktop.name}`;
					const desktopPath = path.resolve(__dirname, '../static', desktopFileName);
					await imgDesktop.mv(desktopPath);
					updateData.imgDesktop = desktopFileName;
				}

				if (req.files.imgMobile) {
					const oldMobilePath = path.resolve(__dirname, '../static', existingBanner.imgMobile);
					if (fs.existsSync(oldMobilePath)) {
						fs.unlinkSync(oldMobilePath);
					}
					
					const imgMobile = req.files.imgMobile;
					const mobileFileName = `${Date.now()}_mobile_${imgMobile.name}`;
					const mobilePath = path.resolve(__dirname, '../static', mobileFileName);
					await imgMobile.mv(mobilePath);
					updateData.imgMobile = mobileFileName;
				}
			}

			// Обновляем баннер в БД
			await Banners.update(updateData, { where: { id } });
			
			// Получаем обновленный баннер
			const updatedBanner = await Banners.findOne({ where: { id } });
			return res.json(updatedBanner);
		} catch (error) {
			console.error('Error updating banner:', error);
			return res.status(500).json({ message: "Ошибка при обновлении баннера", error: error.message });
		}
	}
}

module.exports = new BannerController();