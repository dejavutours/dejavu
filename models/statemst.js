const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);
const Schema = mongoose.Schema;

const stateSchema = new Schema(
  {
    stateId: { type: Number, unique: true },
    name: { type: String, required: true, trim: true },
    image: { type: String, required: true },
    countryCode: { type: String, required: true }, // ✅ Added countryCode field
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Auto-increment plugin
stateSchema.plugin(AutoIncrement, { inc_field: 'stateId' });

// Compound unique index on countryCode + name, only for non-deleted records
stateSchema.index(
  { countryCode: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false }
  }
);

module.exports = mongoose.model("Statemst", stateSchema);
