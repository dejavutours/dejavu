const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const siteSettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: 'global' },
    trendingLimit: { type: Number, default: 12, min: 1, max: 100 }
  },
  { timestamps: true }
);

module.exports = mongoose.models.SiteSettings || mongoose.model('SiteSettings', siteSettingsSchema);
