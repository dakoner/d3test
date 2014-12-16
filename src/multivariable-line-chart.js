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
    // TODO(dek): determine if we only need to do this for the initially visible variable
    dataNest.forEach(function(d, i) {
	svg.append("path")
	    .attr("class", "line")
	    .style("stroke", function() {
		// Each line will be colored by index into the color
		// array we defined earlier.
                return d.color = color(d.key); })
	    .attr("d", line(d.values))
	    .attr("clip-path", "url(#clip)");

	svg.append("text")
	    .attr("x", (legendSpace/2)+i*legendSpace) // spacing
	    .attr("y", height + (margin.bottom/2)+ 25)
	    .attr("class", "legend")
	    .style("fill", function() {
		// Each legend entry will be colored by index into the color
		// array we defined earlier.
		return d.color = color(d.key); })
	    .text(d.key);
    });

    // Main redraw function for an individual chart
    var draw = function() {
	// Figure out the current panning of the chart.
	if (d3.event != null) {
	    translate = d3.event.translate
        } else {
	    translate = [0,0]
	}
	// Check to see if the pan is legal (doesn't try to pan
	// missing data at the start or end)
	if (x.invert(      - translate[0]) >= firstdate &&
	    x.invert(width - translate[0]) <= lastdate) {
	    // TODO(dek): make this test code work to rescale the
	    // chart's y domain to the local Y extrema as it is panned
	    // var start = d3.bisectLeft(dx, x.invert(- translate[0]))
	    // var end = d3.bisect(dx, x.invert(width - translate[0]))
	    // var e = d3.extent(dy.slice(start,end))
	    // e[0] -= (e[0] / 10.)
	    // e[1] += (e[1] / 10.)
	    // y.domain(e);
	    // console.log(x.invert(0) + " -- " + x.invert(width))

	    // Update and rotate the X axis labels (necessary if panning)
	    svg.select("g.x.axis").call(xAxis).selectAll("text")
		.style("text-anchor", "end")
		.attr("dx", "-.8em")
		.attr("dy", ".15em")
		.attr("transform", function(d) {
                    return "rotate(-90)";
		});

	    // Update the Y axis (probably not necessary if we don't rescale the Y axis)
	    svg.select("g.y.axis").call(yAxis);

	    // update the data embedded in the SVG element which
	    // displayes the line chart with the current values.  This
	    // is necessary if panning, to ensure the path is updated
	    // with the current transformation
	    svg.selectAll("path.line")[0].forEach(function(d, i) {
		d.attributes['d'].value=line(dataNest[i].values);
	    });
	}
    }

    // Set up zoom behavior
    var zoom = d3.behavior.zoom()
	.on("zoom", draw);

    // Build an SVG element that contains the zoom behavior
    svg.append("rect")
	.attr("class", "pane")
	.attr("width", width)
	.attr("height", height)
	.call(zoom);
    // Panning and zooming only affect X axis, not Y axis.
    zoom.x(x);

    // Required for the very first view of the chart to be rendered
    draw();
}

$.ajaxSetup ({
    // Disable caching of AJAX responses
    // Used when debugging
    cache: false
});

// List of variables that have tabs and are charted
var list = [ 'outside_temp', 'pressure', 'rssi', 'wind_direction', 'recv_packets', 'rain_spoons', 'heatindex', 'inside_humidity', 'inside_temp', 'outside_humidity', 'rain', 'solar_wm2', 'uv_index', 'wind_gust', 'wind_gust_direction', 'wind_speed' ]

// Date range to chart
var startDate = new Date("2014-10-17");
var endDate = new Date("2014-12-17");
var date = startDate;

function pad(n){return n<10 ? '0'+n : n}

// List all the dates.  It might be possible to merge this code with
// the next for loop.
var dates = [];
while(date < endDate) {
    var s = date.getFullYear() + "-" + pad(date.getMonth()+1) + "-" + pad(date.getDate());
    dates.push(s);
    date.setDate(date.getDate() + 1);
}

// Add all the data files to a list that will be fetched via Ajax.
var ajax_list = []
for (var i = 0; i < dates.length; i++) {
    var n = dates[i];
    var v = $.ajax("data/" + n + ".json");
    ajax_list.push(v);
}

// Set up all the variable tabs
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

// Function that is called when user clicks on a tab to render a variable's chart
function createfunc(v, n) {
    return function() { 
	console.log("executing click for: ", n);
	plot(v, n, n + "_content");
    }
}

// Submit many AJAX requests in parallel, executing a done function
// when finished (or an error function).  Plots the first tab, and
// sets click handlers for plotting all the other tabs.
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
