// TODO Remove notion of queries. There's simply one metric, and the lines come back with the appropriate tags

var Class = require('std/Class'),
	xhr = require('std/xhr'),
	Publisher = require('std/Publisher'),
	map = require('std/map'),
	each = require('std/each'),
	filter = require('std/filter'),
	bind = require('std/bind'),
	curry = require('std/curry'),
	throttle = require('std/throttle'),
	delay = require('std/delay'),
	time = require('std/time'),
	keys = require('std/keys'),
	slice = require('std/slice')

var slices = []

module.exports = Class(Publisher, function(supr) {
	
	this._init = function(metric, aggregator) {
		supr(this, '_init', arguments)
		this._metric = metric
		this._queries = [{}] // initialize with a query that has no tags - this it the Total
		this._data = {}
		this._window = 1 * time.day
		this._start = time.now() - this._window
		this._timeOffsets = [{ offset:0 }]
		this._aggregator = aggregator || 'sum'
		this._seriesAggregate = '1h-sum'
		this._queriesLoading = 0
		
		slices.push(this)
		
		this._loadState()
	}
	
	this.setWindow = function(start, win) {
		this._clip(function() {
			this._window = win
			this._start = start
		})
	}
	
	this.setSeriesAggregate = function(seriesAggregate) {
		this._seriesAggregate = seriesAggregate
		this._clear()
		this._query()
	}
	
	this.getTitle = function() { return this._metric }
	this.getWindow = function() { return this._window }

	/* Shifting (panning) and zooming the dataslice view
	 ***************************************************/
	this.zoom = sync('zoom', function(opts) {
		if (opts.factor) {
			this._clip(function() {
				var zoomBy = this._window * opts.factor,
					panToCenter = -Math.round(zoomBy / 2)
				this._window += zoomBy
				this._start += panToCenter
			})
		}
	})
	
	this.shift = sync('shift', function(opts) {
		if (opts.factor) {
			this._clip(function() { this._start += this._window * opts.factor })
		}
		if (opts.time) {
			this._clip(function() { this._start += opts.time })
		}
	})
	
	this.refreshWithoutQuery = sync('refreshWithoutQuery', function() {
		this._publishData()
	})
	
	function sync(fnName, fn) {
		return function(opts, dontSync) {
			fn.call(this, opts)
			if (dontSync) { return this }
			each(slices, bind(this, function(slice) {
				if (slice == this) { return }
				slice[fnName](opts, true)
			}))
			return this
		}
	}

	// monitors changes to this._start and this._window while duringFn executes,
	// clips the window to time.now() after duringFn has executed, and clears
	// + queries if there was a change in time window after clipping
	this._clip = function(duringFn) {
		var oldStart = this._start,
			oldWindow = this._window

		duringFn.call(this)

		var end = this._start + this._window
		if (end > time.now()) {
			var diff = end - time.now()
			this._start -= diff
		}
		if (oldStart != this._start || oldWindow != this._window) {
			this._query()
		}
	}

	/* Overlay an additional query on this data slice
	 ************************************************/
	this.addQuery = function(tags) {
		tags = (keys(tags).length ? tags : null)
		this._queries.push({ tags:tags })
		this._query()
		return this
	}

	this.removeQuery = function(rmTags) {
		this._perOffsetQuery(function(offsetQuery) {
			if (tagsString(rmTags) != tagsString(offsetQuery.tags)) { return }
			this._removeOffsetQuery(offsetQuery)
		})
		this._queries = filter(this._queries, function(query) {
			return tagsString(rmTags) != tagsString(query.tags)
		})
		this._query()
		return this
	}

	/* Overlay an additional time offset on this data slice
	 ******************************************************/
	this.addTimeOffset = function(offset) {
		this._timeOffsets.push({ offset:offset })
		this._query()
		return this
	}

	this.removeTimeOffset = function(offset) {
		this._perOffsetQuery(function(offsetQuery) {
			if (offsetQuery.offset != offset) { return }
			this._removeOffsetQuery(offsetQuery)
		})
		this._timeOffsets = filter(this._timeOffsets, function(timeOffset) {
			return offset != timeOffset.offset
		})
		this._publishData()
		return this
	}

	this._removeOffsetQuery = function(offsetQuery) {
		delete this._data[offsetQuery]
	}

	/* Querying openTSDB
	 *******************/
	this._query = function() {
		this._publish('loading', true)
		this._clear()
		this._perOffsetQuery(function(offsetQuery) {
			this._queriesLoading++
			sendQuery(offsetQuery, this)
		})
	}
	
	this._handleData = function(offsetQuery, err, response) {
		if (!(--this._queriesLoading)) { this._publish('loading', false) }
		if (err) {
			this._publish('error', err)
			this._removeOffsetQuery(offsetQuery)
		} else if (response.match(/^<!DOCTYPE HTML/)) {
			this._publish('error', new Error('Bad request'))
			this._removeOffsetQuery(offsetQuery)
		} else if (response.match(/^<form method="post" action="\/login">/)) {
			this._publish('unauthorized', new Error('Unauthorized'))
			this._removeOffsetQuery(offsetQuery)
		} else {
			var points = filter(map(response.split('\n'), parseLine)),
				xValues = map(points, getTimestamp),
				yValues = map(points, getValue),
				title = offsetQuery.tags ? map(offsetQuery.tags, function(tag) { return tag }).join(':') : 'Total'

			var queryData = this._data[offsetQuery] = { title:title, offset:offsetQuery.offset, x:[], y:[] }
			each(points, function(point) {
				queryData.x.push(point.ts)
				queryData.y.push(point.value)
			})
		}

		if (this._queriesLoading) { return }
		this._publishData()
	}

	/* Link/hash state hack
	 **********************/
	this._storeState = function() {
		var state = {
			queries:this._queries,
			window:this._window,
			start:this._start,
			aggregate:this._seriesAggregate,
			gInvisibleQueries: gInvisibleQueries
		}
		location.hash = '#' + encodeURIComponent(JSON.stringify(state))
	}
	
	this._loadState = function() {
		var stateJSON = location.hash.substr(1)
		if (stateJSON) {
			var state = JSON.parse(decodeURIComponent(stateJSON))
			this._queries = state.queries
			this._window = state.window
			this._start = state.start
			this._seriesAggregate = state.aggregate
			if (state.gInvisibleQueries) { gInvisibleQueries = state.gInvisibleQueries }
		}
		this._clear()
		this._query()
	}
	
	/* util
	 ******/
	this._clear = function() {
		this._data = {}
		return this
	}

	this._getQueryString = function(offsetQuery) {
		var query = this._aggregator + ':'
			+ this._seriesAggregate + ':'
			+ this._metric
			+ tagsString(offsetQuery.tags)
		return query
	}

	this.toString = function() { return this._aggregator + ':' + this._metric }

	// multiplies queries by time offsets and yields all time offset queries
	this._perOffsetQuery = function(yield) {
		each(this._queries, this, function(query) {
			each(this._timeOffsets, this, function(timeOffset) {
				var id = tagsString(query.tags) + timeOffset.offset,
					offset = timeOffset.offset,
					offsetQuery = { tags:query.tags, id:id, offset:offset, toString:getSelfID }
				yield.call(this, offsetQuery)
			})
		})
	}

	this._publishData = function() {
		var xValueLists = [],
			yValueLists = [],
			xOffsets = [],
			titles = [],
			max = 0,
			min = 0,
			totals = [],
			startTime = this._start,
			endTime = this._start + this._window
		
		var sortedData = map(this._data, function(data) { return data })
		sortedData.sort(function(a, b) {
			if (a.title == b.title) { return 0 }
			if (a.title == 'Total') { return -1 }
			if (b.title == 'Total') { return 1 }
			return a.title < b.title ? 1 : -1
		})
    
		each(sortedData, this, function (queryData) {
			xValueLists.push(queryData.x)
			yValueLists.push(queryData.y)
			xOffsets.push(queryData.offset)
			titles.push(queryData.title)
			var total = 0
			if (!gInvisibleQueries[queryData.title]) {
				each(queryData.y, this, function(value, i) {
					if (queryData.x[i] < startTime || queryData.x[i] > endTime) {
						delete queryData.x[i]
						delete queryData.y[i]
						return 
					}
					if (value) { total += value }
					if (value > max) { max = value }
					if (value < min) { min = value }
				})
			}
			totals.push(total)
		})
		var data = {
			x:xValueLists, y:yValueLists, titles:titles, offsets:xOffsets,
			start:startTime, end:endTime, timespan:endTime - this._start,
			min:min, max:max, valuespan:Math.max(max - min, 0.01), totals:totals }

		this._storeState()
		this._publish('data', data)
	}
	
	this.isRequestingData = function() { return !!globalOutstandingQueries }
	
})

