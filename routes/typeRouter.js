const Router = require("express");
const router = new Router();
const checkRoleMiddleware = require("../middleware/checkRoleMiddleware");
const typeController = require("../controllers/typeController");

// Публичные роуты для получения данных
router.get("/", typeController.getAllTypes);
router.get("/:id", typeController.getOneType);

// Админские роуты (требуют роль ADMIN)
router.post("/", checkRoleMiddleware, typeController.createType);
router.put("/:id", checkRoleMiddleware, typeController.updateType);
router.delete("/:id", checkRoleMiddleware, typeController.deleteType);

module.exports = router;