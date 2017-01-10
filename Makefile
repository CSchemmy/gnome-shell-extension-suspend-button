# Basic Makefile

# Retrieve the UUID from ``metadata.json``
UUID = $(shell grep -E '^[ ]*"uuid":' ./metadata.json | sed 's@^[ ]*"uuid":[ ]*"\(.\+\)",[ ]*@\1@')
BASE_MODULES = extension.js metadata.json COPYING README.md
EXTRA_MODULES = lib.js prefs.js
ICON_MODULE = logoff-symbolic.svg
MSGSRC = $(wildcard locale/*/*/*.po)

ifeq ($(strip $(DESTDIR)),)
INSTALLBASE = $(HOME)/.local/share/gnome-shell/extensions
ICONDIR = $(HOME)/.icons
else
INSTALLBASE = $(DESTDIR)/usr/share/gnome-shell/extensions
ICONDIR = $(DESTDIR)/usr/share/icons/gnome/scalable/status
endif

INSTALLNAME = $(UUID)

$(info UUID is "$(UUID)")

.PHONY: all _build clean extension install install-local zip-file

all: extension

clean:
	rm -f ./schemas/gschemas.compiled
	rm -f ./locale/*/*/*.mo
	-rm -fR ./_build

extension: ./schemas/gschemas.compiled $(MSGSRC:.po=.mo)

./schemas/gschemas.compiled: ./schemas/org.gnome.shell.extensions.suspend-button.gschema.xml
	glib-compile-schemas ./schemas/

./locale/%.mo: ./locale/%.po
	msgfmt -c $< -o $@

install: install-local

install-local:	_build
	rm -rf $(INSTALLBASE)/$(INSTALLNAME)
	mkdir -p $(INSTALLBASE)/$(INSTALLNAME)
	mkdir -p $(ICONDIR)
	cp -r ./_build/* $(INSTALLBASE)/$(INSTALLNAME)
	cp ./_build/$(ICON_MODULE) $(ICONDIR)
ifeq ($(strip $(DESTDIR)),/)
	cd /usr/share/icons/gnome ; \
	gtk-update-icon-cache .
endif

zip-file: _build
	cd _build ; \
	zip -qr "$(UUID)$(VSTRING).zip" .
	mv _build/$(UUID)$(VSTRING).zip ./

_build: all
	-rm -fR ./_build
	mkdir -p _build
	cp $(BASE_MODULES) $(EXTRA_MODULES) $(ICON_MODULE) _build
	mkdir -p _build/schemas
	cp schemas/*.xml _build/schemas/
	cp schemas/gschemas.compiled _build/schemas/
	cp -r locale _build/