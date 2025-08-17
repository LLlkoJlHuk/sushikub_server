const Router = require("express");
const router = new Router();
const checkRoleMiddleware = require("../middleware/checkRoleMiddleware");
const bannerController = require("../controllers/bannerController");

// Публичные роуты для получения данных
router.get("/", bannerController.getAllBanners);
router.get("/:id", bannerController.getOneBanner);

// Админские роуты (требуют роль ADMIN)
router.post("/", checkRoleMiddleware, bannerController.createBanner);
router.put("/:id", checkRoleMiddleware, bannerController.updateBanner);
router.delete("/:id", checkRoleMiddleware, bannerController.deleteBanner);

module.exports = router;