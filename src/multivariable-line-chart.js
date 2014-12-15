// Add an SVG line chart defined by data (via its property specified
// by varname into HTML element tag.
function plot(data, varname, tag) {
    // Empty the target HTML element before populating it.
    $(tag).empty();

    // Margins make space for areas outside the chart The width and
    // height of the chart needs to account for them.  
    // TODO(dek): get the actual width and height we can occupy based
    // on screen dimensions
    var margin = {top: 20, right: 30, bottom: 80, left: 10},
	width = 1500 - margin.left - margin.right,
	height = 500 - margin.top - margin.bottom;

    // parseDate is used to turn the dates in JSON fields such as
    // created_at into JS dates
    var parseDate = d3.time.format("%a, %d %b %Y %H:%M:%S -0000").parse

    // X scale is time-based.  It maps between the data's X-axis domain
    // (defined by the earliest and latest timestamps in the data) and
    // the viewport's width.
    var x = d3.time.scale()
	.range([0, width]);

    // Y scale is linear.  It maps between the data's Y-axis domain
    // (defined by the extreme values for a variable) and the
    // viewport's height.
    var y = d3.scale.linear()
	.range([height, 0]);

    // Define the location and scale of the rendered X axis
    var xAxis = d3.svg.axis()
	.scale(x)
	.orient("bottom")

    // Define the location and scale of the rendered Y axis
    var yAxis = d3.svg.axis()
	.scale(y)
	.orient("right")

    // These functions map date values (either X-axis or Y-axis) to
    // their scaled values
    function fx(d) {
	return x(d.date);
    }
    function fy(d) {
	return y(d.var);
    }

    // Define a SVG line (path) used to render the line chart data
    var line = d3.svg.line()
	.x(fx)
	.y(fy);

    // Create an SVG tag used to contain the entire chart.
    var svg = d3.select(tag).append("svg")
	.attr("width", width + margin.left + margin.right)
	.attr("height", height + margin.top + margin.bottom)
	.append("g")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Append an SVG group used to contain the X axis
    svg.append("g")
	.attr("class", "x axis")
	.attr("transform", "translate(0," + height + ")");

    // Append an SVG group used to contain the Y axis
    svg.append("g")
	.attr("class", "y axis")
	.attr("transform", "translate(" + width + ", 0)");

    // Extract and clean the data (X- and Y-axis values) from the passed-in
    // data, in a data structure that is ready to be passed to D3.
    var newData = [];
    data.forEach(function(d) {
	var item = new Object;
	item.date = parseDate(d.created_at);
	item.var = parseFloat(d[varname]);
	item.station = new Object();
	item.station.uuid = d.station.uuid;
	if (d.us_units == 0) {
	    if (varname == "outside_temp" || varname == "inside_temp")
		item.var = item.var * 9 / 5. + 32.;
	    if (varname == "pressure")
		item.var = item.var / 33.86;
	}
	if (varname == "rssi")
            if (item.var < 0) item.var = -item.var;
	newData.push(item);
    });

    var oldData = data;
    data = newData;

    // Filter the data based on reasonable ranges.
    data = data.filter(function(d) {
	if (varname == "pressure")
	    return d.var > 20 && d.var < 35;
	if (varname == "outside_temp" || varname == "inside_temp")
	    return d.var > 10 && d.var < 100;
	return true;
    });

    // Sort the data (by timestamp) since the subsequent code requires it.
    data.sort(function(a, b) {
	return a.date>b.date ? 1 : a.date<b.date ? -1 : 0;
    });

    var dx = data.map(function(d) { return d.date; })
    var firstdate = new Date(Math.min.apply(null, dx));
    var lastdate = new Date(Math.max.apply(null, dx));
    var daybefore = new Date(Math.max.apply(null, dx));
    // Day before the last day.
    daybefore.setDate(daybefore.getDate()-1);
    // Set the X domain from a time range.  The initially rendered
    // graph will show data within this timespan
    x.domain([daybefore,lastdate])
    // Alternative which renders the entire timespan
    // x.domain(d3.extent(data, function(d) { return d.date; }));

    // Set the Y domain based on the extent of the values.
    var dy = data.map(function(d) { return d.var; })
    y.domain(d3.extent(dy));

    // All the observations in data are tagged by a station UUID.  To
    // implement a chart where each station has an independent line,
    // we "nest" (group) the data, using the UUID as key.
    var dataNest = d3.nest()
	.key(function(d) { return d.station.uuid; })
	.entries(data);

    // Define the color collection for the data groups
    var color = d3.scale.category10();

    // Define a clip rectangle that covers the data.  This is used to
    // erase SVG line chart rendering outside the chart area.
    svg.append("clipPath")
    	.attr("id", "clip")
    	.append("rect")
    	.attr("x", 0)
    	.attr("y", 0)
    	.attr("width", width)
    	.attr("height", height)

    // Build SVG lines and legend text for each station's variable
    legendSpace = width/dataNest.length;
    // TODO(dek): determine if we only need to do this for the initially visible group
    dataNest.forEach(function(d, i) {
        var l = line(d.values);
	svg.append("path")
	    .attr("class", "line")
	    .style("stroke", function() {
                return d.color = color(d.key); })
	    .attr("d", l)
	    .attr("clip-path", "url(#clip)");

	svg.append("text")
	    .attr("x", (legendSpace/2)+i*legendSpace) // spacing
	    .attr("y", height + (margin.bottom/2)+ 25)
	    .attr("class", "legend")
	    .style("fill", function() {
		return d.color = color(d.key); })
	    .text(d.key);
    });

    var draw = function() {
	if (d3.event != null) {
	    translate = d3.event.translate
        } else {
	    translate = [0,0]
	}
	// console.log("translate=" + translate)
	// console.log("x.invert=" + x.invert(      - translate[0]))
	// console.log("x.invert=" + x.invert(width - translate[0]))
	// console.log("firstdate=" + firstdate)
	// console.log("lastdate=" + lastdate)
	if (x.invert(      - translate[0]) >= firstdate &&
	    x.invert(width - translate[0]) <= lastdate) {
	    // want to convert from the positions (-translate[0],  (width - translate[0]))
	    // to the range of locations in data.val
	    var start = d3.bisectLeft(dx, x.invert(- translate[0]))
	    var end = d3.bisect(dx, x.invert(width - translate[0]))
	    console.log("start=", start)
	    console.log("end=", end)
	    var e = d3.extent(dy.slice(start,end))
	    console.log("extent=", e)
	    // e[0] -= (e[0] / 10.)
	    // e[1] += (e[1] / 10.)
	    // y.domain(e);
	    // console.log(x.invert(0) + " -- " + x.invert(width))
	    svg.select("g.x.axis").call(xAxis).selectAll("text")
		.style("text-anchor", "end")
		.attr("dx", "-.8em")
		.attr("dy", ".15em")
		.attr("transform", function(d) {
                    return "rotate(-90)";
		});
	    svg.select("g.y.axis").call(yAxis);
	    svg.selectAll("path.line")[0].forEach(function(d, i) {
		d.attributes['d'].value=line(dataNest[i].values);
	    });
	}
    }

    var zoom = d3.behavior.zoom()
	.on("zoom", draw);

    svg.append("rect")
	.attr("class", "pane")
	.attr("width", width)
	.attr("height", height)
	.call(zoom);
    zoom.x(x);
    draw();
}

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
