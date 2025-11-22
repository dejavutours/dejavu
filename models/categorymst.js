const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);
const Schema = mongoose.Schema;

const categorySchema = new Schema(
  {
    categoryId: { type: Number, unique: true }, // Auto-incremented field
    name: { type: String, required: true, trim: true }, // Category display name
    image: { type: String, required: true }, // Path or URL to category image
    isActive: { type: Boolean, default: true },
    isShowOnHomePage: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 } // Added for homepage ordering
  },
  { timestamps: true }
);

// Auto-increment plugin
categorySchema.plugin(AutoIncrement, { inc_field: 'categoryId' });

// Create a compound unique index on name to avoid duplicates
categorySchema.index(
  {  name: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false }
  }
);

module.exports = mongoose.model("Category", categorySchema);