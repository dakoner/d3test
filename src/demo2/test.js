var margin = {top: 20, right: 20, bottom: 30, left: 50},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

var parseDate = d3.time.format("%Y-%m-%d").parse,
    formatDate = d3.time.format("%Y");

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


var line = d3.svg.line()
    .x(function(d) { return x(d.date); })
    .y(function(d) { return y(d.value); });

var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var zoom = d3.behavior.zoom()
    .on("zoom", draw);



svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")");


svg.append("g")
    .attr("class", "y axis")
    .attr("transform", "translate(" + width + ",0)");

svg.append("clipPath")
    .attr("id", "clip")
  .append("rect")
    .attr("x", x(0))
    .attr("y", y(1))
    .attr("width", x(1) - x(0))
    .attr("height", y(0) - y(1));

svg.append("path")
    .attr("class", "line")
    .attr("clip-path", "url(#clip)");

svg.append("rect")
    .attr("class", "pane")
    .attr("width", width)
    .attr("height", height)
    .call(zoom);

d3.csv("readme-flights.csv", function(error, data) {
  data.forEach(function(d) {
    d.date = parseDate(d.date);
    d.value = parseFloat(d.value);
  });

  x.domain([new Date(1999, 0, 1), new Date(2003, 0, 0)]);
  y.domain(d3.extent(data, function(d) { return d.value; }));
  zoom.x(x);
  zoom.y(y);

  svg.select("path.line").data([data]);
  draw();
});

function draw() {
  svg.select("g.x.axis").call(xAxis).selectAll("text")
                                        .style("text-anchor", "end")
                                        .attr("dx", "-.8em")
                                        .attr("dy", ".15em")
                                        .attr("transform", function(d) {
                                          return "rotate(-90)";

    });
  svg.select("g.y.axis").call(yAxis);
  svg.select("path.line").attr("d", line);
}