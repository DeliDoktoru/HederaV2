const fs = require('fs')
const path = require('path');
const download = require('image-downloader');
const fetch = require('node-fetch');
const db = require('./database');
const axios = require('axios');
var auth="23jHu8UvZMUh4hm59KCMi4graMT";
var company_checker_counter=0;
var version_checker_counter=0;
const appStoreHeader={
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
  }

async function run(){
    try{
        checkCompanyGames(true);
        getVersionOfGame(null,true);

    }catch(error){
        console.log(error)
    }
    
}

async function checkCompanyGames(endless=false){
    console.log("preparing new circle... (Comapany Checker) "+ company_checker_counter)
    //appstore
    /*buna gerek yok yazdım ama 
    var res=await db.query("SELECT  c.id,GROUP_CONCAT(g.adi) list FROM coda.Companys as c inner join coda.Games as g on c.id=g.companyId where c.checker='1' GROUP BY c.id ;");
    for ( item of res) {
        let list=item.list.split(",")
        var res=await getAppStoreCompanyGames(companyId);
        for (item of res) {
            if(!list.includes("id"+item)){
                try {
                    await insertGameByUrlv3("https://apps.apple.com/app/id"+item)
                } catch (error) {
                    console.log(error)
                }
            }
        }
    }*/
    var res=await db.query("SELECT * FROM coda.Companys where checker=1 order by id desc;");
    //var res=await db.selectQuery({ checker: '1'  }, "Companys");
    var l=0;
    for (let item of res) {
        console.log("company = "+ item.id  +" " + res.length +" / " + l  )
        await insertAppStoreCompanyGames(item.adi)
        l++;
    }
    if(endless){
        setTimeout( function() {
            company_checker_counter++
            checkCompanyGames(true);
        }, 0 );
        
    }
}
async function insertCompanyIdsFromGameAppUrl(){
    //appstore
    // company tablosunda appstore id (adi) değeri olmayan developerlar için oyunların sorgundan developer id bulma
    var res=await db.query("select id,url from (SELECT c.id as id ,g.app_store_url as url FROM coda.Games as g inner join coda.Companys as c on c.id=g.companyId where g.app_store_url is not null ) as c group by id order by c.id ;")
    for ( item of res) {
        let r=await getAppStoreCompanyIdByGameUrl(item.url);
        if(r) {
            await db.update({ adi:"id"+r},{id:item.id},"Companys");
            console.log(item.id)
        }
    }
    console.log("finito")
}
async function insertAppStoreCompanyGames(companyId){
    //appstore
    var res=await getAppStoreCompanyGames(companyId);
    if(res){
        for (item of res) {
            try {
                await insertGameByUrlv3("https://apps.apple.com/app/"+item)
            } catch (error) {
                console.log(error)
            }
        }
    }
}
async function insertMultipleGamesByAppStoreIds(arr=[]){
    //appstore
    for ( item of arr) {
        await insertGameByUrlv3("https://apps.apple.com/app/id"+item)
    }
}
async function insertGameByUrlv3(url,userId,full_url){ 
    //appstore
    var uid=url;
    try {
        uid=uid.substring(uid.lastIndexOf("/id"))
        uid=parseInt(uid.replace("/id",""))
        if(isNaN(uid)){
            throw "url hatalı!"
        }
    } catch (error) {
        console.log(error)
        return false;
    }
    var checkGame=(await db.selectQuery({  aai : "id"+uid },"Games") )
    if ( checkGame && checkGame.length>0  ){
        if(userId){
            throw "Bu oyun ekli!";
        }else{
            return checkGame[0].id;
        }
    }
    var res=await getAppStoreGameByLink( full_url || ("https://apps.apple.com/app/id"+uid)  );
    try {
        pre=res.d[0].attributes
        obj=res.d[0].attributes.platformAttributes.ios
        obj.developer=removeEmoji(pre.artistName);
        obj.description=removeEmoji(obj.description.standard);
        insertObj={ 
            n:pre.name,//
            adi:"id"+res.d[0].relationships?.developer?.data[0]?.id,//
            dn:obj.developer,//
            aai:"id"+res.d[0].id,//
            rd:obj.versionHistory[0].releaseDate,//
            bundle_id: obj.bundleId,//
            description: obj.description,//
            app_store_url:full_url || "https://apps.apple.com/app/id"+res.d[0].id,//
            version: obj.versionHistory[0].versionDisplay,//
            rdd: obj.versionHistory[0].releaseDate//
         }
        //company
        let di=res.d[0].relationships?.developer?.data[0]?.id
        let checkCompany;
        if(di){
            checkCompany=(await db.selectQuery({  adi :  "id"+di },"Companys") )
        }else{
            checkCompany=(await db.selectQuery({  text :  obj.developer },"Companys") )
        }
        if ( checkCompany && checkCompany.length>0  ){
            insertObj.companyId=checkCompany[0].id;
        }else{
            var companyId=(await db.insert({ text:obj.developer ,adi:"id"+res.d[0].relationships?.developer?.data[0]?.id},"Companys")).insertId;
            console.log("Company added:"+obj.developer );
            insertObj.companyId=companyId;
        }
        //game
        try { var gameId=(await db.insert(insertObj,"Games")).insertId; } catch (error) { console.log("couldnt insert gameId="+insertObj.aai);return false; }
        console.log("game added:"+gameId);
        if(userId){
            try {
                await db.insert({gameId:gameId,userId:userId},"Game_Manual")
            } catch (error) {
                console.log(error)
                console.log("manuel ekleme başarısız")
            }
        }
        //category
        let category=res.d[0].attributes.genreDisplayName;
        let tmpCategorys=[];
        try {
            res.d[0].relationships.genres.data.forEach(x=> tmpCategorys.push(x.attributes.name) )
        } catch (error) {
            console.log("kategori bulunamadı!")
        }
        for ( category of tmpCategorys) {
            var checkCategory=(await db.selectQuery({  text : category },"Categorys") )
            if ( checkCategory && checkCategory.length>0  ){
                await db.insert({ gameId : gameId , categoryId:checkCategory[0].id},"Game_Categorys");
            }else{
                var categoryId=(await db.insert({ text: category},"Categorys")).insertId;
                console.log("category added:"+category);
                await db.insert({ gameId : gameId , categoryId:categoryId},"Game_Categorys");
            }
        }
        var tmpImg=obj.customAttributes.default.default.customScreenshotsByType
        var Imgs=tmpImg[Object.keys(tmpImg)[0]]
        await dowloandImage(0,gameId,res.avatar)
        var i=1;
        for (let img of Imgs) {
            await dowloandImage(i,gameId,img.url.replace("{w}x{h}{c}.{f}","460x0w.webp"))
            i++;
        }
        for (let ver of obj.versionHistory)  {
            var checkVersino=(await db.selectQuery({  version_name : ver.versionDisplay , gameId : gameId },"Versions") )
            if ( checkVersino && checkVersino.length>0  ){
                 continue;
            }
            await db.insert({ gameId:gameId,version_text:ver.releaseNotes,version_name:ver.versionDisplay, version_date:ver.releaseDate},"Versions")
            console.log("version added version:"+ver.versionDisplay +" game id:"+gameId )
            if(gameId){
                var re=await db.selectQuery({targetId:gameId ,typeId:2 },"Notification_Request")
                if ( re && re.length>0  ){
                    for (ri of re) {
                        await db.insert({date:new Date().toISOString(),userId:ri.userId,text:`<a href="/game/${re[0].targetId }">${insertObj.n}</a> yeni versiyonu çıktı (${ver.versionDisplay}) <a class="btn" href="/game/${re[0].targetId}"><i class="fas fa-link"></i></a>`},"Notifications");
                    }
                }
            }
            if(insertObj.companyId){
                var re=await db.selectQuery({targetId:insertObj.companyId ,typeId:3 },"Notification_Request")
                if ( re && re.length>0  ){
                    for (ri of re) {
                        await db.insert({date:new Date().toISOString(),userId:ri.userId,text:`Yayıncı <a href="/company/${re[0].targetId }">${insertObj.dn}</a>, <a href="/game/${gameId}">${insertObj.n}</a> oynunun yeni versiyonunu çıkarttı (${ver.versionDisplay}) <a class="btn" href="/game/${gameId}"><i class="fas fa-link"></i></a>`},"Notifications");
                    }
                }
            }
        }
        if(insertObj.companyId){
            var re=await db.selectQuery({targetId:insertObj.companyId ,typeId:1 },"Notification_Request")
            if ( re && re.length>0  ){
                for (ri of re) {
                    await db.insert({date:new Date().toISOString(),userId:ri.userId,text:`Yayıncı <a href="/company/${re[0].targetId}">${obj.developer}</a>  yeni oyun(<a href="/game/${gameId }">${insertObj.n}</a>) çıkartdı <a class="btn" href="/game/${gameId}"><i class="fas fa-link"></i></a>`},"Notifications");
                }
            }
        }
        return gameId
    } catch (error) {
        console.log(error)
        return false;
    }
}
async function getVersionOfGame(gameI,endless=false){
    var d=[];
    var l=0;
    if(gameI){
        var game=await db.selectQuery({i:gameI},"Games");
        if(game==null || game==undefined){
            console.log("not found in db gameI:"+gameI)
            return;
        }
        d=d.concat(game)
    }else{
        console.log("preparing new circle... (Version Checker) "+version_checker_counter)
        d=d.concat(( await db.query("SELECT g.* FROM coda.Versions as v inner join coda.Games as g on v.gameId = g.id where  app_store_url is not null and v.deleted=0 and g.skip=0 and v.version_date > NOW()-INTERVAL 90 DAY  group by v.gameId  ;")   ))
        //d=d.concat((await db.selectAll("Games","ORDER BY id DESC")))
    }
    for (let item of d) {
        if(!gameI){
            console.log("game = "+ item.id  +" " + d.length +" / " + l  )
            l++;
        }
        if (item.app_store_url==null) {
            console.log("Version of game, not found id:"+item.id);
            continue;
        }
        //console.log("get version id:"+item.id)
        var ree=await getVersionRequestByLink(item.app_store_url);
        try { ree= JSON.parse(JSON.stringify(ree)) } catch (error) { console.log(ree )}
        try {
            for (ver of ree)  {
                var checkVersion=(await db.selectQuery({  version_name : ver.versionDisplay , gameId : item.id },"Versions") )
                if ( checkVersion && checkVersion.length>0  ){
                     continue;
                }
                await db.insert({ gameId:item.id ,version_text:ver.releaseNotes,version_name:ver.versionDisplay, version_date:ver.releaseDate},"Versions")
                console.log("version added version:"+ver.versionDisplay +" game id:"+item.id )
                if(item.id){
                    var re=await db.selectQuery({targetId:item.id ,typeId:2 },"Notification_Request")
                    if ( re && re.length>0  ){
                        for (ri of re) {
                            await db.insert({date:new Date().toISOString(),userId:ri.userId,text:`<a href="/game/${re[0].targetId }">${item.n}</a> yeni versiyonu çıktı (${ver.versionDisplay}) <a class="btn" href="/game/${re[0].targetId}"><i class="fas fa-link"></i></a>`},"Notifications");
                        }
                    }
                }
                if(item.companyId){
                    var re=await db.selectQuery({targetId:item.companyId ,typeId:3 },"Notification_Request")
                    if ( re && re.length>0  ){
                        for (ri of re) {
                            await db.insert({date:new Date().toISOString(),userId:ri.userId,text:`Yayıncı <a href="/company/${re[0].targetId }">${item.dn}</a>, <a href="/game/${item.id }">${item.n}</a> oynunun yeni versiyonunu çıkarttı (${ver.versionDisplay}) <a class="btn" href="/game/${item.id}"><i class="fas fa-link"></i></a>`},"Notifications");
                        }
                    }
                }
            }
        } catch (error) {
            console.log(error)
        }
        
    }
    if(endless){
        setTimeout( function() {
            version_checker_counter++
            getVersionOfGame(false,true)
        }, 0 );
        
    }
} 
async function getAppStorecompanyName(companyId){
    //appstore
    try {
        var res=await fetch("https://apps.apple.com/developer/id"+companyId,appStoreHeader);
        var jsdom = require('jsdom').JSDOM;
        var document =new jsdom(await res.text(), {}); var window = document.window; var $ = require('jquery')(window); 
        var b=$("#shoebox-media-api-cache-apps").html()
        var a=JSON.parse(b);
        var l=Object.keys(a)[0]
        a=JSON.parse(a[l])
        a=a.d[0].attributes.name
      } catch (error) {
        console.log("wrong app store game link:"+link);
        return false
      }
      return a;
}
async function getAppStoreCompanyIdByGameUrl(link){
    //appstore
    try {
        var res=await fetch(link,appStoreHeader);
        var jsdom = require('jsdom').JSDOM;
        var document =new jsdom(await res.text(), {}); var window = document.window; var $ = require('jquery')(window); 
        var b=$("#shoebox-media-api-cache-apps").html()
        var a=JSON.parse(b);
        var l=Object.keys(a)[0]
        a=JSON.parse(a[l])
        a=a.d[0].relationships.developer.data[0].id
      } catch (error) {
        console.log("wrong app store game link:"+link);
        return false
      }
      return a;
}
async function getAppStoreGameByLink(link){
    //appstore
    try {
        var res=await fetch(link,appStoreHeader );
        var jsdom = require('jsdom').JSDOM;
        var document =new jsdom(await res.text(), {}); var window = document.window; var $ = require('jquery')(window); 
        var b=$("#shoebox-media-api-cache-apps").html()
        var a=JSON.parse(b);
        var l=Object.keys(a)[0]
        a=JSON.parse(a[l])
        a.avatar=$(".we-artwork>source").attr("srcset").split(".webp")[0]+".webp"
        //a.avatar=$(".we-artwork__source").eq(0).attr("srcset").split(" ")[0];
      } catch (error) {
        console.log(error)
        console.log("wrong app store game link:"+link);
        return false
      }
      return a;
}

