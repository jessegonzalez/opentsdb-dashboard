var Class = require('std/Class'),
	TabContent = require('./TabContent'),
	MetricView = require('./MetricView'),
	bind = require('std/bind'),
	curry = require('std/curry'),
	each = require('std/each'),
	map = require('std/map'),
	Button = require('./Button'),
	RadioButtons = require('./RadioButtons'),
	time = require('std/time'),
	xhr = require('std/xhr')

module.exports = Class(TabContent, function(supr) {

	var hashState = location.hash.substr(1)

	this._title = 'Deals'

	this._createContent = function() {
		this._timeButtons = {}
		this._createTimeWindowSelectors()
		this._createSeriesAggregateSelectors()
		this._createTickIntervalSelectors()
		// this._createTimeOffsets()
		this._createQueryPickers()
		supr(this, '_createContent')
	}

	this._createQueryPickers = function() {
		var container = this.append(this.dom({ 'class':'control', html:'<h2>Queries</h2>' }))
		this._queryButtons = {}
		this._fetchTagKeys(bind(this, function(err, tagKeys) {
			if (err) { return container.appendChild(this.dom({ html:'Error loading tag keys - sad panda' })) }
			each(tagKeys, this, function(tagKey) {
				var header = container.appendChild(this.dom({ 'class':'queryKey', html:'<h3>'+tagKey+'</h3>' }))
				this._queryButtons[tagKey] = {}
				this._fetchTagValues(tagKey, bind(this, function(err, tagValues) {
					if (err) { return header.appendChild(this.dom({ html:'Error loading values for ' + tagKey })) }
					each(tagValues, this, function(tagValue) {
						this._queryButtons[tagKey][tagValue] = new Button()
							.label(tagValue)
							.addClass('RadioButton')
							.appendTo(header)
							.on('click', bind(this, '_toggleQuery', tagKey, tagValue))
					})
				}))
			})
		}))
	}
	
	this._fetchTagKeys = function(callback) {
		var letters = 'qwertyuiopasdfghjklzxcvbnm'
			results = [],
			outstandingQueries = letters.length
		each(letters.split(''), function(letter) {
			xhr.get('/tsd/suggest', { type:'tagk', q:letter }, function(err, result) {
				if (err) { return callback(err) }
				results = results.concat(JSON.parse(result))
				if (!--outstandingQueries) { callback(null, results) }
			}, { encode:false })
		})
	}

	this._fetchTagValues = function(tagKey, callback) {
		xhr.get('/tsd/suggest', { type:'tagv', q:tagKey }, function(err, result) {
			if (err) { return callback(err) }
			var tagValues = map(JSON.parse(result), function(value) {
				return value.replace(tagKey + '-', '')
			})
			callback(null, tagValues)
		}, { encode:false })
	}

	this._toggleQuery = function(tagKey, tagValue) {
		var button = this._queryButtons[tagKey][tagValue],
			switchQueryOn = !button.hasClass('toggled')
		button.toggleClass('toggled')
		each(this._metricViews, this, function(view) {
			var slice = view.getSlice(),
				query = {}
			query[tagKey] = tagKey+'-'+tagValue
			if (switchQueryOn) { slice.addQuery(query) }
			else { slice.removeQuery(query) }
		})
	}

	
	var timeWindows = {
		'Last 10 min': 10 * time.minute,
		'Last hour':  time.hour,
		'Last day':   time.day,
		'Last 3 days':   3 * time.day,
		'Last week':  time.week,
		'Last month': 30 * time.day
	}
	this._createTimeWindowSelectors = function() {
		var container = this.append(this.dom({ 'class':'control', html:'<h2>View</h2>' }))
		var buttons = new RadioButtons()
			.on('select', bind(this, '_selectTimePeriod'))
			.appendTo(container)
		
		each(timeWindows, this, function(timeWindow, label) {
			buttons.add(label, timeWindow)
		})
		
		if (!hashState) { buttons.select(2) }
		
		setTimeout(bind(this, function() {
			each(this._metricViews, function(view) {
				view.getGraph().on('ShiftBy', bind(buttons, 'deselect'))
			})
		}), 0)
	}
	this._selectTimePeriod = function(timeWindow) {
		each(this._metricViews, function(view) {
			view.getSlice().setWindow(time.now() - timeWindow, timeWindow)
		})
	}

	var seriesAggregates = {
		'1 Minute sum': '1m-sum',
		'1 Hour Sum': '1h-sum',
		'1 Day Sum': '1d-sum'
	}
	this._createSeriesAggregateSelectors = function() {
		var container = this.append(this.dom({ 'class':'control', html:'<h2>Aggregate</h2>' }))

		var buttons = new RadioButtons()
			.on('select', bind(this, '_selectSeriesAggregate'))
			.appendTo(container)
		
		each(seriesAggregates, this, function(seriesAggregate, label) {
			buttons.add(label, seriesAggregate)
		})
		
		if (!hashState) { buttons.select(1) }
	}
	this._selectSeriesAggregate = function(seriesAggregate) {
		each(this._metricViews, this, function(view) {
			view.getSlice().setSeriesAggregate(seriesAggregate)
		})
	}
	
	var ticks = {
		'Per Minute': 1 * time.minute,
		'Per Hour': 1 * time.hour,
		'Per 12 Hours': 12 * time.hour,
		'Per Day': 1 * time.day
	}
	this._createTickIntervalSelectors = function() {
		var container = this.append(this.dom({ 'class':'control', html:'<h2>Time Ticks</h2>' }))
		var buttons = new RadioButtons()
			.on('select', bind(this, '_setTickInterval'))
			.appendTo(container)
		
		each(ticks, this, function(tick, label) {
			buttons.add(label, tick)
		})
		
		setTimeout(bind(buttons, 'select', 1), 0)
	}
	this._setTickInterval = function(tick, label) {
		each(this._metricViews, this, function(view) {
			view.getGraph().setTickInterval(tick)
		})
	}

	var offsets = {
		'1 Hour ago':  time.hour,
		'1 Day ago':   time.day,
		'1 Week ago':  time.week,
		'1 Month ago': 4 * time.week
	}
	this._createTimeOffsets = function() {
		var timeOffsetsContainer = this.append(this.dom({ 'class':'control', html:'<h2>Times</h2>' }))
		each(offsets, this, function(offset, label) {
			this._timeButtons[label] = new Button()
				.label(label)
				.addClass('RadioButton')
				.appendTo(timeOffsetsContainer)
				.on('click', bind(this, '_toggleTimeOffset', label))
		})
	}
	this._toggleTimeOffset = function(label) {
		var button = this._timeButtons[label],
			offsetIsOn = button.hasClass('toggled')
		button.toggleClass('toggled')
		each(this._metricViews, this, function(view) {
			var slice = view.getSlice()
			if (offsetIsOn) { slice.removeTimeOffset(offsets[label]) }
			else { slice.addTimeOffset(offsets[label], label) }
		})
	}
})
