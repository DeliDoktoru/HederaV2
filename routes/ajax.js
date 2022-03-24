const jsftp = require("jsftp");
const fs = require('fs');
const express = require('express');
const router = express.Router();
const db= require('../business/database');
const md5 = require('md5');
var somur = require('./../business/s');
const multer  = require('multer');
const FTP ={
  host: "cedrusgames.com",
  user: "cedrusadmin", 
  pass: "CedrusFikriemre..891621!!" 
}
//sendIpToCedrus()

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};
/* #endregion */


// #region  multer  
var storageFile = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/prototip_files/');
  },
  filename: function (req, file, cb) {
    if(req.session.user && req.session.user.approved){
      var ext=file.originalname.substr(file.originalname.lastIndexOf("."));
      var fileName=md5(Math.random())+ext;
      if(!req.fileName){
        req.fileName=[];
      }
      req.fileName.push({"fileName":fileName});
      cb(null, fileName) ;
    }
  }
});
const accessFiles=['jpg', 'png','jpeg'];
var uploadFile = multer({ storage: storageFile, limits: { fileSize: 10 * 1024 * 1024  ,files: 10 } ,//10MB
  fileFilter: function (req, file, cb) {
    var obj=JSON.parse(decodeURIComponent(file.originalname));
    file.originalname=obj.name;
    if(!accessFiles.some(ext => file.originalname.endsWith("." + ext))){
      req.fileValidationError='dosyatipigecersiz';
      return cb(null, false)
    }
    cb(null, true)
}});


router.post('/image',uploadFile.array('file',10),function(req,res,next){
  res.send(JSON.stringify(req.fileName))
}); 

router.post('/table/:id',async function(req, res, next) {
  try {
    var data=JSON.parse(JSON.stringify(req.body.ndata));
    let id = req.params.id;
    data.userId=req.session.user.id;
    res.send({d:await db.storedProcedure(id,data),status:1});
  } catch (error) {
    console.log(error)
    res.send({
      message: "Hata oluştu!",
      status: 0,
      color: "danger"
    });
  }

});

router.post('/pdf/:id',async function(req, res, next) {
  try {
    var data={}
    let id = req.params.id;
    data.userId=req.session.user.id;
    res.send({d:await db.storedProcedurePdf(id,data),status:1});
  } catch (error) {
    console.log(error)
    res.send({
      message: "Hata oluştu!",
      status: 0,
      color: "danger"
    });
  }

});

