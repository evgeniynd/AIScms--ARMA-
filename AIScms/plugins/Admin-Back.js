var crypto = require('crypto');

// передаем проверку что это у нас модуль
exports.plg = true;

// запускаем эту функцию если всё хорошо
exports.start = function (name, kernel, plugins) {

    kernel.app.get('/manage', function (req, res) {
        res.render('manage', {
            title: 'Система управления и автоматизации предприятия',
            authorized: req.session.authorized,
            scripts:'<script type="text/javascript" src="/javascripts/website/Site-Front.js"></script>'
        });
    });

    kernel.app.post('/GetOptionts', function (req, res) {
        
        var ret;
        if (req.query.key === 'auth') ret = req.session.authorized;
        res.send(ret);

    });

    kernel.app.get('/GetIcons', function (req, res) {

        var db = kernel.dbmodel.get();
        var ret = {};
        ret.success = true;
        ret.icons = [];

        if (req.session.company === 1) {
            for (var i = 0; i < plugins.length; i++) {
                if (plugins[i].options) {
                    ret.icons.push(plugins[i].options);                }
            }
            res.send(JSON.stringify(ret));
        } else {
            var sel = "select PLUGIN from GRAND_COMPANY where COMPANY_ID = " + req.session.company;
            db.query(sel, function (err, result) {
                for (var o = 0; o < result.length; o++) {                    
                    for (var i = 0; i < plugins.length; i++) {
                        if (plugins[i].options) {
                            if (plugins[i].options.name === result[o].plugin) {
                                ret.icons.push(plugins[i].options);
                            }
                        }
                    }
                }
                res.send(JSON.stringify(ret));
            });
        };
    });
    
    kernel.app.get('/rcon', function (req, res) {

        var rc = kernel.rcon.get();

        var socket = kernel.sock.io;
        
        rc.send(req.query.cmd);

        rc.on('response', function (str) {
            var r = parsrcon(str);
            res.render('index', {
                title: req.query.cmd,
                content: 'ответ от сервера: ' + r
            });
        });
    });

    kernel.app.post('/login', function (req, res) {

        var db = kernel.dbmodel.get();
        var newpass = pasHahs(req.body.password);
        var ret = {};
        
        db.query("select * from PERSONNEL where login = '" + req.body.login + "'", function (err, result) {
            if (result.length !== 0) {
                var pass = result[0].pass;

                //если всё ок, авторизум пользователя
                if (pass === newpass) {
                    req.session.authorized = true;
                    req.session.username = req.body.login;

                    //записываем куки
                    res.cookie('logintoken', req.body.login, {
                        expires: new Date(Date.now() + 5 * 6204800000),
                        path: '/'
                    });

                    ret.success = true;
                    ret.message = "Добро пожаловать " + req.body.login;
                    res.send(ret);

                    req.session.company = result[0].company_id;
                    req.session.ip = req._remoteAddress; 


                } else {
                    ret.message = "Неверный логин или пароль";
                    res.send(ret);
                }
            } else {
                ret.message = "Неверный логин или пароль";
                res.send(ret);
            }
        });
        
    });

    kernel.app.get('/logout', function (req, res) {

        req.session.authorized = false;
        delete req.session.username;
        res.send('ok');

    });

}

// Кодируем пароль
function pasHahs(pass) {
    var passhash = crypto.createHash('md5').update('pre-pass' + pass + 'post-pass').digest('hex');
    return passhash;
}

//Парсим строку из rcon
function parsrcon(str) {

    var s = [/§r/g, /§0/g, /§1/g, /§2/g, /§3/g, /§4/g, /§5/g, /§6/g, /§7/g, /§8/g, /§9/g, /§a/g, /§b/g, /§c/g, /§d/g, /§e/g, /§f/g, /§l/g, /§m/g, /§n/g, /§o/g];
    for (var i = 0; i < s.length; i++) {
        var simvl = s[i];
        str = str.replace(simvl, '');
    };
    return str;

};