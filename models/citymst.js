// const mongoose = require('mongoose');
// const Schema = mongoose.Schema;
// const citymst = new Schema({
//     name: { type: String, required: true },
//     state: { type: String, required: true },
//     image: { type: String, required: true },
//     isActive: { type: Boolean, default: true },
//     isDeleted: { type: Boolean, default: false }
// }, { timestamps: true });

// module.exports = mongoose.model("City", citymst);

const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);
const Schema = mongoose.Schema;

const citySchema = new Schema({
    cityId: { type: Number, unique: true },
    name: { type: String, required: true },
    state: { type: String, required: true },
    image: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

// Auto-increment cityId
citySchema.plugin(AutoIncrement, { inc_field: 'cityId' });

citySchema.index({ name: 1, state: 1 }, { unique: true });

module.exports = mongoose.model("City", citySchema);
