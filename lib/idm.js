var config = require('../config.js'),
    proxy = require('./HTTPClient.js');

var log = require('./logger').logger.getLogger("IDM-Client");

var IDM = (function() {

    var my_token;
    var my_token_expiration;

    var check_conn = function(callback, callbackError) {

        var options = {
            host: config.idm.host,
            port: config.idm.port,
            path: '/v3',
            method: 'GET'
        };
        var protocol = config.idm.ssl ? 'https' : 'http';
        proxy.sendData(protocol, options, undefined, undefined, callback, callbackError);
    };

    var authenticate = function(callback, callbackError) {

        var options = {
            host: config.idm.host,
            port: config.idm.port,
            path: '/v3/auth/tokens',
            method: 'POST',
            headers: {'Content-Type': 'application/json'}
        };
        var protocol = config.idm.ssl ? 'https' : 'http';
        if(config.idm.version === 'keyrock:7'){
            var body = {
                name: config.pep.username, 
                password: config.pep.password
            };
        }else{
            var body = {
                auth: {
                    identity: {
                        methods: ['password'], 
                        password: {
                            user: {
                                name: config.pep.username, 
                                password: config.pep.password, 
                                domain: {id: 'default'}
                            }
                        }
                    }
                }
            };
        }
        proxy.sendData(protocol, options, JSON.stringify(body), undefined, function (status, resp, headers) {
            my_token = headers['x-subject-token'];
            my_token_expiration = new Date(JSON.parse(resp).token.expires_at);
            log.info('Token expiration: ', my_token_expiration);
            callback(my_token);
        }, callbackError);
    };

    var check_token = function(token, callback, callbackError, cache) {
        var options = {};
        if(config.idm.version === 'keyrock:7'){
            options = {
                host: config.idm.host,
                port: config.idm.port,
                path: '/user?access_token=' + encodeURIComponent(token),
                method: 'GET',
                headers: {'X-Auth-Token': my_token, 'Accept': 'application/json'}
            };
        }else{
            options = {
                host: config.idm.host,
                port: config.idm.port,
                path: '/v3/access-tokens/' + encodeURIComponent(token),
                method: 'GET',
                headers: {'X-Auth-Token': my_token, 'Accept': 'application/json'}
            };
        }

        //check PEP token expiration
        var current_time = (new Date()).getTime();
    
        //TESTING purpose only. Force to check token expiration every minute
        //log.info('Token Expiration: ', my_token_expiration, ' Now: ', (new Date(current_time)), ' (',  (new Date(current_time+ (59* 60000))) , ')');
        //if((current_time + (59 * 60000)) >= my_token_expiration){
        
        if(current_time >= my_token_expiration){
            //PEP token has expired thus requesting a new token
            authenticate (function (pep_token) {
                my_token = pep_token;
                log.info('Success re-authenticating PEP proxy. Proxy Auth-token: ', my_token, ' expiration: ', my_token_expiration);
                check_token(token, callback, callbackError, cache);
            }, function (status, e) {
                log.error('Error in IDM communication ', e);
                callbackError(503, 'Error in IDM communication');
            });
        }
        else{ 
            if (cache[token]) {
                log.info('Token in cache, checking timestamp...');
                //var current_time = (new Date()).getTime();
                var token_time = cache[token].date.getTime();

                if (current_time - token_time < config.cache_time * 1000) {
                    callback(cache[token].user_info);
                    return;
                } else {
                    log.info('Token in cache expired');
                    delete cache[token];
                }
            }
            log.info('Checking token with IDM...');
            var protocol = config.idm.ssl ? 'https' : 'http';
            proxy.sendData(protocol, options, undefined, undefined, function (status, resp) {
                var user_info = JSON.parse(resp);
                log.info("user info:", user_info);
                        
                if (!check_application(user_info.app_id)) {
                    log.error('User not authorized in application', config.pep.app_id);
                    callbackError(401, 'User not authorized in application', config.pep.app_id);
                } else {
                    cache[token] = {};
                    cache[token].date = new Date();
                    cache[token].user_info = user_info;
                    callback(user_info);
                }
            }, 
            function (status, e) {
                callbackError(status, e);
            });
        }
        //     if (status === 401) {
                

        //         log.error('Error validating token. Proxy not authorized in keystone. Keystone authentication ...');   
        //         authenticate (function (status, resp) {

        //             my_token = JSON.parse(resp).access.token.id;

        //             log.info('Success authenticating PEP proxy. Proxy Auth-token: ', my_token);
        //             check_token(token, callback, callbackError);

        //         }, function (status, e) {
        //             log.error('Error in IDM communication ', e);
        //             callbackError(503, 'Error in IDM communication');
        //         });
        //     } else {
        //         callbackError(status, e);
        //     }
        // });
    };

    var check_application = function (app_id) {
        log.debug('Token created in application: ', app_id);
        log.debug('PEP Proxy application: ', config.pep.app_id);
        log.debug('PEP Proxy trusted_apps: ', config.pep.trusted_apps);

        if (app_id === config.pep.app_id || config.pep.trusted_apps.indexOf(app_id) !== -1) return true;
        else return false;
    }


    return {
        check_conn: check_conn,
        authenticate: authenticate,
        check_token: check_token
    }

})();
exports.IDM = IDM;
