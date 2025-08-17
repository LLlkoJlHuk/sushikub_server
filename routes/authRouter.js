const Router = require("express");
const router = new Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

// Только вход для администратора (регистрация через БД напрямую)
router.post("/login", userController.login);
router.get("/check", authMiddleware, userController.check);

module.exports = router;