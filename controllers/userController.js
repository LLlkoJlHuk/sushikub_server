const ApiError = require("../error/ApiError");
const {User, Basket} = require('../models/models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Функция для санитизации строк
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>]/g, '').trim();
};

// Функция для валидации логина
const validateLogin = (login) => {
  if (!login || typeof login !== 'string') return false;
  const sanitizedLogin = sanitizeString(login);
  return sanitizedLogin.length >= 3 && sanitizedLogin.length <= 50 && /^[a-zA-Z0-9_-]+$/.test(sanitizedLogin);
};

// Функция для валидации пароля
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') return false;
  return password.length >= 6 && password.length <= 100;
};

const generateJwt = (id, login, role) => {
	const token = jwt.sign(
		{id, login, role}, 
		process.env.SECRET_KEY, 
		{
			expiresIn: process.env.JWT_EXPIRES_IN || '24h',
			issuer: process.env.JWT_ISSUER || 'sushikub',
			audience: process.env.JWT_AUDIENCE || 'sushikub-admin'
		}
	);
	return token;
};

class UserController {
	async login(req, res, next) {
		try {
			const {login, password} = req.body;
			
			// Валидация входных данных
			if (!validateLogin(login)) {
				return next(ApiError.badRequest('Invalid login format'));
			}
			
			if (!validatePassword(password)) {
				return next(ApiError.badRequest('Invalid password format'));
			}
			
			// Санитизация логина
			const sanitizedLogin = sanitizeString(login);
			
			// Поиск пользователя (только админ)
			const user = await User.findOne({where: {login: sanitizedLogin}});
			if (!user) {
				return next(ApiError.badRequest('User with this login not found'));
			}
			
			// Проверяем, что это админ
			if (user.role !== 'ADMIN') {
				return next(ApiError.forbidden('Access denied. Admin only.'));
			}
			
			// Проверка пароля
			let comparePassword = bcrypt.compareSync(password, user.password);
			if (!comparePassword) {
				return next(ApiError.badRequest('Invalid password'));
			}
			
			// Генерация JWT токена
			const jwtToken = generateJwt(user.id, user.login, user.role);
			
			// Не возвращаем пароль в ответе
			const userResponse = {
				id: user.id,
				login: user.login,
				role: user.role
			};
			
			return res.json({
				user: userResponse,
				jwtToken
			});
		} catch (error) {
			console.error('Login error:', error);
			next(ApiError.badRequest(error.message));
		}
	}

	async check(req, res, next) {
		try {
			// Пользователь уже проверен в authMiddleware
			const jwtToken = generateJwt(req.user.id, req.user.login, req.user.role);
			
			const userResponse = {
				id: req.user.id,
				login: req.user.login,
				role: req.user.role
			};
			
			return res.json({
				user: userResponse,
				jwtToken
			});
		} catch (error) {
			console.error('Check auth error:', error);
			next(ApiError.badRequest(error.message));
		}
	}
}

module.exports = new UserController();