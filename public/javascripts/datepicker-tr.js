
( function( factory ) {
	if ( typeof define === "function" && define.amd ) {
		define( [ "../widgets/datepicker" ], factory );
	} else {
		factory( jQuery.datepicker );
	}
}( function( datepicker ) {

datepicker.regional.tr = {
	prevText: "Önceki",
	nextText: "Sonraki",
	currentText: "Bugün",
	monthNames: [ "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
		"Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık" ],
	monthNamesShort: [ "Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara" ],
	dayNames: [ "Pazar","Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi" ],
	dayNamesShort: [ "Paz","Pzt", "Sal", "Çar", "Per", "Cum", "Cmt" ],
	dayNamesMin: [ "Paz" ,"Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"],
	dateFormat: "dd/mm/yy",
	 };
datepicker.setDefaults( datepicker.regional.tr );
return datepicker.regional.tr;

} ) );
