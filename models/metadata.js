const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const MetaDataSchema = new Schema({
  tourcategory: {
    type: Array,
    required: true,
  },
});

module.exports = mongoose.model('metadata', MetaDataSchema);