/* #region  login */
router.post('/login',async function(req, res, next) {
  var data=req.body.kdata;
  var text, status=0 ;
  try {
    var user=(await db.selectQuery({
      username:data.username,
      password:md5(data.password),
    },"Users"));
    if(user && user.length>1){
      tmperror={
        message:"kullancı sorgusunda birden fazla sonuç geldi",
        stack:"Kullanıcı Adı:"+data.username
      };
      console.log(tmperror.message +":"+tmperror.stack )
      throw "Beklenmedik bir hata oluştu!";
    }
    else if (user && user.length==1 ) {
      if(user[0].approved==0 ) throw "Admin onayını bekleyiniz!";
      else req.session.user = user[0];
    }
    else{
      throw "Kullanıcı adı yada parola hatalı!";
    }
    text = "Giriş Yapılıyor!";
    status = 1;
  } catch (error) {
    text=error
  }
  
  res.send({
    message: text,
    status: status,
  });

});
/* #endregion */
/* #region  register */
router.post('/register',async function(req, res, next) {
  var data=req.body.kdata;
  var text, status=0 ;
  try {
    var user=(await  db.selectQuery({
      username:data.username
    },"Users"));
    if(user && user.length>0){
      if(user.length>1){
        tmperror={
          message:"kullanıcı sistemde kayıtlı birden fazla kayıtlı!",
          stack:"Kullanıcı Adı:"+data.username
        };
        console.log(tmperror.message +":"+tmperror.stack )
        throw "Beklenmedik bir hata oluştu!";
      }
      
      if(user[0].approved==1) throw "Bu kullanıcı sistemde kayıtlı!";
      if(user[0].approved==0) throw "Admin onayını bekleyiniz!";
    }
    await db.insert({username:data.username,password:md5(data.password)},"Users")
    text = "Kayıt Başarılı, lütfen admin onayı için bekleyiniz!";
    status = 1;
  } catch (error) {
    text=error
  }
  
  res.send({
    message: text,
    status: status,
  });

});
/* #endregion */
/* #region  kullanicilar */
router.post('/kullanicilar',async function(req, res, next){
  var l=res.locals.l;
  var data=req.body.kdata;
  var text="", status=0 ;
  var session=req.session.user; 
  selfScript.removeNotAllowedProperties([
    "id","kullaniciAdi","kullaniciFoto","kullaniciKayitTar",
  "kullaniciOlusturanId","kullaniciDuzenlemeTar","kullaniciDilTercihi","kullaniciDilTercihi","silindiMi"
  ],data);
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw errors.array();
    }
    switch (req.body.ndata.method) {
      case "update":
        if(!req.body.ndata.id){
          throw "idbulunamadi";
        }
        if(data.kullaniciParola && data.kullaniciParola!="" && data.kullaniciParola.length>=4){
          data.kullaniciParola=md5(data.kullaniciParola);         
        }else{
          delete data.kullaniciParola;
        }
        await  db.update(data,{id:req.body.ndata.id},"kullanicilar");
        text="guncellemebasarili";
        status = 1;
        break;
      case "delete":
        if(!req.body.ndata.id){
          throw "idbulunamadi";
        }
        var tmpData={id:req.body.ndata.id,firmaId:session.firmaId}
        await  db.setSilindi(tmpData,"kullanicilar");
        text="silmeislemibasarili";
        status = 1;
        break;
      case "create":
        if(!data.kullaniciParola || data.kullaniciParola=="" || data.kullaniciParola.length<4 ){
          throw "parolabulunamadi";
        }
        data.kullaniciParola=md5(data.kullaniciParola);         
        if(data.kullaniciParola){
          data.kullaniciParola=md5(data.kullaniciParola);         
        }
        data.kullaniciDilTercihi=session.kullaniciDilTercihi;
        data.kullaniciOlusturanId=session.id;
        await  db.insert(data,"kullanicilar");
        text="eklemeislemibasarili";
        status = 1;
        break;
      default:
        text = "eksikbilgi";
        status = 0;
    }
  } catch (error) {
    text=selfScript.catchConverterError(error,l);
  }
  
  res.send({
    message: text,
    status: status,
  });

});
/* #endregion */
/* #region  exit */
router.get('/exit', async function (req, res, next) {
  var l=res.locals.l;
  var text;
  if (req.session.user == undefined || req.session.user.id == undefined) {
    text = "girisbilgilerinizbulunamadi";
    res.send({
      message: text,
      status: 0,
      color: "danger"
    });
  } else {
    req.session.destroy();
    text = "cikisyapiliyor";
    res.send({
      message: text,
      status: 1,
      color: "success"
    });
  }
});
/* #endregion */
/* #region  dynajax */
router.post('/dyndata', async function (req, res, next) {
  var l=res.locals.l;
  var data=req.body.kdata;
  var text="", status=0;
  var session=req.session.user; 
  var result;
  try {
    if( !data.hash){
      throw "eksikbilgi";
    }
    var sorguBilgileri=selfScript.getValuesFromHash(session,data.hash);
    if(!sorguBilgileri){
      throw "eksikbilgi";
    }
    result=await db.selectWithColumn(sorguBilgileri.colName,sorguBilgileri.tableName,data.where,null,sorguBilgileri.dbName);
    status=1;
  } catch (error) {
    text=selfScript.catchConverterError(error,l);
  }
  res.send({
    message: text,
    status: status,
    data:result,
    colName:sorguBilgileri.colName[1]
  });
});
/* #endregion */

