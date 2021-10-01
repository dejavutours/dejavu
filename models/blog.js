const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const blogSchema = new Schema({

    tripdate: {
        type: String,
        required: true
      },

    headerline: {
      type: String,
        required: true
    },

    title: {
        type: String,
        required: true
      },

    tag: {
        type: String,
        required: true
      },

    blogger: {
        type: String,
        required: true
    },

    content: {
        type: String,
        required: true
      },

    instagram: {
        type: String,
        required: true
      },

    facebook: {
        type: String,
        required: true
      },

    imageurl: {
        type: String,
        required: true
      },

    likes: {
      type: Number,
    },

    comments: [{
      message:{
        type: String,
        required: true
      },
      name:{
        type: String,
        required: true
      },
      email:{
        type: String,
        required: true
      },
      postdate:{
        type: Date,
        default: Date.now
      } 
    }],
    
}, { timestamps: true });

module.exports = mongoose.model('Blog', blogSchema);