var fonts = {
    Roboto: {
        normal: 'fonts/Roboto-Regular.ttf',
        bold: 'fonts/Roboto-Medium.ttf',
        italics: 'fonts/Roboto-Italic.ttf',
        bolditalics: 'fonts/Roboto-MediumItalic.ttf'
    }
};
var PdfPrinter = require('pdfmake');
var printer = new PdfPrinter(fonts);
const Tripdetails = require("../models/tripdetails");

var fs = require('fs');
var config = require('../json/statecities.json');
let state_arr = [config];

exports.getMakePdf = async(req, res, next) => {
    let states_arr = ''
    for(var key of state_arr) {
       states_arr = Object.keys(key);
    }
    let regions = [{"code":'NI',"code_name":'North India'},{"code":'NEI',"code_name":'Northeast India'},{"code":'EI',"code_name":'East India'},{"code":'SI',"code_name":'South India'},{"code":'WI',"code_name":'West India'},{"code":'CI',"code_name":'Central India'}];
    res.render('pages/getTripPdf', { states_arr : states_arr,regions_arr:regions});
};

exports.getstateCities =  (req, res, next) => {
    var config = require('../json/statecities.json');
    let state_arr = config;
    let states_arr = '';
    for (const property in state_arr) {
        if(property == req.body.state){
            states_arr = '';
            states_arr = state_arr[req.body.state];
            break;
        }
    }
    res.json({ cities: states_arr });
    };

exports.postMakePdf = (req, res, next) => {
    var makepdf = createPDF(req.body,req.files,res,'create');
};

