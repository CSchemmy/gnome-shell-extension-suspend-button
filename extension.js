/*  Copyright (C) 2014 Raphael Freudiger <laser_b@gmx.ch>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

   Author: Raphael Freudiger <laser_b@gmx.ch>
   Extensions by: Christoph Schemmelmann <CSchemmy@gmx.de>
**/
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Mainloop = imports.mainloop;

const LoginManager = imports.misc.loginManager;
const Main = imports.ui.main;
const StatusSystem = imports.ui.status.system;
const PopupMenu = imports.ui.popupMenu;
const ExtensionSystem = imports.ui.extensionSystem;

const SHOW_TWO_BUTTONS = 'show-two-buttons';
const SUSPEND_DEFAULT = 'suspend-default';
const REPLACE_POWEROFF = 'replace-poweroff';

const Gettext = imports.gettext.domain('gnome-shell-extension-suspend-button');
const _ = Gettext.gettext;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Lib = Me.imports.lib;

const Extension = new Lang.Class({
    Name: 'SuspendButton.Extension',

    enable: function() {
        this._loginManager = LoginManager.getLoginManager();
        this.systemMenu = Main.panel.statusArea['aggregateMenu']._system;

        this._settings = Lib.getSettings(Me);
        this._toggleTwoButtonsID = this._settings.connect("changed::" + SHOW_TWO_BUTTONS, Lang.bind(this, function() {
            this._update();
        }));
        this._toggleSuspendDefaultID = this._settings.connect("changed::" + SUSPEND_DEFAULT, Lang.bind(this, function() {
            this._update();
        }));
        this._toggleReplacePoweroffID = this._settings.connect("changed::" + REPLACE_POWEROFF, Lang.bind(this, function() {
            this._update();
        }));
        
        this._removealtSwitcher();
        this._setActState();
        this._updateObjects();

        this._menuOpenStateChangedId = this.systemMenu.menu.connect('open-state-changed', Lang.bind(this,
            function(menu, open) {
                if (!open)
                    return;
                this._altsuspendAction.visible = true;
                this._altpowerOff_logOffAction.visible = true;
            }));
    },

    disable: function() {
        this._settings.disconnect(this._toggleTwoButtonsID);
        this._settings.disconnect(this._toggleSuspendDefaultID);
	this._settings.disconnect(this._toggleReplacePoweroffID);
        
        if (this._menuOpenStateChangedId) {
            this.systemMenu.menu.disconnect(this._menuOpenStateChangedId);
            this._menuOpenStateChangedId = 0;
        }

        this._removeObjects();
        this._addDefaultButton();
    },
    
    _update: function() {
        this._removeObjects();
        this._setActState();
        this._updateObjects();
    },
    
    _createActions: function() {
        this._altsuspendAction = this.systemMenu._createActionButton('media-playback-pause-symbolic', _("Suspend"));
        this._altsuspendActionID = this._altsuspendAction.connect('clicked', Lang.bind(this, this._onSuspendClicked));

        if (!this._settings.get_boolean(REPLACE_POWEROFF)) {
            this._altpowerOff_logOffAction = this.systemMenu._createActionButton('system-shutdown-symbolic', _("Power Off"));
            this._altpowerOff_logOffActionId = this._altpowerOff_logOffAction.connect('clicked', Lang.bind(this, this._onPowerOffClicked));
	}
	else {
            this._altpowerOff_logOffAction = this.systemMenu._createActionButton('logoff-symbolic', _("Log Off"));
            this._altpowerOff_logOffActionId = this._altpowerOff_logOffAction.connect('clicked', Lang.bind(this, this._onQuitSessionClicked));
	}
    },
    
    _destroyActions: function() {
        if (this._altsuspendActionId) {
            this._altsuspendAction.disconnect(this._altsuspendActionId);
            this._altsuspendActionId = 0;
        }

        if (this._altpowerOff_logOffActionId) {
            this._altpowerOff_logOffAction.disconnect(this._altpowerOff_logOffActionId);
            this._altpowerOff_logOffActionId = 0;
        }
        
        if (this._altsuspendAction) {
            this._altsuspendAction.destroy();
            this._altsuspendAction = 0;
        }

        if (this._altpowerOff_logOffAction) {
            this._altpowerOff_logOffAction.destroy();
            this._altpowerOff_logOffAction = 0;
        }
    },
    
    _setActState: function() {
       if (this._settings.get_boolean(SHOW_TWO_BUTTONS)) this.state = 1; else this.state = 0;
       if (this._settings.get_boolean(SUSPEND_DEFAULT)) this.state += 2; 
       if (this._settings.get_boolean(REPLACE_POWEROFF)) this.state += 4; 
    },
    
    _removeObjects: function() {
        switch (this.state) {
        case 0:                              // SHOW_TWO_BUTTONS false, SUSPEND_DEFAULT false, REPLACE_POWEROFF false
            this._removealtSwitcher();
            break;
        case 1:                              // SHOW_TWO_BUTTONS true, SUSPEND_DEFAULT false, REPLACE_POWEROFF false
        case 3:                              // SHOW_TWO_BUTTONS true, SUSPEND_DEFAULT true, REPLACE_POWEROFF false
        case 5:                              // SHOW_TWO_BUTTONS true, SUSPEND_DEFAULT false, REPLACE_POWEROFF true
        case 7:                              // SHOW_TWO_BUTTONS true, SUSPEND_DEFAULT true, REPLACE_POWEROFF true
            this._destroyActions();
            break;
        case 2:                              // SHOW_TWO_BUTTONS false, SUSPEND_DEFAULT true, REPLACE_POWEROFF false
        case 4:                              // SHOW_TWO_BUTTONS false, SUSPEND_DEFAULT false, REPLACE_POWEROFF true
        case 6:                              // SHOW_TWO_BUTTONS false, SUSPEND_DEFAULT true, REPLACE_POWEROFF true
            this._removealtStatusSwitcher();
            break;
        default:
            log('Unknown OldState'+ this.state);
            break;
        }
    },

    _updateObjects: function() {
        switch (this.state) {
        case 0:                              // SHOW_TWO_BUTTONS false, SUSPEND_DEFAULT false, REPLACE_POWEROFF false
            this._addDefaultButton();
            break;
        case 1:                              // SHOW_TWO_BUTTONS true, SUSPEND_DEFAULT false, REPLACE_POWEROFF false
        case 3:                              // SHOW_TWO_BUTTONS true, SUSPEND_DEFAULT true, REPLACE_POWEROFF false
        case 5:                              // SHOW_TWO_BUTTONS true, SUSPEND_DEFAULT false, REPLACE_POWEROFF true
        case 7:                              // SHOW_TWO_BUTTONS true, SUSPEND_DEFAULT true, REPLACE_POWEROFF true
            this._createActions();
            this._addSingleButtons();
            break;
        case 2:                              // SHOW_TWO_BUTTONS false, SUSPEND_DEFAULT true, REPLACE_POWEROFF false
        case 6:                              // SHOW_TWO_BUTTONS false, SUSPEND_DEFAULT true, REPLACE_POWEROFF true
            this._createActions();
            this._createaltStatusSwitcher(this._altsuspendAction,this._altpowerOff_logOffAction);
            break;
        case 4:                              // SHOW_TWO_BUTTONS false, SUSPEND_DEFAULT false, REPLACE_POWEROFF true
            this._createActions();
            this._createaltStatusSwitcher(this._altpowerOff_logOffAction,this._altsuspendAction);
            break;
       default:
            log('Unknown State '+ this.state);
            break;
        }
    },

    _addDefaultButton: function() {
        this.systemMenu._actionsItem.actor.add(this.systemMenu._altSwitcher.actor, { expand: true, x_fill: false });
    },
    
    _addSingleButtons: function() {
        this.systemMenu._actionsItem.actor.add(this._altsuspendAction, { expand: true, x_fill: false });
        this.systemMenu._actionsItem.actor.add(this._altpowerOff_logOffAction, { expand: true, x_fill: false });
    },
    
    _removealtSwitcher: function() {
        this.systemMenu._actionsItem.actor.remove_child(this.systemMenu._altSwitcher.actor);
    },
    
    _createaltStatusSwitcher: function(altsuspendAction,altpowerOffAction) {
        this._altStatusSwitcher = new StatusSystem.AltSwitcher(altsuspendAction,altpowerOffAction);
        this.systemMenu._actionsItem.actor.add(this._altStatusSwitcher.actor, { expand: true, x_fill: false });
    },
    
    _removealtStatusSwitcher: function() {
        if (this._altStatusSwitcher) {
            this.systemMenu._actionsItem.actor.remove_child(this._altStatusSwitcher.actor);
            this._altStatusSwitcher.actor.destroy();
            this._altStatusSwitcher = 0;
        }
    },
    
    _onPowerOffClicked: function() {
        this.systemMenu._onPowerOffClicked()
    },

    _onSuspendClicked: function() {
        this.systemMenu._onSuspendClicked();
    },

    _onQuitSessionClicked: function() {
        this.systemMenu.menu.itemActivated();
        this.systemMenu._onQuitSessionActivate();
    }
});

function init(metadata) {
    Lib.initTranslations(Me);
    return new Extension();
}

