const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const GmailUserSchema = new Schema({


    id: {
        type: String,
        required: true
      },

    name: {
        type: String,
        required: true
      },
    
    email:{
      type: String,
      required: true
    },

    paymentids:{
      type: Array,
      required: true
    }

      
});

module.exports = mongoose.model('gmailuser', GmailUserSchema);