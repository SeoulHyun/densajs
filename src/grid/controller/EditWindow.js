Ext.define('Densa.grid.controller.EditWindow', {
    mixins: {
        observable: 'Ext.util.Observable'
    },
    uses: [ 'Densa.editWindow.WindowController' ],

    gridController: null,
    editWindowController: null,
    openOnDblClick: true,

    _removePhantomOnCancel: false,

    constructor: function(config) {
        this.mixins.observable.constructor.call(this, config);
        this.init();
    },

    init: function()
    {
        if (this.windowSaveButton) Ext.Error.raise('windowSaveButton config doesn\'t exist anymore');
        if (this.windowDeleteButton) Ext.Error.raise('windowDeleteButton config doesn\'t exist anymore');
        if (this.windowCancelButton) Ext.Error.raise('windowCancelButton config doesn\'t exist anymore');
        if (this.form) Ext.Error.raise('form config doesn\'t exist anymore');
        if (this.bindable) Ext.Error.raise('bindable config doesn\'t exist anymore');

        if (!this.gridController) {
            if (!this.grid) Ext.Error.raise('grid or gridController config is required');
            if (!(this.grid instanceof Ext.grid.Panel)) Ext.Error.raise('grid config needs to be a Ext.grid.Panel');
            this.gridController = this.grid.getController();
        }
        if (!this.gridController) Ext.Error.raise('gridController config is required');
        if (!(this.gridController instanceof Densa.grid.PanelController)) Ext.Error.raise('gridController config needs to be a Densa.grid.PanelController');

        if (!this.editWindowController) {
            if (!this.editWindow) Ext.Error.raise('editWindow or editWindowController config is required');
            if (!(this.editWindow instanceof Ext.window.Window)) Ext.Error.raise('editWindow config needs to be a Ext.window.Window');
            this.editWindowController = this.editWindow.getController();
        }
        if (!this.editWindowController) Ext.Error.raise('editWindowController config is required');
        if (!(this.editWindowController instanceof Densa.editWindow.WindowController)) Ext.Error.raise('editWindowController config needs to be a Densa.editWindow.WindowController');

        if (!this.addButton) this.addButton = this.gridController.view.down('button#addButton');
        if (this.addButton && !(this.addButton instanceof Ext.button.Button)) Ext.Error.raise('addButton config needs to be a Ext.button.Button');

        if (!this.editActionColumn) this.editActionColumn = this.gridController.view.down('actioncolumn#editButton')
        if (this.editActionColumn && !(this.editActionColumn instanceof Ext.grid.column.Column)) Ext.Error.raise('editActionColumn config needs to be a Ext.grid.column.Column');


        if (this.openOnDblClick) {
            this.gridController.view.on('celldblclick', function(grid, td, cellIndex, row, tr, rowIndex, e) {
                this.openEditWindow(row);
            }, this);
        }

        if (this.editActionColumn) {
            this.editActionColumn.on('click', function(view, cell, rowIndex, colIndex, e) {
                this.openEditWindow(this.gridController.view.store.getAt(rowIndex));
            }, this);
        }
        if (this.addButton) {
            this.addButton.on('click', function() {
                var row = this.gridController.view.getStore().model.create();
                this.gridController.view.getStore().add(row);
                this.fireEvent('add', row);
                this.grid.fireEvent('add', row);
                this.openEditWindow(row);
                this._removePhantomOnCancel = true;
            }, this);
        }
        this.editWindow.on('savesuccess', function(type) {
            this.grid.fireEvent('savesuccess', type);
            this.gridController.view.getStore().reload();
        }, this);
        this.editWindow.on('save', function () {
            this.grid.fireEvent('save');
        }, this);
        this.editWindow.on('cancel', function () {
            if (this._removePhantomOnCancel) {
                var row = this.editWindowController.getLoadedRecord();
                if (row.phantom) {
                    this.gridController.view.getStore().remove(row);
                }
            }
            this._removePhantomOnCancel = false;
        }, this);
    },
    openEditWindow: function(row)
    {
        this._removePhantomOnCancel = false;
        this.editWindowController.openEditWindow(row, this.gridController.view.store);
    }
});
