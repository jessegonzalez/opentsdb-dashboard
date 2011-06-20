OpenTSDB dashboard
==================

A dashboard for viewing OpenTSDB data

Please use Chrome while we work on performance :)

Developed and tested on OS X 10.6

Get started
-----------
Get dependencies (node, npm, opentsdb-dashboard, hbase, asynchbase and opentsdb)

1 Get node:

	curl -O http://nodejs.org/dist/node-v0.4.8.tar.gz
	tar -xzvf node-v0.4.8.tar.gz
	cd node-v0.4.8
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

4 Get hbase. I've been using hbase-0.90.X

	# From http://hbase.apache.org/book/quickstart.html. Pick a mirror at http://www.apache.org/dyn/closer.cgi/hbase/ and run:
	curl -O http://link.to.mirrot/hbase-0.90.X.tar.gz
	tar -xzvf hbase-0.90.X.tar.gz
	hbase-0.90.X/bin/start-hbase.sh

5 Get asyncbase

	git clone https://github.com/stumbleupon/asynchbase.git
	cd asynchbase
	git checkout d1aff70c71d3
	make
 	cp build/hbaseasync-1.0.jar ../opentsdb/third_party/hbase/hbaseasync-1.0.jar

6 Get and run OpenTSDB locally

	# From http://opentsdb.net/getting-started.html
	git clone git://github.com/stumbleupon/opentsdb.git
	cd opentsdb
	make || make MD5=md5sum
	make staticroot
	env COMPRESSION=none HBASE_HOME=../hbase-0.90.X ./src/create_table.sh
	./src/tsdb mkmetric http.hits sockets.simultaneous lolcats.viewed
	./src/tsdb tsd --port=4242 --staticroot=build/staticroot --cachedir=/tmp/tsd

7 (optional) Create some fake time series data to play with

	cd opentsdb-dashboard
	echo "module.exports = ['http.hits', 'sockets.simultaneous', 'lolcats.viewed']" > src/shared/metrics.js
	node run/fakeProducer.js

Develop
-------
Run dashboard locally

	node opentsdb-dashboard/run/dev.js

or, run dashboard locally but connect to a remote TSD on opentsdb.example.com:4242

	node opentsdb-dashboard/run/dev.js opentsdb.example.com 4242

Deploy
------
Build dashboard

	node opentsdb-dashboard/run/build.js

Run production dashboard

	node opentsdb-dashboard/run/prod.js opentsdb.example.com 4242
