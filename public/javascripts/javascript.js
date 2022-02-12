
function showNotification(from, align,renk,text){
    var icon="";  
      
    switch (renk) {
      case "success":
        icon="fas fa-check"
        break;
      case "danger":
        icon="fas fa-ban"
        break;
      default:
        icon="fas fa-exclamation"
    }  
    //$.simplyToast(renk,text);
    $.notify({
        icon: icon,
        message: text

      },{
          type: renk,
          timer: 2000,
          placement: {
              from: from,
              align: align
          }
      });
	}

    $(document).ready(function(){
        if ($("[type='editor']").length != 0) {
            $("[type='editor']").summernote();
            /*.froalaEditor({
                toolbarButtons: ['bold', 'italic', 'underline', 'strikeThrough', 'fontFamily', 'fontSize',"color", '|', 'inlineStyle', 'paragraphFormat', 'align', 'undo', 'redo', 'html'],
            });*/
        }
        if($("[type='multipleSelect']").length != 0){
            $("[type='multipleSelect']").multipleSelect()
        }
        if ($(".datepicker").length != 0) {
            $( ".datepicker" ).each(function(){
                $( this ).mask('00/00/0000');
                var v=$(this).val()
                $( this ).datepicker();
                $( this ).datepicker( "option", "dateFormat", "dd/mm/yy");
                $( this ).datepicker( $.datepicker.regional[ "tr" ] );
                $( this ).datepicker('setDate', v);
            });
        }
        if($('.clockpicker').length != 0){
            $('.clockpicker').clockpicker({ placement: 'top'});
        }
        
    });
    $('form').on('keyup keypress', function(e) {
        var keyCode = e.keyCode || e.which;
        if (keyCode === 13) { 
        e.preventDefault();
        return false;
        }
    });
    
    function dateToString(date){
        var today = date
        var dd = today.getDate();
        var mm = today.getMonth() + 1; //January is 0!

        var yyyy = today.getFullYear();
        if (dd < 10) {
        dd = '0' + dd;
        } 
        if (mm < 10) {
        mm = '0' + mm;
        } 
        var today = dd + '-' + mm + '-' + yyyy;
        return today;
    }
    function toDashboard(obj){
        if(obj){
            showNotification('top','right',"success",obj.message);
            setTimeout(function(){location.href="/index";},100);
            
        }
    }
    
    function kayitBasarili(obj){
        if(obj.message){
            showNotification('top','right',"success",obj.message);
        }
        else{
            showNotification('top','right',"danger",'Bir hata oluştu!');
        }

    }
    function preview(){
        window.open('/preview', '_blank');
    }
    function formBasarili(obj){
        showNotification('top','right',"success",obj.message);
        location.href="table";

    }
    function setChecked(obj,callbackData){
        if(obj.status){
            showNotification('top','right',"success",obj.message);
            $(callbackData.t).find("input").prop('checked', !callbackData.rc);
        }
        else{
            $(callbackData.t).find("input").prop('checked', callbackData.rc);
        }
        
    }
    function basariliReload(obj){
        showNotification('top','right',"success",obj.message);
        location.reload();

    }
    function Dynajax(link,key="",callback,This=null,checkControls=true,data,ask=false,async=true){
        if(checkControls){
            if(controls()) {
                maskClose();    
                return;
            }
        }
        //var _data={};
        var formData ={};
        if(key!=""){
            kdata={};
            $(`[ajax-key=${key}]:visible`).each(function(){
                var type=$(this).attr("type");
                var name=$(this).attr("name");
                if(type=="radio"){
                    kdata[name]=$(`[ajax-key=${key}][name=${name}]:checked`).attr("radio-value");
                }
                else if(type=="checkbox"){
                    var tmpCheckbox=[];
                    $(`[ajax-key=${key}][name=${name}]:checked`).each(function () {
                        tmpCheckbox.push( $(this).attr("value") );
                    });
                    kdata[name]=tmpCheckbox;
                }
                else if(type=="editor"){
                    //kdata[name]=$(this).froalaEditor('html.get', true);
                    kdata[name]=$(this).summernote('code');
                }
                else if(type=="multipleSelect"){
                    //multipleselect kütüphanesini incele
                    kdata[name]=JSON.stringify($(this).val());
                }
                else if(type=="file"){
                    Object.keys(this.files).map(x=>{
                        formData.append("file",this.files[x],JSON.stringify({ name: this.files[x].name,colName:name}));
                    });
                    var tmpDefault=$(this).attr("default-value");
                    if(tmpDefault && tmpDefault!="" && tmpDefault!='""'){
                        kdata[name]=tmpDefault;
                    }
                    
                }
                else{
                    kdata[name]=$(this).val();
                }
            });
            formData.kdata=kdata;
        }
        if(data){
            formData.ndata=data;
        }
        var answer;
        var _ajax={
            type: "POST",
            url: "/ajax/"+link,
            contentType: 'application/json',
            dataType: 'json',
            data: JSON.stringify(formData),
            success: function (result) {
                if(!result){
                    showNotification('top', 'right', 'danger', 'birhatameydanageldi');
                    return;
                }
                if (result.status){
                    if(callback && typeof(callback)=="function") {
                        $(`[ajax-key=${key}]:visible`).val("");
                        callback(result,This);
                    }
                } 
                else {
                    showNotification('top', 'right', "danger", result.message);
                    if(This!=null){
                        if(callback && typeof(callback)=="function") {
                            callback(result,This);
                        }
                    }
                }
                answer=result;
                maskClose();
            },
            error: function (jqXHR, exception) {
                maskClose();
                console.log(jqXHR);
                console.log(exception);
            }
        }
        if(!async){
            _ajax.async=false;
        }
        if (ask) {
            $.confirm({
                content: "",
                theme: 'material',
                type: 'red',
                title: 'Eminmisiniz?',
                draggable: false,
                buttons: {
                    confirm: {
                    btnClass: 'btn-red',
                    text: 'Evet',
                    action: function () {
                        maskOpen();
                        $.ajax(_ajax);
                    }

                    },
                    cancel: {
                    btnClass: 'btn-default',
                    text: 'Hayır',
                    action: function () {
                        maskClose();
                    }
                    }
                }
            });
        } else {
            maskOpen();
            $.ajax(_ajax);
            
        }
        if(!async){
            return answer;
        }
    }

   

    /* #region  show password */
    var selectedPassword;
    $(document).mouseup(function(){
        $(selectedPassword).attr("type","password");
        selectedPassword=null;
        return false;
    });

    $("body").delegate(".showpass", "mousedown", function () {
        selectedPassword=$(this).parent().find("input[type='password']");
        $(selectedPassword).attr("type","text");
    });
    /* #endregion */

  
    /* #region  zorunlu alan kontrolu */
    function enforcedControl() {
        var result = false;
        $("[enforced]:visible").each(function () {
        if ($(this).val() == "" || $(this).val() == undefined || $(this).val() == null) {
            result = true;
            $(this).css("border-bottom", "2px solid red");
        }

        });
        if (result)
        showNotification('top', 'right', 'danger', "Zorunlu alanları doldurmanız gerekmektedir!");
        return result;
    }
    $("body").delegate("[enforced]", "change keyup paste", function () {
        if ($(this).val() != "" && $(this).val() != undefined && $(this).val() != null)
        $(this).css("border-bottom", "");
    });
    /* #endregion */
    
    /* #region  bütün kontroller */
    function controls() {
        return (enforcedControl() )
    }
    /* #endregion */
    
    /* #region  Çıkış yap */
    function exit() {
    $.ajax({
        type: "GET",
        url: "/ajax/exit",
        dataType: "json",
        success: function (result) {
        showNotification('top', 'right', result.color, result.message);
        if (result.status)
            location.href = "/";
        },
        error: function (jqXHR, exception) {
        console.log(jqXHR);
        console.log(exception);
        }
    });
    }
    /* #endregion */

    /* #region  ilişkili veri çekme */
    function DynData(where={},hash,callback){
        var _data={};
        _data.kdata=JSON.stringify({
            where:where,
            hash:hash,
        })
        $.ajax({
            type: "POST",
            url: "/ajax/dyndata",
            dataType: "json",
            data: _data,
            success: function (result) {
                if(!result){
                    showNotification('top', 'right', 'danger', "birhatameydanageldi");
                    return;
                }
                if (result.status){
                    callback(result.data,result.colName);
                } 
                else {
                    showNotification('top', 'right', "danger", result.message);
                }
            },
            error: function (jqXHR, exception) {
                console.log(jqXHR);
                console.log(exception);
            }
        });
        
    }
    var _connect={};
    $("body").delegate("[connect-on]","change",function(){
        var hash=$(this).attr("connect-hash");
        var target=$(this).attr("connect-target") || $(this);
        var whoAmI=$(this).attr("connect-whoami");
        var targetTagName=$(target).prop("tagName");
        var val=$(this).val();
        if(!hash || !target){
            return;
        }
        DynData({[whoAmI]:val},hash,function(result,colName){
            _connect[hash]=result;
            if(targetTagName=="SELECT"){
                $(target).html("");
                $(target).append(`<option value=''>seciniz</option>`);
                $(target).append( result.map(x=>  `<option value="${x.id}">${x[colName]}</option>`).join("<br>"));
                $(target).val('');              
            }

        });
    })
    /* #endregion */
    
    

    /* #region  spinner */
    function maskOpen(){
        $("#loader,#shadow-mask").css("display", "block");
    }
    function maskClose(){
        $("#loader,#shadow-mask").css("display", "none");
    } 
    /* #endregion */
    /* #region  resim önizleme */
    $("[display-target]").on("change",function(){
        var targetId=$(this).attr("display-target");
        var target=`[display-id=${targetId}]`;
        readURL(this,target);
    })
    function readURL(input,target) {
        if (input.files && input.files[0]) {
            var reader = new FileReader();
            
            reader.onload = function(e) {
            $(target).attr('src', e.target.result);
            }
            
            reader.readAsDataURL(input.files[0]);
        }
    }
    /* #endregion */
    function daysInMonth (month, year) {
        return new Date(year, month, 0).getDate();
    }
    function diffDay(s){
        date1 = new Date(s);
        date2 = new Date();;
        diffTime = Math.abs(date2 - date1);
        diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        console.log(diffDays)
        return diffDays;
   }
   function convertTime(date){
    var dateString = date; 
    var dateParts = dateString.split("/");
    var dateObject = new Date(+dateParts[2], dateParts[1] - 1, +dateParts[0]); 
    return dateObject.toISOString()
  }
  var monthsLong=["OCAK","ŞUBAT","MART","NİSAN","MAYIS","HAZİRAN","TEMMUZ","AĞUSTOS","EYLÜL","EKİM","KASIM","ARALIK"]
  var months=["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"]
   Colors2=[
      "#FF0000",
      "#FF8000",
      "#FFFF00",
      "#80112A",
      "#00FF00",
      "#00FF80",
      "#00FFFF",
      "#0080FF",
      "#0000FF",
      "#7F00FF",
      "#FF00FF",
      "#FF007F",
      "#808080",
      "#011030",
      "#558082",
      "#80AA80",
      "#9f9c57",
      "#ad1d45",
      "#a3c3ff",
      "#99228B",
      "#E67E22",
      "#1ABC9C",
      "#2ECC71",
      "#3498DB",
      "#9B59B6",
      "#16A085",
      "#27AE60",
      "#2980B9",
      "#8E44AD",
      "#2C3E50",
      "#F1C40F",
      "#E74C3C",
      "#95A5A6",
      "#F39C12",
      "#D35400",
      "#C0392B",
      "#BDC3C7",
      "#7F8C8D",
    ]
    function findPos(obj) {
        var curtop = 0;
        if (obj.offsetParent) {
            do {
                curtop += obj.offsetTop;
            } while (obj = obj.offsetParent);
        return [curtop];
        }
    }
    
