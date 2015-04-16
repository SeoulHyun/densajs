Ext.define('Densa.defaultButton.Save', {
    extend: 'Ext.button.Button',
    requires: [
        'Densa.defaultButton.SaveController'
    ],
    alias: 'widget.densa.defaultButton.save',
    controller: 'densa.defaultButton.save',
    defaultText: 'Save',
    alias: 'widget.densa.defaultButton.save',
    constructor: function(config)
    {
        if (!config) config = {};
        if (!config.text) config.text = this.defaultText;
        if (!config.itemId) config.itemId = 'saveButton';
        this.callParent([config]);
    }
});
