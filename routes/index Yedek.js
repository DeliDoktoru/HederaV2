/*const getFolderSize=require('get-folder-size');
const myFolder = '../public/games';
const size =  getFolderSize.loose(myFolder)
*/
const db = require('../business/database');
var express = require('express');
var router = express.Router();
var NotificationTypes = {};

function staticObjects(){
  db.selectAll("NotificationTypes").then(result => result.map(x => {
    NotificationTypes[x.id] = x.text
  }));
}
setInterval(staticObjects,60000)
staticObjects();
const fs = require('fs');

router.get('/preview', async function (req, res, next) {
  if (req.session.preview) {
    res.render('preview', {
      title: req.session.preview.name,
      data: JSON.stringify(req.session.preview)
    });
  } else {
    res.redirect('/');
  }
});
router.get('/test', async function (req, res, next) {
  //a=await db.queryObject("SELECT * FROM coda.Games where id= :foo",{foo:1})
  /*
   res.render('preview', {
    title: req.session.preview.name,
    data: JSON.stringify(req.session.preview)
  });
  */
  /*global.sessionStore.all(function(error, sessions){
    res.send(JSON.stringify(sessions))
  })*/
  /*res.render('prototypeV2', {
    title: "Prototip Oluştur"
  });*/
  
  var userId = req.session.user.id;
  await tableGenerator({
    procedure:"game",
    search:true,
    checkbox:true,
    tableHead:["id", "n", "dn", "rdd"],
    turkce:["id", "Oyun Adı", "Yayıncı", "Çıkış zamanı"],
    dateIndex:4,
    typeId:[2],
    searchCol:"n",
    link:"/game/", //sql de order id yerin rdd yazcan kaldır
    sql:`SELECT SQL_CALC_FOUND_ROWS g.*,!isnull(n.id) as notify FROM coda.Games as g  LEFT JOIN coda.Notification_Request as n on n.targetId=g.id and n.typeId=2 and g.deleted=0 and n.userId=${userId} where  1=1 AND g.deleted=0 :srcTxt  GROUP BY g.id  ORDER BY id DESC LIMIT :current,16; SELECT FOUND_ROWS() AS max;`,
    title:"Oyunlar",
    pp:true,
    test:true
  },req,res)
  
});

async function dashboard(res){
  var obj={title:"Ana Sayfa"}
  obj.gamesCount=(await db.query("SELECT count(*) as c FROM coda.Games where deleted=0;"))[0].c
  obj.companyCount=(await db.query("SELECT count(*) as c FROM coda.Companys where deleted=0;"))[0].c
  obj.users=JSON.stringify(await db.query("SELECT username,navigate,lastview FROM coda.Users where navigate!=0 and deleted=0;"))
  obj.size=global.gameImagesSize
  obj.sizeDate=global.gameImagesSizeDate
  obj.games=JSON.stringify(await db.query(`  SELECT  g.id,g.n,GROUP_CONCAT(v.version_date) as ver FROM coda.Games 
  as g inner join coda.Versions as v on v.gameId = g.id and g.skip=0 and 
  v.deleted=0 and v.version_date > NOW()-INTERVAL 90 DAY
    where g.deleted=0 group by v.gameId HAVING COUNT(*) > 1 ORDER BY version_date DESC LIMIT 15; `))
  res.render('dashboard', obj);
}
router.get('/dashboard', async function (req, res, next) { dashboard(res) });
router.get('/', async function (req, res, next) { dashboard(res) });

