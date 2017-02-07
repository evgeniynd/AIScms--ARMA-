var express = require('express');
var http = require('http');
var path = require('path');
var fs = require('fs');
var app = express();
var config = require('./config');
exports.config = config;
var dbmodel = require('./modules/dbmodel');
var rcon = require('./modules/rconmodel');
var server = http.createServer(app);
exports.server = server;
var sock = require('./modules/socketmodel');

exports.sock = sock;
exports.dbmodel = dbmodel;
dbmodel.get();
exports.rcon = rcon;
exports.app = app;
rcon.get();

// Подключаем плагины
var isSite = false;;
var plugins = [];
var files = fs.readdirSync(path.join(__dirname, './plugins'));
for (var i = 0; i < files.length; i++) {
    if (files[i].match('.js')) {
        if (files[i] === 'Site-Back.js') isSite = true;
        plugins[i] = require('./plugins/' + files[i]);        
    }
}

// Если есть модуль Сайт используем его, если нет вставляем этот блок
if (!isSite) {
    app.get('/', function (req, res) {
        res.send('Модульная система');
    });
}

// all environments
//
app.set('port', process.env.PORT || 80);
app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
//app.use(express.cookieDecoder());
app.use(express.cookieParser('icms'));
app.use(express.session());
app.use(express.bodyParser());
app.use(app.router);
app.use(require('stylus').middleware(path.join(__dirname, './public')));
app.use(express.static(path.join(__dirname, './public')));

// development only
if ('development' == app.get('env')) {    
    app.use(express.errorHandler());
};

// Запускаем плагины
for (var i = 0; i < plugins.length; i++) {
    if (plugins[i].plg === true) {
        console.log('Плагин ' + files[i].replace('.js', '') + ' подключен');
        plugins[i].start(files[i].replace('.js', ''), this, plugins);
    } else {
        console.log('Фаил ' + files[i] + ' не является плагином');
    }
};

server.listen(app.get('port'), 'localhost', function (err) {
    console.log('Сервер запущен 192.168.47.18 на порту ' + app.get('port'));    
});