function createPDF(req,files='',res,type){
    let _ = require("lodash");
    //var file_obj = files;
    let file_obj =[];
    files.forEach(function(val,key) {
        file_obj.push(val.originalname)
    });
    if(req.imgu != undefined && req.imgu !=''){
        file_obj.push(req.imgu);
    }
    
    var flag = '';
    var add_month = add_dept_city = add_triptype = add_tripsize = add_days = add_maxalt = add_trek_dist = add_difficulty =
    add_agelimit = add_regionstate = add_trip_dates = '';
   // return false;
    if(req.month != undefined && req.month != ''){
        flag = '1';
        month = req.month.join(',');
        var add_month = {text:'Best Season (Month):'+month, style:'bb'};
    }
    if(req.deptcity != undefined && req.deptcity != ''){
        flag = '1';
        dept_city = req.deptcity.join(',');
        var add_dept_city = {text:'Departure City:'+dept_city, style:'bb'};
    }
    if(req.trip_type != undefined && req.trip_type != ''){
        flag = '1';
        triptype = req.trip_type.join(',');
        var add_triptype =  {text:'Trip type/Category:'+triptype, style:'bb'};
    }
    if(req.minsize != undefined && req.minsize != ''){
        flag = '1';
        var add_tripsize =  {text:'Batch Size:'+req.minsize+' - '+req.maxsize, style:'bb'};
    }
    if(req.tripdays != undefined && req.tripdays != ''){
        flag = '1';
        var add_days =   {text:'No of Days:'+req.tripdays, style:'bb'};
    }
    if(req.maxalt != undefined && req.maxalt != ''){
        flag = '1';
        var add_maxalt =   {text:'Max Altitude:'+req.maxalt, style:'bb'};
    }
    if(req.trek_dist != undefined && req.dist != ''){
        flag = '1';
        var add_trek_dist =   {text:'Trek distance:'+req.trek_dist, style:'bb'};
    }
    if(req.difficulty != undefined && req.difficulty != ''){
        flag = '1';
        var add_difficulty =  {text:'Difficulty:'+req.difficulty, style:'bb'};
    }
    if(req.age_min != undefined && req.age_min != ''){
        flag = '1';
        var add_agelimit =  {text:'Age Group:'+req.age_min+' - '+req.age_max, style:'bb'};
    }
    if(req.regionstate != undefined && req.regionstate != ''){
        flag = '1'; var regioncode = '';
        if(req.region != undefined && req.region != ''){
            regioncode = " ("+req.region+")";
        }
            var add_regionstate =  {text:'Region:'+req.regionstate+regioncode, style:'bb'};
    }
    if(req.trip_dates != undefined && req.trip_dates != ''){
        flag = '1';
        var add_trip_dates =  {text:'Trip Dates:'+req.trip_dates, style:'bb'};
    }
    if(req.route != undefined && req.route != ''){
        route = req.route;
        var route_stack = {
            stack:[{text:'Route', style: 'header2',margin: [0, 0, 0, 10]},
            {text:route, style:'bb'}],margin: [0, 0, 0, 10]
            }
    }
    if(flag == '1'){
        var tripdetails_stack = {
            stack:[
                {text:'Trip Details:', style: 'header2',margin: [0, 0, 0, 10]},
                        add_trip_dates, add_month,  add_dept_city,  add_triptype, add_tripsize,  add_days, add_maxalt,
                    add_trek_dist, add_difficulty,   add_agelimit,  add_regionstate,
            ],margin: [0, -10, 0, 10]

        };

    }
    
    let addinclusion = [];
    var add_inclusion = '';
    if(req.inclusion != undefined && req.inclusion != ''){
        inclusion =  req.inclusion.split('#');//'\r\n'
        inclusion.forEach(function(include) {
            add_inclusion = {text:include, style:'bb',bold:false}
            addinclusion.push(add_inclusion);
        });
      var inclusion_stack = [{text:'Inclusion:', style: 'header2',margin: [0, 10, 0, 10]}, addinclusion,];
                        
    }
    let addexclusion = [];
    var add_exclusion = '';
    if(req.exclusion != undefined && req.exclusion != ''){
        exclusion =  req.exclusion.split('#');
        exclusion.forEach(function(exclude) {
            add_exclusion = {text:exclude, style:'bb',bold:false}
            addexclusion.push(add_exclusion);
        });
        var exclusion_stack = [{text:'Exclusion:', style: 'header2',margin: [0, 10, 0, 10]},addexclusion,];
    }

    let addtripcost = [];var addtable = '';

    if((req.available_from  != undefined  && req.available_from.length >= 1 ) || (req.available_days.length >= 1 || req.costing.length >= 1)){
        if(req.available_from != undefined){
            available_from =  req.available_from;
           addtripcost.push({text: 'Available From', style: 'tableHeader'}, {text: 'Days', style: 'tableHeader'}, {text: 'Cost', style: 'tableHeader'});
            for (var i = 0; i < available_from.length; i++){
                var cost_dd = '';
                if(available_from[i].trim() != '' || req.available_days[i].trim() != '' || req.costing[i].trim() != ''){
                    cost_dd = '1';
                    addtripcost.push(available_from[i]); addtripcost.push(req.available_days[i]);addtripcost.push(req.costing[i]);
                }
            }
            if(cost_dd == '1'){
                addtripcost = _.chunk(addtripcost, 3); 
                addtable = {
                    style: 'tableExample',
                    table: {
                        widths: [80,80,80],
                        body: addtripcost,
                        headerRows: 1
                    },margin: [0, 0, 0, 10]
                };
            }          
        }
    }

    let packdetails = [];
    var pack_details = '';
    if(req.add_trip_cost != undefined && req.add_trip_cost != ''){
        var add_tripcost =  req.add_trip_cost.split('#');
        
        add_tripcost.forEach(function(details) {
            pack_details = {text:details, style:'bb',bold:false}
            packdetails.push(pack_details);
        });
    }
    var package_stack = [{text: 'Package Cost', style: 'header2',margin: [0, 0, 0, 10]},
        addtable,packdetails,];

    let activities = [];
    var act_attr_arr = '';
    if(req.act_attr != undefined && req.act_attr != ''){
        act_attr =  req.act_attr.split('#');
        act_attr.forEach(function(attr) {
            act_attr_arr = {text:attr, style:'bb',bold:false}
            activities.push(act_attr_arr);
        });
        var activity_stack = [{text:'Activities & Attraction:', style: 'header2',margin: [0, 0, 0, 10]},
        activities ,];
    }

    let short_itinery = [];
    if(req.short_itinery != undefined && req.short_itinery != ''){
        req.short_itinery.forEach(function(short) {
            var addshort = [{text:short, style:'bb',bold:false}];
            short_itinery.push(addshort);
        });
       var short_it_stack = {
                        stack:[{text:'Short Itinery:', style: 'header2',margin: [0, 0, 0, 10]},
                        short_itinery,],margin: [0, 0, 0, 10]
                    };
    
    }

    var details = ''; var daywise = daywise2 = daywiseall = '';let dd_arr2 = [];let dd_arr = [];
    if(req.detailed_itinery != undefined && req.detailed_itinery != ''){
        req.detailed_itinery.forEach(function(detailed,key) {
            details =  detailed.split('#');
            var titles = req.short_itinery[key];
            let objul2 = []; let objul = [];
            if(details != undefined){
                details.forEach(function(detailed2,key2) {
                    objul.push({text:detailed2, style:'bb'});
                });
            }
           var add_pickup = (req.pickup[key]!='') ? {text:'Pickup  Landmark:'+req.pickup[key], style:'bb'} : '';
           var add_dep_time = (req.dep_time[key]!='') ? {text:'Departure Time:'+req.dep_time[key], style:'bb'} : '';
           var add_trek_dist2 = (req.trek_dist2[key]!='') ? {text:'Trek Distance:'+req.trek_dist2[key], style:'bb'} : '';
           var add_road_journey = (req.road_journey[key]!='') ?  {text:'Road Jouney:'+req.road_journey[key], style:'bb'} : '';
           var add_stay2 = (req.stay[key]!='') ? {text:'Stay:'+req.stay[key], style:'bb'} : '';
           var add_meals = (req.meals[key]!='') ? {text:'Meals:'+req.meals[key], style:'bb'} : '';
           var add_drop_point = (req.drop_point[key]!='') ?  {text:'Dropping Point:'+req.drop_point[key], style:'bb'} : '';
           var add_drop_time = (req.drop_time[key]!='') ?  {text:'Dropping Time:'+req.drop_time[key], style:'bb'} : '';
            objul2.push(add_pickup,add_dep_time ,add_trek_dist2    ,add_road_journey ,add_stay2,
                add_meals,add_drop_point,add_drop_time  );
            daywise2 = [objul,
                [objul2],];
            daywise = [{text: titles, style: '',margin: [0, 10, 0, 10]} ,daywise2];
            dd_arr.push(daywise);  
        });
        var detailed_stack = { stack:[ {text: 'Detailed Itinery:', style: 'header2',margin: [0, 0, 0, 2]}, dd_arr ],margin: [0, 0, 0, 10]
        };
    }

    var j = 0;
    let imgarr1 = []; let imgarr2 = [];
    if(file_obj!=undefined && file_obj != ''){
        for (var imgs of file_obj) {
            var imggg = '';
                imggg = {	image: 'images/'+imgs, width: 180, height: 150};
                if(j >= 3){
                    imgarr2.push(imggg);
                }else{
                    imgarr1.push(imggg);
                }
                j = j+1;
                
        }
    var image_stack = [{text: 'Trip Gallery',pageBreak: 'before', style: 'header2',margin: [0, 0, 0, 10]},
    {
        margin: [0,0,0,2], columnGap: 2, 
                    columns: imgarr1,
        },
        {
        margin: [0,0,0,2], columnGap: 2, 
                    columns: imgarr2,
                    
        },];
    }
    
   //return false;
    let docDefinition = {
        watermark: { text: 'déjà-vu', color: 'navy', opacity: 0.1, bold: false, italics: true,fontSize: 200 },
     
          footer: {
            columns: [
              {text:'www.dejavutours.in',margin: [20, 10, 20, 80]},
                {text:'Contact: 8511117891',alignment:'center',margin: [20, 10, 20, 80]},
              { text: 'IG: @dejavutours', alignment: 'right',margin: [20, 10, 20, 80] }
            ]
          },
          defaultStyle: {
                fontSize: 15,
                bold: true,
                color:'navy',
              },
        content: [
                {
                    image: 'images/dejavu_transparent_logo.png',
                    width: 180,
                    alignment: 'center',
                    margin: [0, 0, 0, 40],
                },
                {
                    stack: [
                        req.trip_title,
                    ],margin: [0, 0, 0, 50],
                    fontSize: 30,
                    style: 'header'
                    
                },
                tripdetails_stack,                
                route_stack,
                short_it_stack,
                detailed_stack,
                {
                    stack:[
                        activity_stack,
                        inclusion_stack,
                        exclusion_stack,
                    ],margin: [0, 0, 0, 10]
                },
                {
                    stack:[
                        
                            {text: 'Payment', style: 'header2',pageBreak: 'before',margin: [0, 10, 0, 10]},
                            {
                              columns: [ 
                                    { qr: 'text in QR', foreground: 'blue', background: 'lightblue' ,fit:150},
                                   {text:`UPI: dejavutours@icici Mob: 8511117891 \n
                                   Bank Details:
                                   Account Name: Deja-vu Outdoors Pvt.Ltd.
                                    Account No: 624405503177 
                                    IFSC code: ICIC0006244 
                                    Bank name: ICICI bank,Ahmedabad Main`, style:'bb'},
                                ],margin: [0, 10, 60, 10]
                                            
                                },
        
                        ],margin: [0, 0, 0, 10]
                },
                { 
                    stack:[package_stack],margin: [0, 0, 0, 10]  
                },
                {
                    stack:[
                        
                            {text: 'Booking and Cancellation:',pageBreak: 'before', style: 'header2',margin: [0, 0, 0, 10]},
                            {text: 'Booking Policy', style: '',margin: [0, 0, 0, 10]},
                            {
                                
                                ul: [
                                        {text:'100% refund 28 days prior to trip exclusive of GST', style:'bb'},
                                        {text:'30% advance amount while confirmation.', style:'bb'},
                                        {text:'70% balance amount minimum 14 days prior to trip date.', style:'bb'}
        
                                    ],
                            },
                            {text: 'Cancellation Policy', style: '',margin: [0, 10, 0, 10]},
                            {
                                
                                ul: [
                                        {text:`Booking shall be confirmed once received part/full payments`, style:'bb'},
                                        {text:`30% cancellation charges if cancellation done between 28 to 14 days prior or Full amount can be transfered to any of our upcoming event in next 2 months,
                                        but cannot be transfered to another participant.`, style:'bb'},
                                        {text:`70% cancellation charges if cancellation done between 14 to 7 days prior or 50% amount can be transfered to any of our upcoming event in next 2 months,
                                        but cannot be transfered to another participant.`, style:'bb'},
                                        {text:`Fees are neither refundable or transferable if cancellation done, less than 7 days prior to event date`, style:'bb'}
        
                                    ],
                            },
                            {text: 'Consent and Terms', style: '',margin: [0, 10, 0, 10]},
                            {
                                
                                ul: [
                                        {text:`There is certain level of unpredictability, uncertainty and discomfort associated with any Tours/Trips/Adventure/Outdoor Activity.
                                        Things may not go as planned. Organizers/Leaders/Associated members and Representatives of Deja-vu tours have power to take decision
                                        in favour of each participant.`, style:'bb'},
                                        {text:`Instructions and Rules have been adopted for safe enjoyment of activity and I agree to adhere to those regulation mentioned or instructed during the event`, style:'bb'},
                                        {text:`Smoking or drinking alcohol indulging in drugs or doing anything that leads to intoxication is restricted during any
                                        activities that involve risks. We are not encouraging to do same at anywhere else`, style:'bb'},
                                        {text:`Any inconvenience created for fellow participant, organizers, respective owners of the property or locals in terms
                                        of Intentional delays, property damage, Vehicle Damage, abuse or misbehave may lead to termination of participant
                                    <li>70% balance amount minimum 14 days prior to trip date.`, style:'bb'}
                                    ],
                            },
                            
                        ],margin: [0, 0, 0, 10]
                },
              
                {
                    stack:[image_stack]            
                       
                }
        ],
        styles: {
            
            bb:{
                bold:false
            },
            header: {
                bold: true,
                alignment: 'center',
                margin: [20, 10, 20, 80]
            },
            header2: {
                bold: true,
            },
            superMargin: {
                margin: [20, 0, 40, 0],
            },
            tableHeader:{
                fillColor:'navy',
                color:'white',
                alignment:'center'
            }
        }	
    };
    var filename = 'PdfTrip.pdf';
    if(req.filename != undefined && req.filename != ''){
        filename = req.filename;
    }
    var options = { };
    var pdfDoc = printer.createPdfKitDocument(docDefinition,options);
    var hh = pdfDoc.pipe(fs.createWriteStream('images/'+filename));
    pdfDoc.end();
    hh.on('finish', () => {
        if(type == 'create'){
            var add = addtripdetails(req,files);
            if(add == "saved"){ 
                res.redirect("../images/"+filename);   
                console.log("file generated!  "+filename);
            }
        }else{
            res.redirect("../images/"+filename);   
            console.log("file generated!  "+filename);
        }
    });
}

