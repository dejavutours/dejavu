const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);
const Schema = mongoose.Schema;

const stateSchema = new Schema(
  {
    stateId: { type: Number, unique: true }, // Auto-incremented field
    name: { type: String, required: true, trim: true }, // State display name
    image: { type: String, required: true }, // Path or URL to state image
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 } // Added for homepage ordering
  },
  { timestamps: true }
);

// Auto-increment plugin
stateSchema.plugin(AutoIncrement, { inc_field: 'stateId' });

// Create a compound unique index on name to avoid duplicates
stateSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model("State", stateSchema);