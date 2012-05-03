Ext.define('CustomApp',
    {
        extend:'Rally.app.App',
        itemId:'rallyapp',
        componentCls:'app',

        launch:function () {
            this._overrideTree();
            this._getDefaultRequirements();
            this._getPrefRequirements();
        },

        // this method overrides the treeitem used by the tree component so the requirement type of the user story is displayed
        _overrideTree:function () {
            Ext.define('TreeItemOverride',
                {
                    override:'Rally.ui.tree.TreeItem',
                    getPillTpl:function () {
                        var me = this;

                        return Ext.create('Ext.XTemplate', '<div class="pill">', '<tpl if="this.canDrag()"><div class="icon drag"></div></tpl>', '{[this.getActionsGear()]}', '<div class="textContent ellipses">{[this.getFormattedId()]} {[this.getType(values)]}{[this.getSeparator()]}{Name}</div>', '<div class="rightSide">', '{[this.getRequirementType()]}', '</div>', '</div>',
                            {
                                canDrag:function () {
                                    return me.getCanDragAndDrop();
                                },
                                getActionsGear:function () {
                                    return '<div class="row-action icon"></div>';
                                },
                                getFormattedId:function () {
                                    return me.getRecord().getField('FormattedID') ? me.getRecord().render('FormattedID') : '';
                                },
                                getType:function (values) {
                                    return values.PortfolioItemType ? '(' + values.PortfolioItemType._refObjectName + ')' : '';
                                },
                                getRequirementType:function () {
                                    return me.getRecord().getField('RequirementType') ? me.getRecord().render('RequirementType') : '';
                                },
                                getSeparator:function () {
                                    return this.getFormattedId() ? ' - ' : '';
                                }
                            });
                    }
                });
        },

        // retrieves the requirement types defined for a user story
        _getDefaultRequirements:function () {
            Ext.create('Rally.data.WsapiDataStore',
                {
                    model:'TypeDefinition',
                    autoLoad:true,
                    filters:{
                        property:'Name',
                        operator:'=',
                        value:'Hierarchical Requirement'
                    },
                    listeners:{
                        load:function (store, data) {
                            var allowedValues = [];
                            Ext.each(data[0].data.Attributes, function (attr) {
                                if (attr.Name === 'Requirement Type') {
                                    Ext.each(attr.AllowedValues, function (value) {
                                        if (value.StringValue !== "") {
                                            allowedValues.push(value.StringValue);
                                        }
                                    }, this)
                                }
                            }, this);
                            this.defaultRequirements = allowedValues;
                        },
                        scope:this
                    }
                });
        },

        // retrieves the requirement types saved as a pref for this app by this user
        _getPrefRequirements:function () {
            Ext.create('Rally.data.WsapiDataStore',
                {
                    model:'Preference',
                    autoLoad:true,
                    filters:[
                        {
                            property:'Name',
                            operator:'=',
                            value:'requirements.hierarchy.tree.app.settings'
                        },
                        {
                            property:'User',
                            operator:'=',
                            value:'/user/' + Rally.environment.getContext().getUser().ObjectID
                        }
                    ],
                    listeners:{
                        load:function (store, data) {
                            if (data.length === 1) {
                                this.prefRequirements = data[0].data.Value.split(',');
                            }
                            this._addMainContainer();
                        },
                        scope:this
                    }
                });
        },

        // creates the container that contains the settings button and tree
        _addMainContainer:function () {
            this.add(
                {
                    xtype:'container',
                    autoScroll:true,
                    height:'100%',
                    items:[
                        {
                            xtype:'rallybutton',
                            text:'Hierarchy Settings',
                            cls: 'settings-button',
                            handler:this._launchHierarchySettings,
                            scope:this
                        },
                        {
                            xtype:'rallytree',
                            childModelTypeForRecordFn:function () {
                                return 'User Story';
                            },
                            parentAttributeForChildRecordFn:function () {
                                return 'Parent';
                            },
                            canExpandFn:function (record) {
                                return record.get('Children') && record.get('Children').length;
                            },
                            enableDragAndDrop:true,
                            dragThisGroupOnMeFn:function (record) {
                                if (record.get('_type') === 'hierarchicalrequirement') {
                                    return 'hierarchicalrequirement';
                                }
                            },
                            listeners:{
                                beforerecordsaved:this._getChildRequirementType,
                                scope:this
                            }
                        }
                    ]

                });
        },

        // updates the user story just dropped using the user's preference if it exists or the default requirements
        _getChildRequirementType:function (record, newParentRecord, eOpts) {
            var requirements = this.prefRequirements || this.defaultRequirements;
            var parentIndex = Ext.Array.indexOf(requirements, newParentRecord.get('RequirementType'));

            if (parentIndex !== -1 && parentIndex !== requirements.length - 1) {
                var myType = requirements[parentIndex + 1];
                record.set('RequirementType', myType);
                record.save();
            }
        },

        // creates the settings dialog form
        _launchHierarchySettings:function () {
            var window = Ext.create('Rally.ui.dialog.Dialog', {
                title:'Requirement Type Hierarchy',
                itemId:'window',
                closable:true,
                modal:false,
                height:375,
                width:300,
                items:this._buildFormItems(),
                listeners:{
                    savedForm:{
                        fn:function (eOpts) {
                            this.prefRequirements = eOpts.hierarchy;
                        },
                        scope:this
                    }
                }
            });

            window.addEvents['savedForm'];
            window.show();
        },

        // creates the form items dynamically
        _buildFormItems:function () {
            var items = [];

            items.push(
                {
                    xtype:'container',
                    cls: 'settings-description',
                    html:'Your workspace has the defined requirement types below. You can customize which ones to use and ignore for this app when assigning requirement types to children.'
                });

            Ext.each(this.defaultRequirements, function (value, key) {
                var isDisabled = this.prefRequirements && Ext.Array.indexOf(this.prefRequirements, value) === -1;
                var buttonText = isDisabled ? 'Use' : 'Ignore';
                var valueId = 'requirement' + key;
                items.push(
                    {
                        xtype:'container',
                        layout:'hbox',
                        cls: 'requirements-form',
                        items:[
                            {
                                xtype:'rallytextfield',
                                value:value,
                                readOnly:true,
                                disabled:isDisabled,
                                itemId:valueId,
                                width:200,
                                cls: 'requirements-textfield'
                            },
                            {
                                xtype:'rallybutton',
                                text:buttonText,
                                value:value,
                                cls:'requirementButton',
                                handler:function (button) {
                                    if (button.getText() === 'Ignore') {
                                        this.up('#window').down('#' + valueId).setDisabled(true);
                                        button.setText('Use');
                                    }
                                    else {
                                        this.up('#window').down('#' + valueId).setDisabled(false);
                                        button.setText('Ignore');
                                    }
                                }
                            }
                        ]
                    });
            }, this);

            items.push(
                {
                    xtype:'container',
                    layout:{
                        type:'hbox',
                        pack:'center'
                    },
                    items:[
                        {
                            xtype:'rallybutton',
                            text:'Save',
                            cls: 'save-button',
                            handler:function () {
                                var textfields = this.up('#window').query('rallytextfield');
                                var hierarchy = [];

                                Ext.each(textfields, function (field) {
                                    if (!field.isDisabled()) {
                                        hierarchy.push(field.value);
                                    }
                                });

                                Ext.create('Rally.data.WsapiDataStore',
                                    {
                                        model:'Preference',
                                        autoLoad:true,
                                        filters:[
                                            {
                                                property:'Name',
                                                operator:'=',
                                                value:'requirements.hierarchy.tree.app.settings'
                                            },
                                            {
                                                property:'User',
                                                operator:'=',
                                                value:'/user/' + Rally.environment.getContext().getUser().ObjectID
                                            }
                                        ],
                                        listeners:{
                                            load:function (store, data) {
                                                var window = this.up('#window');
                                                if (data.length === 1) { //update existing preference
                                                    var record = data[0];
                                                    record.set('Value', hierarchy.join(','));
                                                    record.save();
                                                    window.fireEvent('savedForm', {hierarchy:hierarchy});
                                                } else if (data.length === 0) { //create preference
                                                    Rally.data.ModelFactory.getModel({
                                                        type:'Preference',
                                                        success:function (model) {
                                                            var record = Ext.create(model, {
                                                                Name:'requirements.hierarchy.tree.app.settings',
                                                                Value:hierarchy.join(','),
                                                                User:Rally.environment.getContext().getUser().ObjectID

                                                            });
                                                            record.save();
                                                            window.fireEvent('savedForm', {hierarchy:hierarchy});
                                                        },
                                                        scope:this
                                                    });
                                                } else {
                                                    console.log("TOO MANY PREFS");
                                                }
                                                window.close();
                                            },
                                            scope:this
                                        }
                                    });
                            }
                        }
                    ]
                });
            return items;
        }
    });