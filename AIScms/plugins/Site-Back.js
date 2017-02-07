var LTT = require('list-to-tree');
var ejs = require('ejs');

// передаем проверку что это у нас модуль
exports.plg = true;

// Опции плагина
var options = {
    icon: '/javascripts/website/website.png',
    name: 'mySite',
    title: 'Управление сайтом'
};

exports.options = options;

// запускаем эту функцию если всё хорошо
exports.start = function (name, kernel, plugins) {

    var iscart = kernel.config.cart;

    kernel.app.get('/', function (req, res) {
        var db = kernel.dbmodel.get();
        var host = req.headers.host;
        var param = {};
        db.query("SELECT pg.NAME, pg.BODY, st.MAIN_THEME FROM saits as st LEFT join pages as pg on st.id = pg.SAIT_ID where st.DOMAIN = '" + host + "'", function (err, result) {
            
                if (err)
                    throw err;
                if (result.length !== 0) {
                    if (result[0].main_theme !== null) {
                        if (result[0].body !== null) {
                            param.title = result[0].name;
                            param.content = result[0].body;
                        } else {
                            param.title = 'Главная страница';
                            param.content = 'Главная страница сайта ' + host + ' не назначена';
                        }
                        SendToSite(res, host, param);
                    } else {                        
                        SendToSite(res, host, param);
                    };            
                }
                else {
                    param.title = 'Новая страница';
                    param.content = '';
                    SendToSite(res, 'empty', param);
                };
            
        });

    });

    kernel.app.get('/products', function (req, res) {

        var host = req.headers.host;
        var param = {};
        var db = kernel.dbmodel.get();
        var ret = "";
        var records, total = 0;
        if (!req.query.page) req.query.page = 1;

        db.query('select count(*) from price where section=' + req.query.section, function (err, result) {

            records = result[0].count;
            total = Math.ceil(records / req.query.count);

            db.query('select first ' + req.query.count + ' skip ' + req.query.count * (req.query.page - 1) + ' * from price where section=' + req.query.section, function (err, result) {
                for (i in result) {
                    ret += '<div class=\"item-block\">'
                    ret += "<div class=\"product-name\">" + result[i].name + "</div>";
                    ret += "<div class=\"product-img\"><img src=\"" + result[i].img + "\" alt=\"" + result[i].name + "\"></div>";
                    ret += "<div class=\"product-note\">" + result[i].note + "</div>";
                    ret += "<div class=\"product-price\">" + result[i].price + "р.</div>";
                    if (iscart) { ret += "<a class=\"button\" href=\"/AddCart?product=" + result[i].id + "&quantity=1\">добавить в корзину</a>"; }
                    else { ret += "<a class=\"button\" href=\"/ordernocart?id=" + result[i].id + "&price=" + result[i].price + "&name=" + result[i].name + "\">купить</a>"; }
                    ret += "</div>";
                }
                if (total != 1) {
                    ret += "<div class=\"pages-info\">страниц " + req.query.page + " из " + total + "</div>";
                    ret += "<div class=\"pages-list\">";
                    if (req.query.page != 1) ret += "<a href=\"/products?section=" + req.query.section + "&count=" + req.query.count + "&page=" + (req.query.page - 1) + "\">назад</a> ";
                    var i;
                    for (i = 1; i <= total; i += 1) {
                        if (i == req.query.page) {
                            ret += " " + i + " ";

                        }
                        else {
                            ret += "<a href=\"/products?section=" + req.query.section + "&count=" + req.query.count + "&page=" + i + "\">" + i + "</a> ";
                        }
                    }
                    if (req.query.page < total) {
                        var next = Number(req.query.page) + 1;
                        ret += "<a href=\"/products?section=" + req.query.section + "&count=" + req.query.count + "&page=" + next + "\">дальше</a> ";
                    }
                    ret += "</div>";
                }
                param.title = 'Каталог';
                param.content = ret;
                SendToSite(res, host, param);

            });
        });
    });

    kernel.app.get('/ordernocart', function (req, res) {

        var host = req.headers.host;
        var param = {};
        var db = kernel.dbmodel.get();
        var ret = "<div id=\"pay_info\">Вы оплачиваете <span id=\"name-item\">" + req.query.name + "</span>, на сумму <span id=\"price-item\">" + req.query.price + "р.</span></div>";
        var orderid = 0;
        var dtime = new Date().toLocaleString();
        var reqSql = "insert into order_table (date_ord, summ) VALUES ('" + dtime + "', " + req.query.price + ") returning id";

        db.query(reqSql, function (err, result) {
            var orderid = result.id;
            reqSql = "insert into SHOPPING_LIST (ORDER_TABLE_ID, PRICE_ID) VALUES (" + orderid + ", " + req.query.id + ")";
            db.query(reqSql, function (err, result) {
                
                param.title = req.query.name;
                param.interkassa = kernel.config.interkassa,
                param.orderid = orderid;
                param.sum = req.query.price;
                param.content = ret;

                SendToSite(res, host, param);
               
            });
        });

    });

    kernel.app.get('/page', function (req, res) {
        var host = req.headers.host;
        page(res, host, req.query.id);
    });

    kernel.app.post('/sci', function (req, res) {
        var db = kernel.dbmodel.get();
        var rc = kernel.rcon.get();
        if (req.body.ik_inv_st == "success") {
            db.query('update order_table set pay=1 where id=' + req.body.ik_pm_no, function (err, result) {
                result;
                db.query("select pr.rcmd from price pr left join shopping_list sl on sl.price_id = pr.id where sl.order_table_id =" + req.body.ik_pm_no, function (err, result) {
                    rc.send(result[0].RCMD.replace('@user', req.body.ik_desc));
                    rc.on('response', function (str) {
                        var r = parsrcon(str);
                        res.send('mc_pay_okk!');
                    });
                });
            });
        }
    });

    kernel.app.get('/getPages', function (req, res) {
        var db = kernel.dbmodel.get();
        //db.connection.options.lowercase_keys = true;
        var order = '';
        var ret = {};
        ret.pages = {};
        var whr = "";
        if (req.session.company !== 1) {
            whr = "where company_id = " + req.session.company + " ";
        };
        if (req.query.sort) {
            var sort = [];
            sort = eval(req.query.sort);
            order = " order by " + sort[0].property + " " + sort[0].direction;
        } else {
            order = " order by id DESC";
        };
        db.query("select count(*) from pages", function (err, result) {
            ret.total = result[0].count;
            db.query("select first " + req.query.limit + " skip " + req.query.limit * (req.query.page - 1) + " * from pages " + whr + order,
                function (err, result) {
                    ret.pages = result;
                    ret.success = true;
                    res.send(JSON.stringify(ret));
                });
        });
    });

    kernel.app.post('/SavePage', function (req, res) {

        var socket = kernel.sock.io;
        var ret = {};
        var db = kernel.dbmodel.get();
        if (req.body.puble) req.body.puble = 1; else req.body.puble = 0;

        if (req.body.id != 0) {
            var ctr = "update pages set name = '" + req.body.name + "', body = '" + req.body.body + "', puble = " + req.body.puble + " where id = " + req.body.id;

            db.query(ctr, function (err, result) {
                ret.success = true;
                req.body.rowIndex = req.query.rowIndex;
                res.send(ret);
                socket.emit('updatepage', req.body);
            });
        } else {
            if (!req.body.name) {
                ret.success = false;
                ret.message = "message", "Название не может быть пустым";
                res.send(ret);
            }
            if (!req.body.body) {
                ret.success = false;
                ret.message = "message", "Содержание не может быть пустым";
                res.send(ret);
            }
            var ctr = "INSERT INTO pages(company_id, name, body, puble) values(" + req.session.company + ",'" + req.body.name + "', '" + req.body.body + "', " + req.body.puble + ") returning id";
            db.query(ctr, function (err, result) {
                var newid = result.id;
                ret.success = true;
                res.send(ret);
                req.body.id = newid;
                socket.emit('addpage', req.body);
            });
        }
    });

    kernel.app.get('/getSites', function (req, res) {
        var db = kernel.dbmodel.get();
        var order = '';
        var ret = {};
        ret.sites = {};
        var whr = "";
        if (req.session.company !== 1) {
            whr = "where company_id = " + req.session.company + " ";
        };
        if (req.query.sort) {
            var sort = [];
            sort = eval(req.query.sort);
            order = " order by " + sort[0].property + " " + sort[0].direction;
        } else {
            order = " order by id DESC";
        };

        db.query("select count(*) from saits", function (err, result) {
            ret.total = result[0].count;
            db.query("select first " + req.query.limit + " skip " + req.query.limit * (req.query.page - 1) + " st.id, st.domain, cp.NAME as company from saits as st left join company as cp on st.company_id = cp.id " + whr + order,
                function (err, result) {
                    ret.sites = result;
                    ret.success = true;
                    res.send(JSON.stringify(ret));
                });
        });

    });

    kernel.app.post('/getSite', function (req, res) {
        
        var db = kernel.dbmodel.get();
        var param = {};
        param.css = '';
        param.script = '';
        param.header = '';
        param.footer = '';

        var sel = "SELECT sf.CSS, sf.SCRIPT, sf.HEADER, sf.FOOTER, st.ALIAS, st.MAIN_THEME FROM saits as st left join SAIT_FILES as sf on sf.ID = st.MAIN_THEME where st.ID = " + req.query.id;
        db.query(sel, function (err, result) {

            if (err)
                throw err;
            

            if (result.length !== 0) {
                if (result[0].main_theme === null) {
                    param.alias = result[0].alias;
                    param.main_theme = 0;
                    res.send(JSON.stringify(param));
                    return;
                }
                if (result[0].css) {
                    result[0].css(function (err, name, e) {

                        e.on('data', function (chunk) {
                            if (chunk)
                                param.css += chunk;
                        });

                        e.on('end', function () {

                            if (result[0].script) {
                                result[0].script(function (err, name, e) {

                                    e.on('data', function (chunk) {
                                        if (chunk)
                                            param.script += chunk;
                                    });

                                    e.on('end', function () {

                                        if (result[0].header) {
                                            result[0].header(function (err, name, e) {

                                                e.on('data', function (chunk) {
                                                    if (chunk)
                                                        param.header += chunk;
                                                });

                                                e.on('end', function () {

                                                    if (result[0].footer) {
                                                        result[0].footer(function (err, name, e) {

                                                            e.on('data', function (chunk) {
                                                                if (chunk)
                                                                    param.footer += chunk;
                                                            });

                                                            e.on('end', function () {
                                                                param.alias = result[0].alias;
                                                                param.main_theme = result[0].main_theme;
                                                                param.css = param.css.replace(new RegExp('#@', 'g'), '"').replace(new RegExp('@#', 'g'), "'");
                                                                param.script = param.script.replace(new RegExp('#@', 'g'), '"').replace(new RegExp('@#', 'g'), "'");
                                                                param.header = param.header.replace(new RegExp('#@', 'g'), '"').replace(new RegExp('@#', 'g'), "'");
                                                                param.footer = param.footer.replace(new RegExp('#@', 'g'), '"').replace(new RegExp('@#', 'g'), "'");
                                                                //param.script = param.script.replace(/\s+/g, '');
                                                                //res.render('Site-Front', param);
                                                                res.send(JSON.stringify(param));
                                                            });
                                                        });
                                                    } else {

                                                    };
                                                });
                                            });
                                        } else {

                                        };
                                    });
                                });
                            } else {

                            };
                        });
                    });
                } else {

                };
            } else {
                param.alias = result[0].alias;                
                res.send(JSON.stringify(param));
            };
        });
    });

    kernel.app.post('/SaveSite', function (req, res) {

        var company = req.session.company;
        var ret = {};
        var db = kernel.dbmodel.get();
        var css, script, header, footer;

        if (req.body.main_theme == 0) {
            db.query("select id from saits where domain = '" + req.body.domain + "'", function (err, result) {
                if (result.length === 0) {
                    var strsql = "INSERT INTO SAIT_FILES (CSS, SCRIPT, HEADER, FOOTER) values('" + req.body.css + "','" + req.body.script + "','" + req.body.header + "','" + req.body.footer + "') returning id";
                    db.query(strsql, function (err, result) {
                        strsql = "INSERT INTO SAITS (DOMAIN, ALIAS, COMPANY_ID, MAIN_THEME) values('" + req.body.domain + "', '" + req.body.alias + "', " + company + ", " + result.id + ") returning id";
                        var sid = result.id;
                        db.query(strsql, function (err, result) {
                            ret.success = true;
                            ret.id = result.id;
                            ret.main_theme = sid;
                            res.send(ret);
                        });
                    });
                } else {
                    ret.success = false;
                    ret.message = 'Такой сайт уже существует!';
                    res.send(ret);
                }
            });
        } else {
            strsql = "update SAITS set DOMAIN = '" + req.body.domain + "', ALIAS = '" + req.body.alias + "', MAIN_THEME = " + req.body.main_theme + " where id = " + req.body.id;
            db.query(strsql, function (err, result) {
                css = req.body.css.replace(/"/g, '#@').replace(/'/g, '@#');
                script = req.body.script.replace(/"/g, '#@').replace(/'/g, '@#');
                header = req.body.header.replace(/"/g, '#@').replace(/'/g, '@#');
                footer = req.body.footer.replace(/"/g, '#@').replace(/'/g, '@#');
                strsql = "update SAIT_FILES set CSS = '" + css + "', SCRIPT = '" + script + "', HEADER = '" + header + "', FOOTER = '" + footer + "' where id = " + req.body.main_theme;
                db.query(strsql, function (err, result) {
                    ret.success = true;
                    res.send(ret);
                });
            });
        }
    });

    kernel.app.get('/category', function (req, res) {
        var host = req.headers.host;
        var db = kernel.dbmodel.get();
        if (req.query.id) {
            db.query('select * from CONTENT_CATEGORIES where CAT_ID = ' + req.query.id, function (err, result) {
                if (result.length !== 0) {
                    if (result[0].key === 'url') res.redirect(result[0].val);
                    if (result[0].key === 'page') page(res, host, result[0].val);
                    if (result[0].key === 'products') res.redirect('/products?section=' + result[0].val + '&count=' + result[0].total);
                } else {
                    res.redirect(req.rawHeaders[11]);
                }

            });
        } else {
            res.redirect(req.rawHeaders[11]);
        }            
    });

    kernel.app.get('/getSiteTree', function (req, res) {
        console.log();
    });


    function page(res, host, id) {
        var param = {};
        var db = kernel.dbmodel.get();
        var ret = "<div class=\"page-content\">";

        if (id) {
            var sel = 'SELECT * FROM PAGES where id = ' + id
            db.query(sel, function (err, result) {
                ret += "<div class=\"page-name\">" + result[0].name + "</div>";
                ret += "<div class=\"page-body\">" + result[0].body + "</div>";
                ret += "</div>";

                param.title = result[0].name;
                param.content = ret;
                SendToSite(res, host, param);

            });
        }
        else {
            res.render('index', {
                title: result[0].name,
                content: 'Такой страницы не существует!'
            });
        }
    }

    function gm(host, callback) {

        var ret = '<ul>';
        var db = kernel.dbmodel.get();
        var s = "select sc.id, sc.name, sc.parentid from site_category as sc left join saits as st on sc.site_id = st.id where sc.visible = 1 and st.domain = '" + host + "'  order by sc.INDEXORD asc";
        db.query(s, function (err, result) {

            var data = result;
            var endMenu = getMenu(0);

            function getMenu(parentID) {

                return data.filter(function (node) { return (node.parentid == parentID); }).sort(function (a, b) { return a.index > b.index }).map(function (node) {
                    var exists = data.some(function (childNode) { return childNode.parentid == node.id; });
                    var subMenu = (exists) ? '</a><ul>' + getMenu(node.id).join('') + '</ul>' : "";
                    var a = '';
                    if (!subMenu) a = '</a >';
                    return '<li><a href="/category?id=' + node.id +'">' + node.name +a+ subMenu + '</li>';
                });

            }
            callback('<ul class="menu-">' + endMenu.join('') + '</ul>');

        });
    };

    function gmtoadmin() {

    };
    
    function SendToSite(res, host, param) {

        var db = kernel.dbmodel.get();
        param.css = '';
        param.script = '';
        param.header = '';
        param.footer = '';

        var sel = "SELECT sf.CSS, sf.SCRIPT, sf.HEADER, sf.FOOTER FROM SAIT_FILES as sf left join saits as st on sf.ID = st.MAIN_THEME where st.DOMAIN = '" + host + "'";
        db.query(sel, function (err, result) {

            if (err)
                throw err;

            if (result.length !== 0) {
                if (result[0].css) {
                    result[0].css(function (err, name, e) {

                        e.on('data', function (chunk) {
                            if (chunk)
                                param.css += chunk;
                        });

                        e.on('end', function () {

                            if (result[0].script) {
                                result[0].script(function (err, name, e) {

                                    e.on('data', function (chunk) {
                                        if (chunk)
                                            param.script += chunk;
                                    });

                                    e.on('end', function () {

                                        if (result[0].header) {
                                            result[0].header(function (err, name, e) {

                                                e.on('data', function (chunk) {
                                                    if (chunk)
                                                        param.header += chunk;
                                                });

                                                e.on('end', function () {

                                                    if (result[0].footer) {
                                                        result[0].footer(function (err, name, e) {
                                                            e.on('data', function (chunk) {
                                                                if(chunk)
                                                                    param.footer += chunk;
                                                            });

                                                            e.on('end', function () {
                                                                param.css = param.css.replace(new RegExp('#@', 'g'), '"').replace(new RegExp('@#', 'g'), "'");
                                                                param.script = param.script.replace(new RegExp('#@', 'g'), '"').replace(new RegExp('@#', 'g'), "'");
                                                                param.header = param.header.replace(new RegExp('#@', 'g'), '"').replace(new RegExp('@#', 'g'), "'");
                                                                param.footer = param.footer.replace(new RegExp('#@', 'g'), '"').replace(new RegExp('@#', 'g'), "'");
                                                                param.script = param.script.replace(/\r|\n/g, '');
                                                                gm(host, function (m) {
                                                                    param.header = param.header.replace('@menu', m);
                                                                    res.render('Site-Front', param);
                                                                });
                                                               
                                                            });
                                                        });
                                                    } else {

                                                    };
                                                });
                                            });
                                        } else {

                                        };
                                    });
                                });
                            } else {

                            };
                        });
                    });
                } else {

                };
            } else {
                res.render('Site-Front', param);
            };
        });
    };
};

//Парсим строку из rcon
function parsrcon(str) {

    var s = [/§r/g, /§0/g, /§1/g, /§2/g, /§3/g, /§4/g, /§5/g, /§6/g, /§7/g, /§8/g, /§9/g, /§a/g, /§b/g, /§c/g, /§d/g, /§e/g, /§f/g, /§l/g, /§m/g, /§n/g, /§o/g];
    for (var i = 0; i < s.length; i++) {
        var simvl = s[i];
        str = str.replace(simvl, '');
    };
    return str;

};