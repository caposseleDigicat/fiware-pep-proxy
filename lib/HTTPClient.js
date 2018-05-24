var express = require('express'),
    app = express(),
    XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var log = require('./logger').logger.getLogger("HTTP-Client");

var subscriptionService = require('../db/schemas/subscriptionService'),
    config = require('../config'),
    uuid = require('uuid');

    // ip: {type: String, required: true},
    // method: {type: String, required: true},
    // url: {type: String, required: true},
    // requestHeaders : {type: String, required: true},
    // requestBody : {type: String, required: false},
    // requestTimestamp : { type: Date, default: Date.now() },
    // responseStatus : {type: String, required: true},
    // responseHeaders: {type: String, required: false},
    // responseBody: {type: String, required: false},
    // //user: { type: String, required: true },
    // //authToken: { type: String, required: true },
    // responseTimestamp: { type: Date, default: Date.now() }
var logService = require('../db/schemas/logService');
var logger = new logService();

exports.getClientIp = function(req, headers) {
  var ipAddress = req.connection.remoteAddress;

  var forwardedIpsStr = req.header('x-forwarded-for');

  if (forwardedIpsStr) {
    // 'x-forwarded-for' header may return multiple IP addresses in
    // the format: "client IP, proxy 1 IP, proxy 2 IP" so take the
    // the first one
    forwardedIpsStr += "," + ipAddress;
  } else {
    forwardedIpsStr = "" + ipAddress;
  }

  headers['x-forwarded-for'] = forwardedIpsStr;
  return headers;
};


exports.sendData = function(protocol, options, data, res, callBackOK, callbackError) {
    var xhr, body, result;

    options.headers = options.headers || {};
    callbackError = callbackError || function(status, resp) {
        
        log.error("Error: ", status, resp);
        res.statusCode = status;
        if(config.logging){
            logger.responseStatus = status;
            logger.responseBody = resp;
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
        res.send(resp);
    };
    callBackOK = callBackOK || function(status, resp, headers) {
        res.statusCode = status;
        var newSubscritpion = undefined;
        for (var idx in headers) {
            var header = headers[idx];
            if(idx === 'location')  newSubscritpion = header;
            res.setHeader(idx, headers[idx]);
        }
        if(config.logging){
            log.debug("LOG Response:", status);
            logger.responseStatus = status;
            log.debug("LOG Headers:", JSON.stringify(headers));
            logger.responseHeaders = JSON.stringify(headers);
            if(resp !== ""){
                log.debug("LOG Body:", JSON.stringify(JSON.parse(resp)));
                logger.responseBody = JSON.stringify(JSON.parse(resp));
            }
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
            //check if new subscription and log 
        if(config.rbac && (options.path === '/v2/subscriptions' || options.path === '/v2/subscriptions/') && newSubscritpion){
            var service = new subscriptionService();
            service.subscriptionId = newSubscritpion.split('/')[3];
            service.user = options.headers['X-Nick-Name'];
            service.authToken = options.headers['x-auth-token'];
            service.save(function (err) {
                if (err) {
                    log.error('New subscription LOG Failed:', err);
                } 
                else {
                    log.debug('New subscription LOG OK. Subscription ID:', newSubscritpion.split('/')[3], 'by user:', options.headers['X-Nick-Name']);
                }
            });
            //log.error('New subscription with ID:', newSubscritpion.split('/')[3], 'by user:', options.headers['X-Nick-Name']);
        }
        res.send(resp);
    };

    var url = protocol + "://" + options.host + ":" + options.port + options.path;
    xhr = new XMLHttpRequest();
    if(config.logging){
        logger = new logService();
        logger.ip = options.headers['x-forwarded-for'];
        log.debug("LOG Method:", options.method);
        logger.method = options.method;
        log.debug("LOG URL:", options.path);
        logger.url = options.path;
        log.debug("LOG Request Headers:", options.headers);
        logger.requestHeaders = JSON.stringify(options.headers);
        logger.requestTimestamp = Date.now();
    }
    xhr.open(options.method, url, true);
    if (options.headers["content-type"]) {
        xhr.setRequestHeader("Content-Type", options.headers["content-type"]);
    }
    for (var headerIdx in options.headers) {
        //log.error('headerIdx:', headerIdx, ':', options.headers[headerIdx]);
        switch (headerIdx) {
            // Unsafe headers
            case "host":
            case "connection":
            case "referer":
//            case "accept-encoding":
//            case "accept-charset":
//            case "cookie":
            case "content-type":
            case "origin":
                break;
            default:
                xhr.setRequestHeader(headerIdx, options.headers[headerIdx]);
                break;
        }
    }

    xhr.onerror = function(error) {}
    xhr.onreadystatechange = function () {

        // This resolves an error with Zombie.js
        if (flag) {
            return;
        }

        if (xhr.readyState === 4) {
            flag = true;
            if (xhr.status < 400) {
                var allHeaders = xhr.getAllResponseHeaders().split('\r\n');
                var headers = {};
                for (var h in allHeaders) {
                    headers[allHeaders[h].split(': ')[0]] = allHeaders[h].split(': ')[1];
                }
                callBackOK(xhr.status, xhr.responseText, headers);
            } else {
                callbackError(xhr.status, xhr.responseText);
            }
        }
    };

    var flag = false;
    log.debug("Sending ", options.method, " to: " + url);
    log.debug("Headers: ", options.headers);
    log.debug("Body: ", data);
    if (data !== undefined) {
        //FIX for empty body (GET, DELETE)
        if (data.length === 0) {
            data = null;
        }
        else if (config.logging && options.path !== "/v3/auth/tokens"){
            log.debug("LOG Request body:", JSON.stringify(JSON.parse(data)));
            logger.requestBody = JSON.stringify(JSON.parse(data));
        }
        try {
            xhr.send(data);
        } catch (e) {
            callbackError(e.message);
            return;
        }
    } 
    else {
        try {
            xhr.send();
        } catch (e) {
            callbackError(e.message);
            return;
        }
    }
}