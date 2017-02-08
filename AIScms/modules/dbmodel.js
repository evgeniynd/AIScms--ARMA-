var Firebird = require('node-firebird');
var kernel = require('../kernel');

var options = kernel.config.db;
options.lowercase_keys = true;

var pending = [];
var index = 0;
var maxconnect = 5;
exports.Firebird = Firebird;

/*
Firebird.attach(options, function (err, svc) {
    if (err)
        return;
    svc.backup(
        {
            database: 'DB.FDB',
            files: [
                {
                    filename: 'DB.FBK',
                    sizefile: '0'
                }
            ]
        },
        function (err, data) {
            console.log(data);
        });
});
*/

exports.get = function () {
    var ret;
    if (pending.length == 0) {
        for (var i = 0; i < maxconnect; i++) {
            Firebird.attach(options, function (err, db) {
                pending.push(db);    
            });
        }
        console.log('Открыто соединений с БД');
        ret = pending[0];        
    } else {
        ret = pending[index];
        index++;
        if (index == maxconnect) index = 0;        
    }        
    return ret;
};