function getSelfID() { return this.id }

function queryTimeString(timestamp) {
	var date = new Date(timestamp)
	return [date.getFullYear(), '/', date.getMonth() + 1, '/', date.getDate(),
		'-', date.getHours(), ':', date.getMinutes(), ':', date.getSeconds()].join('')
}

function tagsString(tags) {
	if (!tags) { return '' }
	return '{' + map(tags, function(val, key) { return key + '=' + val }).sort().join(',') + '}'
}

function parseLine(line) {
	if (!line) { return null }
	line = line.split(' ')
	// e.g. http.hits 1303238406 44.0 server=server-ec2-10-27-34-123.compute-5.amazonaws.com browser=browser-firefox
	var tags = {}
	each(slice(line, 3), function(tagline) {
		var kvp = tagline.split('='),
			name = kvp[0],
			value = kvp[1].substr(name.length + 1) // e.g. "browser-"
		tags[name] = value
	})
	return { key:line[0], ts:parseInt(line[1]) * time.second, value:parseFloat(line[2]), tags:tags }
}

function getTimestamp(datapoint) { return datapoint.ts }
function getValue(datapoint) { return datapoint.value }

var extraTimeForBug = 12 * time.hour // TSD seems to not return all the data in a range if "end" is specified. For now, just request 12 hours of extra data
var holdQueries = []
function sendQuery(offsetQuery, slice) {
	doSendQuery(offsetQuery, slice, bind(slice, '_handleData', offsetQuery))
	return
	var callback = bind(slice, '_handleData', offsetQuery)
	if (slice._metric == 'client.REQUESTED') {
		doSendQuery(offsetQuery, slice, function() {
			each(holdQueries, function(held) {
				doSendQuery(held.offsetQuery, held.slice, bind(held.slice, '_handleData', held.offsetQuery))
			})
			holdQueries = []
			callback.apply(slice, arguments)
		})
	} else {
		holdQueries.push({ offsetQuery:offsetQuery, slice:slice })
	}
}

var globalOutstandingQueries = 0
function doSendQuery(offsetQuery, slice, callback) {
	globalOutstandingQueries += 1
	var offset = offsetQuery.offset,
		start = slice._start - offset,
		end = slice._start + slice._window - offset + extraTimeForBug,
		params = { ascii:true, start:queryTimeString(start) }

	if (Math.abs(end - time.now()) >= 10 * time.second) {
		params.end = queryTimeString(end)
	}
	
	params.m = slice._getQueryString(offsetQuery)

	xhr.get('/tsd/q', params, function() {
		globalOutstandingQueries -= 1
		callback.apply(this, arguments)
	}, {encode:false})
}
