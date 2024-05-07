var PdfPrinter = require('pdfmake');
var fonts = {
    Roboto: {
        normal: 'fonts/Roboto-Regular.ttf',
        bold: 'fonts/Roboto-Medium.ttf',
        italics: 'fonts/Roboto-Italic.ttf',
        bolditalics: 'fonts/Roboto-MediumItalic.ttf'
    }
};
var printer = new PdfPrinter(fonts);
var fs = require('fs');

exports.maketripPdf = (req, res, next) => {
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
