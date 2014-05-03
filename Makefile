commonjs:
	@node_modules/requirejs/bin/r.js -convert js/controllers-src/ js/controllers/
	@echo "JS Compiled."