const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);
const Schema = mongoose.Schema;

const citySchema = new Schema({
    cityId: { type: Number, unique: true },
    name: { type: String, required: true },
    state: { type: String, required: true },
    image: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 } 
}, { timestamps: true });

// Auto-increment cityId
citySchema.plugin(AutoIncrement, { inc_field: 'cityId' });

// ✅ Partial Unique Index on name + state only when not soft-deleted
citySchema.index(
    { name: 1, state: 1 },
    {
      unique: true,
      partialFilterExpression: { isDeleted: false }
    }
  );
  
  module.exports = mongoose.model("City", citySchema);
