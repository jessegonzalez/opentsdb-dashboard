var Class = require('std/Class'),
	extend = require('std/extend'),
	bind = require('std/bind'),
	each = require('std/each'),
	Logger = require('std/Logger')

// Beware of putting this proxy behind nginx over SSL - nginx may strip the "Connection keep-alive" header for SSL requests.
// I've seen TSD fail to return data for e.g. /log, /version, without "Connection keep-alive". Awkwardly, /q *does* return data.
module.exports = Class(function() {

	this._init = function(opts) {
		this._proxyPort = opts.port
		this._proxyHost = opts.host
		this._httpModule = opts.ssl ? require('https') : require('http')
		this._logger = new Logger('Proxy')
		this._httpBasicAuth = opts.httpBasicAuth
		this._rewrite = opts.rewrite
	}

	this.listen = function(port, host) {
		var server = http.createServer(bind(this, 'handleRequest'))
		server.listen(port, host)
	}

	this.handleRequest = function(originalReq, originalRes) {
		var url = originalReq.url
		if (this._rewrite) { url = url.replace(this._rewrite[0], this._rewrite[1]) }
		var params = { host:this._proxyHost, port:this._proxyPort, path:url, method:originalReq.method, headers:{} }
		
		if (this._httpBasicAuth) {
			var basicAuthHeader = 'Basic ' + new Buffer(this._httpBasicAuth).toString('base64')
			params.headers['Authorization'] = basicAuthHeader
		}
		
		var proxyReq = this._httpModule.request(params)
		proxyReq.on('response', bind(this, function(proxyRes) {
			originalRes.writeHead(proxyRes.statusCode, proxyRes.headers)
			proxyRes.pipe(originalRes)
		}))
		
		each(originalReq.headers, function(val, key) { proxyReq.setHeader(key, val) })
		proxyReq.on('error', bind(this._logger, 'error'))
		proxyReq.end()
	}

})
