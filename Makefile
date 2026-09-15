NODE ?= node
BROWSER ?= chromium
.DEFAULT_GOAL := help
.NOTPARALLEL:

TARGETS := help doctor setup install build dev run run-chrome run-edge run-chromium test test-watch test-browser test-ui test-backend typecheck assets assets-validate check package release ci fixture release-files clean clean-all
.PHONY: $(TARGETS)

$(TARGETS):
	$(NODE) scripts/tasks.mjs $@ $(BROWSER)