router.get('/previewV2', async function (req, res, next) {
  res.render('preview', {
    title: req.session.preview.name,
    data: JSON.stringify(req.session.preview)
  });
});
router.post('/previewV2', async function (req, res, next) {
  var data=JSON.parse(req.body.value);
  req.session.preview=data;
  res.render('preview', {
    title: data.name,
    data: JSON.stringify(data)
  });
});
router.get('/random', async function (req, res, next) {
  var ids = await db.query("SELECT g.id FROM coda.Versions as v inner join coda.Games as g on v.gameId = g.id where v.deleted=0 and g.skip=0 and v.version_date > NOW()-INTERVAL 90 DAY  group by v.gameId ORDER BY RAND() LIMIT 2 ;")
  res.render('random', {
    ids: ids,
    title:"Rastgele iki oyun"
  });
});
router.get('/index/:page?', async function (req, res, next) {
  await tableGenerator({
    pp:true,
    tableHead:["id","n","dn","rdd"],
    turkce:["id","Oyun Adı","Yayıncı","Tarih"],
    dateIndex:4,
    table:"/",
    pageLink:"/index",
    link:"/game/",
    sql:`SELECT SQL_CALC_FOUND_ROWS * FROM coda.Games where NOW()  > rdd and rdd > NOW()-INTERVAL 30 DAY and deleted=0 order by rdd DESC LIMIT :current,30; SELECT FOUND_ROWS() AS max;`,
    title:"Son Çıkan Oyunlar"
  },req,res)
 
});
router.get('/exit', async function (req, res, next) {
  //delete req.session.user;
  global.sessionStore.destroy(req.session.id.replaceAll(" ","_"),function(error){ if(error)console.log(error)})
  req.session.destroy()
  res.redirect('/');
});
router.get('/login', async function (req, res, next) {
  res.render('login', {
    title: "Giriş"
  });
});
router.get('/register', async function (req, res, next) {
  res.render('register', {
    title: "Kayıt Ol"
  });
});
router.get('/prototype/:id/:page?', async function (req, res, next) {
  let id = req.params.id
  if (id == "table") {
    await tableGenerator({
      search:true,
      tableHead:[ "name", "username"],
      turkce:[ "Ad", "Oluşturan"],
      notifyLink:"/ajax/user_approve",
      link:"/prototype/",
      searchCol:"name",
      sql:`SELECT SQL_CALC_FOUND_ROWS g.id,g.name,u.username FROM coda.Prototypes as g inner join coda.Users as u on g.ownerId=u.id  where 1=1 :srcTxt  GROUP BY g.id  ORDER BY id DESC LIMIT :current,16; SELECT FOUND_ROWS() AS max;`,
      title:"Prototipler"
    },req,res)
  } else if (id == "form") {
    res.render('prototypeV2', {
      title: "Prototip Oluştur"
    });
  } else {
    var data = await db.selectQuery({
      id: id
    }, "Prototypes");
    if (data[0]) {
      res.render('prototypeV2', {
        link: data[0].link,
        title: data[0].name,
        id: data[0].id,
        data: JSON.stringify(data[0])
      });
    } else {
      res.redirect('/');
    }
  }
});
router.get('/manual/table/:page?', async function (req, res, next) {
  await tableGenerator({
    pp:true,
    tableHead:["id", "n", "dn", "rdd"],
    turkce:["id", "Oyun Adı", "Yayıncı", "Çıkış zamanı"],
    dateIndex:4,
    link:"/game/",
    search:true,
    checkbox:true,
    searchCol:"n",
    typeId:[2],
    sql:`SELECT SQL_CALC_FOUND_ROWS g.*,!isnull(n.id) as notify FROM coda.Games as g  inner join coda.Game_Manual as m on g.id=m.gameId  LEFT JOIN coda.Notification_Request as n on n.targetId=g.id and n.typeId=2 where  m.deleted=0 AND g.deleted=0 :srcTxt  GROUP BY g.id  ORDER BY m.id DESC LIMIT :current,16; SELECT FOUND_ROWS() AS max;`,
    title:"Elle Eklenen Oyunlar"
  },req,res)
});
router.get('/log', async function (req, res, next) {
  if (await db.checkAuth(req.session.user.id, 4)) {
    var txt = fs.readFileSync(__dirname + '/../access.log', {
      encoding: 'utf8',
      flag: 'r'
    });
    var html = `<html> <head> </head><body>${txt.replaceAll("\n","<br/>")}</body></html>`
    res.send(html)
  } else {
    req.session.user.message = "Yetkiniz Yok!";
    res.redirect('/index');
  }

});
router.get('/manual', async function (req, res, next) {
  res.render('manual', {
    title: "Elle Ekleme"
  });
});
router.get('/group/:id/:page?', async function (req, res, next) {
  let id = req.params.id,
    page = req.params.page
  if (id == "table") {
    var src = req.query.search;
    var srcTxt = "";
    if (src && src != "") {
      srcTxt = `and text like '%${src}%'`;
    }
    var data = {};
    data.search = true
    data.tableHead = ["text"];
    data.turkce = ["Grup"]
    current = parseInt(page || 1);
    data.current = isNaN(current) ? 1 : current;
    data.link = "/group/";
    result = await db.query(`SELECT SQL_CALC_FOUND_ROWS * FROM coda.Groups where deleted=0 ${srcTxt} ORDER BY id DESC LIMIT ${((data.current-1)*16)},16;SELECT FOUND_ROWS() AS max;`)
    data.tableBody = result[0]
    var max = result[1][0].max;
    data.max = max < 16 ? 1 : Math.ceil(max / 16);
    res.render('group_table', {
      title: "Gruplar",
      current: data.current,
      data: data,
      max: data.max
    });
  } else {
    var group = await db.selectQuery({
      id: id
    }, "Groups")
    await tableGenerator({
      search:true,
      checkbox:true,
      tableHead:["id", "text"],
      turkce:["id", "Yetki Türü"],
      searchCol:"text",
      customNotifyText:"Durum",
      notifyLink:"authority_group",
      table:id+"/",
      pageLink:"/group/",
      sql:`SELECT SQL_CALC_FOUND_ROWS g.*,!isnull(n.id) as notify  FROM coda.Authorization_List as g LEFT JOIN coda.Authority_Group as n on n.authId=g.id  and n.groupId=:id and n.deleted=0 where g.deleted=0 :srcTxt   GROUP BY g.id  ORDER BY g.id ASC LIMIT :current,16; SELECT FOUND_ROWS() AS max;`,
      title: "Grup ( " + group[0].text + " )",
      sqlData:{ id:id},
    },req,res)
  }
});
router.get('/game/:id/:page?', async function (req, res, next) {
  let id = req.params.id
  if (id == "table") {
    var userId = req.session.user.id;
    await tableGenerator({
      search:true,
      checkbox:true,
      tableHead:["id", "n", "dn", "rdd"],
      turkce:["id", "Oyun Adı", "Yayıncı", "Çıkış zamanı"],
      dateIndex:4,
      typeId:[2],
      searchCol:"n",
      link:"/game/", //sql de order id yerin rdd yazcan kaldır
      sql:`SELECT SQL_CALC_FOUND_ROWS g.*,!isnull(n.id) as notify FROM coda.Games as g  LEFT JOIN coda.Notification_Request as n on n.targetId=g.id and n.typeId=2 and g.deleted=0 and n.userId=${userId} where  1=1 AND g.deleted=0 :srcTxt  GROUP BY g.id  ORDER BY id DESC LIMIT :current,16; SELECT FOUND_ROWS() AS max;`,
      title:"Oyunlar",
      pp:true
    },req,res)
  } else {
    var userId = req.session.user.id;
    var data = await db.selectQuery({
      id: id
    }, "Games")
    if(data.length==0){
      res.redirect('/game/table');
      return;
    }
    var note;
    var tmpNote = await db.selectQuery({
      targetId: id,
      targetType: 1,
      userId: userId
    }, "User_Notes")
    var comments = await db.query(`SELECT c.*,u.username as username FROM coda.Game_Comments as c inner join coda.Users as u on c.userId=u.id where c.gameId=${id} and c.deleted=0 and u.deleted=0 order by c.date desc`)
    if (tmpNote && tmpNote.length > 0) {
      note = tmpNote[0].text
    }
    var images = await  db.selectQuery({
      gameId: id
    }, "Game_Images")
    var usercategorys = await  db.selectQuery({
      userId: userId
    }, "User_Categorys")
    var userselectedcategorys = await  db.query(`SELECT u.id,u.text FROM coda.User_Categorys as u inner join coda.User_Category_Games as g on u.id=g.userCategoryId where g.gameId=${id} and u.userId=${userId} and u.deleted=0 and g.deleted=0;`)
    var categorys = await  db.selectQuery({
      gameId: id
    }, "Game_Categorys")
    var tmp = []
    var tmpN = await  db.selectQuery({
      userId: userId,
      typeId: 2,
      targetId: id
    }, "Notification_Request")
    var notify = false;
    if (tmpN && tmpN.length > 0) {
      notify = true;
    }
    var Categorys = {};
    await db.selectAll("Categorys").then(result => result.map(x => {
      Categorys[x.id] = x.text
    }));
    categorys.map(x => tmp.push(Categorys[x.categoryId]))
    var versions = await db.selectQuery({
      gameId: id
    }, "Versions")
    res.render('game', {
      title: data[0].n,
      data: data[0],
      images: images,
      versions: versions,
      categorys: tmp,
      usercategorys: usercategorys,
      userselectedcategorys: userselectedcategorys,
      notify: notify,
      note: note,
      comments: comments,
      userId: userId
    });

  }
});
router.get('/company/:id/:page?', async function (req, res, next) {
  let id = req.params.id
  if (id == "table") {
    var userId = req.session.user.id;
    await tableGenerator({
      search:true,
      checkbox:true,
      tableHead:["id", "text"],
      turkce:["id", "Yayıncı"],
      checker:true,
      typeId:[1, 3],
      link:"/company/",
      sql:`SELECT SQL_CALC_FOUND_ROWS g.*,!isnull(n.id) as notify FROM coda.Companys as g  LEFT JOIN coda.Notification_Request as n on n.targetId=g.id and n.typeId=1 and n.userId=${userId} where 1=1 :srcTxt   GROUP BY g.id  ORDER BY id DESC LIMIT :current,16; SELECT FOUND_ROWS() AS max;`,
      title:"Yayıncılar",
    },req,res)
  } else {
    var userId = req.session.user.id;
    var tmpN = await  db.selectQuery({
      userId: userId,
      typeId: 1,
      targetId: id
    }, "Notification_Request")
    var notify = false;
    if (tmpN && tmpN.length > 0) {
      notify = true;
    }
    var data = await db.selectQuery({
      id: id
    }, "Companys");
    var note;
    var tmpNote = await db.selectQuery({
      targetId: id,
      targetType: 2,
      userId: userId
    }, "User_Notes")
    if (tmpNote && tmpNote.length > 0) {
      note = tmpNote[0].text
    }
    var games = await  db.query(`select * from coda.Games where companyId=${id} and deleted=0  ORDER BY rdd DESC`)
    res.render('company', {
      title: data[0].text,
      data: data[0],
      games: games,
      notify: notify,
      note: note
    });
  }

});
router.get('/notification/:id/:page?', async function (req, res, next) {
  let id = req.params.id
  if (id == "table") {
    await tableGenerator({
      html:true,
      tableHead:["text", "date"],
      turkce:["Bildirim", "Tarih"],
      dateIndex: 2,
      pageLink:"/notification/",
      sql:`SELECT SQL_CALC_FOUND_ROWS * FROM coda.Notifications WHERE deleted=0 and  userId=:userId ORDER BY id DESC LIMIT :current,16; SELECT FOUND_ROWS() AS max;`,
      title:"Bildirimler",
    },req,res)
  }
});
router.get('/notification_request/:id/:page?', async function (req, res, next) {
  let id = req.params.id
  if (id == "1") {
    await tableGenerator({
      searchCol:"n",
      search:true,
      checkbox:true,
      pp:true,
      tableHead:["id", "n","dn"],
      turkce:["id", "Oyun Adı","Yayıncı"],
      typeId: [2],
      link: "/game/",
      table:"1/",
      pageLink:"/notification_request/",
      sql:`SELECT SQL_CALC_FOUND_ROWS '1' as notify,n.targetId as id,g.n,g.dn FROM coda.Notification_Request as n inner join coda.Games as g on g.id=n.targetId
      WHERE n.userId=:userId and n.typeId=2 :srcTxt group by n.targetId order BY id DESC LIMIT :current,16; SELECT FOUND_ROWS() AS max;`,
      title:"Bildirimler Oyunlar",
    },req,res)
  } else if (id == "2") {
    await tableGenerator({
      searchCol:"text",
      search:true,
      checkbox:true,
      tableHead:["id", "text"],
      turkce:["id", "Yayıncı Adı"],
      typeId: [1],
      link: "/company/",
      table:"2/",
      pageLink:"/notification_request/",
      sql:`SELECT SQL_CALC_FOUND_ROWS '1' as notify,n.targetId as id,g.text FROM coda.Notification_Request as n inner join coda.Companys as g on g.id=n.targetId
      WHERE n.userId=:userId and n.typeId=1 :srcTxt group by n.targetId order BY id DESC LIMIT :current,16; SELECT FOUND_ROWS() AS max;`,
      title:"Bildirimler Yayıncılar",
    },req,res)
  }
});
router.get('/system/:id/:page?', async function (req, res, next) {
  let id = req.params.id
  if (id == "table") {
    var userId = req.session.user.id;
    await tableGenerator({
      search:true,
      checkbox:true,
      tableHead:["id", "n", "dn", "version_date"],
      turkce:["id", "Oyun Adı", "Yayıncı", "Son versiyon tarih"],
      skip:true,
      typeId:[2],
      searchCol:"n",
      link:"/game/",
      pageLink:"/system/",
      sql:`SELECT SQL_CALC_FOUND_ROWS MAX(v.version_date) as version_date,g.*,!isnull(n.id) as notify FROM coda.Games as g inner join coda.Versions as v on v.gameId = g.id and g.skip=0 and v.deleted=0 and v.version_date > NOW()-INTERVAL 90 DAY LEFT join coda.Notification_Request as n on n.targetId=g.id and n.typeId=2 and n.deleted=0 and n.userId=${userId} where g.deleted=0 :srcTxt group by v.gameId  ORDER BY version_date DESC LIMIT :current,16;SELECT FOUND_ROWS() AS max;`,
      title:"Sistem Takip Listesi",
      pp:true
    },req,res)
  }


});
router.get('/user_tag/:id/:page?', async function (req, res, next) {
  let id = req.params.id
  if (id == "table") {
    let page = req.params.page
    var src = req.query.search;
    var srcTxt = "";
    if (src && src != "") {
      srcTxt = `and c.text like '%${src}%'`;
    }
    var data = {};
    var userId = req.session.user.id;
    data.search = true
    data.tableHead = ["text"];
    data.turkce = ["Etiket"]
    current = parseInt(page || 1);
    data.current = isNaN(current) ? 1 : current;
    data.link = "/user_tag/";
    result = await db.query(`SELECT SQL_CALC_FOUND_ROWS c.* FROM coda.User_Categorys as c   where  c.userId= ${userId} AND c.deleted=0 ${srcTxt} ORDER BY c.id DESC LIMIT ${((data.current-1)*16)},16; SELECT FOUND_ROWS() AS max;`)
    data.tableBody = result[0]
    var max = result[1][0].max;
    data.max = max < 16 ? 1 : Math.ceil(max / 16);
    res.render('user_tags_table', {
      title: "Etiketlerim",
      current: data.current,
      data: data,
      max: data.max
    });
  } else {
    var category = await db.selectQuery({
      id: id,
      userId: req.session.user.id
    }, "User_Categorys")
    await tableGenerator({
      search:true,
      checkbox:true,
      tableHead:["id", "n", "dn", "rdd"],
      turkce:["id", "Oyun Adı", "Yayıncı", "Çıkış zamanı"],
      dateIndex:4,
      typeId:[2],
      searchCol:"n",
      link:"/game/",
      sql:`SELECT SQL_CALC_FOUND_ROWS g.*,!isnull(n.id) as notify FROM coda.Games as g inner join coda.User_Category_Games as c on c.gameId=g.id and c.userCategoryId=:id LEFT JOIN coda.Notification_Request as n on n.targetId=g.id and n.typeId=2 where  c.deleted=0 AND g.deleted=0 :srcTxt  GROUP BY g.id  ORDER BY rdd DESC LIMIT :current,16; SELECT FOUND_ROWS() AS max;`,
      title:"Oyunlar ( " + category[0].text + " )",
      sqlData:{ id:id},
      pp:true
    },req,res)
  }

});
router.get('/user/:id/:page?', async function (req, res, next) {
  let id = req.params.id
  if (id == "table") {
    await tableGenerator({
      search:true,
      checkbox:true,
      tableHead:["id","username"],
      turkce:["id","Kullanıcı Adı"],
      customNotifyText:"Aktif/Pasif",
      notifyLink:"user_approve",
      link:"/user/",
      sql:`SELECT SQL_CALC_FOUND_ROWS g.*,g.approved as notify FROM coda.Users as g where 1=1 :srcTxt and g.deleted=0  ORDER BY id DESC LIMIT :current,16; SELECT FOUND_ROWS() AS max;`,
      title:"Kullanıcılar"
    },req,res)
  }
  else{
    var user = await db.selectQuery({
      id: id,
    }, "Users")
    await tableGenerator({
      search:true,
      checkbox:true,
      tableHead:["id","text"],
      turkce:["id","Grup"],
      customNotifyText:"Gruba Ekle",
      notifyLink:"user_grup",
      table:id+"/",
      pageLink:"/user/",
      sql:`SELECT SQL_CALC_FOUND_ROWS g.*,!isnull(n.id) as notify  FROM coda.Groups as g LEFT JOIN coda.User_Grup as n on n.groupId=g.id  and n.deleted=0 and n.userId=:id  where g.deleted=0 :srcTxt GROUP BY g.id  ORDER BY g.id ASC LIMIT :current,16; SELECT FOUND_ROWS() AS max`,
      sqlData:{id:id},
      title:"Gruplar("+ user[0].username +")"
    },req,res)
  }
});

