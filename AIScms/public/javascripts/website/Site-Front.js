/*global Ext*/
/*global Kernel*/
function mySite(op) {

    Kernel.socket.on('addpage', function (data) {
        Ext.getCmp('grid_pages').getStore().insert(0, data);
    });

    Kernel.socket.on('updatepage', function (data) {        
        Ext.getCmp('grid_pages').getStore().insert(data.rowIndex, data);
    });
    

    var saitTabs = Ext.create('Ext.tab.Panel', {

        id: 'saitTab',
        icons: op.icon,
        titles: op.title,
        collapsible: false,
        region: 'center',
        margin: '0 0 0 0'

    });

    Sites();
    cats();
    Pages();
    Price();


    function cats() {

        var pan = Ext.create('Ext.panel.Panel', {
            xtype: 'panel',
            title: 'Содержание'
        });
        saitTabs.add(pan);
    }

    function Sites() {

        Ext.define('Sites', {
            extend: 'Ext.data.Model',
            idProperty: 'id',
            fields: [
                { name: 'id' },
                { name: 'domain' },
                { name: 'company' }
            ]
        });

        var addAction = Ext.create('Ext.Action', {
            iconCls: 'icon-add',
            text: 'Добавить',
            disabled: false,
            handler: function (widget, event) {
                Site();
            }
        });
        var editAction = Ext.create('Ext.Action', {
            iconCls: 'icon-edit',
            text: 'Редактировать',
            disabled: true,
            handler: function (widget, event) {
                var rec = gridSites.getSelectionModel().getSelection()[0];
                if (rec) {
                    Site(rec);
                }
            }
        });
        var deleteAction = Ext.create('Ext.Action', {
            iconCls: 'icon-delete',
            text: 'Удалить',
            disabled: true,
            handler: function (widget, event) {
                var rec = gridSites.getSelectionModel().getSelection()[0];
                if (rec) {
                }
            }
        });
        var contextMenu = Ext.create('Ext.menu.Menu', {
            items: [
                addAction,
                editAction,
                deleteAction
            ]
        });

        var store = Ext.create('Ext.data.Store', {
            model: 'Sites',
            pageSize: 20,
            autoLoad: true,
            groupField: 'company',
            remoteSort: false,
            proxy: {
                disableCaching: false,
                type: 'ajax',
                url: '/getSites',
                method: 'POST',
                reader: {
                    type: 'json',
                    root: 'sites'
                }
            }
        });
        
        var gridSites = Ext.create('Ext.grid.Panel', {
            //title: 'Сайты',
            store: store,
            width: '100%',
            id: 'grid_sites',
            features: [Ext.create('Ext.grid.feature.Grouping', { groupHeaderTpl: '{name} ({rows.length})' })],
            listeners: {
                celldblclick: function (table, td, cellIndex, record, tr, rowIndex, e, eOpts) {                    
                    Site(record, rowIndex);
                },
                cellclick: function (table, td, cellIndex, record, tr, rowIndex, e, eOpts) {
                    SiteToTree(record, rowIndex);
                }
            },
            columns: [{
                header: 'ID',
                dataIndex: 'id',
                width: 30,
                hidden: true
            }, {
                    header: 'Домен сайта',
                    dataIndex: 'domain',
                    width: '50%',
                    flex: 1
                }, {
                    header: 'Компания',
                    dataIndex: 'company',
                    width: '50%',
                    hidden: true,
                    flex: 1
                }],
            dockedItems: [{
                xtype: 'pagingtoolbar',
                store: store,
                dock: 'bottom',
                displayInfo: true,
                beforePageText: 'Страница',
                afterPageText: 'из {0}',
                displayMsg: 'показано {0} - {1} из {2}'
            }],
            viewConfig: {
                stripeRows: true,
                listeners: {
                    itemcontextmenu: function (view, rec, node, index, e) {
                        e.stopEvent();
                        contextMenu.showAt(e.getXY());
                        return false;
                    }
                }
            },
            tbar: [
                addAction, editAction, deleteAction
            ]
        });

        var pan = Ext.create('Ext.panel.Panel', {  
            title: 'Основное',          
            xtype: 'layout-border',
            layout: 'border',
            bodyBorder: false,
            minWidth: 250,
            defaults: {
                split: true,
                bodyPadding: 10
            },
            items: [
                {
                    title: 'Настройка',
                    region: 'east',
                    width: '33%',
                    collapsible: true,
                    margin: '5 5 0 0',
                    //minHeight: 75,
                    //maxHeight: 150,
                    html: '<p>Footer content</p>'
                },
                {
                    title: 'Список сайтов',
                    id: 'site-list',
                    region: 'west',
                    floatable: true,
                    layout: 'fit',
                    margin: '5 0 0 5',
                    width: '33%',
                    iteml: [gridSites]
                },
                {
                    title: 'Содержание',
                    collapsible: true,
                    region: 'center',
                    margin: '5 0 0 0',
                    width: '33%',
                    html: '<h2>Main Page</h2><p>This is where the main content would go</p>'
                }
            ]
        });

        Ext.getCmp('site-list').add(gridSites);

        gridSites.getSelectionModel().on({
            selectionchange: function (sm, selections) {
                if (selections.length) {
                    editAction.enable();
                    deleteAction.enable();
                } else {
                    editAction.disable();
                    deleteAction.disable();
                }
            }
        });

        saitTabs.add(pan);

    }

    function SiteToTree(record, rowIndex) {
        console.log(record);
        var store = Ext.create('Ext.data.TreeStore', {
            model: 'Task',
            proxy: {
                type: 'ajax',
                //the store will get the content from the .json file
                url: '/getSiteTree'
            },
            folderSort: true
        });
    };

    function Site(data, rowIndex) {
        
        var title, id, resp, domain;
        resp = {};

        if (data == null) {
            id = 0;
            title = 'Новый сайт';
            domain = '';
            resp.main_theme = 0;
            resp.alias = '';
            resp.script = '';
            resp.css = '';
            resp.footer = '';
            resp.header = '';

        } else {

            id = data.get('id');
            domain = data.get('domain');


            Ext.Ajax.request({
                disableCaching: false,
                url: '/getSite?id=' + id,
                method: "POST",
                async: false,
                success: function (response) {
                    
                    resp = JSON.parse(response.responseText); 

                },
                failure: function (response) {
                    console.log(response);
                }
            });
            
            title = 'Редактируем сайт - ' + data.get('domain');            
        }

        var formsite = Ext.create('Ext.form.Panel', {
            id: 'formsite-' + id,
            xtype: 'layout-border',            
            titles: title,
            layout: 'border',
            bodyBorder: false,
            defaults: {
                split: true,
                bodyPadding: 5
            },
            fieldDefaults: {
                labelAlign: 'top',
                labelWidth: 128,
                anchor: '80%'
            },
            items: [
                {
                    split: false,
                    region: 'north',
                    height: 115,
                    minHeight: 75,
                    maxHeight: 150,
                    items: [
                        {
                            xtype: 'textfield',
                            name: 'id',
                            hidden: true,
                            value: id
                        },
                        {
                            xtype: 'textfield',
                            name: 'main_theme',
                            hidden: true,
                            value: resp.main_theme
                        },
                        {
                            xtype: 'textfield',
                            name: 'rowindex',
                            hidden: true,
                            value: rowIndex
                        },
                        {
                            xtype: 'fieldset',
                            title: 'Основные настройки',
                            layout: 'column',
                            defaultType: 'container',
                            items: [
                                {
                                    columnWidth: .5,
                                    margin: '0 10 10 0',
                                    xtype: 'textfield',
                                    name: 'domain',
                                    fieldLabel: 'Доменное имя',
                                    value: domain
                                }, {
                                    columnWidth: .5,
                                    margin: '0 0 10 0',
                                    xtype: 'textfield',
                                    name: 'alias',
                                    fieldLabel: 'Второе доменное имя',
                                    value: resp.alias
                                }, {
                                    columnWidth: .5,
                                    margin: '0 0 10 0',
                                    xtype: 'checkboxfield',
                                    name: 'on',
                                    labelAlign: 'right',
                                    labelWidth: 55,
                                    fieldLabel: 'Включён'
                                }],
                        }]
                },
                {
                    region: 'west',   
                    floatable: false,                 
                    margin: '0 0 0 0',
                    width: '50%', 
                    layout: {
                        type: 'vbox',
                        align: 'stretch'  // Child items are stretched to full width
                    },                   
                    items: [
                        {
                            xtype: 'textareafield',
                            fieldLabel: 'Стили',
                            //anchor: '-5',
                            flex: 1,
                            name: 'css',
                            value: resp.css
                        },
                        {
                            xtype: 'textareafield',
                            fieldLabel: 'Скрипты',
                            //anchor: '-5',
                            flex: 1,
                            name: 'script',
                            value: resp.script
                        }
                    ]
                },
                {
                    region: 'center',
                    collapsible: false,
                    width: '50%',
                    margin: '0 0 0 0',
                    layout: {
                        type: 'vbox',
                        align: 'stretch'  // Child items are stretched to full width
                    },
                    items: [
                        {
                            xtype: 'textareafield',
                            fieldLabel: 'Хедер',
                            //anchor: '-5',
                            flex: 1,
                            name: 'header',
                            value: resp.header
                        },
                        {
                            xtype: 'textareafield',
                            fieldLabel: 'Футер',
                            //anchor: '-5',
                            flex: 1,
                            name: 'footer',
                            value: resp.footer
                        }
                    ]
                }
            ],                
            buttons: ['->', {
                text: 'Применить',
                handler: function () {
                    formsite.getForm().submit({
                        url: '/SaveSite',
                        method: "POST",
                        success: function (form, action) {                            
                            Ext.getCmp('grid_sites').getStore().reload();
                            if (action.result.id)
                                formsite.getForm().setValues({ id: action.result.id, main_theme: action.result.main_theme });
                            //Ext.getCmp('grid_pages').getStore().reload();
                            //Ext.getCmp('grid_pages').getStore().insert(0, this);

                        },
                        failure: function (form, action) {
                            Ext.MessageBox.alert('Произошла ошибка! ', action.result.message);
                        }
                    });
                }
            }, {
                text: 'Сохранить',
                handler: function () {
                    formsite.getForm().submit({
                        url: '/SaveSite',
                        method: "POST",
                        success: function (form, action) {                            
                            Ext.getCmp('win-id-formsite-' + id).close();
                            Ext.getCmp('grid_sites').getStore().reload();
                        },
                        failure: function (form, action) {
                            Ext.MessageBox.alert('Произошла ошибка! ', action.result.message);
                        }
                    });
                }
            }, {
                    text: 'Отменить',
                    handler: function () {
                        Ext.getCmp('win-id-formsite-' + id).close();
                    }
                }]
        });

        Kernel.winCreate(formsite, 500, 400);
    };

    function Pages() {

        Ext.define('Pages', {
            extend: 'Ext.data.Model',
            idProperty: 'id',
            fields: [
                { name: 'ID' },
                { name: 'NAME' },
                { name: 'BODY' },
                { name: 'PUBLE' },
                {name: 'NAME_ID'}
            ]
        });

        var addAction = Ext.create('Ext.Action', {
            iconCls: 'icon-add',
            text: 'Добавить',
            disabled: false,
            handler: function (widget, event) {
                Page();
            }
        });
        var editAction = Ext.create('Ext.Action', {
            iconCls: 'icon-edit',
            text: 'Редактировать',
            disabled: true,
            handler: function (widget, event) {
                var rec = gridPages.getSelectionModel().getSelection()[0];
                if (rec) {
                    Page(rec);
                }
            }
        });
        var deleteAction = Ext.create('Ext.Action', {
            iconCls: 'icon-delete',
            text: 'Удалить',
            disabled: true,
            handler: function (widget, event) {
                var rec = gridPages.getSelectionModel().getSelection()[0];
                if (rec) {
                }
            }
        });
        var contextMenu = Ext.create('Ext.menu.Menu', {
            items: [
                addAction,
                editAction,
                deleteAction
            ]
        });

        var store = Ext.create('Ext.data.Store', {
            model: 'Pages',
            pageSize: 20,
            autoLoad: true,
            remoteSort: true,
            proxy: {
                disableCaching: false,
                type: 'ajax',
                url: '/getPages',
                method: 'POST',
                reader: {
                    type: 'json',
                    root: 'pages'
                }
            }
        });

        var gridPages = Ext.create('Ext.grid.Panel', {
            title: 'Страницы',
            store: store,
            width: '100%',
            id: 'grid_pages',
            listeners: {
                celldblclick: function (table, td, cellIndex, record, tr, rowIndex, e, eOpts) {
                    var id = record.data.id;                    
                    Page(record, rowIndex);
                }
            },
            columns: [{
                header: 'ID',
                dataIndex: 'id',
                width: 30,
                //hidden: true
            }, {
                    header: 'Имя',
                    dataIndex: 'name',
                    width: '100%',
                    flex: 1
                }],
            dockedItems: [{
                xtype: 'pagingtoolbar',
                store: store,
                dock: 'bottom',
                displayInfo: true,
                beforePageText: 'Страница',
                afterPageText: 'из {0}',
                displayMsg: 'показано {0} - {1} из {2}'
            }],
            viewConfig: {
                stripeRows: true,
                listeners: {
                    itemcontextmenu: function (view, rec, node, index, e) {
                        e.stopEvent();
                        contextMenu.showAt(e.getXY());
                        return false;
                    }
                }
            },
            tbar: [
                addAction, editAction, deleteAction
            ]
        });

        gridPages.getSelectionModel().on({
            selectionchange: function (sm, selections) {
                if (selections.length) {
                    editAction.enable();
                    deleteAction.enable();
                } else {
                    editAction.disable();
                    deleteAction.disable();
                }
            }
        });

        saitTabs.add(gridPages);
    };  
    
    function Page(data, rowIndex) {

        var title, name, body, puble, id;

        if (data == null) {
            id = 0;
            title = 'Новая страница';
            name = '';
            body = '';
            puble = false;
        } else {
            id = data.get('id');
            title = 'Редактируем страницу - ' + data.get('name');
            name = data.get('name');
            body = data.get('body');
            if (data.get('puble') == 1) { puble = true } else { puble = false };
        };

        var formpage = Ext.create('Ext.form.Panel', {
            id: 'formpage' + id,
            xtype: 'form-fieldtypes',
            bodyPadding: 5,
            titles: title,
            fieldDefaults: {
                labelWidth: 80,
                labelAlign: 'top',
                anchor: '100%'
            },
            layout: {
                type: 'vbox',
                align: 'stretch'  // Child items are stretched to full width
            },
            items: [
                {
                    xtype: 'textfield',
                    name: 'id',
                    hidden: true,
                    value: id
                },
                {
                    xtype: 'textfield',
                    name: 'name',
                    fieldLabel: 'Название страницы',
                    value: name
                }, {
                    xtype: 'htmleditor',
                    name: 'body',
                    fieldLabel: 'Содержание',
                    value: body,
                    emptyText: 'Содержаниеe',
                    flex: 1
                }, {
                    xtype: 'checkboxfield',
                    name: 'puble',
                    fieldLabel: 'Публиковать',
                    checked: puble,
                    labelAlign: 'left',
                }],
            buttons: [
                {
                    text: 'Сохранить',
                    handler: function () {                        
                        formpage.getForm().submit({
                            url: '/SavePage?rowIndex=' + rowIndex,
                            method: "POST",
                            success: function (form, action) {
                                Ext.getCmp('win-id-formpage' + id).close();
                                //Ext.getCmp('grid_pages').getStore().reload();
                                //Ext.getCmp('grid_pages').getStore().insert(0, this);

                            },
                            failure: function (form, action) {
                                Ext.MessageBox.alert('Произошла ошибка! ', action.result.message);
                            }
                        });
                    }
                }]
        });
        Kernel.winCreate(formpage, 500, 400);
    };

    function Price() {

        Ext.define('Price', {
            extend: 'Ext.data.Model',
            idProperty: 'id',
            fields: [{
                name: 'id',
                type: 'int'
            }, {
                    name: 'name',
                    type: 'string'
                }, {
                    name: 'note',
                    type: 'string'
                }
                , {
                    name: 'section',
                    type: 'string'
                },
                {
                    name: 'img',
                    type: 'string'
                }, {
                    name: 'price',
                    type: 'string'
                },
                {
                    name: 'rcmd',
                    type: 'string'
                }]
        });

        var store = Ext.create('Ext.data.Store', {
            model: 'Price',
            pageSize: 20,
            autoLoad: true,
            remoteSort: true,
            proxy: {
                disableCaching: false,
                type: 'ajax',
                url: '/Admin/getPrice',
                reader: {
                    type: 'json',
                    root: 'data'
                }
            }
        });

        var addAction = Ext.create('Ext.Action', {
            iconCls: 'icon-add',
            text: 'Добавить',
            disabled: false,
            handler: function (widget, event) {
                //console.log(widget);
                Price();
            }
        });
        var editAction = Ext.create('Ext.Action', {
            iconCls: 'icon-edit',
            text: 'Редактировать',
            disabled: true,
            handler: function (widget, event) {
                var rec = grid_pages.getSelectionModel().getSelection()[0];
                if (rec) {
                    Price(rec);
                }
            }
        });
        var deleteAction = Ext.create('Ext.Action', {
            iconCls: 'icon-delete',
            text: 'Удалить',
            disabled: true,
            handler: function (widget, event) {
                var rec = grid_pages.getSelectionModel().getSelection()[0];
                if (rec) {
                }
            }
        });
        var contextMenu = Ext.create('Ext.menu.Menu', {
            items: [
                addAction,
                editAction,
                deleteAction
            ]
        });

        var grid_price = Ext.create('Ext.grid.Panel', {
            title: 'Каталог',
            store: store,
            width: '100%',
            id: 'grid_price',
            listeners: {
                celldblclick: function (table, td, cellIndex, record, tr, rowIndex, e, eOpts) {
                    Price(record);
                }
            },
            columns: [{
                header: 'ID',
                dataIndex: 'id',
                width: '3%',
                hidden: true
            }, {
                    header: 'Картинка',
                    dataIndex: 'img',
                    renderer: renderIcon,
                    width: 60
                }, {
                    header: 'Имя',
                    dataIndex: 'name',
                    //width: '100%',
                    flex: 1
                }, {
                    header: 'Цена',
                    dataIndex: 'price',
                    //width: '100%',
                    flex: 1
                }],
            dockedItems: [{
                xtype: 'pagingtoolbar',
                store: store,
                dock: 'bottom',
                displayInfo: true,
                beforePageText: 'Страница',
                afterPageText: 'из {0}',
                displayMsg: 'показано {0} - {1} из {2}'
            }],
            viewConfig: {
                stripeRows: true,
                getRowClass: function (record, rowIndex, rp, store) {
                    //rp.tstyle += 'height: 50px;';
                },
                listeners: {
                    itemcontextmenu: function (view, rec, node, index, e) {
                        e.stopEvent();
                        contextMenu.showAt(e.getXY());
                        return false;
                    }
                }
            },
            tbar: [
                addAction, editAction, deleteAction
            ]
        });

        function renderIcon(val) {
            return '<img width="50" src="' + val + '">';
        }

        grid_price.getSelectionModel().on({
            selectionchange: function (sm, selections) {
                if (selections.length) {
                    editAction.enable();
                    deleteAction.enable();
                } else {
                    editAction.disable();
                    deleteAction.disable();
                }
            }
        });

        saitTabs.add(grid_price);
    };

    function PriceWin(data) {
        var title, name, note, puble, id;

        if (data == null) {
            id = 0;
            title = 'Новый товар';
            name = '';
            note = '';
            puble = false;
        } else {
            id = data.get('id');
            title = 'Редактируем товар - ' + data.get('name');
            name = data.get('name');
            note = data.get('note');
            if (data.get('puble') == "true") { puble = true } else { puble = false };
        };
    };
     
    Kernel.winCreate(saitTabs, 450, 350);
};