router.post('/setNotify',async function(req, res, next) {
  var data=req.body.ndata;
  var text, status=0 ;
  try {
    var userId=req.session.user.id;
    for ( item of data.typeId) {
      if(data.status){
        await db.remove({userId:userId,typeId:item,targetId:data.targetId},"Notification_Request")
        text = "Bildirim isteği kaldırıldı!";

      }else{
        await db.insert({userId:userId,typeId:item,targetId:data.targetId},"Notification_Request")
        text = "Bildirim isteği eklendi!";

      }
    }
    status = 1;
  } catch (error) {
    console.log(error)
    text=error
  }
  
  res.send({
    message: text,
    status: status,
  });

});

router.post('/user_approve',async function(req, res, next) {
  var data=req.body.ndata;
  var text, status=0 ;
  var userId=req.session.user.id;
  try {
    if(await db.checkAuth(userId,7 ) == false){
      throw "Yetkiniz Yok!"
    }
    if(data.status){
      await  db.update({approved:0},{id:data.targetId},"Users")
      text = "Kullanıcı pasife alındı!";
      
    }else{
      await db.update({approved:1},{id:data.targetId},"Users")
      text = "Kullanıcı aktife alındı!";

    }
    status = 1;
  } catch (error) {
    console.log(error)
    text=error
  }
  
  res.send({
    message: text,
    status: status,
  });

});
router.post('/hidden',async function(req, res, next) {
  var data=req.body.ndata;
  var text, status=0 ;
  try {
    await  db.update({hidden:0},{id:data.targetId},"Companys")
    text = "Yayıncı aktifleştirildi!";
    status = 1;
  } catch (error) {
    console.log(error)
    text=error
  }
  res.send({
    message: text,
    status: status,
  });

});
router.post('/user_grup',async function(req, res, next) {
  var data=req.body.ndata;
  var text, status=0 ;
  var userId=req.session.user.id;
  try {
    if(await db.checkAuth(userId,3 ) == false){
      throw "Yetkiniz Yok!"
    }
    if(data.status){
      await  db.remove({userId:data.id,groupId:data.targetId},"User_Grup")
      text = "Kullanıcı gruptan kaldırıldı!";
      
    }else{
      await db.insert({userId:data.id,groupId:data.targetId},"User_Grup")
      text = "Kullanıcı gruba eklendi!";

    }
    status = 1;
  } catch (error) {
    console.log(error)
    text=error
  }
  
  res.send({
    message: text,
    status: status,
  });

});

router.post('/authority_group',async function(req, res, next) {
  var data=req.body.ndata;
  var text, status=0 ;
  var userId=req.session.user.id;
  try {
    if(await  db.checkAuth(userId,3 ) == false){
      throw "Yetkiniz Yok!"
    }
    if(data.status){
      await  db.remove({authId:data.authId,groupId:data.groupId},"Authority_Group")
      text = "Yetki gruptan kaldırıldı!";
      
    }else{
      await db.insert({authId:data.authId,groupId:data.groupId},"Authority_Group")
      text = "Yetki gruba eklendi!";

    }
    status = 1;
  } catch (error) {
    console.log(error)
    text=error
  }
  
  res.send({
    message: text,
    status: status,
  });

});