async function tableGenerator(data,req,res){
  var page = req.params.page;
  var src = req.query.search;
  data.id=req.params.id;
  if(!data.queryAs){
    data.queryAs="g"
  }
  if(!data.searchCol){
    data.searchCol="text"
  }
  data.srcTxt=""
  if (src && src != "") {
    data.srcTxt = `and ${data.queryAs}.${data.searchCol} like :src`;
  }
  current = parseInt(page || 1);
  data.current = isNaN(current) ? 1 : current;
  data.sql=data.sql.replace(":srcTxt",data.srcTxt )
  if(data.sqlData==null){
    data.sqlData={}
  }
  data.sqlData.current=(data.current-1)*16
  data.sqlData.src="%"+src+"%"
  data.sqlData.userId=req.session.user.id
  result = await db.queryObject(data.sql,data.sqlData)
  data.tableBody = result[0]
  var max = result[1][0].max;
  data.max = max < 16 ? 1 : Math.ceil(max / 16);
  if(data.pq){
    data.colModel=JSON.stringify(data.tableHead.map((x,i)=> { return { title: data.turkce[i], dataIndx: x} }))
    res.render('tablepq', {
      title: data.title,
      data: data
    });
  }else if(data.test){
    res.render('testt', {
      title: data.title,
      data: data
    });
  }
  else{
    res.render('table', {
      title: data.title,
      data: data
    });
  }
  
}

module.exports = router;

String.prototype.replaceAll = function (search, replacement) {
  var target = this;
  return target.replace(new RegExp(search, 'g'), replacement);
};