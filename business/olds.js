const fs = require('fs')
const path = require('path');
const download = require('image-downloader');
const fetch = require('node-fetch');
const db = require('./database');
const axios = require('axios');
var auth="1tA6sEL3h0iTt1Xh3TO4ZKnrlRw";
async function run(){
    try{
        console.log(new Date())
        await insertLatestGames();
        await insertOtherCompanyGames();
        await getVersionOfGame();
        await delay(60)
        run();
    }catch(error){
        run();
    }
    
}

async function insertLatestGames(){
    for(let i=1;true;i++ ){
        var newItem=false,data,res=await getLatestDataRequest(i);//bütün veriyi çekmek için newitem false yap
        try { data=JSON.parse(res).data;  } catch (error) { console.log("cannot parse! (Main Loop)"); break;}
        if(data==undefined || data.length==0) break;
        for ( item of data) {
          let tmpBool = (await insertGameById(item.i));
          if(tmpBool){
            newItem=false;
          }
        }
        if(newItem){
            break;
        }
    }
}

async function insertOtherCompanyGames(){
    
    var data=await new db().query("SELECT * FROM coda.Companys WHERE get_games='0';")  
    if(data.length){
        console.log("companys which has any not inserted games count:"+data.length) 
        for (let item of data) {
            var resc=await getCompanyGamesRequest(item.di)
            try {  obj=JSON.parse(resc); if(obj.apps.data==undefined || obj.data==undefined) throw "" } catch (error) { console.log("No data (Insert company games Loop) companyId="+item.id); await new db().update({ get_games:"1"},{id:item.id},"Companys"); continue;}
            for (let game of obj.apps.data) {
                await insertGameById(game.id)
            }
            await new db().update({ get_games:"1"},{id:item.id},"Companys")
        }
    }
}

async function insertGameByURL(url){
    var checkGame=(await new db().selectQuery({  app_store_url : url },"Games") )
    if ( checkGame && checkGame.length>0  ){
        return false;
    }
}

