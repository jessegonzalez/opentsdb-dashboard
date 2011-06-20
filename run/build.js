#!/usr/bin/env node

var fs = require('fs'),
	compiler = require('require/compiler')

var base = __dirname + '/..'

var compiledJS = compiler.compile(base + '/src/client/app.js')
var html = fs.readFileSync(base + '/static/index.html').toString()
	html = html.replace(/<script src="\/\/localhost:1234\/require\/app"><\/script>/, '<script>'+compiledJS+'</script>')
try {
	fs.mkdirSync(base + '/build', '0744')
	fs.symlinkSync('../static/css', base + '/build/css')
	fs.symlinkSync('../static/img', base + '/build/img')
} catch(e) {
	// ignore errors telling us the symlinks already exist
	if (e.code != 'EEXIST') { throw e }
}
fs.writeFileSync(base + '/build/index.html', html)
