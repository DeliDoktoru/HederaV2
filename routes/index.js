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
    turkce:["Id", "Oyun adı", "Yayıncı", "Çıkış zamanı"],
    dateIndex:[4],
    typeId:[2],
    searchCol:"n",
    link:"/game/", //sql de order id yerin rdd yazcan kaldır
    title:"Oyunlar",
    pp:true,
    test:true
  },req,res)
  
});

async function dashboard(req,res){
  await tableGenerator({
    procedure:"top",
    pp:true,
    tableHead:["id","tier","n","dn","id","id","date"],
    turkce:["Id","Sıralama","Oyun adı","Yayıncı","Cihaz","Ülke","Tarih"],
    dateIndex:[7],
    soloDateIndex:[7],
    table:"/",
    special:[{k:"Devices",i:"5",c:"device_text",q:"d",t:"select"},{k:"Countries",i:"6",q:"c",c:"countrie_text",t:"select"}],
    pageLink:"/dashboard/",
    link:"/game/",
    title:"Ana Sayfa",
    //orderBy:"date",
    customTable:"dashboard",
    customCheckbox:"Grafik",
    static:{Devices:  await db.selectAll("Devices"),Countries:  await db.selectAll("Countries") }
  },req,res)
}
router.get('/dashboard', async function (req, res, next) { dashboard(req,res) });
router.get('/', async function (req, res, next) { dashboard(req,res) });

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
    procedure:"index",
    pp:true,
    tableHead:["id","n","dn","rdd"],
    turkce:["Id","Oyun adı","Yayıncı","Tarih"],
    dateIndex:[4],
    table:"/",
    pageLink:"/index",
    link:"/game/",
    title:"Son Çıkan Oyunlar"
  },req,res)
 
});
router.get('/linkedin/:id/:page?', async function (req, res, next) {
  let id = req.params.id
  if (id == "table") {
    await tableGenerator({
      procedure:"linkedin_company",
      checkbox:true,
      tableHead:["id","name"],
      turkce:["Id","Şirket adı"],
      typeId:[4],
      table:"/",
      link:"/linkedin/",
      title:"Linkedin Şirket Takibi"
    },req,res)
  }else{
    var company = await db.selectQuery({
      id: id
    }, "Linkedin_Company")
    await tableGenerator({
      procedure:"linkedin_user",
      tableHead:["id","username"],
      turkce:["Id","İsim-Soyisim"],
      pageLink:"/linkedin/",
      title:"Şirket Çalışanları ( "+company[0]?.name +" )",
      sqlData:{ id:id},
    },req,res)
  }
  
 
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
      procedure:"prototype",
      tableHead:[ "name", "username"],
      turkce:[ "Ad", "Oluşturan"],
      notifyLink:"/ajax/user_approve",
      link:"/prototype/",
      searchCol:"name",
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
    procedure:"manual",
    tableHead:["id", "n", "dn", "rdd"],
    turkce:["Id", "Oyun adı", "Yayıncı", "Çıkış zamanı"],
    dateIndex:[4],
    link:"/game/",
    search:true,
    checkbox:true,
    searchCol:"n",
    typeId:[2],
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
  //DÜZELT BUNU
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
      procedure:"authority_group",
      search:true,
      checkbox:true,
      tableHead:["id", "text"],
      turkce:["Id", "Yetki türü"],
      searchCol:"text",
      customNotifyText:"Durum",
      notifyLink:"authority_group",
      table:id+"/",
      pageLink:"/group/",
      title: "Grup ( " + group[0]?.text + " )",
      sqlData:{ id:id},
    },req,res)
  }
});

