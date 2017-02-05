var kernel = require('../kernel');
var io = require('socket.io')(kernel.server);

io.on('connection', function (socket) {
    console.log('a user connected ' + socket.conn.remoteAddress);
});

setInterval(function () {
    var dtime = new Date();
    io.emit('sendtime', dtime.toLocaleTimeString());
}, 1000);

exports.io = io;

