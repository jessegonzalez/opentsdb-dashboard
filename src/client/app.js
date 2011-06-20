var xhr = require('std/xhr'),
	map = require('std/map'),
	UIComponent = require('std/ui/Component'),
	TabContainer = require('./TabContainer'),
	MainView = require('./views/MainView')

function main() {
	var header = new UIComponent()
		.addClass('header')
		.html('<div class="logo">OpenTSDB</div><div class="dashboardLogo">Dashboard</div>')
		.appendTo(document.body)

	var body = new UIComponent()
		.addClass('body')
		.appendTo(document.body)

	// TODO use actual multiple tabs
	new TabContainer()
		.addTab(new MainView())
		.appendTo(body)
		.selectTab(0)
}

main()
