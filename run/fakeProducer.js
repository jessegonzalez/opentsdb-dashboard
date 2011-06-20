#!/usr/bin/env node

var child_process = require('child_process'),
	each = require('std/each'),
	metrics = require('../src/shared/metrics'),
	time = require('std/time')

var tags = { browser:['firefox', 'safari'] },
	rateOfChange = 1.1

var lastValues = {},
	rand = function(min, max) { return Math.random() * (max - min) + min },
	now = function() { return Math.floor(new Date().getTime() / 1000) }

var nc = child_process.spawn.call(child_process, 'nc', ['-w', 30, 'localhost', 4242])
nc.stdout.on('data', function(data) { console.log('stdout', data.toString()) })
nc.stderr.on('data', function(data) { console.log('stderr', data.toString()) })

function produce() {
	each(metrics, function(metric) {
		each(tags, function(tagValues, tagKey) {
			each(tagValues, function(tagValue, i) {
				var uniqueName = [metric, tagKey, tagValue].join(':')
				if (!lastValues[uniqueName]) {
					lastValues[uniqueName] = 100 / (i + 1)
				}
				var value = lastValues[uniqueName] * rateOfChange,
					parts = ['put', metric, now(), value, tagKey+'='+tagKey+'-'+tagValue]

				lastValues[uniqueName] = value
				rateOfChange = rateOfChange - (Math.log(rateOfChange * rand(0.9, 1.1))) / 10
				var command = parts.concat('\n').join(' ')
				nc.stdin.write(parts.concat('\n').join(' '))
				console.log(command)
			})
		})
	})
}

produce()
setInterval(produce, 1 * time.second)

