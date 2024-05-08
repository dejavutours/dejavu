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
var fs = require('fs');

exports.getMakePdf = async(req, res, next) => {
    var config = require('../json/statecities.json');
    let state_arr = [config];
    let states_arr = [];
    for(var key of state_arr) {
       states_arr = Object.keys(key);
    }
    let regions = [{"code":'NI',"code_name":'North India'},{"code":'NEI',"code_name":'Northeast India'},{"code":'EI',"code_name":'East India'},{"code":'SI',"code_name":'South India'},{"code":'WI',"code_name":'West India'},{"code":'CI',"code_name":'Central India'}];

    res.render('pages/getTripPdf', { states_arr : states_arr,regions_arr:regions });
};

exports.getstateCities =  (req, res, next) => {
    var config = require('../json/statecities.json');
    let state_arr = config;
    let states_arr = [];
    for (const property in state_arr) {
        if(property == req.body.state){
            states_arr = '';
            states_arr = state_arr[req.body.state];
            break;
        }
    }
    res.json({ cities: states_arr });
};

exports.postMakePdf = async(req, res, next) => {
    //res.send(req.body);return false;
    let _ = require("lodash");
    var file_obj = req.files;
    var flag = ''; var add_month = '';
    var add_dept_city = ''; var add_triptype = ''; var add_tripsize = ''; 
    var add_days = ''; var add_maxalt = ''; var add_trek_dist = ''; var add_difficulty = ''; var add_agelimit = '';
    var add_regionstate = ''; var add_trip_dates = '';
    if(req.body.month != undefined && req.body.month != ''){
        flag = '1';
        month = req.body.month.join(',');
        var add_month = {text:'Best Season (Month):'+month, style:'bb'};
    }
    if(req.body.deptcity != undefined && req.body.deptcity != ''){
        flag = '1';
        dept_city = req.body.deptcity.join(',');
        var add_dept_city = {text:'Departure City:'+dept_city, style:'bb'};
    }
    if(req.body.trip_type != undefined && req.body.trip_type != ''){
        flag = '1';
        triptype = req.body.trip_type.join(',');
        var add_triptype =  {text:'Trip type/Category:'+triptype, style:'bb'};
    }
    if(req.body.minsize != undefined && req.body.minsize != ''){
        flag = '1';
        var add_tripsize =  {text:'Batch Size:'+req.body.minsize+' - '+req.body.maxsize, style:'bb'};
    }
    if(req.body.tripdays != undefined && req.body.tripdays != ''){
        flag = '1';
        var add_days =   {text:'No of Days:'+req.body.tripdays, style:'bb'};
    }
    if(req.body.maxalt != undefined && req.body.maxalt != ''){
        flag = '1';
        var add_maxalt =   {text:'Max Altitude:'+req.body.maxalt, style:'bb'};
    }
    if(req.body.trek_dist != undefined && req.body.trek_dist != ''){
        flag = '1';
        var add_trek_dist =   {text:'Trek distance:'+req.body.trek_dist, style:'bb'};
    }
    if(req.body.difficulty != undefined && req.body.difficulty != ''){
        flag = '1';
        var add_difficulty =  {text:'Difficulty:'+req.body.difficulty, style:'bb'};
    }
    if(req.body.age_min != undefined && req.body.age_min != ''){
        flag = '1';
        var add_agelimit =  {text:'Age Group:'+req.body.age_min+' - '+req.body.age_max, style:'bb'};
    }
    if(req.body.regionstate != undefined && req.body.regionstate != ''){
        flag = '1';
        var add_regionstate =  {text:'Region:'+req.body.regionstate, style:'bb'};
    }
    if(req.body.trip_dates != undefined && req.body.trip_dates != ''){
        flag = '1';
        var add_trip_dates =  {text:'Trip Dates:'+req.body.trip_dates, style:'bb'};
    }
    if(req.body.route != undefined && req.body.route != ''){
        route = req.body.route;
        var route_stack = {
            stack:[{text:'Route', style: 'header2',margin: [0, 0, 0, 10]},
            {text:route, style:'bb'}],margin: [0, 0, 0, 10]
            };
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
    if(req.body.inclusion != undefined && req.body.inclusion != ''){
        inclusion =  req.body.inclusion.split('#');
        inclusion.forEach(function(include) {
            add_inclusion = {text:include, style:'bb',bold:false};
            addinclusion.push(add_inclusion);
        });
      var inclusion_stack = [{text:'Inclusion:', style: 'header2',margin: [0, 10, 0, 10]},{  ul: addinclusion  },];
                        
    }
    
    let addexclusion = [];
    var add_exclusion = '';
    if(req.body.exclusion != undefined && req.body.exclusion != ''){
        exclusion =  req.body.exclusion.split('#');
        exclusion.forEach(function(exclude) {
            add_exclusion = {text:exclude, style:'bb',bold:false};
            addexclusion.push(add_exclusion);
        });
        var exclusion_stack = [{text:'Exclusion:', style: 'header2',margin: [0, 10, 0, 10]}, {  ul: addexclusion   },];
    }

    let addtripcost = [];
    if((req.body.available_from  != undefined  && req.body.available_from.length >= 1 ) || (req.body.available_days.length >= 1 || req.body.costing.length >= 1)){
        if(req.body.available_from != undefined){
            available_from =  req.body.available_from;
           addtripcost.push({text: 'Available From', style: 'tableHeader'}, {text: 'Days', style: 'tableHeader'}, {text: 'Cost', style: 'tableHeader'});
            for (var i = 0; i < available_from.length; i++){
                addtripcost.push(available_from[i]); addtripcost.push(req.body.available_days[i]);addtripcost.push(req.body.costing[i]);
            }
            
        }
    }

    let packdetails = [];
    var pack_details = '';
    if(req.body.add_trip_cost != undefined && req.body.add_trip_cost != ''){
      var  add_trip_cost =  req.body.add_trip_cost.split('#');
        add_trip_cost.forEach(function(details) {
            pack_details = {text:details, style:'bb',bold:false};
            packdetails.push(pack_details);
        });
        var package_stack = [{text: 'Package Cost', style: 'header2',margin: [0, 0, 0, 10]},
                    { style: 'tableExample',  table: {
                            widths: [80,80,80],
                            body: addtripcost,
                            headerRows: 1
                        },margin: [0, 0, 0, 10]
                    },  { ul: packdetails, },];
    }

    let activities = [];
    var act_attr_arr = '';
    if(req.body.act_attr != undefined && req.body.act_attr != ''){
       var act_attr =  req.body.act_attr.split('#');
        act_attr.forEach(function(attr) {
            act_attr_arr = {text:attr, style:'bb',bold:false};
            activities.push(act_attr_arr);
        });
        var activity_stack = [{text:'Activities & Attraction:', style: 'header2',margin: [0, 0, 0, 10]},
        {  ul: activities,  },];
    }

    let short_itinery = [];
    if(req.body.short_itinery != undefined && req.body.short_itinery != ''){
        req.body.short_itinery.forEach(function(short) {
            var addshort = [{text:short, style:'bb',bold:false}];
            short_itinery.push(addshort);
        });
       var short_it_stack = {
                        stack:[{text:'Short Itinery:', style: 'header2',margin: [0, 0, 0, 10]},
                        short_itinery,],margin: [0, 0, 0, 10]
                    };
    
    }

    var details = ''; var daywise = ''; var daywise2 = ''; var daywiseall = ''; let dd_arr2 = []; let dd_arr = [];
    if(req.body.detailed_itinery != undefined && req.body.detailed_itinery != ''){
        req.body.detailed_itinery.forEach(function(detailed,key) {
            details =  detailed.split('#');
            var titles = req.body.short_itinery[key];
            let objul2 = []; let objul = [];
            if(details != undefined){
                details.forEach(function(detailed2,key2) {
                    objul.push({text:detailed2, style:'bb'});
                });
            }
           var add_pickup = (req.body.pickup[key]!='') ? {text:'Pickup  Landmark:'+req.body.pickup[key], style:'bb'} : '';
           var add_dep_time = (req.body.dep_time[key]!='') ? {text:'Departure Time:'+req.body.dep_time[key], style:'bb'} : '';
           var add_trek_dist2 = (req.body.trek_dist2[key]!='') ? {text:'Trek Distance:'+req.body.trek_dist2[key], style:'bb'} : '';
           var add_road_journey = (req.body.road_journey[key]!='') ?  {text:'Road Jouney:'+req.body.road_journey[key], style:'bb'} : '';
           var add_stay2 = (req.body.stay[key]!='') ? {text:'Stay:'+req.body.stay[key], style:'bb'} : '';
           var add_meals = (req.body.meals[key]!='') ? {text:'Meals:'+req.body.meals[key], style:'bb'} : '';
           var add_drop_point = (req.body.drop_point[key]!='') ?  {text:'Dropping Point:'+req.body.drop_point[key], style:'bb'} : '';
           var add_drop_time = (req.body.drop_time[key]!='') ?  {text:'Dropping Time:'+req.body.drop_time[key], style:'bb'} : '';
            objul2.push(add_pickup,add_dep_time ,add_trek_dist2    ,add_road_journey ,add_stay2,
                add_meals,add_drop_point,add_drop_time  );
            daywise2 = [{ul: [
                objul,
                [objul2],
            ],}];
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
                imggg = {image: 'images/'+imgs.originalname, width: 180, height: 150};
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
    
    addtripcost = _.chunk(addtripcost, 3);

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
                        req.body.trip_title,
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
                            {text: 'Payment', style: 'header2',margin: [0, 10, 0, 10]},
                            {
                              columns: [ 
                                    { qr: 'text in QR', foreground: 'blue', background: 'lightblue' ,fit:150},
                                   {text:`UPI: dejavutours@icici Mob: 85 1111 7891 \n
                                   Bank Details:
                                   Account Name: Deja-vu Outdoors Pvt.Ltd.
                                    Account No: 624405503177 
                                    IFSC code: ICIC0006244 
                                    Bank name: ICICI bank,Ahmedabad Main`, style:'bb'},
                                ],margin: [0, 10, 0, 10]
                                            
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
    if(req.body.filename != undefined && req.body.filename != ''){
        filename = req.body.filename;
    }
    var options = {};
    //res.send(docDefinition);return false;
   // res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', 'inline; filename="'+ filename +'"');
    var pdfDoc = printer.createPdfKitDocument(docDefinition,options);
    //pdfDoc.pipe(fs.createWriteStream(filename));
    pdfDoc.pipe(fs.createWriteStream('../images/'+filename));
    pdfDoc.end();
   // console.log("file generated!  "+filename);
    //res.redirect("/admin/makepdf");   
    res.redirect("../images/"+filename);   
};
