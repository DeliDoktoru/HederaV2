

async function delay(sec){
    await new Promise(resolve => setTimeout(resolve, sec*1000));
}
var alp= ["","a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"]
var alp1= ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"]
var result={}


async function go(){

    for( i=0; i<alp.length;i++  )
    {
        for( j=0; j<alp1.length;j++  )
        {   
            console.log("%"+ Math.floor( (100/ (alp.length * alp.length)) * ((i*alp.length) + j+1 )  )  )
            var tmp=  alp[i] + alp1[j]
            var req=await fetch("https://shire.codaplatform.com/web/v1/app/search/all?query="+tmp, {
                "headers": {
                  "accept": "application/json, text/plain, */*",
                  "accept-language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
                  "authorization": "Bearer session:c:13826:1tA6sEL3h0iTt1Xh3TO4ZKnrlRw",
                  "sec-fetch-dest": "empty",
                  "sec-fetch-mode": "cors",
                  "sec-fetch-site": "same-site"
                },
                "referrer": "https://dash.codaplatform.com/developer/MatchinghamGames/1cAmCwzwkAb8CLpVKOMZ3gnd79K",
                "referrerPolicy": "no-referrer-when-downgrade",
                "body": null,
                "method": "GET",
                "mode": "cors",
                "credentials": "include"
              })
            var res = await req.json()
            try {
                for (item of res.data) {
                    if(item.type=="dev")
                    result[item.id]=item.name
                }
            } catch (error) {
            }
            await delay(3)
        }
    }
    var resultTxt=""
    for ( key in result) {
        resultTxt=resultTxt + key + "\n";
    }
    var uri = 'data:text/csv;charset=utf-8,' + resultTxt;
    var downloadLink = document.createElement("a");
    downloadLink.href = uri;
    downloadLink.download = "a.csv";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}
go();
