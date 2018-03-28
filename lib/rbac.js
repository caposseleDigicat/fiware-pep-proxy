var config = require('../config.js'),
    proxy = require('./HTTPClient.js'),
    log = require('./logger').logger.getLogger("RBAC-Client");

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
                    //log.info('resource updated: ', resource);
                    //check role against resource 
                    for (roleIdx in roles){
                        //log.info('role:', roles[roleIdx])
                        if (roles[roleIdx] === resource) {
                            callback();
                            return;
                        }
                    }
                }
            }
            case SUBSCRIPTION: {
                if(action === 'GET'){
                    callbackError(401, 'User token not authorized');
                    return;
                }
                else if (action === 'PATCH' || action === 'DELETE'){
                    //UNSAFE
                    callback();
                    return;
                }
                else if (action === 'POST'){
                    var subs = JSON.parse(req.body);
                    var subjects = subs.subject.entities;
                    var decision = [];
                    
                    for (entity in subjects){
                        if (fiware_service !== undefined){ 
                            subjects[entity].id = fiware_service + ':' + subjects[entity].id;
                        }
                        decision = 'deny';
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
                callbackError(401, 'User token not authorized');
                return;
            }
            case NOT_ALLOWED: {
                callbackError(401, 'User token not authorized');
                return;
            }
        }
        
        callbackError(401, 'User token not authorized');        

    };

    var get_path = function(resource) {
        if (resource === 'v2' || resource === 'v2/' || resource.indexOf('v2/types') !== -1)
            return PUBLIC;
        else if (resource === 'v2/subscriptions' || resource === 'v2/subscriptions/')
            return SUBSCRIPTION;
        else if (resource.indexOf("v2/entities/") !== -1)
            return ENTITY;
        return NOT_ALLOWED;
    };

    var parse_entity = function(resource){

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