async function insertGameById(gameI){
    var checkGame=(await new db().selectQuery({  i : gameI },"Games") )
    if ( checkGame && checkGame.length>0  ){
        return false;
    }
    var res=await getGameRequest(gameI);
    try {  obj=res.data } catch (error) { console.log("No data (Insert game Loop) gameI="+gameI); return false;}
   
    //game obj
    
    obj.developer=removeEmoji(obj.developer);
    obj.description=removeEmoji(obj.description);
    insertObj={ n:obj.name,di:obj.developer_id,dn:obj.developer,i:gameI,rd:obj.released,bundle_id: obj.bundle_id 
        , description: obj.description, country:obj.country ,app_store_url:obj.app_store_url,version:obj.version,video_url:obj.video_url 
        ,avg_rating:obj.avg_rating, installs: obj.installs,installs_labels:obj.installs_labels,rdd: obj.released.substring(0,10) }
    
    //company
    var checkCompany=(await new db().selectQuery({  text :  obj.developer },"Companys") )
    if ( checkCompany && checkCompany.length>0  ){
        insertObj.companyId=checkCompany[0].id;
    }else{
        var companyId=(await new db().insert({ text:obj.developer ,di:obj.developer_id},"Companys")).insertId;
        console.log("Company added:"+obj.developer );
        insertObj.companyId=companyId;
    }
    //game
    try { var gameId=(await new db().insert(insertObj,"Games")).insertId; } catch (error) { console.log("couldnt insert gameId="+gameI);return false; }
    console.log("game added:"+gameId);
    //category
    let tmpCategorys=[];
    if(obj.tag_groups){
        for (let tag of obj.tag_groups) {
            if(tag.name == "Core Mechanics" || tag.name=="Secondary Mechanics"){
                for (let rtag of tag.tags) {
                    tmpCategorys.push(rtag.name)
                }
            }                   
        }
    }
    for ( category of tmpCategorys) {
        var checkCategory=(await new db().selectQuery({  text : category },"Categorys") )
        if ( checkCategory && checkCategory.length>0  ){
            await new db().insert({ gameId : gameId , categoryId:checkCategory[0].id},"Game_Categorys");
        }else{
            var categoryId=(await new db().insert({ text: category},"Categorys")).insertId;
            console.log("category added:"+category);
            await new db().insert({ gameId : gameId , categoryId:categoryId},"Game_Categorys");
        }
    }
    if(obj.artwork_url){
       await dowloandImage(0,gameId,obj.artwork_url)
    }
    if(obj.screenshots){
        var i=1;
        for ( img of obj.screenshots) {
            await dowloandImage(i,gameId,img)
            i++;
        }
    }
    await getVersionOfGame(gameI)
    if(insertObj.companyId){
        var re=await new db().selectQuery({targetId:insertObj.companyId ,typeId:1 },"Notification_Request")
        if ( re && re.length>0  ){
            for (ri of re) {
                await new db().insert({date:new Date().toISOString(),userId:ri.userId,text:`Yayıncı <a href="/company/${re[0].targetId}">${obj.developer}</a>  yeni oyun(<a href="/game/${gameId }">${insertObj.n}</a>) çıkartdı <a class="btn" href="/game/${gameId}"><i class="fas fa-link"></i></a>`},"Notifications");
            }
        }
    }
    return true;
}
async function getVersionOfGame(gameI){
    var d=[];
    if(gameI){
        var game=await new db().selectQuery({i:gameI},"Games");
        if(game==null || game==undefined){
            console.log("not found in db gameI:"+gameI)
            return;
        }
        d=d.concat(game)
    }else{
        d=d.concat(( await new db().query("SELECT g.* FROM coda.Versions as v inner join coda.Games as g on v.gameId = g.id where v.deleted=0 and g.skip=0 and v.version_date > NOW()-INTERVAL 90 DAY  group by v.gameId  ;")   ))
        //d=d.concat((await new db().selectAll("Games","ORDER BY id DESC")))
    }
    for (item of d) {
        if (item.app_store_url==null) {
            console.log("Version of game, not found id:"+item.id);
            continue;
        }
        console.log("get version id:"+item.id)
        var ree=await getVersionRequestByLink(item.app_store_url);
        try { ree= JSON.parse(JSON.stringify(ree)) } catch (error) { console.log(ree )}
        try {
            for (ver of ree)  {
                var checkVersino=(await new db().selectQuery({  version_name : ver.versionDisplay , gameId : item.id },"Versions") )
                if ( checkVersino && checkVersino.length>0  ){
                     continue;
                }
                await new db().insert({ gameId:item.id ,version_text:ver.releaseNotes,version_name:ver.versionDisplay, version_date:ver.releaseDate},"Versions")
                console.log("version added version:"+ver.versionDisplay +" game id:"+item.id )
                if(item.id){
                    var re=await new db().selectQuery({targetId:item.id ,typeId:2 },"Notification_Request")
                    if ( re && re.length>0  ){
                        for (ri of re) {
                            await new db().insert({date:new Date().toISOString(),userId:ri.userId,text:`<a href="/game/${re[0].targetId }">${item.n}</a> yeni versiyonu çıktı (${ver.versionDisplay}) <a class="btn" href="/game/${re[0].targetId}"><i class="fas fa-link"></i></a>`},"Notifications");
                        }
                    }
                }
                if(item.companyId){
                    var re=await new db().selectQuery({targetId:item.companyId ,typeId:3 },"Notification_Request")
                    if ( re && re.length>0  ){
                        for (ri of re) {
                            await new db().insert({date:new Date().toISOString(),userId:ri.userId,text:`Yayıncı <a href="/company/${re[0].targetId }">${item.dn}</a>, <a href="/game/${item.id }">${item.n}</a> oynunun yeni versiyonunu çıkarttı (${ver.versionDisplay}) <a class="btn" href="/game/${item.id}"><i class="fas fa-link"></i></a>`},"Notifications");
                        }
                    }
                }
            }
        } catch (error) {
            console.log(error)
        }
        
    }
    
}
async function insertDowloandsOfGame(){
    
    var data=await new db().query("SELECT * FROM coda.Games WHERE installs is null;")  
    console.log("need dowloands games count:"+data.length) 
    for (let item of data) {
        var res=await getGameRequest(item.i);
        try {  obj=res.data } catch (error) { console.log("No data (Insert dowloandsOfGame Loop) gameId="+item.id); await new db().update({ installs:   "-",installs_labels:"-"  },{id:item.id},"Games");continue;}
        if( obj.installs==null ){
            console.log("no installs gameId="+item.id)
            await new db().update({ installs:   "-",installs_labels:"-"  },{id:item.id},"Games");
            continue;
        }
        console.log(obj.installs)
        await new db().update({ installs: obj.installs,installs_labels:obj.installs_labels  },{id:item.id},"Games")
    }

}   

function removeEmoji(str){
    return str.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
}
async function delay(sec){
    await new Promise(resolve => setTimeout(resolve, sec*1000));
}
async function dowloandImage(name,gameId,link){
    var fileName=name+".jpg";
    var dir=path.join(__dirname, '../public/games/'+gameId+"/") 
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
    if ( ! fs.existsSync(dir + fileName)) {
        try { 
            await download.image({ url: link, dest: dir + fileName  });
            console.log('Saved to', fileName);
            await new db().insert({ gameId : gameId , text:fileName},"Game_Images");   
         } catch (error) {
             console.log(link)
             console.log("resim yüklenemedi gameId:"+gameId)
            }
    }
}

