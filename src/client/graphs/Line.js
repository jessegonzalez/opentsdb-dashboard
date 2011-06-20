var Class = require('std/Class'),
	Graph = require('./Graph'),
	map = require('std/map'),
	invoke = require('std/invoke'),
	each = require('std/each'),
	bind = require('std/bind'),
	time = require('std/time'),
	delay = require('std/delay'),
	throttle = require('std/throttle'),
	colors = require('../colors'),
	round = require('std/math/round')

gInvisibleQueries = {}

module.exports = Class(Graph, function(supr) {
		
	this._paperOpts = {
		width: 1,
		smooth: false,
		shade: false,
		nostroke: false,
		symbol: null //'xo'
	}

	this._dataWidth = 1300
	this._dataHeight = 200
	this._gutter = { top:10, right:0, bottom:80, left:100 }
	
	this.getWidth = function() {
		return this._gutter.left + this._dataWidth + this._gutter.right
	}
	
	this.getHeight = function() {
		return this._gutter.top + this._dataHeight + this._gutter.bottom + this._legendHeight
	}
	
	this.setTickInterval = function(interval) {
		this._tickInterval = interval
		this._renderXAxis()
	}
	
	this._createContent = function() {
		supr(this, '_createContent')
		this
			._makeDraggable()
			.on('drag', bind(this, '_onDrag'))
			._on('mousewheel', bind(this, '_onMouseWheel'))
	}

	/* Navigating graph with controls, drag/drop and scrolling
	 **************************************************************/
	this._onMouseWheel = function(e) {
		e.cancel()
		// TODO Zoom in with e.dy
		this._shiftBy(e.dx)
	}

	this._onZoomClick = function(factor) {
		if (this._slice.isRequestingData()) { return }
		this._slice.zoom({ factor:factor })
	}
	
	this._shiftedBy = 0
	this._shiftBy = function(amount) {
		if (this._slice.isRequestingData()) { return }
		if (!this._lines || !amount) { return }
		this._shiftedBy += amount
		this._lines.translate(amount)
		this._renderXAxis()
		this._scheduleShift()
		this._publish('ShiftBy')
	}

	this._onDrag = function(drag) {
		this._shiftBy(drag.delta.x)
	}

	/* Shifting UI and underlying data at the same time
	 **************************************************/
	this._scheduleShift = delay(function() {
		this._slice.shift({ time:this._getUIOffset() })
		this._shiftedBy = 0
	}, 350)

	this._getUIOffset = function() {
		return this._pixelsToTime(this._shiftedBy)
	}

	this._pixelsToTime = function(pixels) {
		var timePerPixel = this._slice.getWindow() / this._dataWidth,
			offsetTime = -Math.round(pixels * timePerPixel)
		return offsetTime
	}
	
	this._timeToPixels = function(seconds) {
		var timePerPixel = this._slice.getWindow() / this._dataWidth,
			offsetPixels = -Math.round(seconds / timePerPixel)
		return offsetPixels
	}
	
	/* Interacting with the graph data
	 *********************************/
	var tooltip
	function showTooltip(e) {
		if (!tooltip) {
			tooltip = document.createElement('div')
			fakeComponent.style(tooltip, { position:'absolute', padding:8, background:'#579157', border:'1px solid #008000', color:'#fff' })
		}
		document.body.appendChild(tooltip)
		var offset = fakeComponent.layout(this.node)
		fakeComponent.style(tooltip, { left:offset.x + 25, top:offset.y - 40 })
		var date = new Date(this.xValue)
		var doubleDigit = function(num) { return (num.toString().length == 1 ? '0' + num : num) }
		tooltip.innerHTML = 'time: ' + date.getDate() + 'th @ ' + doubleDigit(date.getHours()) + ':' + doubleDigit(date.getMinutes())
			+ '<br />value: ' + round(this.yValue, 2)
		clearTimeout(tooltipHideTimeout)
	}
	var tooltipHideTimeout
	function hideTooltip(e) {
		if (!tooltip || !tooltip.parentNode) { return }
		tooltipHideTimeout = setTimeout(function() {
			tooltip.parentNode.removeChild(tooltip)
		}, 150)
	}
	
	/* Graph rendering code
	 **********************/
	this._render = function(data) {
		this._data = data
		var resolution = { x:data.timespan / this._dataWidth, // number of pixels per x "column"
			y:data.valuespan / (this._dataHeight - 5) } // reserve 5 pixels of padding on top
		this._renderControls()
		this._renderData(data, resolution)
		this._renderXAxis()
		this._renderYAxis()
		this._renderLegend(data)
		this._paper.setSize(this.getWidth(), this.getHeight())
	}

	this._renderXAxis = throttle(function() {
		if (!this._data) { return }
		if (this._xAxis) { this._xAxis.remove() }
		this._xAxis = this._renderAxis(true, this._tickInterval, this._data.start, this._data.timespan, bind(this, function(timestamp) {
			var date = new Date(timestamp),
				hours = date.getHours().toString(),
				minutes = date.getMinutes().toString()
			if (hours.length == 1) { hours = '0' + hours }
			if (minutes.length == 1) { minutes = '0' + minutes}
			
			return (this._tickInterval < 1 * time.hour)
				? date.getDate() + 'th ' + hours + ':' + minutes
				: date.getDate() + 'th @ ' + hours + ':00'
		}))
	})

	this._renderYAxis = function() {
		if (this._yAxis && this._yAxis.node) { this._yAxis.remove() }
		this._yAxis = this._renderAxis(false, Math.max(6, Math.round(this._data.valuespan / 6)), this._data.min, this._data.valuespan, function(val) {
			return round(val, 2)
		})
	}

	this._renderData = function(data, resolution) {
		this._lines = this._paper.set()
		if (!data.x[0] || data.x[0].length < 2) {
			this._setStatus('No data')
			return
		}
		var gutter = this._gutter
		each(data.x, this, function(xAxis, i) {
			if (xAxis.length < 2) { return }
			if (gInvisibleQueries[data.titles[i]]) { return }
			this._lines.push(
				this._drawLine(xAxis, data.y[i], data, resolution)
					.attr({ stroke: colors[i], 'clip-rect': [gutter.left, gutter.top, gutter.left+this._dataWidth, gutter.top+this._dataHeight] })
					.translate(data.offsets[i] / resolution.x))
		})
		this._lines.translate(gutter.left, gutter.top)
	}

	this._drawLine = function(xValues, yValues, data, resolution) {
		var line = this._paper.set(),
			pathData = []
		for (var i=0; i<xValues.length; i++) {
			if (!xValues[i] || !yValues[i]) { continue }
			var xOffset = xValues[i] - data.start,
				yOffset = yValues[i] - data.min, // draw negative values above the baseline
				x = Math.round(xOffset / resolution.x),
				y = this._dataHeight - Math.round(yOffset / resolution.y) // raphael puts origin top left. flip for cartesian origin bottom left
			// TODO normalize for granularity greater than 1s
      		pathData.push(x, y)
			var circle = this._paper.circle(x, y, 4).attr('fill', '#fff')
			circle.xValue = xValues[i]
			circle.yValue = yValues[i]
			circle.hover(showTooltip, hideTooltip)
			line.push(circle)
		}
		pathData.unshift('M') // Move to the first point
		pathData.splice(3, 0, 'L') // And start drawing a path from that point on
		line.push(this._paper.path(pathData.join(' ')))
		return line
	}
	
	this._renderAxis = function(isX, tickInterval, minValue, span, labelFn) {
		var axis = this._paper.set()
		
		var numTicks = Math.max(6, Math.min(40, Math.floor(span / tickInterval))),
			baseOffset = isX ? minValue % tickInterval : 0,
			baseOffsetPx = this._timeToPixels(baseOffset),
			dir = isX ? 1 : -1,
			tickSize = 10 * dir,
			padding = 5 * dir,
			gapSize = (isX ? this._dataWidth : this._dataHeight) / numTicks,
			axisVariable = isX ? 'x' : 'y',
			tickVariable = isX ? 'y' : 'x'

		for (var i=0; i<=numTicks; i++) {
			var offset = {},
				gap = Math.round(i * gapSize)
			offset[axisVariable] = (isX ? gap + this._shiftedBy + baseOffsetPx : this._dataHeight - gap)
			offset[tickVariable] = padding
			var line = ['M', offset.x, offset.y]
			offset[tickVariable] += tickSize
			line.push('L', offset.x, offset.y)
			axis.push(this._paper.path(line.join(' ')))
			offset[tickVariable] += padding
			var value = minValue + (i / numTicks) * span + baseOffset,
				anchor = isX ? 'start' : 'end',
				label = this._paper.text(offset.x, offset.y, labelFn(value)).attr('text-anchor', anchor)
			if (isX) {
				var rotationOrigin = (offset.x - baseOffsetPx) || 1
				label.rotate(90).translate(-28, 25)
			}
			axis.push(label)
		}

		axis.translate(this._gutter.left, this._gutter.top + (isX ? this._dataHeight : 0))
		
		return axis
	}

	this._renderLegend = function(data) {
		var legend = this._paper.set(),
			paddingTop = 10,
			titlePadding = 15
		each(data.titles, this, function(title, i) {
			var color = colors[i]
			//this._paper.canvas.parentNode.style.height = '400px'
			var fill = (gInvisibleQueries[data.titles[i]] ? '#fff' : color)
			var circle = this._paper.circle(100, paddingTop + i * titlePadding, 3)
				.attr({ stroke:color, fill:fill, cursor:'pointer' })
				.click(bind(this, '_toggleLineVisible', i))
			var text = this._paper.text(110, paddingTop + i * titlePadding, title + ' (total over this period: ' + round(data.totals[i], 1) + ')')
				.attr({ fill:color, 'text-anchor':'start', cursor:'pointer' })
				.click(bind(this, '_toggleLineVisible', i))
			legend.push(circle, text)
		})
		legend.translate(0, this._gutter.top + this._dataHeight + this._gutter.bottom)
		this._legendHeight = paddingTop + data.titles.length * titlePadding
	}
	
	this._toggleLineVisible = function(i) {
		var title = this._data.titles[i]
		gInvisibleQueries[title] = !gInvisibleQueries[title]
		this._slice.refreshWithoutQuery()
	}
	
	this._renderControls = function() {
		var paper = this._paper,
			controls = paper.set(),
			offset = { x:20, y:20 },
			radius = 9,
			padding = 20

		function clickable(node, color, clickHandler) {
			node
				.click(clickHandler)
				.attr({ fill:color, cursor:'pointer' })
			return node
		}

		function createButton(xPos, yPos, text, handler) {
			var x = offset.x + xPos * padding,
				y = offset.y + yPos * padding
			controls.push(clickable(paper.circle(x, y, radius), '#45a35e', handler))
			controls.push(clickable(paper.text(x, y, text), '#333', handler))
		}

		createButton(0, 0, '+', bind(this, '_onZoomClick', -0.5))
		createButton(0, 1, '-', bind(this, '_onZoomClick',  0.5))
	}

})

var fakeComponent = new require('std/ui/Component')()