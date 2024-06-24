const mongoose = require('mongoose')

const paymentDetailsSchema = new mongoose.Schema({
	orderId: {
		type: String,
		required: true
	},
	receiptId: {
		type: String
	},
	paymentId: {
		type: String,
	},
	signature: {
		type: String,
	},
	amount: {
		type: Number
	},
	currency: {
		type: String
	},
	createdAt: {
		type: Date
	},
	status: {
		type: String
	},
	name: {
		type: String
	},
	email: {
		type: String
	},
	travellers: {
		type: String
	},
	cost: {
		type: Number
	},
	dob: {
		type: String
	},
	contact: {
		type: Number
	},
	destination: {
		type: String
	},
	tripdate: {
		type: Date
	},
})

module.exports = mongoose.model('PaymentDetail', paymentDetailsSchema)