const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);
const Schema = mongoose.Schema;

const bannerSchema = new Schema(
  {
    bannerId: { type: Number, unique: true }, // Auto-incremented field
    caption: { type: String, required: true, trim: true }, // banner caption 
    image: { type: String, required: true }, // Path or URL to banner image
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 } // Added for homepage ordering
  },
  { timestamps: true }
);

// Auto-increment plugin
bannerSchema.plugin(AutoIncrement, { inc_field: 'bannerId' });


module.exports = mongoose.model("bannerImg", bannerSchema);