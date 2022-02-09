String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

 function showNotification(from, align,renk,text){
    var icon="";  
      
    switch (renk) {
      case "success":
        icon="ti-check"
        break;
      case "danger":
        icon="ti-close"
        break;
      default:
        icon="ti-direction"
    }  
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