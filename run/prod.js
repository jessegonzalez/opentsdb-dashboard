#!/usr/bin/env node

var Server = require('../src/server/Server')

var tsdHost = process.argv[2] || 'localhost',
	tsdPort = process.argv[3] || 4242,
	tsdSSL = true,
	tsdBasicHTTPAuth = null, // 'username:password'
	staticDir = __dirname + '/../build',
	localHost = 'localhost',
	localPort = 8080

var dashboardServer = new Server({
	tsdHost:tsdHost,
	tsdPort:tsdPort,
	tsdSSL:tsdSSL,
	tsdBasicHTTPAuth:tsdBasicHTTPAuth,
	tsdRewrite:['/tsd/', '/'],
	staticDir:staticDir,
	printStackTrace:false,
	disableAuth:true
})

dashboardServer.listen(localPort, localHost)

console.log('opentsdb dashboard is running on', localHost+':'+localPort, 'and expects TSD to be running on', tsdHost+':'+tsdPort)
