OpenTSDB dashboard
==================

A dashboard for viewing OpenTSDB data

Please use Chrome while we work on performance :)

Get started
-----------
Get dependencies (node, npm, opentsdb-dashboard, hbase, asynchbase and opentsdb)

1 Get node:

	curl -O http://nodejs.org/dist/node-v0.4.8.tar.gz; tar -xzf node-v0.4.8.tar.gz
	./configure
	make
	sudo make install

2 Get npm:

	git clone http://github.com/isaacs/npm.git
	cd npm
	sudo make install

3 Get opentsdb-dashboard:

	git clone https://github.com/clover/opentsdb-dashboard.git
	cd opentsdb-dashboard
	sudo npm install .

4 Get hbase & asyncbase. I've been using hbase-0.90.X and https://github.com/stumbleupon/asynchbase/commit/d1aff70c71d3179ee47fb474fb75555c28ea741f

	# TODO Improve command-line instructions for this step
	# http://hbase.apache.org/book/quickstart.html
	hbase-0.90.2/bin/start-hbase.sh

5 Get and run OpenTSDB locally

	# TODO Improve command-line instructions for this step
	# http://opentsdb.net/getting-started.html
	env COMPRESSION=none HBASE_HOME=../hbase-0.90.2 ./src/create_table.sh
	./src/tsdb mkmetric http.hits sockets.simultaneous lolcats.viewed
	./src/tsdb tsd --port=4242 --staticroot=build/staticroot --cachedir=/tmp/tsd

6 (optional) Create some fake time series data to play with

	cat "module.exports = ['http.hits', 'sockets.simultaneous', 'lolcats.viewed']" > src/shared/metrics.js
	node run/fakeProducer.js

Develop
-------
Run dashboard locally

	node run/dev.js

or, run dashboard locally but connect to a remote TSD on opentsdb.example.com:4242

	node run/dev.js opentsdb.example.com 4242

Deploy
------
Build dashboard

	node run/build.js

Run production dashboard

	node run/prod.js opentsdb.example.com 4242
