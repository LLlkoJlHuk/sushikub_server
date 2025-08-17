const Router = require("express");
const router = new Router();
const checkRoleMiddleware = require("../middleware/checkRoleMiddleware");
const categoryController = require("../controllers/categoryController");

// Публичные роуты для получения данных
router.get("/", categoryController.getAllCategories);
router.get("/:id", categoryController.getOneCategory);

// Админские роуты (требуют роль ADMIN)
router.post("/", checkRoleMiddleware, categoryController.createCategory);
router.put("/:id", checkRoleMiddleware, categoryController.updateCategory);
router.delete("/:id", checkRoleMiddleware, categoryController.deleteCategory);

module.exports = router;