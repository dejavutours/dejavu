const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);
const Schema = mongoose.Schema;

const internationalCategorySchema = new Schema(
  {
    internationalCategoryId: { type: Number, unique: true }, // Auto-incremented ID
    name: { type: String, required: true, trim: true }, // Display name
    image: { type: String, required: true }, // Path to image
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Auto-increment plugin
internationalCategorySchema.plugin(AutoIncrement, { inc_field: 'internationalCategoryId' });

// Unique name constraint (case-sensitive by default)
internationalCategorySchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model("InternationalCategory", internationalCategorySchema);
