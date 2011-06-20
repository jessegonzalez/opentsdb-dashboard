var Class = require('std/Class'),
	UIComponent = require('std/ui/Component'),
	extend = require('std/extend'),
	Button = require('./Button'),
	bind = require('std/bind'),
	each = require('std/each'),
	invoke = require('std/invoke')

module.exports = Class(UIComponent, function(supr) {

	this._init = function() {
		supr(this, '_init', arguments)
		this._buttons = []
		this._payloads = []
		this._index = null
	}

	this._class = 'RadioButtons'

	this.add = function(label, payload) {
		var button = new Button({ label:label, toggle:true }),
			index = this._buttons.length
		button.addClass('RadioButton')
		button.on('click', bind(this, 'select', index))
		if (index == 0) { button.addClass('leftMost') }
		if (this._buttons[index - 1]) {
			this._buttons[index - 1].removeClass('rightMost')
		}
		button.addClass('rightMost')
		this._payloads.push(payload || label)
		this._buttons.push(button)
		button.appendTo(this)
		return this
	}

	this.select = function(index) {
		if (index === this._index) { return }
		this.deselect()
		this._buttons[index].addClass('toggled')
		this._index = index
		this._publish('select', this._payloads[index])
	}
	
	this.deselect = function() {
		each(this._buttons, invoke('removeClass', 'toggled'))
	}
})