///
async function getGameRequest(gameI){
    try {
        var res=await axios({
            method: 'get',
            url: 'https://shire.codaplatform.com/web/v1/app/'+gameI,
            headers: {
                "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.89 Safari/537.36"
            },
        });
        return res.data;
    } catch (error) {
        return null;
    }
    
}
async function getAppStoreGameRequestByLink(link){
    try {
      var res=await fetch(link, {
          "headers": {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            "accept-language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
            "cache-control": "max-age=0",
            "if-modified-since": "Thu, 08 Apr 2021 20:22:24 GMT",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "same-origin",
            "sec-fetch-user": "?1",
            "upgrade-insecure-requests": "1"
          },
          "referrerPolicy": "no-referrer-when-downgrade",
          "body": null,
          "method": "GET",
          "mode": "cors",
          "credentials": "include"
        });
        var jsdom = require('jsdom').JSDOM;
        var document =new jsdom(await res.text(), {}); var window = document.window; var $ = require('jquery')(window); 
      var b=$("#shoebox-ember-data-store").html()
      var a=JSON.parse(b);
      a=a[link.replace("https://apps.apple.com/app/id","")].data.relationships.platforms.data[0].attributes.versionHistory
    } catch (error) {
      //console.log("version data:"+b)
      //console.log("No version link:"+link);
      //return []
    }
    return a;


}
async function getVersionRequestByLink(link){
          try {
            var res=await fetch(link, {
                "headers": {
                  "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                  "accept-language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
                  "cache-control": "max-age=0",
                  "if-modified-since": "Thu, 08 Apr 2021 20:22:24 GMT",
                  "sec-fetch-dest": "document",
                  "sec-fetch-mode": "navigate",
                  "sec-fetch-site": "same-origin",
                  "sec-fetch-user": "?1",
                  "upgrade-insecure-requests": "1"
                },
                "referrerPolicy": "no-referrer-when-downgrade",
                "body": null,
                "method": "GET",
                "mode": "cors",
                "credentials": "include"
              });
              var jsdom = require('jsdom').JSDOM;
              var document =new jsdom(await res.text(), {}); var window = document.window; var $ = require('jquery')(window); 
            var b=$("#shoebox-ember-data-store").html()
            var a=JSON.parse(b);
            a=a[link.replace("https://apps.apple.com/app/id","")].data.relationships.platforms.data[0].attributes.versionHistory
          } catch (error) {
            console.log("version data:"+b)
            console.log("No version link:"+link);
            return []
          }
          return a;
  
   
}
async function getCompanyGamesRequest(companyId){
    try{
    var res=await fetch("https://shire.codaplatform.com/web/v1/dev/"+companyId, {
        "headers": {
          "accept": "application/json, text/plain, */*",
          "accept-language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
          "authorization": "Bearer session:c:13826:"+auth,
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "cookie": "_ga=GA1.2.1523260663.1617484534; _gid=GA1.2.1327822279.1617484534; _hjid=b9a3a3e1-f927-4b25-aaeb-8c29fb872807; _hjTLDTest=1; _hjAbsoluteSessionInProgress=0; intercom-session-z9t74ij8=QzhFbHFmdjB3N0F0V3RnT2JZRW9VbEtWQTFRQkF5c2pTeDJsckJpdjYzQlJscy96QnJjV3NoK1huUUtwVmJKbS0tTllvL2JTN2JReDZqTmRPS3NrN1dOQT09--3fe716820731df9a8b88700e66eb3cb99315b24d"
        },
        "referrer": "https://dash.codaplatform.com/developer/Baronie%20Drew/1XxvqqKMmPAVx7iAYfwdEzZjyyF",
        "referrerPolicy": "no-referrer-when-downgrade",
        "body": null,
        "method": "GET",
        "mode": "cors"
      });
      return await res.text()
    } catch (error) {
        return null;
    }
}
async function getLatestDataRequest(index){
    try {
        var res=await fetch("https://shire.codaplatform.com/web/v1/intelligence/tab/preLaunch?dr=30+Days&page="+index, {
        "headers": {
          "accept": "application/json, text/plain, */*",
          "accept-language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
          "authorization": "Bearer session:c:13826:"+auth,
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "cookie": "_ga=GA1.2.1523260663.1617484534; _gid=GA1.2.1327822279.1617484534; _hjTLDTest=1; _hjid=b9a3a3e1-f927-4b25-aaeb-8c29fb872807; _hjFirstSeen=1; _hjAbsoluteSessionInProgress=0; intercom-session-z9t74ij8=OC9VdjF1cEN5MzZaWEJEVEZPYlB6MFpSeTE4U2oxbWxGS0EweWhWdE9pU2ZodlN3K1NPa0Z4a05JTmdvR0NVNS0tME54d1FWZHQrWnFlOFV2TWNUdVVVZz09--797e2c316417f7327eaf11754f8886763a423175"
        },
        "referrer": "https://dash.codaplatform.com/market-intelligence?name=preLaunch",
        "referrerPolicy": "no-referrer-when-downgrade",
        "body": null,
        "method": "GET",
        "mode": "cors"
      })
      return await res.text()
    } catch (error) {
        return 
    }
    
}
run()
//exports.run=run;
