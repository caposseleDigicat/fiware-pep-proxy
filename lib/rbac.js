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
        var fiware_service = req.headers['fiware-service'];
        log.info('fiware_service: ', fiware_service);
        
        if (fiware_service !== undefined){ 
            resource = fiware_service + ':' + resource;
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
