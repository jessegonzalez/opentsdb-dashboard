var Class = require('std/Class'),
	Proxy = require('./Proxy'),
	path = require('path'),
	express = require('express'),
	Logger = require('std/Logger'),
	bind = require('std/bind'),
	fs = require('fs'),
	http = require('http')

module.exports = Class(function() {

	this._init = function(opts) {
		this._staticDir = opts.staticDir
		this._printStackTrace = opts.printStackTrace
		this._logger = new Logger('Server')
		this._tsdProxy = new Proxy({
			httpModule:opts.httpModule || http,
			host:opts.tsdHost,
			port:opts.tsdPort,
			httpBasicAuth:opts.tsdBasicHTTPAuth,
			ssl:opts.tsdSSL,
			rewrite:opts.tsdRewrite
		})
		if (opts.disableAuth) { authorizeAdmin = function(req, res, next) { next() } }
	}

	this.listen = function(port, hostname) {
		express.createServer()
			.use(express.cookieParser())
			.use(express.session({ secret:'super-duper-secret stuff' }))
			.use(express.bodyParser())
			.post('/login',
				handleAdminLogin)
			.get('/',
				authorizeAdmin,
				bind(this, '_setFile', this._staticDir + '/index.html'),
				bind(this, '_sendFile'))
			.get(/^\/tsd\/.*/,
				authorizeAdmin,
				bind(this._tsdProxy, 'handleRequest'))
			.get('/css/:file',
				authorizeAdmin,
				bind(this, '_setDir', this._staticDir + '/css'),
				bind(this, '_sendFile'))
			.get('/img/:file',
				authorizeAdmin,
				bind(this, '_setDir', this._staticDir + '/img'),
				bind(this, '_sendFile'))
			.get('*',
				bind(this, '_setError', 404, 'Not found'))
			.error(
				bind(this, '_handleError'))
			.listen(port, hostname)
	}

	this._setError = function(code, message, req, res, next) {
		var error = new Error(message)
		error.code = 404
		next(error)
	}

	this._handleError = function(err, req, res) {
		var code = err.code || 500
		res.writeHead(code, { 'Content-Type': 'text/plain' })
		res.end(this._printStackTrace ? err.stack : err.message)
	}

	this._setFile = function(file, req, res, next) {
		req.file = file
		next()
	}

	this._setDir = function(dir, req, res, next) {
		req.dir = dir
		next()
	}

	var _contentTypes = { '.css':'text/css' }
	this._sendFile = function(req, res, next) {
		var file = path.resolve(req.dir || '', req.params.file || req.file)
		fs.readFile(file, function(err, content) {
			if (err) { return next(err) }
			res.setHeader('Content-Type', _contentTypes[path.extname(file)])
			res.end(content)
		})
	}
})

var authorizeAdmin = function(req, res, next) {
	if (req.session && req.session.isAdmin) { return next() }
	var formHTML = [
		'<form method="post" action="/login">',
			'<input type="password" name="password">',
			'<input type="hidden" name="next" value="'+req.url+'">',
		'</form>']

	res.writeHead(200, { 'Content-Type': 'text/html' })
	res.end(formHTML.join('\n'))
}

function handleAdminLogin(req, res, next) {
	req.session.isAdmin = (req.param('password') == 'orangejuice')
	res.redirect(req.param('next'))
}
