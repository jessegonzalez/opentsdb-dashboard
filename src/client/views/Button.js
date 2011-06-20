var Class = require('std/Class'),
	UIComponent = require('std/ui/Component'),
	extend = require('std/extend'),
	bind = require('std/bind')

module.exports = Class(UIComponent, function(supr) {

	var defaults = {
		label: 'A Button'
	}

	this._class = 'Button'

	this._init = function(opts) {
		supr(this, '_init', arguments)
		opts = extend(opts, defaults)
		this._label = opts.label
	}
	
	this.label = function(label) {
		if (typeof label == 'undefined') { return this._label }
		this._label = label
		if (this._el) { this.html(label) }
		return this
	}

	this._createContent = function() {
		this.html(this._label)
		this._on('mousedown', bind(this, '_onMouseDown'))
		this._on('mouseup', bind(this, '_onMouseUp'))
		this._on('mouseover', bind(this, '_onMouseOver'))
		this._on('mouseout', bind(this, '_onMouseOut'))
	}

	this._onMouseOver = function() {
		this.addClass('hover')
	}

	this._onMouseOut = function() {
		this._mouseDown = false
		this.removeClass('down')
		this.removeClass('hover')
	}

	this._onMouseDown = function() {
		this._mouseDown = true
		this.addClass('down')
	}

	this._onMouseUp = function() {
		if (!this._mouseDown) { return }
		this._mouseDown = false
		this.removeClass('down')
		this._publish('click')
	}
})
