const sequelize = require("../db");
const { DataTypes } = require("sequelize");

const User = sequelize.define("user", {
	id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
	login: { type: DataTypes.STRING, unique: true },
	password: { type: DataTypes.STRING },
	role: { type: DataTypes.STRING, defaultValue: "USER" },
});

const Basket = sequelize.define("basket", {
	id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
});

const BasketProduct = sequelize.define("basket_product", {
	id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
});

const Product = sequelize.define("product", {
	id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
	name: { type: DataTypes.STRING, unique: true, allowNull: false },
	description: { type: DataTypes.STRING },
	price: { type: DataTypes.INTEGER, allowNull: false },
	img: { type: DataTypes.STRING, allowNull: false },
	article: { type: DataTypes.INTEGER, allowNull: false },
	weight: { type: DataTypes.INTEGER },
	inStock: { type: DataTypes.BOOLEAN, defaultValue: true },
	order: { type: DataTypes.INTEGER, allowNull: false },
});

const Category = sequelize.define("category", {
	id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
	name: { type: DataTypes.STRING, unique: true, allowNull: false },
	preview: { type: DataTypes.STRING, allowNull: false },
	order: { type: DataTypes.INTEGER, allowNull: true },
});	

const Type = sequelize.define("type", {
	id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
	name: { type: DataTypes.STRING, unique: true, allowNull: false },
});	

const TypeCategory = sequelize.define("type_category", {
	id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
});	

const Banners = sequelize.define("banners", {
	id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
	imgDesktop: { type: DataTypes.STRING, allowNull: false },
	imgMobile: { type: DataTypes.STRING, allowNull: false },
	link: { type: DataTypes.STRING, allowNull: false },
	order: { type: DataTypes.INTEGER, allowNull: false },
});

const Settings = sequelize.define("settings", {
	id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
	key: { type: DataTypes.STRING, unique: true, allowNull: false },
	value: { type: DataTypes.TEXT, allowNull: false },
	type: { type: DataTypes.ENUM('string', 'number', 'boolean', 'json'), defaultValue: 'string' },
	description: { type: DataTypes.STRING },
	order: { type: DataTypes.INTEGER, defaultValue: 0 },
});

User.hasOne(Basket);
Basket.belongsTo(User);

Basket.hasMany(BasketProduct);
BasketProduct.belongsTo(Basket);

Type.hasMany(Product);
Product.belongsTo(Type);

Product.hasMany(BasketProduct);
BasketProduct.belongsTo(Product);

Category.hasMany(Product);
Product.belongsTo(Category);

Category.belongsToMany(Type, { through: TypeCategory });
Type.belongsToMany(Category, { through: TypeCategory });

module.exports = {
	User,
	Basket,
	BasketProduct,
	Product,
	Category,
	Type,
	Banners,
	Settings,
};
