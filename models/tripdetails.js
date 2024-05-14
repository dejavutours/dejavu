const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const tripdetailsSchema = new Schema({

        title: {
            type: String,
            required: true
        },

        route: {
            type: String,
            required: false
        },  

        deptstate: {
            type: String,
            required: false
        },

        deptcity: {
            type: String,
            required: false
        },


        trip_type: {
            type: String,
            required: false
        },

        tripsize :{
            type: String,
            required: false
        },

        duration: {
            type: String,
            required: false
        },

        altitude: {
            type: String,
            required: false
        },

        distance: {
            type: String,
            required: false
        },
        difficulty :{
            type: String,
            required: false
        },
        age_grp :{
            type: String,
            required: false
        },
        region_state :{
            type: String,
            required: false
        },

        region_code :{
            type: String,
            required: false
        },

        trip_dates :{
            type: String,
            required: false
        },

        month: {
            type: String,
            required: false
        },

        about: {
            type: String,
            required: false
        },
        itinerary: {
            type: String,
            required: false
        },
        short_itinerary: {
            type: String,
            required: false
        }, 

        inclusion: {
            type: String,
            required: false
        },
        exclusion: {
            type: String,
            required: false
        }, 
        available_from: {
            type: String,
            required: false
        },
        available_days: {
            type: String,
            required: false
        },
        cost: {
            type: String,
            required: false
        },   
        package_details: {
            type: String,
            required: false
        },
        stay: {
            type: String,
            required: false
        }, 
        meals: {
            type: String,
            required: false
        },
        drop_point: {
            type: String,
            required: false
        }, 
        pickup: {
            type: String,
            required: false
        },
        dept_time: {
            type: String,
            required: false
        },
        trek_dist: {
            type: String,
            required: false
        },
        road_jrn: {
            type: String,
            required: false
        },
        drop_time: {
            type: String,
            required: false
        }, 
        activities :{
            type: String,
            required: false
        },
        imageurl: {
            type: String,
            required: false
        },
        filename: {
            type: String,
            required: false
        }

}, { timestamps: true });

module.exports = mongoose.model('Tripdetails', tripdetailsSchema);