router.post('/manual',async function(req, res, next) {
  var data=req.body.ndata;
  var text, status=0 ;
  try {
      if(data.targetUrl.includes("/developer/")){
        var uid=data.targetUrl;
        uid=uid.substring(uid.lastIndexOf("/id"))
        uid=parseInt(uid.replace("/id",""))
        if(isNaN(uid)){
            throw "Url hatalı!"
        }
        var checkCompany=(await db.selectQuery({  adi :  "id"+uid },"Companys") )
        if ( checkCompany && checkCompany.length>0  ){
          var notify=(await db.selectQuery({  userId :  req.session.user.id,targetId:checkCompany[0].id,typeId:1 },"Notification_Request") )
          text = "Bu yayıncı ekli!";
          status = 1;
          res.send({
            notify:notify,
            d:checkCompany,
            message: text,
            status: status,
          });
          return
        }
        let companyName=await somur.getCompanyName(uid)
        if(!companyName) throw "Yayıncı adı bulunamadı!"
        await db.insert({ text:companyName ,adi:"id"+uid,checker:'1'},"Companys")
        console.log("Company added:"+companyName );
        text = "Eklendi!";
        status = 1;
        
      }
      else{
        if(data.targetUrl && await somur.addByUrl(data.targetUrl,req.session.user.id)){
          text = "Eklendi!";
          status = 1;
        }else{
          text = "İşlem başarısız!"; 
        }
      }
  } catch (error) {
    console.log(error)
    text=error
  }
  
  res.send({
    message: text,
    status: status,
  });

});
router.post('/color/:id',async function(req, res, next) {
  var data=req.body.kdata;
  var text, status=0 ;
  var userId=req.session.user.id;
  let id = req.params.id;
  try {
    if(!id) throw "ID bulunamadı!";
    var checkColor=(await db.selectQuery({  gameId :  id },"Game_Color") )
    if ( checkColor && checkColor.length>0  ){
      await db.update({
        color_1:data.color_1,
        color_2:data.color_2,
        color_3:data.color_3,
        color_4:data.color_4,
        color_5:data.color_5,
        userId:userId,
      },{id:checkColor[0].id},"Game_Color");
      text = "Güncellendi!";
    }else{
      await db.insert({
        color_1:data.color_1,
        color_2:data.color_2,
        color_3:data.color_3,
        color_4:data.color_4,
        color_5:data.color_5,
        gameId:id,
        userId:userId,
      },"Game_Color");
      text = "Eklendi!";
    }
    status = 1;
  } catch (error) {
    console.log(error)
    text=error
  }
  
  res.send({
    message: text,
    status: status,
  });

});
router.post('/note',async function(req, res, next) {
  var data=req.body.ndata;
  var text, status=0 ;
  try {
    var userId=req.session.user.id;
    if(data.status==0){
      await db.remove({userId:userId,targetType:data.targetType,targetId:data.targetId},"User_Notes")
      text = "Not silindi!";

    }else{
      await db.remove({userId:userId,targetType:data.targetType,targetId:data.targetId},"User_Notes")
      await db.insert({userId:userId,targetType:data.targetType,targetId:data.targetId,text:data.text},"User_Notes")
      text = "Not eklendi!";

    }
    status = 1;
  } catch (error) {
    console.log(error)
    text=error
  }
  
  res.send({
    message: text,
    status: status,
  });

});
router.post('/user_game_tag',async function(req, res, next) {
  var data=req.body.ndata;
  var text, status=0 ;
  var tableName="User_Category_Games"
  try {
    switch (data.method) {
      case "delete":
        if(!data.userCategoryId ||  !data.gameId){
          throw "ID bulunamadı!";
        }
        if(await checkOwner(data.userCategoryId,"User_Categorys",req)==false){
          throw "Yetkiniz Yok!"
        }
        await db.setSilindi({gameId:data.gameId,userCategoryId:data.userCategoryId},tableName);
        text="Silme başarılı";
        status = 1;
        break;
      case "create":
        if(await checkOwner(data.userCategoryId,"User_Categorys",req)==false){
          throw "Yetkiniz Yok!"
        }
        await db.setSilindi({gameId:data.gameId,userCategoryId:data.userCategoryId},tableName);
        await db.insert({gameId:data.gameId,userCategoryId:data.userCategoryId},tableName);
        text="Kategoriye eklendi!"
        status = 1;
        break;
      default:
        text = "Eksik bilgi!";
        status = 0;
    }
  } catch (error) {
    console.log(error)
    text=error
  }
  
  res.send({
    message: text,
    status: status,
  });

});
router.post('/group',async function(req, res, next) {
  var data=req.body.ndata;
  var text, status=0 ;
  var userId=req.session.user.id;
  var tableName="Groups"
  try {
    if(await db.checkAuth(userId,3 ) == false){
      throw "Yetkiniz Yok!"
    }
    switch (data.method) {
      case "update":
        if(!data.id){
          throw "ID bulunamadı!";
        }
        await db.update({text:data.text},{id:data.id},tableName);
        text="Güncelleme başarılı!"
        status = 1;
        break;
      case "delete":
        if(!data.id){
          throw "ID bulunamadı!";
        }
        await db.setSilindi({id:data.id},tableName);
        text="Silme başarılı";
        status = 1;
        break;
      case "create": 
        await db.insert({text:data.text},tableName);
        text="Grup eklendi!"
        status = 1;
        break;
      default:
        text = "Eksik bilgi!";
        status = 0;
    }
  } catch (error) {
    console.log(error)
    text=error
  }
  
  res.send({
    message: text,
    status: status,
  });

});
router.post('/user_tag',async function(req, res, next) {
  var data=req.body.ndata;
  var text, status=0 ;
  var userId=req.session.user.id;
  var tableName="User_Categorys"
  try {
    switch (data.method) {
      case "update":
        if(!data.id){
          throw "ID bulunamadı!";
        }
        if(await checkOwner(data.id,tableName,req)==false){
          throw "Yetkiniz Yok!"
        }
        await db.update({text:data.text},{id:data.id},tableName);
        text="Güncelleme başarılı!"
        status = 1;
        break;
      case "delete":
        if(!data.id){
          throw "ID bulunamadı!";
        }
        if(await checkOwner(data.id,tableName,req)==false){
          throw "Yetkiniz Yok!"
        }
        await db.setSilindi({id:data.id},tableName);
        text="Silme başarılı";
        status = 1;
        break;
      case "create":
        await db.insert({userId:userId,text:data.text},tableName);
        text="Kategori eklendi!"
        status = 1;
        break;
      default:
        text = "Eksik bilgi!";
        status = 0;
    }
  } catch (error) {
    console.log(error)
    text=error
  }
  
  res.send({
    message: text,
    status: status,
  });

});
router.post('/comment',async function(req, res, next) {
  var data=req.body.ndata;
  var text, status=0 ;
  var tableName="Game_Comments"
  try {
    var userId=req.session.user.id;
    switch (data.method) {
      case "update":
        if(!data.id){
          throw "ID bulunamadı!";
        }
        if(await checkOwner(data.id,tableName,req)==false){
          throw "Yetkiniz Yok!"
        }
        await db.update({text:data.text},{id:data.id},tableName);
        text="Güncelleme başarılı!"
        status = 1;
        break;
      case "delete":
        if(!data.id){
          throw "ID bulunamadı!";
        }
        if(await checkOwner(data.id,tableName,req)==false){
          throw "Yetkiniz Yok!"
        }
        await db.setSilindi({id:data.id},tableName);
        text="Silme başarılı";
        status = 1;
        break;
      case "create":
        await db.insert({userId:userId,text:data.text,gameId:data.gameId,date:new Date().toISOString()},tableName)
        text = "Yorum eklendi!";
        status = 1;
        break;
      default:
        text = "Eksik bilgi!";
        status = 0;
    }
    status = 1;
  } catch (error) {
    console.log(error)
    text=error
  }
  
  res.send({
    message: text,
    status: status,
  });

});
router.post('/checker',async function(req, res, next) {
  var data=req.body.ndata;
  var text, status=0 ;
  try {
    if(await db.checkAuth(req.session.user.id,1 ) == false ){
      throw "Yetkiniz Yok!"
    }
    if(data.status){
      await db.update({ checker:"0"},{id:data.targetId},"Companys");
      text = "Yayıncı takibi kapatıldı!";
    }else{
      await db.update({ checker:"1"},{id:data.targetId},"Companys");
      text = "Yayıncı takibi açıldı!";
    }
    status = 1;
  } catch (error) {
    console.log(error)
    text=error
  }
  
  res.send({
    message: text,
    status: status,
  });

});
router.post('/top',async function(req, res, next) {
  var data=req.body.ndata;
  var text, status=0 ;
  try {
    var resultGames=await db.selectLikeWithColumn(["countrieId","deviceId","tier","date"],"Top_List",{gameId:data.targetId})
    var resultGame=await db.selectLikeWithColumn(["n"],"Games",{id:data.targetId})
    res.send({d:resultGames,n:resultGame[0].n,status:1});
    return
  } catch (error) {
    console.log(error)
    text=error
  }
  
  res.send({
    message: text,
    status: status,
  });

});
router.post('/skip',async function(req, res, next) {
  var data=req.body.ndata;
  var text, status=0 ;
  try {
    if(await db.checkAuth(req.session.user.id,1 ) == false ){
      throw "Yetkiniz Yok!"
    }
    /*if(await checkOwner(data.targetId,"Games",req)==false){
      throw "Yetkiniz Yok!"
    }*/
    await db.update({ skip:"1"},{id:data.targetId},"Games");
    text = "Versiyon kontrolu kapatıldı!";
    status = 1;
  } catch (error) {
    console.log(error)
    text=error
  }
  
  res.send({
    message: text,
    status: status,
  });

});
router.post('/prototype',async function(req, res, next) {
  var data=req.body.ndata;
  var text, status=0 ;
  try {
    if(data && data.method=="delete" )
    {
      if(data.id==0){
        text = "Henüz kaydedilmedi!";
      }
      else{
        if(await checkOwner(data.id,"Prototypes",req)==false && await db.checkAuth(req.session.user.id,6)==false ){
          throw "Yetkiniz Yok!"
        }
        await db.remove({id:data.id},"Prototypes")
        text = "Silindi!";
      }
    }
    else{
      data.name= data.name=="" || data.name==null ? ""+Math.floor(Math.random() * 999999) : data.name 
      if(data.id==0){
        await db.insert({ownerId:req.session.user.id,data:JSON.stringify(data),name:data.name,link:slug(data.name)},"Prototypes")
      }else{
        if(await checkOwner(data.id,"Prototypes",req)==false && await db.checkAuth(req.session.user.id,6)==false ){
          throw "Yetkiniz Yok!"
        }
        await db.update({data:JSON.stringify(data),name:data.name,link:slug(data.name)},{id:data.id},"Prototypes");
      }
      if(await db.checkAuth(req.session.user.id,5 ) ){
        savePrototype(data.name,data)
      }
      text = "Kaydedildi!";
    }
    status = 1;
  } catch (error) {
    console.log(error)
    text=error
  }
  
  res.send({
    message: text,
    status: status,
  });

});
router.post('/preview',async function(req, res, next) {
  var data=req.body.ndata;
  var text, status=0 ;
  try {
    req.session.preview=data;
    status = 1;
  } catch (error) {
    console.log(error)
    text=error
  }
  res.send({
    message: text,
    status: status,
  });

});

