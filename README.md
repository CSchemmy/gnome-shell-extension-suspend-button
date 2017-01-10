gnome-shell-extension-suspend-button
====================================

GNOME Shell Extension Suspend-Button for GNOME 3.10 / 3.12 / 3.14 / 3.16 / 3.18 / 3.20 / 3.22


Installation
============

Run

```
make
make install
```

This will build and install the extension to ``~/.local/share/gnome-shell/extensions/`` and install the logoff icon to ``~/.icons/``.

Alternatively run
```
make
sudo DESTDIR=/ make install
```

This will build and install the extension to ``$(DESTDIR)/usr/share/gnome-shell/extensions/`` and install the logoff icon to ``$(DESTDIR)/usr/share/icons/gnome/scalable/status``.