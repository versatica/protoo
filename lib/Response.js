'use strict';

const utils = require('./utils');

class Response
{
	static factory(res)
	{
		if (!utils.isPositiveInteger(res.status) || res.status < 100 || res.status > 699)
			throw new Error('protoo.Response.factory() | status must be 100..699');

		res.__proto__ = new Response();
		// Object.setPrototypeOf(res, new Response());

		res.init();

		return res;
	}

	constructor()
	{
		/**
		 * JSON fields
		 * - id:     Number (ro), mandatory
		 * - status: Number (ro), mandatory
		 * - reason: String (ro), optional
		 * - data:   Object (rw), optional
		 */

		/**
		 * Public attributes
		 * - isProvisional:  Boolean (ro)
		 * - isAccept:  Boolean (ro)
		 * - isReject:  Boolean (ro)
		 * - isFinal:   Boolean (ro)
		 */

		/**
		 * Private attributes
		 * - _toString: String, for toString() method
		 * - _id: String, response id needed by ResponseSender
		 */
	}

	init()
	{
		this.reason = this.reason || '';
		this.data = this.data || {};
		this._id = utils.randomString();

		if (this.status < 200)
		{
			this.isProvisional = true;
		}
		else if (this.status < 300)
		{
			this.isAccept = true;
			this.isFinal = true;
		}
		else
		{
			this.isReject = true;
			this.isFinal = true;
		}
	}

	toString()
	{
		return this._toString || (this._toString = `[id:${this.id}, status:${this.status}, reason:"${this.reason}"]`);
	}

	json()
	{
		let json =
		{
			status : this.status,
			reason : this.reason,
			id     : this.id,
			data   : this.data
		};

		return JSON.stringify(json);
	}

}

module.exports = Response;