async function getAppStoreCompanyGames(companyId){
    //appstore
    try {
      var res=await fetch("https://apps.apple.com/developer/"+companyId, appStoreHeader);
        var jsdom = require('jsdom').JSDOM;
        var document =new jsdom(await res.text(), {}); var window = document.window; var $ = require('jquery')(window); 
        var b=$("#shoebox-media-api-cache-apps").html()
        var a=JSON.parse(b);
        var l=Object.keys(a)[0]
        a=JSON.parse(a[l])
        a=a.d[0].relationships["ios-apps"].data.map(x=>"id"+x.id)
    } catch (error) {
      console.log("wrong app store game link:"+companyId);
      return false
    }
    return a;
}
async function getVersionRequestByLink(link){
    //appstore version çekme
    try {
    var res=await fetch(link, appStoreHeader);
        var jsdom = require('jsdom').JSDOM;
        var document =new jsdom(await res.text(), {}); var window = document.window; var $ = require('jquery')(window); 
        var b=JSON.parse($("#shoebox-media-api-cache-apps").html().replace("",""))
        var a=JSON.parse(b[Object.keys(b)[0]])
        a=a.d[0].attributes.platformAttributes.ios.versionHistory
   } catch (error) {
    try {
        console.log("version data was:\n"+JSON.stringify(b))
    } catch (error) {
    }
    console.log("No version link:"+link);
    return []
    }
    return a;
}




