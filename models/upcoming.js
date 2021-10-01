const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const UpcomingTripSchema = new Schema({


    tripdate: {
        type: String,
        required: true
      },

    triprefid: {
        type: Schema.Types.ObjectId,
        ref: 'Tours',
        required: true
      }

      
});

module.exports = mongoose.model('upcomingtrip', UpcomingTripSchema);