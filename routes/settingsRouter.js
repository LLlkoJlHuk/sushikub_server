const Router = require("express");
const router = new Router();
const checkRoleMiddleware = require("../middleware/checkRoleMiddleware");
const settingsController = require("../controllers/settingsController");

// Публичные роуты для получения данных
router.get("/", settingsController.getAllSettings);
router.get("/object", settingsController.getSettingsObject);
router.get("/key/:key", settingsController.getSettingByKey);

// Админские роуты (требуют роль ADMIN)
router.post("/", checkRoleMiddleware, settingsController.createSetting);
router.put("/:id", checkRoleMiddleware, settingsController.updateSetting);
router.delete("/:id", checkRoleMiddleware, settingsController.deleteSetting);

module.exports = router;
