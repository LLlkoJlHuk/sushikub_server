const Router = require("express");
const router = new Router();
const checkRoleMiddleware = require("../middleware/checkRoleMiddleware");
const productController = require("../controllers/productController");

// Публичные роуты для получения данных
router.get("/", productController.getAllProducts);
router.get("/:id", productController.getOneProduct);

// Админские роуты (требуют роль ADMIN)
router.post("/", checkRoleMiddleware, productController.createProduct);
router.put("/:id", checkRoleMiddleware, productController.updateProduct);
router.delete("/:id", checkRoleMiddleware, productController.deleteProduct);

module.exports = router;