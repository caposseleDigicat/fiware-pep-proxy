var config = require('../config.js'),
    proxy = require('./HTTPClient.js'),
    log = require('./logger').logger.getLogger("RBAC-Client"),
    url = require('url'),
    querystring = require('querystring');

var subscriptionService = require('../db/schemas/subscriptionService'),
    config = require('../config'),
    uuid = require('uuid');

var RBAC = (function() {

    var PUBLIC = "public";
    var ENTITY = "entity";
    var QUERY = "query";
    var SUBSCRIPTION = "subscription";
    var NOT_ALLOWED = "not allowed";

    var check_permissions = function(auth_token, user_info, req, callback, callbackError) {

        var roles = get_roles(user_info);
        var app_id = user_info.app_id;
        var action = req.method;
        var resource = req.url.split('?')[0].substring(1, req.url.split('?')[0].length);
        var fiware_service = req.headers['fiware-service'];
        switch(get_path(resource)){
            case PUBLIC: {
                callback();
                return;
            }
            case QUERY:{
                var parsedUrl = url.parse(req.url);
                var check_type = querystring.parse(parsedUrl.query);
                if (check_type.type === undefined && check_type.id === undefined){
                    callbackError(401, 'User token not authorized: missing entity type or entity id');
                    return;
                }
                var permissions_required = parse_permissions_from_request(req);
                log.debug('QUERY - Permissions required: ', permissions_required);
                var decision = [];
                for(idx in permissions_required){
                    for (roleIdx in roles){
                        //log.info('role:', roles[roleIdx])
                        var permissions_owned = parse_permissions_from_role(roles[roleIdx]);
                        log.debug('Permissions owned:', permissions_owned);
                        if (operation_is_allowed(permissions_required[idx], permissions_owned))  {
                            decision.push(true);
                            break;
                        }
                    }
                }
                if (decision.length == permissions_required.length){
                    callback();
                    return;
                }
                callbackError(401, 'User token not authorized');
                return;
            }
            case ENTITY: {
                //ONLY GET allowed
                if(action === 'GET'){
                    var entityId = resource.split('/')[2];
                    if (entityId === undefined){
                        callbackError(401, 'User token not authorized');
                        return;
                    }
                    var permissions_required = parse_permissions_entity_from_request(req);
                    permissions_required.id = entityId;
                    log.debug('ENTITY - Permissions required: ', permissions_required);
                    for (roleIdx in roles){
                        //log.info('role:', roles[roleIdx])
                        var permissions_owned = parse_permissions_from_role(roles[roleIdx]);
                        log.debug('Permissions owned:', permissions_owned);
                        if (operation_is_allowed(permissions_required, permissions_owned))  {
                            callback();
                            return;
                        }
                    }
                    callbackError(401, 'User token not authorized');
                    return;
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
                            log.debug("Subscription ID:", subId);
                            subscriptionService.findOne({ subscriptionId: subId, user: user_info.id }, function(err, userSubscribed) {
                                if (err) {
                                    log.error("MongoDB connection ERROR");
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
                    log.debug('Body: ',req.body);
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


                    var permissions_required = parse_permissions_from_body(req);

                    log.debug('SUBSCRIPTION - Permissions required: ', permissions_required);
                    var permissions_owned = [];

                    for (roleIdx in roles){
                        //log.info('role:', roles[roleIdx])
                        permissions_owned[roleIdx] = parse_permissions_from_role(roles[roleIdx]);
                        log.debug('Permissions owned:', permissions_owned[roleIdx]);
                    }

                    if (subscription_is_allowed(permissions_required, permissions_owned))  {
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
        log.debug("RESOURCE:",resource);
        temp = resource.split('/');
        if (resource === 'v2' || resource === 'v2/' || resource.indexOf('v2/types') !== -1)
            return PUBLIC;
        else if (resource.indexOf('v2/subscriptions') !== -1)
            return SUBSCRIPTION;
        else if (resource.indexOf("v2/entities") !== -1 && temp[2] === '')
            return QUERY;
        else if (resource.indexOf("v2/entities/") !== -1 && temp[2] !== '')
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

    var parse_permissions_from_request = function (request) {
        var permissions = []
        var ids = []
        var parsedUrl = url.parse(request.url);
        var parsedQs = querystring.parse(parsedUrl.query);
        if(parsedQs.id !== undefined)
            ids = parsedQs.id.split(',');
        else
            ids.push('');
        //log.debug("IDs:", ids);
        for(idx in ids) { //permissions.id.push(ids[idx]);
            var permission = {};
            permission = {
                fiware_service : '',
                operation : '',
                type : '',
                id : '',
                attrs : ''
            };
            //retrieve fiware-service
            if (request.headers['fiware-service'] !== undefined)
                permission.fiware_service = request.headers['fiware-service'];

            //retrieve operation
            permission.operation = request.method; // TO IMPROVE

            //retrieve entity type
            if (parsedQs.type !== undefined)
                permission.type = parsedQs.type;

            //retrieve entity id
            if (parsedQs.id !== undefined){
                permission.id = ids[idx];
                log.debug("Permissions IDS", permission.id);
            }
            else if (parsedQs.idPattern !== undefined)
                permission.id = parsedQs.idPattern;

            //retrieve attributes
            if (parsedQs.attrs !== undefined)
                permission.attrs = parsedQs.attrs;

            permissions.push(permission);
        }

        return permissions;
    };

    var parse_permissions_entity_from_request = function (request) {
        var permission = {
            fiware_service : '',
            operation : '',
            type : '',
            id : '',
            attrs : ''
        };
        var parsedUrl = url.parse(request.url);
        var parsedQs = querystring.parse(parsedUrl.query);
                    
        //retrieve fiware-service
        if (request.headers['fiware-service'] !== undefined)
            permission.fiware_service = request.headers['fiware-service'];

        //retrieve operation
        permission.operation = request.method; // TO IMPROVE

        //retrieve entity type
        if (parsedQs.type !== undefined)
            permission.type = parsedQs.type;

        //retrieve attributes
        if (parsedQs.attrs !== undefined)
            permission.attrs = parsedQs.attrs;

        return permission;
    };

    var parse_permissions_from_body = function (request) {
        var permissions = {
                fiware_service : '',
                operation : '',
                entities : [],
                attrs : []
            };
        var parsedUrl = url.parse(request.url);
        try{
            var parsedBody = JSON.parse(request.body);
        }catch(e){
            callbackError(411, 'JSON body not valid');
            return;
        }
        var subjects = parsedBody.subject.entities;
        if (subjects === undefined){
            callbackError(411, 'JSON body not valid');
            return;
        }

        //retrieve entity id and type
        //var idx = 0;
        for (entity in subjects){
            //log.debug("Entity in loop:",entity)
            permissions.entities.push(subjects[entity])

           // permissions.entities[idx].id = subjects[entity].id;
           // permissions.entities[idx].type = subjects[entity].type;
           // idx += 1;
           // log.debug("Entities:", permissions.entities[entity].id, permissions.entities[entity].type )
        }

        //retrieve fiware-service
        if (request.headers['fiware-service'] !== undefined)
            permissions.fiware_service = request.headers['fiware-service'];

        //retrieve operation
        permissions.operation = 'GET';//request.method; // TO IMPROVE

        //retrieve attributes from condition
        //var attributes = parsedBody.subject.condition;
        //var idx = 0;
        //if (attributes !== undefined){
        //    for (attr in attributes.attrs){
        //        permissions.attrs[idx] = attributes.attrs[attr];
        //        idx += 1;
        //    }
        //}

        //retrieve attributes from notification //TO IMPROVE (attributes could be repeated among condition and notification)
        //var attributes = parsedBody.notification.attrs;
        //if (attributes !== undefined){
        //    for (attr in attributes){
        //        permissions.attrs[idx] = attributes[attr];
        //        idx += 1;
        //    }
        //}
        return permissions;
    };

    var parse_permissions_from_role = function (role) {
        var permissions = {
                fiware_service : '',
                operation : '',
                type : '',
                id : '',
                attrs : ''
            };
        parsedRole = role.split('|');
        if (parsedRole[0] !== undefined)
            permissions.fiware_service = parsedRole[0];
        if (parsedRole[1] !== undefined)
            permissions.operation = parsedRole[1];
        if (parsedRole[2] !== undefined)
            permissions.type = parsedRole[2];
        if (parsedRole[3] !== undefined)
            permissions.id = parsedRole[3];
        if (parsedRole[4] !== undefined)
            permissions.attrs = parsedRole[4];

        return permissions;
    };

    var operation_is_allowed = function(permissions_required, permissions_owned) {
        if((permissions_required.fiware_service !== permissions_owned.fiware_service) ||
            (permissions_required.operation !== permissions_owned.operation))
            return false;

        if(permissions_required.type !== '' ){
            if(permissions_required.type !== permissions_owned.type)
                return false;
            else if (permissions_owned.id === '')
                return true;
        }
        if(permissions_required.id === permissions_owned.id) {
            if ((permissions_owned.attrs === '') ||
                (permissions_required.attrs === permissions_owned.attrs))
                return true;
        }
        return false;
    };

    var subscription_is_allowed = function(permissions_required, permissions_owned) {
        var decisions = [];
        //log.debug("Permission required:", permissions_required);
        for (idx in permissions_required.entities){
            var decision = {};
            for(roleIdx in permissions_owned){
                decision.fiware_service = false;
                decision.type = false;
                decision.id = false;
                //log.debug("Checking ID:", permissions_required.entities[idx].id,permissions_owned[roleIdx].id);
    
                if((permissions_required.fiware_service === permissions_owned[roleIdx].fiware_service))
                //&&  (permissions_required.operation !== permissions_owned.operation))
                    decision.fiware_service = true;
                //checking type
                //if(permissions_required.entities[idx].type !== ''){
                if(permissions_required.entities[idx].type === permissions_owned[roleIdx].type){
                        decision.type = true;
                    //else if (permissions_owned[roleIdx].id === '')
                    //    decisions[idx].id = true;
                }
                //TODO check on attributes
                if(permissions_required.entities[idx].id === permissions_owned[roleIdx].id || 
                   (permissions_owned[roleIdx].id === '' && decision.type === true) ||
                   (permissions_required.entities[idx].idPattern !== undefined && decision.type === true && permissions_owned[roleIdx].id === undefined)) {
                        //log.debug("Checking ID:", permissions_required.entities[idx].id,permissions_owned[roleIdx].id)
                    // if ((permissions_owned[roleIdx].attrs === '') ||
                    //     (permissions_required.attrs === permissions_owned[roleIdx].attrs))
                        decision.id = true;
                }
                //checking if a role with required permissions is found and exit from inner loop
                if (decision.fiware_service && decision.id && decision.type){
                        break;
                }
            }
            decisions.push(decision);
            //log.debug("Decisions pre:", decisions);
        }
        decision = true;
        //log.debug("Decisions:", decisions);
        for(idx in decisions){
            decision = decision && decisions[idx].fiware_service && decisions[idx].type && decisions[idx].id;
            log.debug("Intra-decision:",decision)
        }
        log.info("Decision:",decision);
        return decision;
    };

    return {
        check_permissions: check_permissions
    }

})();
exports.RBAC = RBAC;