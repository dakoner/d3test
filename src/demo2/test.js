var margin = {top: 100, right: 100, bottom: 100, left: 100},
    width = window.innerWidth - margin.left - margin.right,
    height = window.innerHeight - margin.top - margin.bottom;

var parseDate = d3.time.format("%Y-%m-%d %H:%M:%S").parse,
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


var line = d3.svg.line()
    .x(function(d) { return x(d.date); })
    .y(function(d) { return y(d.outside_temp); });

var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");



svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")");


svg.append("g")
    .attr("class", "y axis")
    .attr("transform", "translate(" + width + ",0)");


d3.csv("outside_temp.csv", function(error, data) {
  data.forEach(function(d) {
    d.date = parseDate(d.created_at);
    d.outside_temp = parseFloat(d.outside_temp);
  });

  x.domain([new Date(2014, 10, 27), new Date(2014, 11, 0)]);
  y.domain(d3.extent(data, function(d) { return d.outside_temp; }));


   var dataNest = d3.nest()
        .key(function(d) { return d["station.uuid"]; })
        .entries(data);

  var color = d3.scale.category10();
  legendSpace = width/dataNest.length; // spacing for legend

  dataNest.forEach(function(d, i) {
                svg.append("path")
                    .attr("class", "line")
                    .style("stroke", function() {
                                    return d.color = color(d.key); })
                    .attr("d", line(d.values));

                svg.append("text")
                    .attr("x", (legendSpace/2)+i*legendSpace) // spacing
                    .attr("y", height + (margin.bottom/2)+ 25)
                    .attr("class", "legend")
                    .style("fill", function() {
                        return d.color = color(d.key); })
                    .text(d.key);
                    }
    );

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
});
