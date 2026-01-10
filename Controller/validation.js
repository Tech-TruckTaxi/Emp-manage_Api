var jwt = require('jsonwebtoken');
var config = require('../config');


async function Validation(token){
    if (!token){
        return({ auth: false, message: 'No token provided.' });
    }else{
        var Data = await jwt.verify(token, config.secret, (err, user) => {
            if (err) {
                return({status: 401, message: "Invalid Token or Token expired!"});
            }
            else{
                const decoded = jwt.verify(token, config.secret);
                return({status: 200, message: "success", data: decoded});
            }
        });
        return(Data);
    }
}
exports.Validation=Validation;

async function ValidateRequestData(obj){
    var validateData = false;
    for (var key in obj) {
        if(obj.hasOwnProperty(key)) {
            var ObjKey_l1 = obj[key];
            if((ObjKey_l1 == "undefined" || ObjKey_l1 == undefined || ObjKey_l1 == null || ObjKey_l1 == "") && ObjKey_l1!=0){
                console.log(ObjKey_l1);
                validateData = false
                return({status: 422,message: "The required parameter "+key+" is missing!"});
                break;
            }
            validateData = true;
            for(let key1 in ObjKey_l1){
                if(ObjKey_l1.hasOwnProperty(key1)) {
                    var ObjKey_l2 = ObjKey_l1[key1];
                    if((ObjKey_l2 == "undefined" || ObjKey_l2 == undefined || ObjKey_l2 == null || ObjKey_l2 == "") && ObjKey_l2!=0){
                        console.log(ObjKey_l2);
                        validateData = false
                        return({status: 422,message: "The required parameter "+key1+" is missing!"});
                        break;
                    }
                    validateData = true;
                    for(let key2 in ObjKey_l2){
                        if(ObjKey_l2.hasOwnProperty(key2)) {
                            var ObjKey_l3 = ObjKey_l2[key2];
                            if((ObjKey_l3 == "undefined" ||  ObjKey_l3 == undefined || ObjKey_l3 == null || ObjKey_l3 == "") && ObjKey_l3!=0){
                                console.log(ObjKey_l3);
                                validateData = false
                                return({status: 422,message: "The required parameter "+key2+" is missing!"});
                                break;
                            }
                            validateData = true;
                        }
                    }
        
                }
            }
            // ObjLoop(val);
        }
    }
    if(validateData){
        return({respCode:2,message:"Success",Text:"Request Data Validated"});
    }
}
exports.ValidateRequestData=ValidateRequestData;
