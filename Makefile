.PHONY: init clean build js assets server

NODE_MODULES=./node_modules
NODE_MODULES_BIN=$(NODE_MODULES)/.bin
DOCS_DIR=docs/
SRC_DIR=src/

init:
	git submodule update --init --recursive --remote
	npm install

clean:
	rm -r $(DOCS_DIR)

build: clean assets js
	mkdir -p $(DOCS_DIR)
	node generate.js --unhandled-rejections=strict

build_prod:
	IS_PROD=true make build

js:
	$(NODE_MODULES_BIN)/uglifyjs --compress -o $(DOCS_DIR)map.js -- \
		$(NODE_MODULES)/leaflet/dist/leaflet.js \
		$(NODE_MODULES)/leaflet.markercluster/dist/leaflet.markercluster.js \
		$(NODE_MODULES)/leaflet.fullscreen/Control.FullScreen.js \
		./$(SRC_DIR)leaflet-plugins/L.Control.Sidebar.js \
		$(NODE_MODULES)/papaparse/papaparse.js \
		$(SRC_DIR)map.js

assets:
	$(NODE_MODULES_BIN)/node-sass $(SRC_DIR)map.scss $(DOCS_DIR)map.css --output-style=compressed
	cp -r $(NODE_MODULES)/leaflet/dist/images $(DOCS_DIR)
	cp -r $(NODE_MODULES)/leaflet.fullscreen/*.png $(DOCS_DIR)/images

serve:
	$(NODE_MODULES_BIN)/http-server $(DOCS_DIR)
