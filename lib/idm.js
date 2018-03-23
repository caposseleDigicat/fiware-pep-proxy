var config = require('../config.js'),
    proxy = require('./HTTPClient.js');

var log = require('./logger').logger.getLogger("IDM-Client");

var IDM = (function() {

    var my_token;
    var my_token_expiration;

    var check_conn = function(callback, callbackError) {

        var options = {
            host: config.keystone_host,
            port: config.keystone_port,
            path: '/v3/auth/tokens/'+ encodeURIComponent(my_token),
            method: 'GET'
        };
        proxy.sendData('http', options, undefined, undefined, callback, callbackError);
    };

    var check_pep_token = function(callback, callbackError) {

        var options = {
            host: config.keystone_host,
            port: config.keystone_port,
            path: '/v3',
            method: 'GET'
        };
        proxy.sendData('http', options, undefined, undefined, callback, callbackError);
    };

    var authenticate = function(callback, callbackError) {

        var options = {
            host: config.keystone_host,
            port: config.keystone_port,
            path: '/v3/auth/tokens',
            method: 'POST',
            headers: {'Content-Type': 'application/json'}
        };
        var body = {
            auth: {
                identity: {
                    methods: ['password'], 
                    password: {
                        user: {
                            name: config.username, 
                            password: config.password, 
                            domain: {id: "default"}
                        }
                    }
                }
            }
        };
        proxy.sendData('http', options, JSON.stringify(body), undefined, function (status, resp, headers) {
            my_token = headers['x-subject-token'];
            var r = JSON.parse(resp);
            var token_expiration = r.token.expires_at;
            my_token_expiration = new Date(token_expiration);
            log.info('Token expiration: ', my_token_expiration);
            callback(my_token);
        }, callbackError);
    };

    var check_token = function(token, callback, callbackError, cache) {

        var options;

        if (config.tokens_engine === 'keystone') {
            options = {
                host: config.keystone_host,
                port: config.keystone_port,
                path: '/v3/auth/tokens/',
                method: 'GET',
                headers: {
                    'X-Auth-Token': my_token,
                    'X-Subject-Token': encodeURIComponent(token),
                    'Accept': 'application/json'
                }
            };

        } else {
            options = {
                host: config.keystone_host,
                port: config.keystone_port,
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

            proxy.sendData('http', options, undefined, undefined, function (status, resp) {
                var user_info = JSON.parse(resp);
                cache[token] = {};
                cache[token].date = new Date();
                cache[token].user_info = user_info;
                callback(user_info);
            }, function (status, e) {
                    callbackError(status, e);
            });
        }
    };


    return {
        check_conn: check_conn,
        authenticate: authenticate,
        check_token: check_token
    }

})();
exports.IDM = IDM;