async function checkOwner(id,tableName,req){
  let tmp=await db.selectQuery({id:id},tableName)
  if ( tmp && tmp.length>0 &&  req.session.user.id && ( ( tmp[0].ownerId && tmp[0].ownerId==req.session.user.id  ) ||  (  tmp[0].userId && tmp[0].userId==req.session.user.id ) )  ){
    return true
  }
  else{
    return false
  }
  
}

function sendIpToCedrus(){
  const http = require('http');
  function doRequest(url) {
      var options = {
          headers: {
              "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.89 Safari/537.36",
              "Upgrade-Insecure-Requests": 1,
          }
      };
      http.get(url,options, (resp) => {
          let html = '';
          resp.on('data', (chunk) => {
            html += chunk;
          });
          resp.on('end', () => {
              console.log(html);
              //var ip="45.135.206.76";
              var str=`var ip="http://${html.trim()}:3000/login"`
              let buffer=Buffer.from(str, "utf-8");
              new jsftp(FTP).put(buffer, "/httpdocs/ip.js", function(err) {
                if (err) {
                    console.error(err);
                }
                else {
                    console.log( "ip uploaded successfuly");
                }
              });
          });
          }).on("error", (err) => {
              console.log(err);
          });
      
  }
  doRequest("http://icanhazip.com/")
  
}

