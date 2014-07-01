function Queue () {
    this.front = [];
    this.back = [];
    this.push = function (x) {
        if (this.front.length) {
            this.back.push(x);
        } else {
            this.front.push(x);
        }
    }
    this.pop = function () {
        if (this.front.length) {
            var ret = this.front.pop();
            if (! this.front.length) {
                this.front = this.back.reverse();
                this.back = [];
            }
            return ret;
        } else {
            return undefined;
        }
    }
}

function Set (max_size) {
    this.obj = {};
    this.size = 0;
    this.max_size = max_size;
    this.add = function (x) {
        while (this.size >= this.max_size) {
            var keys = Object.keys(this.obj);
            var key = keys[Math.floor(Math.random() * keys.length)];
            this.del(key);
        }
        this.obj[x] = true;
        this.size++;
    }
    this.del = function (x) {
        d3.select(this.obj[x]).remove();
        delete this.obj[x];
        this.size--;
    }
    this.has = function (x) {
        return this.obj[x];
    }
}

var jitter = function () {
    return (Math.random() - 0.5) * 1;
}

var shuffle = function (arr) {
    for (var i = arr.length - 1; i > 0; --i) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = arr[i];
        arr[i] = arr[j];
        arr[j] = t;
    }
    return arr;
}

// nice hack https://gist.github.com/mbostock/5649592
var lineTransition = function (speed, path) {
    path.transition()
        .duration(100000 / speed)
        .attrTween("stroke-dasharray", function () {return tweenDash(this.getTotalLength(), speed);})
        .each("end", function(d,i) {
            d3.select(this).remove();
        });
};

var tweenDash = function (path_len, speed) {
    var car_len =  Math.pow(1.5, speed / 15.0) + 1;
    var interpolate = d3.interpolateString([0, 0                 , car_len, path_len - car_len].join(','),
                                           [0, path_len - car_len, car_len, 0                 ].join(','));
    return function(t) { return interpolate(t); };
};

var width = 800;
var height = 800
// http://stackoverflow.com/questions/14492284/center-a-map-in-d3-given-a-geojson-object
// Create a unit projection.
var projection = d3.geo.albers()
    .scale(1)
    .translate([0, 0]);

var path = d3.geo.path()
    .projection(projection);

var svg = d3.select("div#container").append("svg")
    .attr("width", width)
    .attr("height", height);

var car_queue = new Queue();

d3.json("speedy/boroughs.geojson", function(error, nyc) {
    if (error) return console.error(error);
    var b = path.bounds(nyc);
    var s = .95 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height);
    var t = [(width - s * (b[1][0] + b[0][0])) / 2, (height - s * (b[1][1] + b[0][1])) / 2];

    // Update the projection to use computed scale & translate.
    projection
        .scale(s)
        .translate(t);
    // title
    drawTitle()
    // boroughs
    svg.selectAll("path")
        .data(nyc.features)
        .enter()
        .append("path")
        .attr("d", path)
        .style("fill", "#262626");

    // legend
    drawLegendRects();

    // initial queue
    refillQueue();
    drawRoutes();

});

var drawTitle = function () {
    svg.append("text")
        .attr("x", 46)
        .attr("y", 62)
        .text("Live NYC Traffic")
        .attr("font-family", '"Myriad Pro", "Helvetica Neue", Helvetica, Arial')
        .attr("font-size", "42px")
        .attr("fill", "#262626")

    svg.append("text")
        .attr("x", 50)
        .attr("y", 80)
        .attr("font-family", '"Myriad Pro", "Helvetica Neue", Helvetica, Arial')
        .attr("font-size", "10px")
        .attr("fill", "#262626")
        .attr("id", "asof");

};

var drawLegendRects = function () {
    var initial_x = 50;
    var initial_y = 110;

    var rect_width = 150;
    var rect_height = 30;
    var buffer = 5;

    var speeds = [5, 10, 20, 40, 80];
    for (var i = 0; i < 5; ++i) {
        var x = initial_x;
        var y = initial_y + i * rect_height + i * buffer;
        svg.append("rect")
            .attr("x", x)
            .attr("y", y)
            .attr("width", rect_width)
            .attr("height", rect_height)
            .attr("fill", "#262626");

        svg.append("text")
            .attr("x", x + rect_width - buffer)
            .attr("y", y + rect_height / 2)
            .attr("font-family", '"Myriad Pro", "Helvetica Neue", Helvetica, Arial')
            .attr("font-size", "20px")
            .attr("fill", "white")
            .attr("text-anchor", "end")
            .attr("dominant-baseline", "central")
            .text(speeds[i] + " MPH");

        drawLegendPeriodically(x, y, rect_width, rect_height, speeds[i], 1000);
    }

};

var drawLegend = function (x, y, width, speed) {

    var points = [{"x": x, "y": y},
                  {"x": x + width, "y": y}]

    svg.append("path")
        .attr("class", "route")
        .attr("class", "legend")
        .attr("speed", speed)
        .attr("d", lineLinearFunction(points))
        .attr("stroke", function(d) {return randomColor(color_brewer);})
        .call(function (path) {return lineTransition(parseFloat(speed), path);})

};

var drawLegendPeriodically = function (x, y, width, height, speed, timeout) {
    drawLegend(x, y + Math.random() * height , width, speed);
    setTimeout(function () {drawLegendPeriodically(x, y, width, height, speed, timeout)}, timeout);
};

var lineLinearFunction = d3.svg.line()
    .x(function(d) { return d.x; })
    .y(function(d) { return d.y; })
    .interpolate("linear");


var lineFunction = d3.svg.line()
    .x(function(d) { return d.x; })
    .y(function(d) { return d.y; })
    .interpolate("basis");

var drawRoutes = function () {
    var timeout = 50;
    var car = car_queue.pop();
    if (car) {
        drawRoute(car);
    } else {
        refillQueue(function (cq) {drawRoute(cq.pop());});
    }
    setTimeout(drawRoutes, timeout);
};
// http://bl.ocks.org/mbostock/5577023
var color_brewer = ["#a6cee3","#1f78b4","#b2df8a","#33a02c",
                    "#fb9a99","#e31a1c","#fdbf6f","#ff7f00",
                    "#cab2d6","#6a3d9a","#ffff99","#b15928"];
var randomColor = function (arr) {
    return arr[Math.floor(Math.random() * (arr.length + 1))];
};

var drawRoute = function (row) {
    if (!row) debugger;
    var data = google.maps.geometry.encoding.decodePath(row.EncodedPolyLine);
    var bezier = [];
    for (var i = 1; i < data.length; ++i) {
        var proj = projection([data[i].lng(), data[i].lat()]);
        var x = proj[0] //+ jitter();
        var y = proj[1] //+ jitter();
        bezier.push({"x": x, "y": y})
    }
    if (row.Speed == 0) {
        return;
    }
    var speed = Math.max(row.Speed, 2);
    svg.append("path")
        .attr("class", "route")
        .attr("speed", speed)
        .attr("d", lineFunction(bezier))
        .attr("stroke", function(d) {return randomColor(color_brewer);})
        .call(function (path) {return lineTransition(parseFloat(speed), path);})
};

var refillQueue = function (callback) {
    d3.text("speedy/asof.txt", function (txt) {
        d3.select("#asof")
            .text("last updated on " + txt);
    })
    d3.csv("speedy/speeds.csv", function(csv) {
        shuffle(csv);
        csv.forEach(function (row) {
            car_queue.push(row);
        });
        if (callback) {
            callback(car_queue);
        }
    });
};
