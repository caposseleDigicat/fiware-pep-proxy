var config = {};

// Used only if https is disabled
config.pep_port = 7000;

// Set this var to undefined if you don't want the server to listen on HTTPS
config.https = {
    enabled: false,
    cert_file: 'cert/cert.crt',
    key_file: 'cert/key.key',
    port: 443
};

config.idm = {
    version: '',
	host: '',
	port: '',
	ssl: false
}

config.app_host = '';
config.app_port = '';
// Use true if the app server listens in https
config.app_ssl = false;

// Credentials obtained when registering PEP Proxy in app_id in Account Portal
config.pep = {
	app_id: '',
	username: '',
	password: '',
	trusted_apps : []
}

// in seconds
config.cache_time = 300;


// if enabled PEP checks permissions of NGSIv2 request with a Role Based Access Control
// roles have to be provided according to the following scheme:
// fiware-service|operation|entityType|entityID|attribute
// e.g., tenantRZ1|GET|AirQualityObserved||
// the above example will grant GET permission for each entity of type AirQualityObserved under the Fiware-Service tenantRZ1 
config.rbac = false;

//if enabled PEP logs access requests and responses on mongoDb
config.logging = false;

// if enabled PEP checks permissions with AuthZForce GE. 
// only compatible with oauth2 tokens engine
//
// you can use custom policy checks by including programatic scripts 
// in policies folder. An script template is included there
config.azf = {
	enabled: false,
	protocol: 'http',
    host: 'pdp.docker',
    port: 8080,
    custom_policy: undefined // use undefined to default policy checks (HTTP verb + path).
};

// list of paths that will not check authentication/authorization
// example: ['/public/*', '/static/css/']
config.public_paths = [];

config.magic_key = '123456789';

// MongoDB
config.mongoDb = {
    server: 'mongoPep',
    port: 27017,
    user: '',
    password: '',
    db: 'pep'
};

module.exports = config;
