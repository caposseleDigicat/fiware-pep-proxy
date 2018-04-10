var config = require('../config.js'),
    proxy = require('./HTTPClient.js'),
    log = require('./logger').logger.getLogger("RBAC-Client");

var subscriptionService = require('../db/schemas/subscriptionService'),
    config = require('../config'),
    uuid = require('node-uuid');

var RBAC = (function() {

    var PUBLIC = "public";
    var ENTITY = "entity";
    var SUBSCRIPTION = "subscription";
    var NOT_ALLOWED = "not allowed";

    var check_permissions = function(auth_token, user_info, req, callback, callbackError) {

        var roles = get_roles(user_info);
        var app_id = user_info.app_id;
        
        var action = req.method;
        var resource = req.url.split('?')[0].substring(1, req.url.split('?')[0].length);
        //log.info('Resource: ', resource, 'Action: ', action);
        var fiware_service = req.headers['fiware-service'];
        //log.info('fiware_service: ', fiware_service);
        switch(get_path(resource)){
            case PUBLIC: {
                callback();
                return;
            }
            case ENTITY: {
                //ONLY GET allowed
                if(action === 'GET'){
                    var parsed_resource = resource.split('/')[2];
                    if (parsed_resource === undefined){
                        callbackError(404, 'Path not found');
                        return;
                    }
                    
                    if (fiware_service !== undefined){ 
                        resource = fiware_service + ':' + parsed_resource;
                    }
                    log.info('resource updated: ', resource);
                    //check role against resource 
                    for (roleIdx in roles){
                        //log.info('role:', roles[roleIdx])
                        if (roles[roleIdx] === resource) {
                            callback();
                            return;
                        }
                    }
                }
                break;
            }
            case SUBSCRIPTION: {
                if(action === 'GET' || action === 'DELETE'){
                    if ((resource === 'v2/subscriptions') || (resource === 'v2/subscriptions/')){
                        callbackError(401, 'User token not authorized');
                        return;
                    }
                    else{
                        var subId = get_subscriptionId(resource);
                        if (subId){
                            log.info("Subscription ID:", subId);
                            subscriptionService.findOne({ subscriptionId: subId, user: user_info.id }, function(err, userSubscribed) {
                                if (err) {
                                    log.info("MongoDB connection ERROR");
                                    callbackError(500, 'Internal communication error');
                                    return;
                                }
                                if (userSubscribed){
                                    //Subscription for user found, operation ALLOWED
                                    //log.info("User subscribed", userSubscribed);
                                    callback();
                                    return;
                                }else{
                                    //Subscription for user not found, operation NOT ALLOWED
                                    //log.info("User not subscribed", userSubscribed);
                                    callbackError(401, 'User token not authorized');
                                    return;
                                }
                                
                            });
                        }
                    }
                    return;                       
                }
      
                else if (action === 'POST' || action === 'PATCH'){
                    log.info('Body: ',req.body);
                    if(req.body !== undefined)
                        if(req.body.length === 0){
                            callback();
                            return;
                        }
                    try{
                        var subs = JSON.parse(req.body);
                    }catch(e){
                        callbackError(411, 'JSON body not valid');
                        return;
                    }
                    var subjects = subs.subject.entities;
                    
                    if (subjects !== undefined){
                        for (entity in subjects){
                            if (fiware_service !== undefined){ 
                                subjects[entity].id = fiware_service + ':' + subjects[entity].id;
                            }
                            var decision = 'deny';
                            //log.info('Decision:', decision[entity]);
                            //log.info('Entity:', subjects[entity].id);
                            for (roleIdx in roles){
                                //log.info('role:', roles[roleIdx])
                                if (roles[roleIdx] === subjects[entity].id){
                                    decision = 'permit';
                                    //log.info('Decision:', decision[entity]);
                                }
                            }
                            if (decision === 'deny'){
                                callbackError(401, 'User token not authorized');
                                return;
                            }
                        }
                        callback();
                        return;
                    }
                }
                callbackError(401, 'User token not authorized');
                return;
            }
            case NOT_ALLOWED: {
                callbackError(401, 'User token not authorized');
                return;
            }
        }
        
        //callbackError(401, 'User token not authorized');        

    };

    var get_path = function(resource) {
        if (resource === 'v2' || resource === 'v2/' || resource.indexOf('v2/types') !== -1)
            return PUBLIC;
        else if (resource.indexOf('v2/subscriptions') !== -1)
            return SUBSCRIPTION;
        else if (resource.indexOf("v2/entities/") !== -1)
            return ENTITY;
        return NOT_ALLOWED;
    };

    var get_subscriptionId = function(resource) {
        if (resource.indexOf('v2/subscriptions/') !== -1){
            return resource.split('/')[2];
        }
        return undefined;
    };

    var get_roles = function (user_info) {
        var roles = [];
        for (var orgIdx in user_info.organizations) {
            var org = user_info.organizations[orgIdx];
            for (var roleIdx in org.roles) {
                var role = org.roles[roleIdx];
                if (roles.indexOf(role.id) === -1) roles.push(role.name);
            }
        }

        for (roleIdx in user_info.roles) {
            role = user_info.roles[roleIdx];
            if (roles.indexOf(role.id) === -1) roles.push(role.name);
        }

        return roles;
    };

    return {
        check_permissions: check_permissions
    }

})();
exports.RBAC = RBAC;
