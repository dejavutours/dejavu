const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);
const Schema = mongoose.Schema;

const citySchema = new Schema({
    cityId: { type: Number, unique: true },
    name: { type: String, required: true },
    state: { type: String, required: true },
    countryCode: { type: String, default: 'IN' }, 
    image: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 }
}, { timestamps: true });

// Auto-increment cityId
citySchema.plugin(AutoIncrement, { inc_field: 'cityId' });

// ✅ Partial Unique Index on name + state + countryCode only when not soft-deleted
// Allows same city name in different countries (e.g., Dubai-UAE vs Mumbai-IN)
citySchema.index(
    { name: 1, state: 1, countryCode: 1 },
    {
      unique: true,
      partialFilterExpression: { isDeleted: false }
    }
  );
  
  module.exports = mongoose.model("City", citySchema);
