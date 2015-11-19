Ext.define('Densa.editWindow.WindowController', {
    extend: 'Densa.mvc.ViewController',
    uses: [ 'Densa.data.StoreSyncQueue' ],

    focusOnEditSelector: 'field',
    bindable: null,
    autoSync: true,

    deleteConfirmText: 'Do you really wish to remove this entry?',
    deleteConfirmTitle: 'Delete',
    addTitle: 'Add',
    editTitle: 'Edit',
    saveChangesTitle: 'Save',
    saveChangesMsg: 'Do you want to save the changes?',
    _saveKeyMap: null,

    optionalControl: {

        saveButton: {
            selector: '> toolbar > button#saveButton',
            listeners: {
                click: 'onSaveClick'
            }
        },

        deleteButton: {
            selector: '> toolbar > button#deleteButton',
            listeners: {
                click: 'onDeleteClick'
            }
        },

        cancelButton: {
            selector: '> toolbar > button#cancelButton',
            listeners: {
                click: 'onCancelClick'
            }
        }

    },
    init: function()
    {
        if (!this.view) Ext.Error.raise('view is required');
        if (!(this.view instanceof Ext.window.Window)) Ext.Error.raise('view needs to be a Ext.window.Window');

        if (!this.bindable) {
            //by default (most common case) get form
            this.bindable = this.view.down('> form');
        }
        if (!this.bindable) Ext.Error.raise('bindable config is required');
        if (!this.bindable.isBindableController && this.bindable.getController) {
            this.bindable = this.bindable.getController();
        }
        if (!this.bindable.isBindableController) {
            Ext.Error.raise('bindable config needs to be a Densa.mvc.bindable.Interface');
        }

        this.view.on('beforeclose', function() {
            this.onCancelClick();
            return false;
        }, this);

        if (this.view.closeAction == 'destroy') {
            this.view.on('destroy', function() {
                if (this._isBindableViewForm()) {
                    this._saveKeyMap.destroy();
                }
            }, this);
        } else if (this.view.closeAction == 'hide') {
            this.view.on('hide', function() {
                if (this._isBindableViewForm() && this._saveKeyMap.isEnabled()) {
                    this._saveKeyMap.disable();
                }
            }, this);
        }

        this.view.on('show', function() {
            if (this._isBindableViewForm()) {
                if (!this._saveKeyMap) {
                    this._saveKeyMap = new Ext.util.KeyMap({
                        target: Ext.getBody(),
                        binding: [{
                            key: Ext.EventObject.ENTER,
                            ctrl: true,
                            fn: function (keyCode, e) {
                                if (!this.view.isVisible()) return;
                                if (!document.activeElement) return;
                                var parentField = Ext.get(document.activeElement).findParent('.x4-field');
                                if (!parentField) return;
                                if (Ext.getCmp(parentField.id).xtype != 'textarea') return;

                                e.stopEvent();
                                this.onSaveClick();
                            },
                            scope: this
                        }, {
                            key: Ext.EventObject.ENTER,
                            ctrl: false,
                            fn: function (keyCode, e) {
                                if (!this.view.isVisible()) return;
                                if (!document.activeElement) return;
                                var parentField = Ext.get(document.activeElement).findParent('.x4-field');
                                if (!parentField) return;
                                var activeField = Ext.getCmp(parentField.id);
                                if (activeField.xtype == 'textareafield') return;

                                if (activeField.forceSelection && activeField instanceof Ext.form.field.Trigger) {
                                    activeField.triggerBlur();
                                }
                                e.stopEvent();
                                this.onSaveClick();
                            },
                            scope: this
                        }]
                    });
                }
                if (!this._saveKeyMap.isEnabled()) this._saveKeyMap.enable();
            }
        }, this);

        this.bindable.on('savesuccess', function(type) {
            this.fireViewEvent('savesuccess', type);
            this.fireEvent('savesuccess', type);
        }, this);
    },

    _isBindableViewForm: function()
    {
        if (this.bindable.view == undefined) return false;
        return this.bindable.view.isXType('form');
    },

    //store is optional, used for sync
    openEditWindow: function(row, store)
    {
        this._loadedStore = store;
        if (row.phantom) {
            this.view.setTitle(this.addTitle);
        } else {
            this.view.setTitle(this.editTitle);
        }
        this.view.show();
        this.bindable.load(row, store);
        if (this.focusOnEditSelector) {
            this.view.down(this.focusOnEditSelector).focus();
        }
    },

    doSave: function()
    {
        return this.bindable.allowSave().then({
            success: function() {

                var row = this.bindable.getLoadedRecord();
                if (row.phantom && this._loadedStore
                    && this._loadedStore.indexOf(row) == -1
                ) {
                    this._loadedStore.add(row);
                }

                if (this.autoSync) {
                    if (this._loadedStore) {
                        var syncQueue = new Densa.data.StoreSyncQueue();
                        syncQueue.add(this._loadedStore); //sync store first
                        this.bindable.save(syncQueue);    //then bindables (so bindable grid is synced second)
                                                        //bindable forms can still update the row as the sync is not yet started
                        syncQueue.start({
                            success: function() {
                                this.fireViewEvent('savesuccess', 'save');
                                this.fireEvent('savesuccess', 'save');
                            },
                            scope: this
                        });
                    } else {
                        this.bindable.save();
                        this.bindable.getLoadedRecord().save({
                            callback: function(records, operation, success) {
                                if (!success) return;
                                this.fireViewEvent('savesuccess', 'save');
                                this.fireEvent('savesuccess', 'save');
                            },
                            scope: this
                        });
                    }
                } else {
                    this.bindable.save();
                }
                this.fireViewEvent('save');

            },
            scope: this
        });
    },

    onSaveClick: function()
    {
        this.doSave().then({
            success: function() {
                this.closeWindow();
            },
            scope: this
        });
    },

    onCancelClick: function()
    {
        if (this.bindable.isDirty()) {
            Ext.Msg.show({
                title: this.saveChangesTitle,
                msg: this.saveChangesMsg,
                icon: Ext.MessageBox.QUESTION,
                buttons: Ext.Msg.YESNOCANCEL,
                fn: function(btn) {
                    if (btn == 'no') {
                        this.fireViewEvent('cancel');
                        this.closeWindow();
                    } else if (btn == 'yes') {
                        this.doSave().then({
                            success: function() {
                                this.closeWindow();
                            },
                            scope: this
                        });
                    }
                },
                scope: this
            });
        } else {
            this.fireViewEvent('cancel');
            this.closeWindow();
        }
    },

    closeWindow: function()
    {
        this.view.hide();
        this.bindable.reset();
    },

    getLoadedRecord: function()
    {
        if (this.bindable) {
            return this.bindable.getLoadedRecord();
        } else {
            return null;
        }
    },

    onDeleteClick: function()
    {
        this.bindable.allowDelete().then({
            success: function() {
                if (this.autoSync) {
                    Ext.Msg.show({
                        title: this.deleteConfirmTitle,
                        msg: this.deleteConfirmText,
                        icon: Ext.MessageBox.QUESTION,
                        buttons: Ext.Msg.YESNO,
                        scope: this,
                        fn: function(button) {
                            if (button == 'yes') {
                                if (this._loadedStore) {
                                    this._loadedStore.remove(this.getLoadedRecord());
                                    this._loadedStore.sync();
                                } else {
                                    this.getLoadedRecord().destroy();
                                }
                                this.closeWindow();
                            }
                        }
                    });
                } else {
                    if (!this._loadedStore) {
                        Ext.Error.raise("Can't delete record without store");
                    }
                    this._loadedStore.remove(this.getLoadedRecord());
                    this.closeWindow();
                }
            },
            scope: this
        });
    }

});
