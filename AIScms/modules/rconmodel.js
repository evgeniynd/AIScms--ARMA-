var Rcon = require('rcon');
var kernel = require('../kernel');

var conn = new Rcon(kernel.config.rcon.server, kernel.config.rcon.port, kernel.config.rcon.password);

conn.on('auth', function () {
    console.log("Соединения RCON установлено");

}).on('response', function (str) {
    console.log("Ответ от RCON: " + str);

}).on('end', function () {
    console.log("RCON закрыт!");
    process.exit();

});

//conn.connect();

exports.get = function () {
    return conn;
};