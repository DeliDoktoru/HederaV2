const mysql = require( 'mysql' );
class Database {
    procedures={
        index:{ sql:`SELECT SQL_CALC_FOUND_ROWS v.version_count,g.* FROM coda.Games as g left join (select COUNT(*) as version_count,gameId from coda.Versions where gameId is not null and deleted=0 group by gameId) as v on g.id=v.gameId  where ( v.version_count=1 or v.version_count is null ) and NOW()  > g.rdd and g.rdd > NOW()-INTERVAL 30 DAY and g.deleted=0 :srcTxt  order by :orderBy LIMIT :current,30; SELECT FOUND_ROWS() AS max;`
               ,searchCol:[ {k:"id"},{k:"n"},{k:"dn"},{k:"rdd",t:"date"} ] 
               ,orderBy:["id","n","dn","rdd"] 
            },
        game:{ sql:`SELECT SQL_CALC_FOUND_ROWS g.id,g.n,g.dn,g.rdd,!isnull(n.id) as notify FROM coda.Games as g  LEFT JOIN coda.Notification_Request as n on n.targetId=g.id and n.typeId=2 and g.deleted=0 and n.userId=:userId where  1=1 AND g.deleted=0 :srcTxt  GROUP BY g.id  ORDER BY :orderBy LIMIT :current,16; SELECT FOUND_ROWS() AS max;`
               ,searchCol:[ {k:"id"},{k:"n"},{k:"dn"},{k:"rdd",t:"date"} ] 
               ,orderBy:["id","n","dn","rdd","notify"] 
            },
        company:{ sql:`SELECT SQL_CALC_FOUND_ROWS g.*,!isnull(n.id) as notify FROM coda.Companys as g  LEFT JOIN coda.Notification_Request as n on n.targetId=g.id and n.typeId=1 and n.userId=:userId  where 1=1 and g.hidden=0 :srcTxt   GROUP BY g.id  ORDER BY :orderBy LIMIT :current,16; SELECT FOUND_ROWS() AS max;`
            ,searchCol:[ {k:"id"},{k:"text"},{k:"checker",t:"equal"} ] 
            ,orderBy:["id","text","notify","checker"] 
        },    
        notification_request:{ sql:`SELECT SQL_CALC_FOUND_ROWS g.* FROM coda.Notifications as g WHERE g.deleted=0 and  g.userId=:userId :srcTxt ORDER BY :orderBy LIMIT :current,16; SELECT FOUND_ROWS() AS max;`
            ,searchCol:[{k:"text"},{k:"date",t:"date"}] 
            ,orderBy:["date","text"] 
        }, 
        notification_request_one:{ sql:`SELECT SQL_CALC_FOUND_ROWS '1' as notify,n.targetId as id,g.n,g.dn FROM coda.Notification_Request as n inner join coda.Games as g on g.id=n.targetId WHERE n.userId=:userId and n.typeId=2 :srcTxt group by n.targetId order BY :orderBy LIMIT :current,16; SELECT FOUND_ROWS() AS max;`
            ,searchCol:[  {k:"id"},{k:"n"},{k:"dn"} ] 
            ,orderBy:["id", "n","dn","notify"] 
        },
        notification_request_two:{ sql:`SELECT SQL_CALC_FOUND_ROWS '1' as notify,n.targetId as id,g.text FROM coda.Notification_Request as n inner join coda.Companys as g on g.id=n.targetId WHERE n.userId=:userId and n.typeId=1 :srcTxt group by n.targetId order BY :orderBy LIMIT :current,16; SELECT FOUND_ROWS() AS max;`
            ,searchCol:[ {k:"id"},{k:"text"} ] 
            ,orderBy:["id", "text","notify"] 
        },
        system:{ sql:`SELECT SQL_CALC_FOUND_ROWS v.version_date_max,v.version_date_min,g.*,!isnull(n.id) as notify FROM coda.Games as g inner join (SELECT count(*) as version_count,MAX(version_date) as version_date_max,MIN(version_date) as version_date_min,gameId FROM coda.Versions where deleted=0 group by gameId) as v on v.version_count>1 and v.version_date_max > NOW()-INTERVAL 90 DAY and g.skip=0  and v.gameId = g.id  LEFT join coda.Notification_Request as n on n.targetId=g.id and n.typeId=2 and n.deleted=0 and n.userId=:userId where g.deleted=0 :srcTxt ORDER BY :orderBy LIMIT :current,16;SELECT FOUND_ROWS() AS max;`
            ,searchCol:[ {k:"id"},{k:"n"},{k:"dn"},{k:"version_date_max",t:"date",q:"v"},{k:"version_date_min",t:"date",q:"v"} ] 
            ,orderBy:["id", "n", "dn", "version_date_max","version_date_min","notify"] 
        },
        user_categorys :{ sql:`SELECT SQL_CALC_FOUND_ROWS g.*,!isnull(n.id) as notify FROM coda.Games as g inner join coda.User_Category_Games as c on c.gameId=g.id and c.userCategoryId=:id LEFT JOIN coda.Notification_Request as n on n.targetId=g.id and n.typeId=2 where  c.deleted=0 AND g.deleted=0 :srcTxt  GROUP BY g.id  ORDER BY :orderBy LIMIT :current,16; SELECT FOUND_ROWS() AS max;`
        ,searchCol:[  {k:"id"},{k:"n"},{k:"dn"},{k:"rdd",t:"date"} ] 
        ,orderBy:["id", "n", "dn", "rdd","notify"] 
        },
        user :{ sql:`SELECT SQL_CALC_FOUND_ROWS g.*,g.approved as notify FROM coda.Users as g where 1=1 :srcTxt and g.deleted=0  ORDER BY :orderBy LIMIT :current,16; SELECT FOUND_ROWS() AS max;`
        ,searchCol:[ {k:"id"},{k:"username"} ] 
        ,orderBy:["id","username","notify"] 
        },
        user_grup:{ sql:`SELECT SQL_CALC_FOUND_ROWS g.*,!isnull(n.id) as notify  FROM coda.Groups as g LEFT JOIN coda.User_Grup as n on n.groupId=g.id  and n.deleted=0 and n.userId=:id  where g.deleted=0 :srcTxt GROUP BY g.id  ORDER BY :orderBy LIMIT :current,16; SELECT FOUND_ROWS() AS max`
        ,searchCol:[  {k:"id"},{k:"text"} ] 
        ,orderBy:["id","text","notify"] 
        },
        authority_group:{ sql:`SELECT SQL_CALC_FOUND_ROWS g.*,!isnull(n.id) as notify  FROM coda.Authorization_List as g LEFT JOIN coda.Authority_Group as n on n.authId=g.id  and n.groupId=:id and n.deleted=0 where g.deleted=0 :srcTxt   GROUP BY g.id  ORDER BY :orderBy LIMIT :current,16; SELECT FOUND_ROWS() AS max;`
        ,searchCol:[  {k:"id"},{k:"text"} ] 
        ,orderBy:["id","text","notify"] 
        },
        manual:{ sql:`SELECT SQL_CALC_FOUND_ROWS g.*,!isnull(n.id) as notify FROM coda.Games as g  inner join coda.Game_Manual as m on g.id=m.gameId  LEFT JOIN coda.Notification_Request as n on n.targetId=g.id and n.typeId=2 where  m.deleted=0 AND g.deleted=0 :srcTxt  GROUP BY g.id  ORDER BY :orderBy LIMIT :current,16; SELECT FOUND_ROWS() AS max;`
        ,searchCol:[ {k:"id"},{k:"n"},{k:"dn"},{k:"rdd",t:"date"} ] 
        ,orderBy:["id", "n", "dn", "rdd","notify"] 
        },
        prototype:{ sql:`SELECT SQL_CALC_FOUND_ROWS g.id,g.name,u.username FROM coda.Prototypes as g inner join coda.Users as u on g.ownerId=u.id  where 1=1 :srcTxt  GROUP BY g.id  ORDER BY :orderBy LIMIT :current,16; SELECT FOUND_ROWS() AS max;`
        ,searchCol:[ {k:"name"},{k:"username"} ] 
        ,orderBy:["name", "username"] 
        },
        myfollow:{ sql:`SELECT SQL_CALC_FOUND_ROWS g.*,!isnull(nn.id) as notify FROM coda.Companys as c  inner JOIN coda.Notification_Request as n on n.targetId=c.id and n.typeId=1 and n.userId=:userId and c.hidden=0 and c.deleted=0 and n.deleted=0 inner join coda.Games as g on g.companyId=c.id and g.deleted=0 left join coda.Notification_Request as nn on nn.targetId=g.id and nn.typeId=2 and nn.userId=:userId and nn.deleted=0 where  1=1  :srcTxt  ORDER BY :orderBy LIMIT :current,16; SELECT FOUND_ROWS() AS max;`
        ,searchCol:[ {k:"id"},{k:"n"},{k:"dn"},{k:"rdd",t:"date"} ] 
        ,orderBy:["id","n","dn","rdd","notify"] 
        },
        top:{ sql:`SELECT SQL_CALC_FOUND_ROWS g.id,g.n,d.device_text,c.countrie_text,t.rank,t.date FROM coda.Top_List as t  
        inner JOIN coda.Games as g on t.gameId=g.id 
        inner JOIN coda.Devices as d on t.deviceId=d.id
        inner JOIN coda.Countries as c on t.countrieId=c.id 
        where  1=1  :srcTxt  ORDER BY :orderBy LIMIT :current,16; SELECT FOUND_ROWS() AS max;`
        ,searchCol:[ {k:"id"},{k:"n"},{k:"device_text",q:"d"},{k:"countrie_text",q:"c"},{k:"date",t:"date",q:"t"},{k:"rank",q:"equal"} ] 
        ,orderBy:["id","n","device_text","countrie_text","rank","date"] 
        },

    }
    constructor() {
        this.databaseName = "coda";
        this.pool = mysql.createPool( {
            host: "localhost",
            user: "root",
            password: "password",
            multipleStatements: true,
            dateStrings: 'date',
            charset : 'utf8mb4'
          } );
        
    }
    async storedProcedure(procedure,values){
        try {
           var selectedProcedure=JSON.parse(JSON.stringify(this.procedures[procedure]))
        } catch (error) {
           console.log(error)   
           throw "Procedure not converted!"
        }
        if(! selectedProcedure) throw "Procedure not found!"
        if(! selectedProcedure.sql) throw "Sql not found!"
        //search
        if(values.srcTxt ){
            try {
                var tmp="";
                Object.keys(values.srcTxt).forEach(x=> {
                    try {
                        if(values.srcTxt[x] && values.srcTxt[x]!=""){
                            let f=selectedProcedure.searchCol.find(y=> y.k==x )
                            if(!f){
                                if( "notify"==x) f={ k:"id",t:"check",q:"n" } 
                                else{
                                    delete values.srcTxt[x];
                                    return
                                }
                            }
                            if(!f.q) f.q="g";
                            if(!f.t) {
                                if(f.k=="id") f.t="equal"
                                else f.t="text"
                            };
                            switch (f.t) {
                                case "text":
                                    tmp+=` and ${f.q}.${f.k} like `+ this.pool.escape(`%${values.srcTxt[x]}%`) +" "
                                    break;
                                case "equal":
                                    tmp+=` and ${f.q}.${f.k} = `+ this.pool.escape(`${values.srcTxt[x]}`) +" "
                                    break;
                                case "check":
                                    tmp+=` and ${f.q}.${f.k} is not null` +" "
                                    break;    
                                case "date":
                                    if(values.srcTxt[x].max)
                                    tmp+=` and ${f.q}.${f.k} < ${ this.pool.escape(new Date(values.srcTxt[x].max).toISOString() )} ` +" "
                                    if(values.srcTxt[x].min)
                                    tmp+=` and ${f.q}.${f.k} > ${ this.pool.escape(new Date(values.srcTxt[x].min).toISOString() )} ` +" "
                                    break;     
                                default:
                                    break;
                            }
                        }
                        delete values.srcTxt[x];
                    } catch (error) {
                        console.log(error)
                        delete values.srcTxt[x];
                    }
                })
                if(tmp!=""){
                    selectedProcedure.sql=selectedProcedure.sql.replace(":srcTxt",tmp)
                    delete values.srcTxt;
                }else{
                    delete values.srcTxt;
                }
            } catch (error) {
                console.log(error)
                delete values.srcTxt;
                throw "hata"
            }
        }else{
            delete values.srcTxt;
        }
        //orderby
        if(values.orderBy &&  Array.isArray(selectedProcedure.orderBy) && selectedProcedure.orderBy.includes(values.orderBy) ){
            selectedProcedure.sql=selectedProcedure.sql.replace(":orderBy",values.orderBy + (values.orderType=="A" ? " ASC" : " DESC") )
        }else{
            selectedProcedure.sql=selectedProcedure.sql.replace(":orderBy","id DESC")
        }
        if(! values.current) selectedProcedure.sql=selectedProcedure.sql.replace(":current","0")
        return await this.queryObject(selectedProcedure.sql,values)
    }
    //anti sql injection
    queryObject(q,o){
        var query= q.replace(/\:(\w+)/g, function (txt, key) {
          if (o.hasOwnProperty(key)) {
            return this.pool.escape(o[key]);
          }
          return "";
        }.bind(this));
        return this.query(query);
    }
    async query( sql, args, close=true,returnRejectedData=false,ignoreError=false ) {
        return new Promise( ( resolve, reject ) => {
            this.pool.getConnection(function(err, connection) {
                if (err) throw err;
                connection.query( sql, args, ( err, rows ) => {
                    if ( err )  {
                        var rejected={message:"veritabanihatasi" };
                        switch (err.code) {
                            case "ER_DUP_ENTRY":
                                rejected.colName=err.sqlMessage.substring(err.sqlMessage.search("key ")+5,err.sqlMessage.search("_UNIQUE"));
                                rejected.colData=err.sqlMessage.substring(err.sqlMessage.search("entry ")+6,err.sqlMessage.search(" for key"));
                                rejected.message="buverihalihazirdavar";
                                break;
                            case "ER_OPERAND_COLUMNS":
                                rejected.message="veriicindebulunmamasigerekverivar";
                                break;
                            case "ER_NO_SUCH_TABLE":
                                rejected.message="tablobulunamadi";
                                break;
                            case "ER_TRUNCATED_WRONG_VALUE":
                                rejected.message="hatalideger";
                                break;
                            default:
                                break;
                        }
                        console.log(err);
                        if(returnRejectedData) {
                            rejected.data=args;
                        }
                        return ignoreError? resolve( rejected ) : reject( rejected );
                        
                    }
                    if ( close ) connection.release();;
                    resolve( rows );
                } );
            });
        } );
    }
    close() {
        return new Promise( ( resolve, reject ) => {
            this.pool.end( err => {
                if ( err )
                    return reject( err );
                resolve();
            } );
        } );
    }
    async checkAuth(userId,authId){
        if(userId==null || authId==null) return false;
        try {
            //var result=await this.selectQuery({authId:authId,groupId:groupId},"Authority_Group")
            var result=await this.query(`SELECT a.* FROM coda.User_Grup g inner join coda.Authority_Group a on g.groupId=a.groupId and a.authId=${authId} and g.userId=${userId} and g.deleted=0 and a.deleted=0;`);
            if ( result && result.length>0  ){
                return true;
            }else{
                return false;
            }
        } catch (error) {
            return false;
        }
       
    }
    async updateUserNavigateValue(req){
        var q="UPDATE coda.Users SET  navigate= navigate + 1, lastview= :date WHERE id = "+req.session.user.id
        var dt = new Date();
        let dtNow=`${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}:${dt.getSeconds().toString().padStart(2, '0')}  ${(dt.getMonth()+1).toString().padStart(2, '0')}/${dt.getDate().toString().padStart(2, '0')}/${dt.getFullYear().toString().padStart(4, '0')}`;
        this.queryObject(q,{ date: dtNow })
        //return this.query("UPDATE coda.Users SET  navigate= navigate + 1, lastview= "+new Date() +" WHERE id = "+req.session.user.id)
    }
    async selectAll(tableName,extra="",countRow=false,databaseName=this.databaseName){
        if(extra==null){
            extra="";
        }
        if(!tableName || tableName==""){
            throw "tabloismibulunamadi";
        }
        var query=`SELECT ${ countRow ? "SQL_CALC_FOUND_ROWS" : "" } * FROM ${databaseName}.${tableName} WHERE deleted=0 ${extra};${ countRow ? "SELECT FOUND_ROWS() AS max;" : "" }`;
        return this.query(query);
    }
    async selectQuery(where={},tableName,mode="AND",extra="",countRow=false,databaseName=this.databaseName){
        if(!tableName || tableName==""){
            throw "tabloismibulunamadi";
        }
        if(Object.keys(where).length==0){
            throw "sorgualanieksik";
        }
        var query="";
        query=selectQueryConverter(tableName,databaseName,where,mode,extra,countRow);
        if(query==""){
            throw "sorgubulunamadi";
        }
        return this.query(query,Object.keys(where).map(y=> where[y]));
    }
    async selectLike(tableName,where,mode="AND",extra="",countRow=false,databaseName=this.databaseName){
        //var a=await new db().selectWithColumn(["id","a"],"test");
        if(!tableName || tableName==""){
            throw "tabloismibulunamadi";
        }
        
        var query="";
        query=selectLikeConverter(tableName,databaseName,where,mode,extra,countRow);
        if(!where){
            where={};
        }
        if(query==""){
            throw "sorgubulunamadi";
        }
        return this.query(query,Object.keys(where).map(y=> "%"+where[y]+"%"));
    }
    async selectLikeWithColumn(colNameS=[],tableName,where,mode="AND",databaseName=this.databaseName){
        //var a=await new db().selectWithColumn(["id","a"],"test");
        if(!tableName || tableName==""){
            throw "tabloismibulunamadi";
        }
        if(colNameS.length==0){
            throw "kolonisimlerieksik";
        }
        var query="";
        query=selectLikeWithColumnConverter(tableName,databaseName,colNameS,where,mode);
        if(!where){
            where={};
        }
        if(query==""){
            throw "sorgubulunamadi";
        }
        return this.query(query,Object.keys(where).map(y=> "%"+where[y]+"%"));
    }
    async selectWithColumn(colNameS=[],tableName,where,mode="AND",databaseName=this.databaseName){
        //var a=await new db().selectWithColumn(["id","a"],"test");
        if(!tableName || tableName==""){
            throw "tabloismibulunamadi";
        }
        if(colNameS.length==0){
            throw "kolonisimlerieksik";
        }
        var query="";
        query=selectWithColumnConverter(tableName,databaseName,colNameS,where,mode);
        if(!where){
            where={};
        }
        if(query==""){
            throw "sorgubulunamadi";
        }
        return this.query(query,Object.keys(where).map(y=> where[y]));
    }
    async insert(data={},tableName,databaseName=this.databaseName){
        //await new db().insert({ a:"azxzcxzxczsol",b:"1231"},"test")
        if(!tableName || tableName==""){
            throw "tabloismibulunamadi";
        }
        if(Object.keys(data).length==0){
            throw "veribulunamadi";
        }
        if(Array.isArray(data)){
            var rejectedItems=[];
            for(item of data){
                if(typeof(item)!="object"){
                    throw "veritipihatali";
                }
                var query="";
                query=insertConverter(tableName,databaseName,item);
                if(query==""){
                    throw "sorgubulunamadi";
                }
                var result =await this.query(query,[ [ Object.keys(item).map(y=> item[y]) ] ],false,true,true);
                if(result.data){
                    rejectedItems.push( { title: {colName: result.colName, colData:result.colData, message:result.message },data:result.data[0][0]});
                }
            }
            console.log(rejectedItems);
            this.close();
            return rejectedItems;
            /*  eski toplu insert
                data.map(x=> {
                if(typeof(x)!="object"){
                    throw "veritipihatali";
                }
                var query="";
                query=insertConverter(tableName,databaseName,x);
                if(query==""){
                    throw "sorgubulunamadi";
                }
                return this.query(query,[ [ Object.keys(x).map(y=> x[y]) ] ],false);
            })*/
        }
        else if(typeof(data)=="object"){
            var query="";
            query=insertConverter(tableName,databaseName,data);
            if(query==""){
                throw "sorgubulunamadi";
            }
            return this.query(query,[ [ Object.keys(data).map(y=> data[y]) ] ]);
        }
        else{
            throw "veritipihatali";
        }
       
        return false;
    }
    async remove(where={},tableName,mode="AND",databaseName=this.databaseName){
        if(!tableName || tableName==""){
            throw "tabloismibulunamadi";
        }
        if( Object.keys(where).length==0){
            throw "sorgualanieksik";
        }
        var query="";
        query=removeConverter(tableName,databaseName,where,mode);
        if(query==""){
            throw "sorgubulunamadi";
        }
        return this.query(query,Object.keys(where).map(y=> where[y]));
    }
    async update(data={},where={},tableName,mode="AND",databaseName=this.databaseName){
        //var a=await new db().update({a:"a",b:"b"},{b:"b"},"test");
        if(!tableName || tableName==""){
            throw "tabloismibulunamadi";
        }
        if(Object.keys(where).length==0){
            throw "sorgualanieksik";
        }
        if(Object.keys(data).length==0){
            throw "veribulunamadi";
        }
        var query="";
        query=updateConverter(tableName,databaseName,data,where,mode);
        if(query==""){
            throw "sorgubulunamadi";
        }
        var arr1=Object.keys(data).map(y=> data[y])
        var arr2=Object.keys(where).map(y=> where[y])
        var concat= arr1.concat(arr2);
        return this.query(query,Object.keys(concat).map(y=> concat[y]));
    }
    async selectIn(colName,data=[],tableName,extra="",countRow=false,databaseName=this.databaseName){
        //data [1,2,3,4] şeklinde olmalı
        //var a=await new db().selectIn("id",[1,2],"sayfalar");
        if(!tableName || tableName==""){
            throw "tabloismibulunamadi";
        }
        if(data.length==0){
            throw "veribulunamadi";
        }
        if(!colName){
            throw "kolonadibulanamadi";
        }
        var query="";
        query=selectInConverter(tableName,databaseName,colName,extra,countRow);
        if(query==""){
            throw "sorgubulunamadi";
        }
        return this.query(query,[data]);
    
    }

