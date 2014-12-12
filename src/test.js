function plot(data, varname, tag) {

    $(tag).empty();

    var margin = {top: 20, right: 30, bottom: 80, left: 10},
	width = 1500 - margin.left - margin.right,
	height = 500 - margin.top - margin.bottom;

    var parseDate = d3.time.format("%a, %d %b %Y %H:%M:%S -0000").parse,
	formatDate = d3.time.format("%Y-%m-%d");

    var x = d3.time.scale()
	.range([0, width]);

    var y = d3.scale.linear()
	.range([height, 0]);

    var xAxis = d3.svg.axis()
	.scale(x)
	.orient("bottom")


    var yAxis = d3.svg.axis()
	.scale(y)
	.orient("right")

    function fx(d) {
	return x(d.date);
    }
    function fy(d) {
	return y(d.var);
    }
    
    var line = d3.svg.line()
	.x(fx)
	.y(fy);

    var svg = d3.select(tag).append("svg")
	.attr("width", width + margin.left + margin.right)
	.attr("height", height + margin.top + margin.bottom)
	.append("g")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append("g")
	.attr("class", "x axis")
	.attr("transform", "translate(0," + height + ")");

    svg.append("g")
	.attr("class", "y axis")
	.attr("transform", "translate(" + width + ", 0)");

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
    data = data.filter(function(d) {
	if (varname == "pressure")
	    return d.var > 20 && d.var < 35;
	if (varname == "outside_temp" || varname == "inside_temp")
	    return d.var > 10 && d.var < 100;
	return true;
    });

    // x.domain(d3.extent(data, function(d) { return d.date; }));
    var dx = data.map(function(d) { return d.date; })
    var lastdate = new Date(Math.max.apply(null, dx));
    var daybefore = new Date(Math.max.apply(null, dx));
    daybefore.setDate(daybefore.getDate()-7);
    console.log(lastdate)
    console.log(daybefore)
    x.domain([daybefore,lastdate])
    y.domain(d3.extent(data, function(d) { return d.var; }));

    var dataNest = d3.nest()
	.key(function(d) { return d.station.uuid; })
	.entries(data);

    var color = d3.scale.category10();
    legendSpace = width/dataNest.length; // spacing for legend

    svg.append("clipPath")
    	.attr("id", "clip")
    	.append("rect")
    	.attr("x", 0)
    	.attr("y", 0)
    	.attr("width", width)
    	.attr("height", height)

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