router.get('/game/:id/:page?', async function (req, res, next) {
  let id = req.params.id
  if (id == "table") {
    var userId = req.session.user.id;
    await tableGenerator({
      procedure:"game",
      search:true,
      checkbox:true,
      tableHead:["id", "n", "dn", "rdd"],
      turkce:["Id", "Oyun adı", "Yayıncı", "Çıkış zamanı"],
      dateIndex:[4],
      typeId:[2],
      searchCol:"n",
      link:"/game/", 
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
    var color = await  db.selectQuery({
      gameId: id
    }, "Game_Color")
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
    versions=versions.sort( function( a, b ) {
      if ( a.version_date > b.version_date ){
        return -1;
      }
      if ( a.version_date < b.version_date ){
        return 1;
      }
      return 0;
    } );
    res.render('game', {
      title: data[0].n,
      data: data[0],
      images: images,
      versions: versions,
      color:color && color[0],
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
      procedure:"company",
      search:true,
      checkbox:true,
      searchCol:"text",
      tableHead:["id", "text"],
      turkce:["Id", "Yayıncı"],
      checker:true,
      typeId:[1, 3],
      link:"/company/",
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
    var linkedin;
    var tmplinkedin = await db.selectQuery({
      companyId: id
    }, "Linkedin_Company");
    if (tmplinkedin && tmplinkedin.length > 0) {
      linkedin = tmplinkedin[0]
    }
    var note;
    var tmpNote = await db.selectQuery({
      targetId: id,
      targetType: 2,
      userId: userId
    }, "User_Notes")
    if (tmpNote && tmpNote.length > 0) {
      note = tmpNote[0].text
    }
    var games = await  db.queryObject(`select g.id,g.n,g.rdd,GROUP_CONCAT(v.version_date) as ver  from coda.Games as g inner join coda.Versions as v on v.gameId = g.id and v.deleted=0 and g.companyId=:id   group by v.gameId ORDER BY g.rdd DESC`,{id:id})
    res.render('company', {
      title: data[0]?.text,
      data: data[0],
      games: games,
      notify: notify,
      note: note,
      linkedin:linkedin
    });
  }

});
router.get('/notification/:id/:page?', async function (req, res, next) {
  let id = req.params.id
  if (id == "table") {
    await tableGenerator({
      procedure:"notification_request",
      html:true,
      tableHead:["text", "date"],
      turkce:["Bildirim", "Tarih"],
      dateIndex: [2],
      pageLink:"/notification/",
      title:"Bildirimler",
    },req,res)
  }
});
router.get('/notification_request/:id/:page?', async function (req, res, next) {
  let id = req.params.id
  if (id == "1") {
    await tableGenerator({
      pdf:true,
      procedure:"notification_request_one",
      searchCol:"n",
      search:true,
      checkbox:true,
      pp:true,
      tableHead:["id", "n","dn"],
      turkce:["Id", "Oyun adı","Yayıncı"],
      typeId: [2],
      link: "/game/",
      table:"1/",
      pageLink:"/notification_request/",
      title:"Bildirimler Oyunlar",
    },req,res)
  } else if (id == "2") {
    await tableGenerator({
      procedure:"notification_request_two",
      searchCol:"text",
      search:true,
      checkbox:true,
      tableHead:["id", "text"],
      turkce:["Id", "Yayıncı adı"],
      typeId: [1],
      link: "/company/",
      table:"2/",
      pageLink:"/notification_request/",
      title:"Bildirimler Yayıncılar",
    },req,res)
  }
});
router.get('/myfollow/:id/:page?', async function (req, res, next) {
  let id = req.params.id
  if (id == "table") {
    await tableGenerator({
      procedure:"myfollow",
      search:true,
      checkbox:true,
      tableHead:["id", "n", "dn", "rdd"],
      turkce:["Id", "Oyun adı", "Yayıncı", "Çıkış zamanı"],
      typeId:[2],
      dateIndex:[4],
      searchCol:"n",
      link:"/game/",
      pageLink:"/myfollow/",
      title:"Takip Edilen Yayıncıların Oyunları",
      pp:true
    },req,res)
  }
});
router.get('/system/:id/:page?', async function (req, res, next) {
  let id = req.params.id
  if (id == "table") {
    await tableGenerator({
      procedure:"system",
      search:true,
      checkbox:true,
      tableHead:["id", "n", "dn", "version_date_max","version_date_min"],
      turkce:["Id", "Oyun adı", "Yayıncı", "Son versiyon tarihi", "İlk versiyon tarihi"],
      skip:true,
      typeId:[2],
      dateIndex:[4,5],
      orderBy:"version_date_max",
      searchCol:"n",
      link:"/game/",
      pageLink:"/system/",
      title:"Sistem Takip Listesi",
      pp:true
    },req,res)
  }
});
router.get('/user_tag/:id/:page?', async function (req, res, next) {
  let id = req.params.id
  //TEHLİKELİ!!
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
      procedure:"user_categorys",
      search:true,
      checkbox:true,
      tableHead:["id", "n", "dn", "rdd"],
      turkce:["Id", "Oyun Adı", "Yayıncı", "Çıkış zamanı"],
      dateIndex:[4],
      typeId:[2],
      searchCol:"n",
      link:"/game/",
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
      procedure:"user",
      search:true,
      checkbox:true,
      searchCol:"username",
      tableHead:["id","username"],
      turkce:["Id","Kullanıcı adı"],
      customNotifyText:"Aktif/Pasif",
      notifyLink:"user_approve",
      link:"/user/",
      title:"Kullanıcılar"
    },req,res)
  }
  else{
    var user = await db.selectQuery({
      id: id,
    }, "Users")
    await tableGenerator({
      procedure:"user_grup",
      search:true,
      checkbox:true,
      tableHead:["id","text"],
      searchCol:"text",
      turkce:["Id","Grup"],
      customNotifyText:"Gruba Ekle",
      notifyLink:"user_grup",
      table:id+"/",
      pageLink:"/user/",
      sqlData:{id:id},
      title:"Gruplar("+ user[0].username +")"
    },req,res)
  }
});

async function tableGenerator(data,req,res){
  if(data.customTable){
    res.render(data.customTable, {
      title: data.title,
      data: data
    });
  }
  else if(data.old){
    res.render('table yedek', {
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