function addtripdetails(req,files=[]){
       const title = req.trip_title;
       const route = req.route;
       const deptstate = req.state;
       const deptcity = (req.deptcity != undefined && req.deptcity!='') ? req.deptcity.toString() : '';
       const trip_type = (req.trip_type != undefined && req.trip_type!='') ? req.trip_type.toString() : '';
       const tripsize = req.minsize+'-'+req.maxsize; 
       const duration = req.tripdays+'-'+req.tripnight;
       const altitude = req.maxalt;
       const distance = req.trek_dist;
       const difficulty = req.difficulty;
       const age_grp = req.age_min+'-'+req.age_max;
       const region_state = req.regionstate;
       const region_code = req.region;
       const trip_dates = req.trip_dates;
       const month = (req.month != undefined && req.month!='') ? req.month.toString() : '';
       const about = (req.about_trip != undefined && req.about_trip!='') ? req.about_trip.toString() : '';
       const activities = (req.act_attr != undefined && req.act_attr!='') ? req.act_attr.toString() : '';
       const itinerary = (req.detailed_itinery != undefined && req.detailed_itinery!='') ? req.detailed_itinery.toString() : '';
       const short_itinerary = (req.short_itinery != undefined && req.short_itinery!='') ? req.short_itinery.toString() : '';
       const exclusion = (req.exclusion != undefined && req.exclusion!='') ? req.exclusion.toString() : '';
       const inclusion = (req.inclusion != undefined && req.inclusion!='') ? req.inclusion.toString() : '';
       const available_from = (req.available_from != undefined && req.available_from!='') ? req.available_from.toString() : '';
       const available_days = (req.available_days != undefined && req.available_days!='') ? req.available_days.toString() : '';
       const cost = (req.costing != undefined && req.costing!='') ? req.costing.toString() : '';
       const stay = (req.stay != undefined && req.stay!='') ? req.stay.toString() : '';
       const meals = (req.meals != undefined && req.meals!='') ? req.meals.toString() : '';
       const package_details = (req.add_trip_cost != undefined && req.add_trip_cost!='') ? req.add_trip_cost.toString() : '';
       const drop_point = (req.drop_point != undefined && req.drop_point!='') ? req.drop_point.toString() : '';
       const pickup = (req.pickup != undefined && req.pickup!='') ? req.pickup.toString() : '';
       const dept_time = (req.dep_time != undefined && req.dep_time!='') ? req.dep_time.toString() : '';
       const trek_dist = (req.trek_dist2 != undefined && req.trek_dist2!='') ? req.trek_dist2.toString() : '';
       const road_jrn = (req.road_journey != undefined && req.road_journey!='') ? req.road_journey.toString() : '';
       const drop_time = (req.drop_time != undefined && req.drop_time!='') ? req.drop_time.toString() : ''; 
       const filename = req.filename; 
       let imgurl = [];
       files.forEach(function(val,key) {
            imgurl.push(val.originalname)
        });
       const imageurl = (files != undefined && files!='') ? imgurl.toString() : '';
       const trip = new Tripdetails({
           title : title,
           route : route,
           deptstate : deptstate,
           deptcity : deptcity,
           trip_type : trip_type,
           tripsize : tripsize,
           duration : duration,
           altitude : altitude,
           distance : distance,
           difficulty : difficulty,
           age_grp : age_grp,
           region_state : region_state,
           region_code : region_code,
           trip_dates : trip_dates,
           month : month,
           about : about,
           activities : activities,
           itinerary : itinerary,
           short_itinerary : short_itinerary,
           exclusion : exclusion,
           inclusion : inclusion,
            available_from : available_from,
           available_days : available_days,
           cost : cost,
           stay : stay,
           meals : meals,
           package_details : package_details,
           drop_point : drop_point,
           pickup : pickup,
           dept_time : dept_time,
           trek_dist : trek_dist,
           road_jrn : road_jrn,
           drop_time : drop_time, 
           filename : filename, 
           imageurl : imageurl,
       });
       trip.save(); return "saved";
       //res.redirect("/admin/makepdf");

}; 


