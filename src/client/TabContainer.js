var Class = require('std/Class'),
	UIComponent = require('std/ui/Component'),
	each = require('std/each'),
	bind = require('std/bind')

module.exports = Class(UIComponent, function(supr) {
	
	this._init = function() {
		supr(this, '_init', arguments)
		this._tabs = []
		this._views = []
	}

	this.addTab = function(view) {
		this._views.push(view)
		return this
	}

	this._createContent = function() {
		this.addClass('TabContainer')
		this._head = this.append(this.dom({ 'class':'head' }))
		var container = this.append(this.dom({ 'class':'container' }))
		this._body = container.appendChild(this.dom({ 'class':'body' }))
		each(this._views, bind(this, '_renderTab'))
	}

	this._renderTab = function(view, index) {
		var el = this.dom({ 'class':'Button tab', html:view.getTitle() })
		this._tabs[index] = this._head.appendChild(el)
		this._on(el, 'click', bind(this, 'selectTab', index))
	}

	this.selectTab = function(index) {
		if (this._index !== undefined) {
			var view = this._views[this._index],
				tab = this._tabs[this._index]
			this.removeClass(tab, 'selected')
			view.hide()
		}
		this._index = index
		this.addClass(this._tabs[this._index], 'selected')
		this._views[this._index]
			.appendTo(this._body)
			.show()
	}
})
