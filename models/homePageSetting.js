const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const homePageSettingSchema = new Schema({
  banners: [{
    imageUrl: String,
    caption: String,
    displayOrder: Number,
    isActive: Boolean,
  }],
  trendingDestinations: [{
    tourId: { type: Schema.Types.ObjectId, ref: "NewTours" },
    displayOrder: Number,
  }],
  stateOrder: [{
    stateId: { type: Schema.Types.ObjectId, ref: "State" },
    displayOrder: Number,
  }],
  categoryOrder: [{
    categoryId: { type: Schema.Types.ObjectId, ref: "Category" },
    displayOrder: Number,
  }],
});

module.exports = mongoose.model("HomePageSetting", homePageSettingSchema);