var express = require('express'),
    app = express(),
    XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var log = require('./logger').logger.getLogger("HTTP-Client");

var subscriptionService = require('../db/schemas/subscriptionService'),
    config = require('../config'),
    uuid = require('node-uuid');

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


exports.sendData = function(port, options, data, res, callBackOK, callbackError) {
    var xhr, body, result;

    options.headers = options.headers || {};
    callbackError = callbackError || function(status, resp) {
        log.error("Error: ", status, resp);
        res.statusCode = status;
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
        log.error("Response: ", status);
        log.error(" Headers: ", headers);
        log.error(" Body: ", resp);

        //check if new subscription and log 
        if(options.path === '/v2/subscriptions' && newSubscritpion){
            subscriptionService.insert({subscriptionId: newSubscritpion.split('/')[3], 
                                        user: options.headers['X-Nick-Name'], 
                                        accessToken: options.headers['x-auth-token']}, 
            function (err, rawResp) {
                if (err) {
                    log.error('New subscription LOG Failed. Subscription ID:', newSubscritpion.split('/')[3], 'by user:', options.headers['X-Nick-Name']);
                } 
                else {
                    log.error('New subscription LOG OK. Subscription ID:', newSubscritpion.split('/')[3], 'by user:', options.headers['X-Nick-Name']);
                }
            });
            //log.error('New subscription with ID:', newSubscritpion.split('/')[3], 'by user:', options.headers['X-Nick-Name']);
        }
        //LOG response
        //TODO
        res.send(resp);
    };

    var url = port+"://" + options.host + ":" + options.port + options.path;
    xhr = new XMLHttpRequest();
    xhr.open(options.method, url, true);
    if (options.headers["content-type"]) {
        xhr.setRequestHeader("Content-Type", options.headers["content-type"]);
    }
    for (var headerIdx in options.headers) {
        log.error('headerIdx:', headerIdx, ':', options.headers[headerIdx]);
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

    xhr.onerror = function(error) {
    }
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
    log.debug(" Headers: ", options.headers);
    log.debug(" Body: ", data);
    if (data !== undefined) {
        //FIX for empty body (GET, DELETE)
        if (data.length === 0) {data = null;}
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