//-s stand alone
if(process.argv[2]=="-s"){
    run()
}

if(process.argv[2]=="-c"){
    paramC(process.argv[3])
}

if(process.argv[2]=="-g"){
    insertGameById(process.argv[3])
}
async function paramC(day){
    var Devices=await db.selectAll("Devices")
    var Countries=await db.selectAll("Countries")
    for(i=day;i<=day;i++){
        var date=convertTime(i+"/03/2022")
        for(c of Countries){
            //console.log(c.countrie_text)
            for(d of Devices){
                await appStoreTopList(c,d,date)
            }
        }

    }

}
function convertTime(date){
    var dateString = date; 
    var dateParts = dateString.split("/");
    var dateObject = new Date(+dateParts[2], dateParts[1]-1, +dateParts[0]); 
    dateObject.setHours(3,0,0,0);
    return dateObject
}
async function appStoreTopList(c,d,date){
    var res=await getSensorTowerData(c,d,date)
    date.setHours(0,0,0,0);
    try {
        for(item of res){
            //free game
            let f=item[0]
            let gameId=await insertGameByUrlv3("https://apps.apple.com/app/id"+f.app_id,null,f.url)
            var obj={  countrieId:c.id,deviceId:d.id,tier:f.rank,date:date }
            let checkGame=(await db.selectQuery(obj,"Top_List") )
            obj.gameId=gameId;//sorgudan sonra gameId ekledim
            if ( checkGame && checkGame.length>0  ){
                if(checkGame[0].gameId!=gameId){
                    console.log(checkGame[0].gameId +" != "+gameId)
                    await db.update(obj,{id:checkGame[0].id},"Top_List");  
                    console.log("updated date:"+obj.date +" tier:" +obj.tier) 
                }else console.log("duplicate")
                continue
            }
            obj.gameId=gameId;
            await db.insert(obj,"Top_List")
            console.log("inserted date:"+obj.date +" tier:" +obj.tier)
        }
    } catch (error) {
        console.log(error)
    }
   
}
async function getSensorTowerData(c,d,date){
    let res
    try {
         res=await fetch("https://app.sensortower.com/api/ios/rankings/get_category_rankings?category=6014&country="+c.link+"&date="+encodeURIComponent(date.toISOString())+"&device="+d["device_text"]+"&limit=500&offset=0", {
        "headers": {
            "accept": "application/json, text/javascript, */*; q=0.01",
            "accept-language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
            "if-none-match": "W/\"d858640d31c04d43eaaff66ab9336473\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-requested-with": "XMLHttpRequest"
        },
        "referrer": "https://app.sensortower.com/ios/rankings/top/iphone/us/games?date=2022-02-10",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": null,
        "method": "GET",
        "mode": "cors",
        "credentials": "include"
        });
        res=JSON.parse(await res.text())
        return res;
    } catch (error) {
        if(res.status==429){
            console.log("too fast")
        }
        console.log(res)
        console.log(error)
    }
    return false
    
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
            await db.insert({ gameId : gameId , text:fileName},"Game_Images");   
         } catch (error) {
             console.log(link)
             console.log("resim yüklenemedi gameId:"+gameId)
            }
    }
}

