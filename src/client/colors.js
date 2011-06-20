var map = require('std/map')

var customColors = ['#57a257']

var gRaphaelHues = [.6, .2, .05, .1333, .75, 0]
var gRaphaelColors = map(gRaphaelHues, function(hue) {
	return "hsb(" + hue + ", .75, .75)"
}).concat(map(gRaphaelHues, function(hue) {
	return "hsb(" + hue + ", 1, .5)"
}))

module.exports = customColors.concat(gRaphaelColors)
