const Router = require("express");
const router = new Router();
const authRouter = require("./authRouter");
const typeRouter = require("./typeRouter");
const categoryRouter = require("./categoryRouter");
const productRouter = require("./productRouter");	
const bannerRouter = require("./bannerRouter");
const settingsRouter = require("./settingsRouter");

router.use('/auth', authRouter);
router.use('/type', typeRouter);	
router.use('/category', categoryRouter);
router.use('/product', productRouter);	
router.use('/banner', bannerRouter);
router.use('/settings', settingsRouter);
	
module.exports = router;