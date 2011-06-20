var Class = require('std/Class'),
	UIComponent = require('std/ui/Component'),
	extend = require('std/extend'),
	bind = require('std/bind'),
	map = require('std/map'),
	MetricView = require('./MetricView'),
	metrics = require('../../shared/metrics')

module.exports = Class(UIComponent, function(supr) {
	
	this._title = 'Tab Title'
	this._class = 'TabContent'

	var defaults = {}

	this._init = function(opts) {
		supr(this, '_init', arguments)
		opts = extend(opts, defaults)
		if (opts.title) { this._title = opts.title }
	}

	this.getTitle = function() {
		return this._title
	}

	this._createContent = function() {
		this._metricViews = map(metrics, this, function(metric) {
			return new MetricView(metric).appendTo(this)
		})
	}
})
