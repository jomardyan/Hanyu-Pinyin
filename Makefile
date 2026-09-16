NODE ?= node
BROWSER ?= chromium
DIST ?= dist
PROFILE ?=
URL ?=
BINARY ?=
.DEFAULT_GOAL := help
.NOTPARALLEL:

TARGETS := help doctor setup install build build-validate dev run run-chrome run-edge run-chromium test test-watch test-browser test-ui test-backend typecheck assets store-generate assets-validate store-validate check package release store-release ci fixture release-files clean clean-all
.PHONY: $(TARGETS)

$(TARGETS):
	$(NODE) scripts/tasks.mjs $@ --browser "$(BROWSER)" --dist "$(DIST)" $(if $(PROFILE),--profile "$(PROFILE)") $(if $(URL),--url "$(URL)") $(if $(BINARY),--binary "$(BINARY)")
