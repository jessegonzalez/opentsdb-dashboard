var Class = require('std/Class'),
	UIComponent = require('std/ui/Component'),
	graphs = require('../graphs'),
	each = require('std/each'),
	RadioButtons = require('./RadioButtons'),
	DataSlice = require('../DataSlice'),
	bind = require('std/bind')

module.exports = Class(UIComponent, function(supr) {
	
	this._class = 'MetricView'

	this._init = function(metric) {
		supr(this, '_init')
		this._slice = new DataSlice(metric)
		this._views = {}
	}

	this._createContent = function() {
		this._createTitle()
		this._createViewPicker()
	}

	this.getSlice = function() { return this._slice }
	this.getGraph = function() { return this._views['Chart'] }

	this._createTitle = function() {
		this.append(this.dom({ html:this._slice.getTitle(), 'class':'title' }))
	}

	this._createViewPicker = function() {
		var viewClasses = { 'Chart':graphs.Line } // TODO Implement table view and actually append these guys to the dom
		var buttons = new RadioButtons()
			.on('select', bind(this, '_selectView'))
			//.appendTo(this)
		each(viewClasses, function(viewClass, name) {
			buttons.add({ label:name, 'class':viewClass })
		})
		buttons.select(0)
	}

	this._selectView = function(view) {
		if (this._currentView) { this._currentView.hide() }
		var views = this._views,
			viewName = view.label
		if (!views[viewName]) {
			views[viewName] = new view['class'](this._slice)
		}
		this._currentView = views[viewName]
			.appendTo(this)
			.show()
	}
})