function savePrototype(name,data){
  console.log("Saving..")
  for (let i = 0; i < data.splide.length; i++) {
    data.splide[i]=data.splide[i].map(e=> {  
      if(e.type=="yns" && e.link!="/images/dummy.jpg"){
        let tmp=e.link
        require('fs').readFile("./public"+tmp, function(err, buffer) {
          if(err) {
              console.error(err);
          }
          else {
            new jsftp(FTP).put(buffer, "/httpdocs/gids"+tmp, function(err) {
                  if (err) {
                      console.error(err);
                  }
                  else {
                      console.log( "img uploaded");
                  }
              });
          }
        });
      }
      if(e.link!="/images/dummy.jpg"){
        e.link="/gids"+e.link;
      }else{
        e.link=""
      }
      return e;
    })
  }

  orjinalName=name
  name=slug(name)
  savedName= name=="" || name==null ? ""+Math.floor(Math.random() * 999999) : name 
  var indexHtml = fs.readFileSync('./business/template.html',{encoding:'utf8'});
  indexHtml=indexHtml.replace("${#}",JSON.stringify(data)).replaceAll("{#NAME}",orjinalName)
  fs.writeFileSync("./prototypes/"+savedName+".html",indexHtml);
  require('fs').readFile("./prototypes/"+savedName+".html", function(err, buffer) {
    if(err) {
        console.error(err);
    }
    else {
        new jsftp(FTP).put(buffer, "/httpdocs/gids/"+savedName+".html", function(err) {
            if (err) {
                console.error(err);
            }
            else {
                console.log( "prototip uploaded successfuly");
            }
        });
    }
  });
  
  
}
 function slug(str) {
  str = str.replace(/^\s+|\s+$/g, ''); // trim
  str = str.toLowerCase();

  // remove accents, swap ñ for n, etc
  var from = "ãàáäâẽèéëêìíïîõòóöôùúüûñç·/_,:;";
  var to   = "aaaaaeeeeeiiiiooooouuuunc------";
  for (var i=0, l=from.length ; i<l ; i++) {
    str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
  }

  str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
    .replace(/\s+/g, '-') // collapse whitespace and replace by -
    .replace(/-+/g, '-'); // collapse dashes

  return str;
};
router.post('/linkedin',async function(req, res, next) {
  var data=req.body;
  var text="", status=0 ;
  switch (data.method) {
    case "check":
      var checkCompany=await db.selectQuery({  id :  data.id },"Linkedin_Company") 
      if ( checkCompany && checkCompany.length>0  ){
        var count=(await db.queryObject("select count(*) as count from coda.Linkedin_User where companyId=:id and deleted=0",{id:data.id}))[0].count
        if(count!=data.count){ text="eşit değil";status=1;}else{text="eşit"}
      }
      else{text="hiç verisi yok";status=1;}
      break;
    case "update":
      var checkCompany=await db.selectQuery({  id :  data.id },"Linkedin_Company") 
      let gate=true;
      if ( checkCompany && checkCompany.length==0  ){
        await db.insert({ id:data.id,name:data.companyName,link:"https://www.linkedin.com/company/"+data.id  },"Linkedin_Company")
        for(item of data.cache){
          if((await db.selectQuery({  urn :  item.urn, companyId:item.companyId},"Linkedin_User")).length==0)
          await db.insert({ username:item.name,link:item.link,urn:item.urn,companyId:item.companyId  },"Linkedin_User")
        }
        gate=false;
      }
      for(item of data.cache){
        if((await db.selectQuery({  urn :  item.urn, companyId:item.companyId},"Linkedin_User")).length==0)
        await db.insert({ username:item.name,link:item.link,urn:item.urn,companyId:item.companyId  },"Linkedin_User")
      }
      if(gate){
        let fired=await db.selectIn("urn",data.cache.map(x=>x.urn),"Linkedin_User",true," AND companyId="+checkCompany[0].id)
        if(fired.length>0){
          var re=await db.selectQuery({targetId:data.id ,typeId:4 },"Notification_Request")
          if ( re && re.length>0  ){
            for(item of fired){
                for (ri of re) {
                    await db.insert({date:new Date().toISOString(),userId:ri.userId,text:`${item.username} işten ayrıldı ( Firma : ${checkCompany[0].name}) <a class="btn" href="${item.link}"><i class="fas fa-link"></i></a>`},"Notifications");
                }
            }
          }
          await db.setSilindi({id:item.id},"Linkedin_User")
        }
        
      }
    break;  
    default:
      break;
  }
  res.send({
    message: text,
    status: status,
  });

});
module.exports = router;