module.exports={
    run:run,
    addByUrl:insertGameByUrlv3,
    getCompanyName:getAppStorecompanyName
};













async function insertDowloandsOfGame(){
    //coda
    var data=await db.query("SELECT * FROM coda.Games WHERE installs is null;")  
    console.log("need dowloands games count:"+data.length) 
    for (let item of data) {
        var res=await getGameRequest(item.i);
        try {  obj=res.data } catch (error) { console.log("No data (Insert dowloandsOfGame Loop) gameId="+item.id); await db.update({ installs:   "-",installs_labels:"-"  },{id:item.id},"Games");continue;}
        if( obj.installs==null ){
            console.log("no installs gameId="+item.id)
            await db.update({ installs:   "-",installs_labels:"-"  },{id:item.id},"Games");
            continue;
        }
        console.log(obj.installs)
        await db.update({ installs: obj.installs,installs_labels:obj.installs_labels  },{id:item.id},"Games")
    }

}  
async function getGameRequest(gameI){
    //coda
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
async function searchDevNameRequest(developer){
    //coda
    try {
        var res=await fetch("https://shire.codaplatform.com/web/v1/app/search/all?query="+developer, {
            "headers": {
              "accept": "application/json, text/plain, */*",
              "accept-language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
              "authorization": "Bearer session:c:13826:1tA6sEL3h0iTt1Xh3TO4ZKnrlRw",
              "sec-fetch-dest": "empty",
              "sec-fetch-mode": "cors",
              "sec-fetch-site": "same-site"
            },
            "referrer": "https://dash.codaplatform.com/",
            "referrerPolicy": "no-referrer-when-downgrade",
            "body": null,
            "method": "GET",
            "mode": "cors",
            "credentials": "include"
          });

        for( item of (await res.json()).data){
            if(item.type=="dev" && item.sub_name==developer){
                return item.id;
            }
        }
        return "nocompany"
    } catch (error) {
        return  "nocompany";
    }
}
async function searchByNameRequest(name,developer){
    //coda
    try {
        var res=await fetch("https://shire.codaplatform.com/web/v1/app/search/all?query="+name, {
            "headers": {
              "accept": "application/json, text/plain, */*",
              "accept-language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
              "authorization": "Bearer session:c:13826:1tA6sEL3h0iTt1Xh3TO4ZKnrlRw",
              "sec-fetch-dest": "empty",
              "sec-fetch-mode": "cors",
              "sec-fetch-site": "same-site"
            },
            "referrer": "https://dash.codaplatform.com/",
            "referrerPolicy": "no-referrer-when-downgrade",
            "body": null,
            "method": "GET",
            "mode": "cors",
            "credentials": "include"
          });

        for( item of (await res.json()).data){
            if(item.name==name && item.sub_name==developer){
                return item.id;
            }
        }
    } catch (error) {
        return false;
    }
    return false;
}
async function getAppStoreGameNameAndDeveloperRequestByLink(link){
    //eski
    try {
      var res=await fetch(link, appStoreHeader);
        var jsdom = require('jsdom').JSDOM;
        var document =new jsdom(await res.text(), {}); var window = document.window; var $ = require('jquery')(window); 
      var b=$("#shoebox-ember-data-store").html()
      var a=JSON.parse(b);
      a=a[link.replace("https://apps.apple.com/app/id","")].data.attributes
    } catch (error) {
      console.log("wrong app store game link:"+link);
      return false
    }
    return a;
}
async function insertCompanyById(di,text){
    //coda
    var checkCompany=(await db.selectQuery({  di : di },"Companys") )
    if ( checkCompany && checkCompany.length>0  ){
        return
    }else{
        await db.insert({ text:text,di: di },"Companys");
        console.log("Company added:"+text );
    }
}
async function insertGameById(gameI){
    //coda
    var checkGame=(await db.selectQuery({  i : gameI },"Games") )
    if ( checkGame && checkGame.length>0  ){
        return false;
    }
    var res=await getGameRequest(gameI);
    try {  obj=res.data } catch (error) { console.log("No data (Insert game Loop) gameI="+gameI); return false;}
   
    //game obj
    
    obj.developer=removeEmoji(obj.developer);
    obj.description=removeEmoji(obj.description);
    if(!obj.released){
        if(obj.scraped_at){
            obj.released=obj.scraped_at
        }else if(obj.released_cur){
            obj.released=obj.released_cur
        }else{
            obj.released=""
        }
    }
    insertObj={ n:obj.name,di:obj.developer_id,dn:obj.developer,i:gameI,rd:obj.released,bundle_id: obj.bundle_id 
        , description: obj.description, country:obj.country ,app_store_url:obj.app_store_url,version:obj.version,video_url:obj.video_url 
        ,avg_rating:obj.avg_rating, installs: obj.installs,installs_labels:obj.installs_labels,rdd: obj.released.substring(0,10) }
    
    //company
    var checkCompany=(await db.selectQuery({  text :  obj.developer },"Companys") )
    if ( checkCompany && checkCompany.length>0  ){
        insertObj.companyId=checkCompany[0].id;
    }else{
        var companyId=(await db.insert({ text:obj.developer ,di:obj.developer_id},"Companys")).insertId;
        console.log("Company added:"+obj.developer );
        insertObj.companyId=companyId;
    }
    //game
    try { var gameId=(await db.insert(insertObj,"Games")).insertId; } catch (error) { console.log("couldnt insert gameId="+gameI);return false; }
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
        var checkCategory=(await db.selectQuery({  text : category },"Categorys") )
        if ( checkCategory && checkCategory.length>0  ){
            await db.insert({ gameId : gameId , categoryId:checkCategory[0].id},"Game_Categorys");
        }else{
            var categoryId=(await db.insert({ text: category},"Categorys")).insertId;
            console.log("category added:"+category);
            await db.insert({ gameId : gameId , categoryId:categoryId},"Game_Categorys");
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
        var re=await db.selectQuery({targetId:insertObj.companyId ,typeId:1 },"Notification_Request")
        if ( re && re.length>0  ){
            for (ri of re) {
                await db.insert({date:new Date().toISOString(),userId:ri.userId,text:`Yayıncı <a href="/company/${re[0].targetId}">${obj.developer}</a>  yeni oyun(<a href="/game/${gameId }">${insertObj.n}</a>) çıkartdı <a class="btn" href="/game/${gameId}"><i class="fas fa-link"></i></a>`},"Notifications");
            }
        }
    }
    return true;
}
async function getCompanyGamesRequest(companyId){
    //coda
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
    //coda
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
async function insertLatestGames(){
    //coda
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
    //coda
    var data=await db.query("SELECT * FROM coda.Companys WHERE get_games='0';")  
    if(data.length){
        console.log("companys which has any not inserted games count:"+data.length) 
        for (let item of data) {
            var resc=await getCompanyGamesRequest(item.di)
            try {  obj=JSON.parse(resc); if(obj.apps.data==undefined || obj.data==undefined) throw "" } catch (error) { console.log("No data (Insert company games Loop) companyId="+item.id); await db.update({ get_games:"1"},{id:item.id},"Companys"); continue;}
            for (let game of obj.apps.data) {
                await insertGameById(game.id)
            }
            await db.update({ get_games:"1"},{id:item.id},"Companys")
        }
    }
}

/*
async function insertGameByURL(url){
    var checkGame=(await db.selectQuery({  app_store_url : url },"Games") )
    if ( checkGame && checkGame.length>0  ){
        return false;
    }
    var res=await getAppStoreGameNameAndDeveloperRequestByLink(url);
    if(res==false) return false
    var gameI=await searchByNameRequest(res.name,res.artistName);
    if(gameI==false) return false
    return await insertGameById(gameI) 
}
async function insertGameByUrlv2(url,userId){
    var i=url;
    i=i.substring(i.indexOf("id"))
    i=i.substring(0,i.indexOf("/"))
    var checkGame=(await db.selectQuery({  i : i },"Games") )
    if ( checkGame && checkGame.length>0  ){
        return false;
    }
    var res=await getAppStoreGameByLink(url);
    try {
        pre=res.data.attributes
        obj=res.data.relationships.platforms.data[0].attributes
        obj.developer=removeEmoji(pre.artistName);
        obj.description=removeEmoji(obj.description.standard);
        insertObj={ 
            n:pre.name,//
            di:await searchDevNameRequest(obj.developer),//
            dn:obj.developer,//
            i:"id"+res.data.id,//
            rd:obj.versionHistory[0].releaseDate,//
            bundle_id: obj.bundleId,//
            description: obj.description,//
            app_store_url:"https://apps.apple.com/app/id"+res.data.id,//
            version: obj.versionHistory[0].versionDisplay,//
            rdd: obj.versionHistory[0].releaseDate//
         }
        //company
        var checkCompany=(await db.selectQuery({  text :  obj.developer },"Companys") )
        if ( checkCompany && checkCompany.length>0  ){
            insertObj.companyId=checkCompany[0].id;
        }else{
            var companyId=(await db.insert({ text:obj.developer ,di:obj.developer_id},"Companys")).insertId;
            console.log("Company added:"+obj.developer );
            insertObj.companyId=companyId;
        }
        //game
        try { var gameId=(await db.insert(insertObj,"Games")).insertId; } catch (error) { console.log("couldnt insert gameId="+gameI);return false; }
        console.log("game added:"+gameId);
        try {
            await db.insert({gameId:gameId,userId:userId},"Game_Manual")
        } catch (error) {
            console.log(error)
            console.log("manuel ekleme başarısız")
        }
        var tmpImg=obj.customAttributes.default.default.customScreenshotsByType
        var Imgs=tmpImg[Object.keys(tmpImg)[0]]
        await dowloandImage(0,gameId,res.avatar)
        var i=1;
        for ( img of Imgs) {
            await dowloandImage(i,gameId,img.url.replace("{w}x{h}{c}.{f}","460x0w.webp"))
            i++;
        }
        for (ver of obj.versionHistory)  {
            var checkVersino=(await db.selectQuery({  version_name : ver.versionDisplay , gameId : gameId },"Versions") )
            if ( checkVersino && checkVersino.length>0  ){
                 continue;
            }
            await db.insert({ gameId:gameId,version_text:ver.releaseNotes,version_name:ver.versionDisplay, version_date:ver.releaseDate},"Versions")
            console.log("version added version:"+ver.versionDisplay +" game id:"+gameId )
            if(gameId){
                var re=await db.selectQuery({targetId:gameId ,typeId:2 },"Notification_Request")
                if ( re && re.length>0  ){
                    for (ri of re) {
                        await db.insert({date:new Date().toISOString(),userId:ri.userId,text:`<a href="/game/${re[0].targetId }">${insertObj.n}</a> yeni versiyonu çıktı (${ver.versionDisplay}) <a class="btn" href="/game/${re[0].targetId}"><i class="fas fa-link"></i></a>`},"Notifications");
                    }
                }
            }
            if(insertObj.companyId){
                var re=await db.selectQuery({targetId:insertObj.companyId ,typeId:3 },"Notification_Request")
                if ( re && re.length>0  ){
                    for (ri of re) {
                        await db.insert({date:new Date().toISOString(),userId:ri.userId,text:`Yayıncı <a href="/company/${re[0].targetId }">${insertObj.dn}</a>, <a href="/game/${gameId}">${insertObj.n}</a> oynunun yeni versiyonunu çıkarttı (${ver.versionDisplay}) <a class="btn" href="/game/${gameId}"><i class="fas fa-link"></i></a>`},"Notifications");
                    }
                }
            }
        }
        if(insertObj.companyId){
            var re=await db.selectQuery({targetId:insertObj.companyId ,typeId:1 },"Notification_Request")
            if ( re && re.length>0  ){
                for (ri of re) {
                    await db.insert({date:new Date().toISOString(),userId:ri.userId,text:`Yayıncı <a href="/company/${re[0].targetId}">${obj.developer}</a>  yeni oyun(<a href="/game/${gameId }">${insertObj.n}</a>) çıkartdı <a class="btn" href="/game/${gameId}"><i class="fas fa-link"></i></a>`},"Notifications");
                }
            }
        }
        return true
    } catch (error) {
        console.log(error)
        return false;
    }
}*/