exports.getViewPdfdetails = (req, res, next) => {

    Tripdetails.find({})
    .then((result) => {
      res.render("pages/viewpdfdetails", {
        trippdfs : result
      })
    })
    .catch((err) => {
      console.log(err);
    }) 
};

exports.editPdfDetails = async(req, res, next) => {
    try{
        const tripid = req.body.tripid;
        const trip = await Tripdetails.findById({'_id' : tripid});
        let states_arr = ''
        for(var key of state_arr) {
        states_arr = Object.keys(key);
        }
        let regions = [{"code":'NI',"code_name":'North India'},{"code":'NEI',"code_name":'Northeast India'},{"code":'EI',"code_name":'East India'},{"code":'SI',"code_name":'South India'},{"code":'WI',"code_name":'West India'},{"code":'CI',"code_name":'Central India'}];
    
        res.render("pages/edittripdetails" , { states_arr : states_arr,regions_arr:regions,tripdetails: trip });
    } 
    catch(err){
      console.log(err);
    }
  };

  exports.updatePdfDetails = async(req, res, next) => {
    try{
            const title = req.body.trip_title;
            const route = req.body.route;
            const deptstate = req.body.state;
            const deptcity = (req.body.deptcity != undefined && req.body.deptcity!='') ? req.body.deptcity.toString() : '';
            const trip_type = (req.body.trip_type != undefined && req.body.trip_type!='') ? req.body.trip_type.toString() : '';
            const tripsize = req.body.minsize+'-'+req.body.maxsize; 
            const duration = req.body.tripdays+'-'+req.body.tripnight;
            const altitude = req.body.maxalt;
            const distance = req.body.trek_dist;
            const difficulty = req.body.difficulty;
            const age_grp = req.body.age_min+'-'+req.body.age_max;
            const region_state = req.body.regionstate;
            const region_code = req.body.region;
            const trip_dates = req.body.trip_dates;
            const month = (req.body.month != undefined && req.body.month!='') ? req.body.month.toString() : '';
            const about = (req.body.about_trip != undefined && req.body.about_trip!='') ? req.body.about_trip.toString() : '';
            const activities = (req.body.act_attr != undefined && req.body.act_attr!='') ? req.body.act_attr.toString() : '';
            const itinerary = (req.body.detailed_itinery != undefined && req.body.detailed_itinery!='') ? req.body.detailed_itinery.toString() : '';
            const short_itinerary = (req.body.short_itinery != undefined && req.body.short_itinery!='') ? req.body.short_itinery.toString() : '';
            const exclusion = (req.body.exclusion != undefined && req.body.exclusion!='') ? req.body.exclusion.toString() : '';
            const inclusion = (req.body.inclusion != undefined && req.body.inclusion!='') ? req.body.inclusion.toString() : '';
            const available_from = (req.body.available_from != undefined && req.body.available_from!='') ? req.body.available_from.toString() : '';
            const available_days = (req.body.available_days != undefined && req.body.available_days!='') ? req.body.available_days.toString() : '';
            const cost = (req.body.costing != undefined && req.body.costing!='') ? req.body.costing.toString() : '';
            const stay = (req.body.stay != undefined && req.body.stay!='') ? req.body.stay.toString() : '';
            const meals = (req.body.meals != undefined && req.body.meals!='') ? req.body.meals.toString() : '';
            const package_details = (req.body.add_trip_cost != undefined && req.body.add_trip_cost!='') ? req.body.add_trip_cost.toString() : '';
            const drop_point = (req.body.drop_point != undefined && req.body.drop_point!='') ? req.body.drop_point.toString() : '';
            const pickup = (req.body.pickup != undefined && req.body.pickup!='') ? req.body.pickup.toString() : '';
            const dept_time = (req.body.dep_time != undefined && req.body.dep_time!='') ? req.body.dep_time.toString() : '';
            const trek_dist = (req.body.trek_dist2 != undefined && req.body.trek_dist2!='') ? req.body.trek_dist2.toString() : '';
            const road_jrn = (req.body.road_journey != undefined && req.body.road_journey!='') ? req.body.road_journey.toString() : '';
            const drop_time = (req.body.drop_time != undefined && req.body.drop_time!='') ? req.body.drop_time.toString() : ''; 
            const filename = req.body.filename; 
            const imgurl =[];
            req.files.forEach(function(val,key) {
                imgurl.push(val.originalname)
            });
            if(req.body.imgu != undefined && req.body.imgu !=''){
                imgurl.push(req.body.imgu);
            }
            const imageurl = ((req.files != undefined && req.files!='') || (req.body.imgu != undefined && req.body.imgu !='') ) ? imgurl.toString(): '';
            const tripid = req.body._id;
        Tripdetails.findById({_id: tripid })
        .then(trip => {
            trip.title = title;
            trip.route = route;
            trip.deptstate = deptstate;
            trip.deptcity = deptcity;
            trip.trip_type = trip_type;
            trip.tripsize = tripsize;
            trip.duration = duration;
            trip.altitude = altitude;
            trip.distance = distance;
            trip.difficulty = difficulty;
            trip.age_grp = age_grp;
            trip.region_state = region_state;
            trip.region_code = region_code;
            trip.trip_dates = trip_dates;
            trip.month = month;
            trip.about = about;
            trip.activities = activities;
            trip.itinerary = itinerary;
            trip.short_itinerary = short_itinerary;
            trip.exclusion = exclusion;
            trip.inclusion = inclusion;
            trip.available_from = available_from;
            trip.available_days = available_days;
            trip.cost = cost;
            trip.stay = stay;
            trip.meals = meals;
            trip.package_details = package_details;
            trip.drop_point = drop_point;
            trip.pickup = pickup;
            trip.dept_time = dept_time;
            trip.trek_dist = trek_dist;
            trip.road_jrn = road_jrn;
            trip.drop_time = drop_time; 
            trip.filename = filename; 
            trip.imageurl = imageurl;
         return trip.save().then(result => {
            var makepdf = createPDF(req.body,req.files,res,'edit');
            //res.redirect("/admin/getViewPdfdetails");   
         });
        })
        .catch(err => {
          console.log(err);
        });;
    } 
    catch(err){
      console.log(err);
    }
  };

  exports.deletePdftrip = (req, res, next) => {
    const tripid = req.body.tripid;
    Tripdetails.findOneAndDelete({ _id : tripid })
    .then((result) => {
      res.redirect("/admin/getViewPdfdetails");
    })
    .catch((err) => {
      console.log(err);
    });
};
