				Ext.define('CustomApp',
				{
					extend : 'Rally.app.App',
					componentCls : 'app',

					launch : function()
					{
						Ext.define('USReqType',
						{
							override : 'Rally.ui.tree.TreeItem',
							getPillTpl : function()
							{
								var me = this;

								return Ext.create('Ext.XTemplate', '<div class="pill">', '<tpl if="this.canDrag()"><div class="icon drag"></div></tpl>', '{[this.getActionsGear()]}', '<div class="textContent ellipses">{[this.getFormattedId()]} {[this.getType(values)]}{[this.getSeparator()]}{Name}</div>', '<div class="rightSide">', '{[this.getRequirementType()]}', '</div>', '</div>',
								{
									canDrag : function()
									{
										return me.getCanDragAndDrop();
									},
									getActionsGear : function()
									{
										return '<div class="row-action icon"></div>';
									},
									getFormattedId : function()
									{
										return me.getRecord().getField('FormattedID') ? me.getRecord().render('FormattedID') : '';
									},
									getType : function(values)
									{
										return values.PortfolioItemType ? '(' + values.PortfolioItemType._refObjectName + ')' : '';
									},
									getRequirementType : function()
									{
										return me.getRecord().getField('RequirementType') ? me.getRecord().render('RequirementType') : '';
									},
									getSeparator : function()
									{
										return this.getFormattedId() ? ' - ' : '';
									}
								});
							}
						});
						this.add(
						{
							xtype : 'container',
							autoScroll : true,
							height : '100%',
							items : [
							{
								xtype : 'rallybutton',
								text : 'Hierarchy Settings',
								width : 150,
								style: {
									marginBottom: '20px'
								},
								handler : this._launchHierarchySettings
							},
							{
								xtype : 'rallytree',
								childModelTypeForRecordFn : function()
								{
									return 'User Story';
								},
								parentAttributeForChildRecordFn : function()
								{
									return 'Parent';
								},
								canExpandFn : function(record)
								{
									return record.get('Children') && record.get('Children').length;
								},
								enableDragAndDrop : true,
								dragThisGroupOnMeFn : function(record)
								{
									if(record.get('_type') === 'hierarchicalrequirement')
									{
										return 'hierarchicalrequirement';
									}
								},
								listeners :
								{
									beforerecordsaved : function(record, newParentRecord, eOpts)
									{
										var parentType = newParentRecord.get('RequirementType');
										var myType;

										switch (parentType)
										{
											case 'Investment Theme':
												myType = 'Business Epic';
												break;
											case 'Business Epic':
											case 'Architectural Epic':
											case 'Design Epic':
												myType = 'Feature (CRD)';
												break;
											case 'Feature (CRD)':
												myType = 'User Story (PRS)';
												break;
											case 'User Story (PRS)':
												myType = 'Low Level User Story (subPRS)';
												break;
										}
										record.set('RequirementType', myType);
										record.save();
									},
									scope : this
								}
							}]

						});
					},
					_launchHierarchySettings : function()
					{ 
						Ext.create('Rally.data.WsapiDataStore',
						{
							model : 'TypeDefinition',
							autoLoad : true,
							filters :
							{
								property : 'Name',
								operator : '=',
								value : 'Hierarchical Requirement'
							},
							listeners :
							{
								load : function(store, data)
								{
									var items = [];
									var allowedValues;

									Ext.each(data[0].data.Attributes, function(attr)
									{
										if(attr.Name === 'Requirement Type')
										{
											allowedValues = attr.AllowedValues;
										}
									}, this);

									Ext.each(allowedValues, function(value)
									{
										var valueString = value.StringValue;
										if(valueString.length > 0){
											items.push(
											{
												xtype : 'container',
												layout : 'hbox',
												style :
												{
													paddingTop : '10px',
													paddingLeft : '10px',
													paddingRight : '10px'
												},
												items : [
												{
													xtype : 'rallytextfield',
													value : valueString,
													readOnly : true,
													itemId : valueString,
													style :
													{
														marginRight : '10px'
													}
												},
												{
													xtype : 'rallybutton',
													text : 'Remove',
													value : valueString,
													width: 60,
													handler : Ext.bind(function(button)
													{
														if(button.getText() === 'Remove')
														{
															//                                                    this.up('#window').down('#'
															// + valueString).setDisabled(true);
															button.setText('Add');
														}
														else
														{
															//                                                    this.up('#window').down('#'
															// + valueString).setDisabled(false);
															button.setText('Remove');
														}
													}, this)
												}]
											});
											}
										}, this);


									items.push(
									{
										xtype : 'container',
										layout :
										{
											type : 'hbox',
											pack : 'center'
										},
										style :
										{
											paddingTop : '15px'
										},
										items : [
										{
											xtype : 'rallybutton',
											text : 'Save',
											width: 60,
											handler : Ext.bind(function(button)
											{
												var buttons = this.query('.x-btn');
												var valueButtons = Ext.Array.slice(buttons, 0, buttons.length - 2);

												Ext.each(valueButtons, function(value)
												{
													//get values to use on buttons with 'remove' text
												});

												//save as pref
												console.log("Save me as a pref!");
											}, this)
										}]
									});

									Ext.create('Rally.ui.dialog.Dialog',
									{
										title : 'Requirement Type Hierarchy',
										itemId : 'window',
										closable: true,
										modal: false,
										height : 425,
										width : 300,
										items : items
									}).show();
								},
								scope : this
							}
						});
					}
				}