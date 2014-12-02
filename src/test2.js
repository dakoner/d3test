$.ajaxSetup ({
    // Disable caching of AJAX responses
    // Used when debugging
    cache: false
});

var list = [ 'outside_temp', 'pressure', 'rssi', 'wind_direction', 'recv_packets', 'rain_spoons', 'heatindex', 'inside_humidity', 'inside_temp', 'outside_humidity', 'rain', 'solar_wm2', 'uv_index', 'wind_gust', 'wind_gust_direction', 'wind_speed' ]

var ajax_list = []
for (var i = 0; i < list.length; i++) {
    var n = list[i];
    var v = $.ajax(n + ".json");
    ajax_list.push(v);
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
	plot(arguments[0][0], list[0], list[0] + "_content");
	for (var i = 0; i < arguments.length; i++) {
	    tab = $("." + list[i] + "_tab");
	    var v = arguments[i][0];
	    var n = list[i]
	    // external func required to bind value of v, n
	    tab.click(createfunc(v, n))
	}})
    .fail(function(e) {
	console.log("Err..." + e);
    });