    async setSilindi(where={},tableName,mode="AND",databaseName=this.databaseName){
        //await new db().setSilindi({a:"azxzcxzxczsol"},"test");
        if(!tableName || tableName==""){
            throw "tabloismibulunamadi";
        }
        if( Object.keys(where).length==0){
            throw "sorgualanieksik";
        }
        var query="";
        query=setSilindiConverter(tableName,databaseName,where,mode);
        if(query==""){
            throw "sorgubulunamadi";
        }
        return this.query(query,Object.keys(where).map(y=> where[y]));
    }
}
function insertConverter(_tableName,_databaseName,_object){
    return `INSERT INTO ${_databaseName}.${_tableName} (${Object.keys(_object).toString()}) VALUES  ?`; 
}
function removeConverter(_tableName,_databaseName,_where,_mode){
    return `DELETE FROM ${_databaseName}.${_tableName} WHERE ${Object.keys(_where).map(x=> x+"= ? ").join(_mode+" ")}`; 
}
function selectQueryConverter(_tableName,_databaseName,_where,_mode,_extra,_countRow){
    return `SELECT ${ _countRow ? "SQL_CALC_FOUND_ROWS" : "" } * FROM ${_databaseName}.${_tableName} WHERE ( ${Object.keys(_where).map(x=> x+"= ? ").join(_mode+" ")} ) AND deleted=0 ${_extra} ; ${ _countRow ? "SELECT FOUND_ROWS() AS max;" : "" }`;
}
function selectLikeConverter(_tableName,_databaseName,_where,_mode,_extra,_countRow){
    return `SELECT ${ _countRow ? "SQL_CALC_FOUND_ROWS" : "" } * FROM ${_databaseName}.${_tableName} WHERE ( ${ _where ? Object.keys(_where).map(x=> x+" LIKE ? ").join(_mode+" "):"1=1" } ) AND deleted=0 ${_extra} ; ${ _countRow ? "SELECT FOUND_ROWS() AS max;" : "" }`;
}
function selectLikeWithColumnConverter(_tableName,_databaseName,_colNameS,_where,_mode){
    return `SELECT ${_colNameS} FROM ${_databaseName}.${_tableName} WHERE ( ${ _where ? Object.keys(_where).map(x=> x+" LIKE ? ").join(_mode+" "):"1=1" } ) AND deleted=0`;
}
function selectWithColumnConverter(_tableName,_databaseName,_colNameS,_where,_mode){
    return `SELECT ${_colNameS} FROM ${_databaseName}.${_tableName} WHERE ( ${ _where ? Object.keys(_where).map(x=> x+"= ? ").join(_mode+" "):"1=1" } ) AND deleted=0`;
}
function updateConverter(_tableName,_databaseName,_object,_where,_mode){
    return `UPDATE ${_databaseName}.${_tableName} SET ${Object.keys(_object).map(x=> x+"= ? ").toString()} WHERE ${Object.keys(_where).map(x=> x+"= ? ").join(_mode+" ")}`;
}
function selectInConverter(_tableName,_databaseName,_colName,_extra,_countRow){
    return `SELECT ${ _countRow ? "SQL_CALC_FOUND_ROWS" : "" } * FROM ${_databaseName}.${_tableName} WHERE ${_colName} IN (?) AND deleted=0 ${_extra} ; ${ _countRow ? "SELECT FOUND_ROWS() AS max;" : "" }`;
}
function setSilindiConverter(_tableName,_databaseName,_where,_mode){
    return `UPDATE ${_databaseName}.${_tableName} SET deleted=1 WHERE ${Object.keys(_where).map(x=> x+"= ? ").join(_mode+" ")}`;
}

module.exports =new Database();