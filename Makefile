commonjs:
	@node_modules/requirejs/bin/r.js -convert js/src js/app/
	@echo "JS Compiled."