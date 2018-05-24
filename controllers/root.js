var config = require('./../config.js'),
    proxy = require('./../lib/HTTPClient.js'),
    IDM = require('./../lib/idm.js').IDM,
    AZF = require('./../lib/azf.js').AZF,
    RBAC = require('./../lib/rbac.js').RBAC;

var log = require('./../lib/logger').logger.getLogger("Root");

var logService = require('../db/schemas/logService');
var logger = new logService();

var Root = (function() {

    //{token: {user_info: {}, date: Date, verb1: [res1, res2, ..], verb2: [res3, res4, ...]}}
    var tokens_cache = {};

    var pep = function(req, res) {
    	
    	var auth_token = req.headers['x-auth-token'];

        if (auth_token === undefined && req.headers['authorization'] !== undefined) {
            var header_auth = req.headers['authorization'].split(' ')[1];
            auth_token = new Buffer(header_auth, 'base64').toString();
        }

    	if (auth_token === undefined) {
            log.info('Auth-token not found in request header');
            var auth_header = 'IDM uri = ' + config.idm_host;
            res.set('WWW-Authenticate', auth_header);
            res.status(401).send('Auth-token not found in request header');
    	} else {

            if (config.magic_key && config.magic_key === auth_token) {
                var options = {
                    host: config.app_host,
                    port: config.app_port,
                    path: req.url,
                    method: req.method,
                    headers: proxy.getClientIp(req, req.headers)
                };
                var protocol = config.app_ssl ? 'https' : 'http';
                proxy.sendData(protocol, options, req.body, res);
                return;

            }
            if(config.logging) {
                logger = new logService();
                logger.ip = req.connection.remoteAddress;
                logger.url = req.url;
                logger.method = req.method;
                logger.requestHeaders = JSON.stringify(req.headers);
                if (req.body !== undefined)
                    if(req.body.length > 0)
                        logger.requestBody = JSON.stringify(JSON.parse(req.body));
                logger.requestTimestamp = Date.now();
            }

    		IDM.check_token(auth_token, function (user_info) {
                if (config.azf.enabled) {
                    
                    AZF.check_permissions(auth_token, user_info, req, function () {

                        redir_request(req, res, user_info);

                    }, function (status, e) {
                        if (status === 401) {
                            log.info('User access-token not authorized: ', e);
                            res.status(401).send('User token not authorized');
                        } else if (status === 404) {
                            log.info('Domain not found: ', e);
                            res.status(404).send(e);
                        } else {
                            log.error('Error in AZF communication ', e);
                            res.status(503).send('Error in AZF communication');
                        }

                    }, tokens_cache);
                } else if (config.rbac){
                    RBAC.check_permissions(auth_token, user_info, req, function () {
                        redir_request(req, res, user_info);
                    }, function (status, e) {
                        if(config.logging) {
                            logger.responseStatus = status;
                            logger.responseBody = e;
                            logger.responseTimestamp = Date.now();
                            logger.save(function (err) {
                                if (err) {
                                    log.error('New LOG Failed:', err);
                                } 
                                else {
                                    log.debug('New LOG OK');
                                }
                            });
                        }
                        if (status === 401) {
                            log.info('User access-token not authorized: ', e);
                            res.status(401).send('User token not authorized');
                        } else if (status === 404) {
                            log.info('Path not found: ', e);
                            res.status(404).send(e);
                        } else if (status === 411) {
                            log.info('Error JSON: ', e);
                            res.status(411).send(e);
                        } else {
                            log.error('Error in RBAC', e);
                            res.status(500).send(e);
                        }
                    });
                } else{
                    redir_request(req, res, user_info);
                }


    		}, function (status, e) {
                if(config.logging) {
                    logger.responseStatus = status;
                    logger.responseBody = e;
                    logger.responseTimestamp = Date.now();
                    logger.save(function (err) {
                        if (err) {
                            log.error('New LOG Failed:', err);
                        } 
                        else {
                            log.debug('New LOG OK');
                        }
                    });
                }
    			if (status === 404 || status === 401) {
                    log.info('User access-token not authorized');
                    res.status(401).send('User access-token not authorized. Token invalid or expired');
                } else {
                    log.error('Error in IDM communication ', e);
                    res.status(503).send('Error in IDM communication');
                }
    		}, tokens_cache);
    	};	
    };

    var public = function(req, res) {
        redir_request(req, res);
    };

    var redir_request = function (req, res, user_info) {

        if (user_info) {

            log.info('Access-token OK. Redirecting to app...');
            
            req.headers['X-Nick-Name'] = user_info.id;
            req.headers['X-Display-Name'] = user_info.displayName;
            req.headers['X-Roles'] = JSON.stringify(user_info.roles);
            req.headers['X-Organizations'] = JSON.stringify(user_info.organizations);

        } else {
            log.info('Public path. Redirecting to app...');
        }

        var protocol = config.app_ssl ? 'https' : 'http';

        var options = {
            host: config.app_host,
            port: config.app_port,
            path: req.url,
            method: req.method,
            headers: proxy.getClientIp(req, req.headers)
        };
        proxy.sendData(protocol, options, req.body, res);
    };

    return {
        pep: pep,
        public: public
    }
})();

exports.Root = Root;