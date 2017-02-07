var Kernel = {};

Kernel.winCreate = function(data, w, h) {
    var desktopbar = Ext.getCmp('buttonbar');
    var contp = Ext.getCmp('contenPanel');

    if (Ext.getCmp('win-id-' + data.id)) {
        var winvis = Ext.getCmp('win-id-' + data.id);
        winvis.setActive(true, true);
        winvis.setVisible(true);
    }
    else {
        var win = Ext.create('widget.window', {
            title: data.titles,
            icon: data.icons,
            id: 'win-id-' + data.id,
            frame: true,
            height: h,
            width: w,
            modal: false,
            constrain: true,
            maximizable: true,
            minimizable: true,
            layout: 'fit',
            //shadow: 'frame',
            //shadowOffset: 30,
            items: [data],
            listeners: {
                minimize: function (win) {
                    win.hide();

                },
                close: function () {
                    desktopbar.remove(Ext.getCmp('button-id-' + data.id));
                }
            }
        });
        contp.add(win);
        win.show();
        var button = Ext.create('Ext.Button', {
            id: 'button-id-' + data.id,
            icon: data.icons,
            text: data.titles,
            handler: function () {
                var thiswin = Ext.getCmp('win-id-' + data.id);
                if (!thiswin.isVisible()) {
                    thiswin.setActive(true, true);
                    thiswin.setVisible(true);
                }
                else {
                    thiswin.setVisible(false);
                };
            }
        });        
        desktopbar.add(button);
    }
};

Kernel.socket = io('http://' + window.location.host);
Kernel.socket.on('connect', function () {
    console.log('Connect to ' + window.location.host+ ' ok!');
});
Kernel.socket.on('disconnect', function () {
    console.log('disconnect');
});

Ext.onReady(function () {
    
    Ext.define('Classes.Options', {
        getValue: function (key) {
            var res = '';
            Ext.Ajax.request({
                disableCaching: false,
                url: '/GetOptionts?key=' + key,
                method: "POST",
                async: false,
                success: function (response) {
                    res = response.responseText;
                },
                failure: function (response) {

                }
            });
            return res;
        },
    });

    var opt = Ext.create('Classes.Options');

    var formlogin = Ext.create('Ext.form.Panel', {
        bodyPadding: 10,
        defaultType: 'textfield',
        xtype: 'form-login',
        items: [{
            allowBlank: false,
            fieldLabel: 'Логин',
            name: 'login',
            emptyText: 'Логин'
        }, {
            allowBlank: false,
            fieldLabel: 'Пароль',
            name: 'password',
            emptyText: 'Пароль',
            inputType: 'password',
            
            }],
        
        
        buttons: [
            {
                text: 'Войти',
                handler: function () {
                    submit();
                }
            }
        ],
        defaults: {
            listeners: {
                specialkey: function (field, event) {
                    if (event.getKey() == event.ENTER) {
                        submit();
                    }
                    //submit();
                }
            },
            anchor: '100%',
            labelWidth: 120
        }
    });

    function submit() {
        formlogin.getForm().submit({
            url: '/login',
            method: "POST",
            success: function (form, action) {
                Ext.MessageBox.alert('Авторизация пройдена. ', action.result.message);
                winlogon.hide();
                start();
            },
            failure: function (form, action) {
                Ext.MessageBox.alert('Ошибка авторизации. ', action.result.message);
            }
        });
    }

    var winlogon = Ext.create('Ext.window.Window', {
        title: 'Авторизация',
        frame: true,
        width: 320,
        modal: true,
        close: false,
        items: [formlogin]
    });

    if (opt.getValue('auth') == 'true') { start() } else { winlogon.show() };

    function icons() {

        var contenPanel = Ext.getCmp('contenPanel');

        Ext.define('ImageModel', {
            extend: 'Ext.data.Model',
            fields: [
                { name: 'name' },
                { name: 'icon' },
                { name: 'title'}                
            ]
        });

        var store = Ext.create('Ext.data.Store', {
            model: 'ImageModel',
            proxy: {
                type: 'ajax',
                url: '/GetIcons',
                reader: {
                    type: 'json',
                    rootProperty: 'icons'
                }
            }
        });
        store.load();

        var icons = Ext.create('Ext.view.View', {
            store: store,
            tpl: [
                '<tpl for=".">',
                '<div class="thumb-wrap" id="{name:stripTags}">',
                '<div class="thumb"><img src="{icon}" title="{title:htmlEncode}"></div>',
                '<span class="x-editable">{title:htmlEncode}</span>',
                '</div>',
                '</tpl>',
                '<div class="x-clear"></div>'
            ],
            multiSelect: true,
            trackOver: true,
            overItemCls: 'x-item-over',
            itemSelector: 'div.thumb-wrap',
            emptyText: 'No images to display',                       
            listeners: {
                itemdblclick: function (t, r, y, x) {
                    var fun = eval(r.data.name);                                      
                    fun(r.data);
                }
            }
        });
        
        contenPanel.add(icons);

    };

    function start() {

        var buttonbar = new Ext.Toolbar({
            id: 'buttonbar',
            border: 'none',
           // width: '100%',
            items: []
        });

        var statebar = new Ext.Toolbar({
            id: 'statebar',
            border: 'none',
            width: 60,
            items: [
                '22:21'
            ]
        });

        Kernel.socket.on('sendtime', function (data) {
            statebar.removeAll();
            statebar.add(data);
        });

        var contenPanel = Ext.create('Ext.panel.Panel', {
            xtype: 'panel',
            bodyStyle: {
                background: 'url(files/images/background.jpg) no-repeat;',
                'background-size': '100%',
                border: 'none'
            },
            id: 'contenPanel',
            collapsible: false,
            region: 'center',
            margin: '0 0 0 0',
            dockedItems: [{
                id: 'desktopbar',
                xtype: 'toolbar',
                dock: 'bottom',
                height: 30,                
                items: [{
                    text: 'Пуск',
                    icon: '/files/images/home.svg',
                    menu: [{
                        text: 'Сайт',
                        menu: [{
                            text: 'Страницы',
                            handler: function () {
                                Pages();
                            }
                        }, {
                                text: 'Товары',
                                handler: function () {
                                    Price();
                                }
                            }
                        ]
                    }, {
                            text: 'Выход',
                            handler: function () {
                                stop();
                            }
                        }]
                },
                    '-',
                    buttonbar,                    
                    '->',
                    '-',
                    statebar
                ]
            }]
        });        

        Ext.create('Ext.container.Viewport', {
            id: 'conWind',
            xtype: 'layout-border',
            requires: [
                'Ext.layout.container.Border'
            ],
            layout: 'border',            
            bodyBorder: false,            
            renderTo: Ext.getBody(),
            items: [contenPanel]
        });

        icons();
    };

    function stop() {
        Ext.Ajax.request({
            disableCaching: false,
            url: '/logout',
            method: "GET",
            async: false,
            success: function (response) {
                Ext.getCmp('conWind').destroy();
                winlogon.show();
            },
            failure: function (response) {

            }
        });
    };

});