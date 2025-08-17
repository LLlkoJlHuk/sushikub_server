const {Type} = require('../models/models');
const ApiError = require('../error/ApiError');

class TypeController {
	async createType(req, res) {
		const {name} = req.body;
		const type = await Type.create({name});
		return res.json(type);
	}

	async updateType(req, res) {
		const {id} = req.params;
		const {name} = req.body;
		const type = await Type.update({name}, {where: {id}});
		return res.json(type);
	}

	async deleteType(req, res) {
		const {id} = req.params;
		const type = await Type.destroy({where: {id}});
		return res.json(type);
	}

	async getAllTypes(req, res) {
		const types = await Type.findAll();
		return res.json(types);
	}

	async getOneType(req, res) {
		const {id} = req.params;
		const type = await Type.findOne({where: {id}});
		return res.json(type);
	}	
}

module.exports = new TypeController();		