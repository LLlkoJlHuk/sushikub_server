const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
	if (req.method === "OPTIONS") {
		next();
	}
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader) {
			return res.status(401).json({message: "Authorization header is required"});
		}
		
		const token = authHeader.split(' ')[1];
		if (!token) {
			return res.status(401).json({message: "Token is required"});
		}
		
		// Проверяем формат токена
		if (!/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/.test(token)) {
			return res.status(401).json({message: "Invalid token format"});
		}
		
		const decoded = jwt.verify(token, process.env.SECRET_KEY);
		
		// Проверяем время жизни токена
		if (decoded.exp && Date.now() >= decoded.exp * 1000) {
			return res.status(401).json({message: "Token has expired"});
		}
		
		// Проверяем, что токен не был выпущен слишком давно (например, больше 10 дней)
		const tokenAge = Date.now() - (decoded.iat * 1000);
		const maxTokenAge = 10 * 24 * 60 * 60 * 1000; // 10 дней
		if (tokenAge > maxTokenAge) {
			return res.status(401).json({message: "Token is too old"});
		}
		
		req.user = decoded;
		next();
	} catch (error) {
		if (error.name === 'JsonWebTokenError') {
			return res.status(401).json({message: "Invalid token"});
		} else if (error.name === 'TokenExpiredError') {
			return res.status(401).json({message: "Token has expired"});
		} else {
			return res.status(500).json({message: "Internal server error"});
		}
	}
}