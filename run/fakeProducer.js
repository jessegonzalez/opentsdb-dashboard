#!/usr/bin/env node

throw "Make sure you're not tunneling to production tsdb!"

var child_process = require('child_process'),
	each = require('std/each'),
	metrics = require('../src/shared/metrics'),
	time = require('std/time')

var buckets = [1,2,3],
	rateOfChange = 1.1

var lastValues = {},
	rand = function(min, max) { return Math.random() * (max - min) + min },
	now = function() { return Math.floor(new Date().getTime() / 1000) }

var nc = child_process.spawn.call(child_process, 'nc', ['-w', 30, 'localhost', 4242])
nc.stdout.on('data', function(data) { console.log('stdout', data.toString()) })
nc.stderr.on('data', function(data) { console.log('stderr', data.toString()) })

function produce() {
	each(metrics, function(metric) {
		each(buckets, function(bucket) {
			var uniqueName = metric+bucket
			if (!lastValues[uniqueName]) {
				lastValues[uniqueName] = 100 / bucket
			}
			var value = lastValues[uniqueName] * rateOfChange,
				parts = ['put', metric, now(), value, 'http_hits=http_hits-'+bucket]
			
			lastValues[uniqueName] = value
			rateOfChange = rateOfChange - (Math.log(rateOfChange * rand(0.9, 1.1))) / 10
			nc.stdin.write(parts.concat('\n').join(' '))
		})
	})
}

produce()
setInterval(produce, 1 * time.second)

