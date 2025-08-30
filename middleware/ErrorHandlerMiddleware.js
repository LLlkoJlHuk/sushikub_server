const ApiError = require("../error/ApiError");

module.exports = function (err, req, res, next) {
	// Логируем только критические ошибки в продакшене
	if (process.env.NODE_ENV === 'development') {
		console.error('Error occurred:', {
			message: err.message,
			stack: err.stack,
			url: req.url,
			method: req.method,
			ip: req.ip,
			userAgent: req.get('User-Agent')
		});
	}

	if (err instanceof ApiError) {
		return res.status(err.status).json({
			message: err.message,
			status: err.status,
			timestamp: new Date().toISOString()
		});
	}

	// Обработка ошибок валидации
	if (err.name === 'ValidationError') {
		return res.status(400).json({
			message: 'Validation error',
			status: 400,
			timestamp: new Date().toISOString()
		});
	}

	// Обработка ошибок JWT
	if (err.name === 'JsonWebTokenError') {
		return res.status(401).json({
			message: 'Invalid token',
			status: 401,
			timestamp: new Date().toISOString()
		});
	}

	if (err.name === 'TokenExpiredError') {
		return res.status(401).json({
			message: 'Token expired',
			status: 401,
			timestamp: new Date().toISOString()
		});
	}

	// Обработка ошибок базы данных
	if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
		return res.status(400).json({
			message: 'Database validation error',
			status: 400,
			timestamp: new Date().toISOString()
		});
	}

	// Обработка ошибок файлов
	if (err.code === 'LIMIT_FILE_SIZE') {
		return res.status(413).json({
			message: 'File too large',
			status: 413,
			timestamp: new Date().toISOString()
		});
	}

	if (err.code === 'LIMIT_UNEXPECTED_FILE') {
		return res.status(400).json({
			message: 'Unexpected file field',
			status: 400,
			timestamp: new Date().toISOString()
		});
	}

	// Обработка CORS ошибок
	if (err.message === 'Not allowed by CORS') {
		return res.status(403).json({
			message: 'CORS policy violation',
			status: 403,
			timestamp: new Date().toISOString()
		});
	}

	// Обработка rate limiting ошибок
	if (err.status === 429) {
		return res.status(429).json({
			message: err.message || 'Too many requests',
			status: 429,
			timestamp: new Date().toISOString()
		});
	}

	// Общая ошибка сервера
	return res.status(500).json({
		message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
		status: 500,
		timestamp: new Date().toISOString(),
		...(process.env.NODE_ENV === 'development' && { stack: err.stack })
	});
}