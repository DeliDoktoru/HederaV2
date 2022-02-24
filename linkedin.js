
/* #region  default */
String.prototype.replaceAll = function (find, replace) {
    var str = this;
    return str.replace(new RegExp(find, 'g'), replace);
};
let locationNow=location.href;
function locationListener(){
    if(locationNow!=location.href){
        locationNow=location.href
        main()
    }
    setTimeout(locationListener,3000)
}
locationListener()
async function waiter(f,sec=60){
    let timer=0;
    return new Promise(function(resolve, reject){
        setTimeout(function(){
            var interval=setInterval(function(){
                $("#counter").html(`<h1>${sec-timer}</h1>`)
                loadBot()
                if(f() || infoBot.status==0){
                    $("#counter").html(``)
                    clearInterval(interval);
                    resolve(true);
                    return;
                }
                timer++
                if(timer==sec ){
                    $("#counter").html(``)
                    log("Bekleme sonuçlanmadı")
                    clearInterval(interval);
                    resolve(false)
                    return;
                }
            },1000)
        },1000)
    })
}
async function delay(sec){
    let timer=0;
    return new Promise(function(resolve, reject){
        function interval(){
            $("#counter").html(`<h1>${sec-timer}</h1>`)
            timer++
            loadBot()
            if(timer>=sec || infoBot.status==0){
                $("#counter").html(``)
                resolve(true)
            }
            else
            setTimeout(interval,1000)
        }
        setTimeout(interval,1000)
    })
}

function openLinkWithKey(blank,link,key,val=["1"]){
    try {
        tmpUrl=new URL(link);
        a=new URLSearchParams(tmpUrl.search);
        if(Array.isArray(key)){
            key.forEach((x,i)=> a.set(x, val[i]) )
        }
        else{
            a.set(key, Array.isArray(val) ? val[0] : val ) 
        }
        if(blank) window.open(tmpUrl.origin + tmpUrl.pathname+"?"+ a.toString(), '_blank');
        else location.href=tmpUrl.origin + tmpUrl.pathname+"?"+ a.toString()

        return true
    } catch (error) {
        console.log(error)
        return false;
    }
}
function checkKeyFromUrl(key,expected){
    try {
        let tmp=(new URL(location.href)).searchParams.get(key)
        if(tmp==null){
            return false;
        }
        else if( expected==true )//counter
        {
            return tmp
        }
        else if(tmp=="1" ){
            return true
        }else{
            return false;
        }
    } catch (error) {
        return false;
    }
}

function log(txt){
    var ynstxt=$("#ynstxt").html()
    $("#ynstxt").html("<div>" +txt + "</div><br>"+ynstxt )
}

function renderLogger(){
    $("#ynstxt").remove()
    $("html").append(`<div style="
        position: absolute;
        right: 0px;
        top: 0px;
        width: 200px;
        height: 100px;
        background-color: #acb3b3;
        z-index: 9999999;
        color: black;
        overflow-y: auto;
        font-weight: bold;
        font-size: 14px;
        opacity: 0.8;">
    
        <h1 style="
        font-size: 10px ; 
        text-align: center;
        border-bottom: 1px solid white;
        width: 90%;
        margin: auto;
        margin-bottom: 0px;
        padding-bottom: 0px;"  >Log</h1>
    
        <div id="ynstxt" style="padding: 10px;"></div></div>`)
}
function renderArea(){
    $("#buttonArea").remove()
    $("html").append(`<div id='buttonArea'  style="
        position: absolute;
        left: 2px;
        top: 2px;
        z-index: 9999999;
        ">
        </div>`)
    $("#buttonArea").append(`<div id='counter' >
    </div>`)
}
/* #endregion */


var infoBot;
var cache=[];

