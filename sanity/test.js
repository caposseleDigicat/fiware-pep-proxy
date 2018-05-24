var should = require('should');
var mocha = require('mocha'); 

var config = require('./../config'),
    IDM = require("./../lib/idm.js").IDM,
    AZF = require('./../lib/azf.js').AZF;

var log = require('./../lib/logger').logger.getLogger("Test");
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

describe('Sanity Checks for Wilma PEP Proxy - Identity Manager Checks', function() {

    describe('Testing Keyrock configuration', function() {

		it('should have Keyrock configured', function (done) {
			if (config.idm.version !== undefined && config.idm.version !== '') {
				if (config.idm.host !== undefined && config.idm.host !== '') {
					if (config.idm.port !== undefined && config.idm.port !== '') {
						done();
					}
				}
			}
		});

		it('should have PEP user configured', function (done) {
			if (config.pep.username !== undefined && config.pep.username !== '') {
				if (config.pep.password !== undefined && config.pep.password !== '') {
					done();
				}
			}
		});
	});

    describe('Testing connection with Keyrock', function() {

    	it('should have connectivity with Keyrock', function (done) {
			IDM.check_conn (function (status) {
				if (status === 200) {
			    	done();	
				};
			}, function (status, e) {
			    log.error('Error in Keyrock communication', e);
			});
		});

		it('should authenticate with Keyrock', function (done) {
			IDM.authenticate (function (token) {
			    done();
			}, function (status, e) {
			});
		});
	});
});


describe('Sanity Checks for Wilma PEP Proxy - AuthZForce Checks', function(done) {

	if(config.azf.enabled) {
	    describe('Testing configuration', function() {

			it('should have AZF server configured', function (done) {
				if (config.azf.host !== undefined && config.azf.host !== '') {
					if (config.azf.port !== undefined && config.azf.port !== '') {
						done();
					}
				}
			});
		});

		describe('Testing connection with AZF', function() {

	    	it('should have connectivity with AZF', function (done) {
				AZF.check_conn (function (status, b, c) {	
				}, function (status, e) {
					if (status === 401) {
				    	done();	
					};
				});
			});
		});

	    
	} else {
		it('AZF not enabled', function (done) {
			done();
		});
	}
});