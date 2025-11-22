// models/DisplayOrder.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const displayOrderSchema = new Schema({
  type: { 
    type: String, 
    required: true,
    enum: ['category_trips', 'city_trips', 'state_trips', 'departure_city_trips']
  },
  parentId: { 
    type: Schema.Types.ObjectId, 
    required: true 
  },
  tripIds: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'NewTours' 
  }]
}, { timestamps: true });

// Compound index for fast lookup
displayOrderSchema.index({ type: 1, parentId: 1 }, { unique: true });

module.exports = mongoose.model('DisplayOrder', displayOrderSchema);