async function main(){
    renderLogger();
    renderArea();
    if(location.pathname.includes("/company/")){
        loadBot()
        let index=infoBot.companys.indexOf(getCompanyId())
        if(index>-1){
            $("#buttonArea").append(`<button id="deleteCompanyBot" style="${styleButton}">Listeden Çıkar</button><br/>`)
            $("#deleteCompanyBot").on("click",async function(){
                loadBot()
                let index=infoBot.companys.indexOf(getCompanyId())
                if(index>-1)  {
                    infoBot.companys.splice(index,1)
                    log("Silindi")
                }
                else log("Silinmiş")
                saveBot()
                $(this).remove()
                main()
            }); 
        }else{
            $("#buttonArea").append(`<button id="addCompanyBot" style="${styleButton}">Listeye Ekle</button><br/>`)
            $("#addCompanyBot").on("click",async function(){
                loadBot()
                let index=infoBot.companys.indexOf(getCompanyId())
                if(index>-1)  log("Eklenmiş")
                else {
                    log("Eklendi")
                    infoBot.companys.push(getCompanyId())
                }
                saveBot()
                $(this).remove()
                main()
            }); 
        }
    }
    loadBot()
    if(infoBot.status==0){
        $("#buttonArea").append(`<button id="startBot" style="${styleButton}">Çalıştır</button><br/>`)
        $("#startBot").on("click",async function(){
            $(this).remove()
            infoBot.status=1
            saveBot()
            openNextCompany()
        });
    }
    if(infoBot.status==1){
        $("#buttonArea").append(`<button id="stopBot" style="${styleButton}">Durdur</button><br/>`)
        $("#stopBot").on("click",async function(){
            $(this).remove()
            infoBot.status=0;saveBot()
            main()
        });
        if((id= mgSearchCounter=checkKeyFromUrl("companypage",true)) || typeof(id)=="number"){
            await waiter( ()=> { return $(".search-results-container h2").length==1  }  )
            let count=$(".search-results-container h2").text().trim().split(" ")[0]
            let res=JSON.parse(await SendDataToServer({id:id,method:"check",count:count}))
            if(res.status){
                log(res.message)
                getEmployes(id)
                //sayfaları çek
            }
            else if(res.status==0){
                log(res.message)
                await delay(300)
                loadBot()
                if(infoBot.status==1)
                openNextCompany()
            }
        }
    }
    
}
async function getEmployes(companyId){
    window.scrollTo(0,document.body.scrollHeight);
    await waiter( ()=> { return $(".search-results-container ul>li [data-chameleon-result-urn]").length>0  }  )
    let e=$(".search-results-container ul>li")
    for(i=0;i<$(e).length;i++){
        try{
        let name=$(e).eq(i).find("span.entity-result__title-text [aria-hidden='true']").eq(0).text()
        let link=$(e).eq(i).find("span.entity-result__title-text a").eq(0).attr("href").split("?")[0]
        let urn=$(e).eq(i).find("[data-chameleon-result-urn]").eq(0).attr("data-chameleon-result-urn").split("member:")[1]
        cache.push({
            name:name,
            link:link,
            urn:urn,
            companyId:companyId
        })
        }catch(error){ }
    }
    if(!$(".artdeco-pagination__button--next").prop('disabled')){
        $(".artdeco-pagination__button--next").click()
        await waiter( ()=> { return $(".search-results-container ul>li [data-chameleon-result-urn]").length>0  }  )
        getEmployes(companyId)
    }else{
        let companyName=$("#hoverable-outlet-mevcut-şirket-filter-value").parent().find("span>button").text().trim().slice(0,-1).trim()
        let res=JSON.parse(await SendDataToServer({id:companyId,method:"update",cache:cache,companyName:companyName}))
        log(res.message)
        await delay(300)
        loadBot()
        if(infoBot.status==1)
        openNextCompany()
    }
    window.scrollTo(0,0);
}
async function SendDataToServer(send){
    return new Promise(function(resolve, reject){
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
                resolve(this.responseText);
            }
            if(this.readyState == 4 && this.status != 200){
                log("Server hata")
                resolve(false);
            }
        };
        xhttp.open("POST", "http://localhost:3000/ajax/linkedin", true);
        xhttp.setRequestHeader("Content-Type", 'application/json');
        xhttp.send(JSON.stringify(send));
    });
}
/* #region  fix */
function openNextCompany(){
    loadBot()
    if(infoBot.companys.length==0){
        log("Liste boş")
        return
    } 
    let id=infoBot.companys[infoBot.k]
    infoBot.k++
    if(infoBot.companys.length==infoBot.k){
        infoBot.k=0;
    }
    saveBot()
    openLinkWithKey(false,"https://www.linkedin.com/search/results/people/?currentCompany=%5B%22"+id+"%22%5D&sid=v4r","companypage",id)

}

function getCompanyName(){
    // kullanılmıyor
    let pathName=location.pathname;
    pathName=pathName.replace("/company/","")
    pathName=pathName.substring(0,pathName.indexOf("/"))
    return pathName;
}
function getCompanyId(){
    try {
        return document.getElementsByTagName("html")[0].innerHTML.match(/\"urn:li:fs_miniCompany:(.*?)\"/)[1]
    } catch (error) {
        log("ID bulunamadı!")
        throw error;
    }
    
}
function loadBot(){
    try {  infoBot=JSON.parse(localStorage.getItem("infoBot"))  } catch (error) {  }
    if(!infoBot){
        infoBot={
            status:0,
            k:0,
            companys:[]
        }
    }
}
function saveBot(){
    localStorage.setItem('infoBot',JSON.stringify(infoBot));
}

/* #endregion */

   
var styleButton=`width: 100px;
                 background-color: burlywood;
                 border-radius: 3px;
                 height: 20px;
                 margin:1px`
main();


