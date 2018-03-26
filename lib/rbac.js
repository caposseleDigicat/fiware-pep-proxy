var config = require('../config.js'),
    proxy = require('./HTTPClient.js'),
    log = require('./logger').logger.getLogger("RBAC-Client");

var RBAC = (function() {

    var check_permissions = function(auth_token, user_info, req, callback, callbackError) {

        var roles = get_roles(user_info);
        var app_id = user_info.app_id;
        
        var action = req.method;
        var resource = req.url.split('?')[0].substring(1, req.url.split('?')[0].length);
        log.info('Resource: ', resource);
        var parsed_resource = parse_resource(resource);
        if (parsed_resource === undefined){
            callbackError(404, 'Path not found');
            return;
        }
        var fiware_service = req.headers['fiware-service'];
        log.info('fiware_service: ', fiware_service);
        
        if (fiware_service !== undefined){ 
            resource = fiware_service + ':' + parsed_resource;
        }

        log.info('resource updated: ', resource);

        for (roleIdx in roles){
            log.info('role:', roles[roleIdx])
            if (roles[roleIdx] === resource) {
                callback();
                return;
            }
        }

        callbackError(401, 'User token not authorized');        

    };

    var parse_resource = function(resource) {
        // v2/entities/Room1/attrs/temperature 
        // v2/entities/Room1
        //var hasEntity = resource.indexOf("v2/entities/", 0);
        // v2/
        // v2
        //var hasRoot = resource.indexOf("v2", 0);
        
        if(resource.indexOf("v2/entities/") !== -1){
            var r = resource.split('/')[2];
            log.info('Parsing:', r);
        } else if(resource.indexOf("v2") !== -1){
            var r = resource.split('/')[0];
            log.info('Parsing:', r);
        } 
        return r;
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
