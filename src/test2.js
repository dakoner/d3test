$.ajaxSetup ({
    // Disable caching of AJAX responses
    // Used when debugging
    cache: false
});

var list = [ 'outside_temp', 'pressure', 'rssi', 'wind_direction', 'recv_packets', 'rain_spoons', 'heatindex', 'inside_humidity', 'inside_temp', 'outside_humidity', 'rain', 'solar_wm2', 'uv_index', 'wind_gust', 'wind_gust_direction', 'wind_speed' ]


var startDate = new Date("2014-10-17");
var endDate = new Date("2014-12-14");
var date = startDate;
var dates = [];
function pad(n){return n<10 ? '0'+n : n}
while(date < endDate) {
    var s = date.getFullYear() + "-" + pad(date.getMonth()+1) + "-" + pad(date.getDate());
    dates.push(s);
    date.setDate(date.getDate() + 1);
}

var ajax_list = []
for (var i = 0; i < dates.length; i++) {
    var n = dates[i];
    var v = $.ajax("data/" + n + ".json");
    ajax_list.push(v);
}

for (var i = 0; i < list.length; i++) {
    var n = list[i];
    p = "tab-pane";
    if (i == 0) p += " active";
    d3.select(".nav-tabs").append("li")
	.append("a")
	.attr("class", n+"_tab")
	.attr("href", "#" + n + "_tab")
	.attr("data-toggle","tab")
	.text(n)
    d3.select(".tab-content").append("div")
	.attr("class", p)
	.attr("id", n + "_tab")
	.append(n + "_content")
}

function createfunc(v, n) {
    return function() { 
	console.log("executing click for: ", n);
	plot(v, n, n + "_content");
    }
}
$.when.apply($, ajax_list)
    .done(function() {
	var weatherdatas = [];
	for (var i = 0; i < arguments.length; i++) {
	    weatherdatas.push(arguments[i][0].weatherdata);
	}
	var data = Array.prototype.concat.apply([], weatherdatas);
	
	plot(data, list[0], list[0] + "_content");
	for (var i = 0; i < list.length; i++) {
	    tab = $("." + list[i] + "_tab");
	    var v = data;
	    var n = list[i]
	    // external func required to bind value of v, n
	    tab.click(createfunc(v, n))
	}
    })
    .fail(function(e) {
	console.log("Err..." + e);
    });
