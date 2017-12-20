/**
 * Matrix
 * @constructor
 * @param {string} selector - the selector that would return the parent element that contains the Matrix, for example "#some_svg"
 * @param {Object} graph - a graph object to be displayed as matrix: source nodes to be rows and target nodes to be columns
 * @param {Object} options - a set of options for display the matrix
 * @param {eventHandler} eventHandler
 *
 * The available options:
 * options = {rootPosition: top|bottom|left|right,
 *      width: 100px,
 *      height: 100px
 *      }
 */
function Matrix(_parentSelector, _graph, _options, _eventHandler) {
    var self = this;

    if (!_options.tooltipSelector)
        _options.tooltipSelector = "#tooltip";
    if (!_options.colorScale)
        _options.colorScale = 'auto';
    
    if (_options.colorScale == 'auto')
        self.zScale = d3.scaleLinear().range(["#deebf7", "#9ecae1", "#3182bd"]);
    else
        self.zScale = _options.colorScale;
    
    self.parentSelector = _parentSelector;
    self.graph = _graph;
    self.options = _options;
    self.eventHandler = _eventHandler;
    self.matrix = [];

    self.init();
}

Matrix.prototype.init = function () {
    this.draw(this.parentSelector, this.options.width, this.options.height);
};

Matrix.prototype.draw = function (selector, width, height) {
    var self = this;

    // margin is also used to provide space for row and column labeling.
    // If not specified, margin will be determined based on positioning
    // of the labels (rowName and colName).
    // However, user must be careful when specifying margin and label position
    // to ensure compatibility.
    var margin = {top: 10, right: 10, bottom: 10, left: 10};

    if (!self.options.margin) {
        if (self.options.rowName == 'left') {
            margin.left = 100
        }
        else {
            margin.right = 100
        }
        if (self.options.colName == 'top') {
            margin.top = 100;
            margin.right = 50
        }
        else {
            margin.bottom = 100;
            margin.left = 50
        }
    } else {
        margin = self.options.margin
    }

    var rowLabel = self.options['rowLabel'],
        colLabel = self.options['colLabel'];
    d3.select(selector).html("");

    //// The container for both cells and labels
    //var container = d3.select(selector).append("svg")
    //    .classed("Matrix", true)
    //    .attr("width", width + margin.left + margin.right)
    //    .attr("height", height + margin.top + margin.bottom);
    //// The svg to hold cells
    //var cellGroup =  d3.select(selector).append("g").attr("id", "cellGroup")
    //    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    //var svg = cellGroup.append("svg")
    //    .attr("width", width)
    //    .attr("height", height);
    //// The group to hold labels
    //var rowTextGroup = container.append("g").attr("id", "rowTextGroup")
    //    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    //var colTextGroup = container.append("svg").append("g").attr("id", "colTextGroup")
    //    .style("margin-left", "-20px")
    //    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var svg = d3.select(selector).append("svg")
        .classed("Matrix", true)
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("margin-left", 0 + "px");
    var cellGroup = svg.append("g").attr("id", "cellGroup")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    // The group to hold labels
    var rowTextGroup = svg.append("g").attr("id", "rowTextGroup")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    var colTextGroup = svg.append("g").attr("id", "colTextGroup")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


    //var zoom = d3.behavior.zoom()
    //    .scaleExtent([1, 10])
    //    .on("zoom", zoomed);
    //
    //cellGroup.call(zoom);
    //cellGroup.on("dblclick.zoom", null);
    //
    //svg.on("dblclick", resetZoom);
    //svg.on("click", stopped, true);
    //function stopped() {
    //    if (d3.event.defaultPrevented) d3.event.stopPropagation();
    //}

    var x = d3.scaleBand().range([0, width]),
        y = d3.scaleBand().range([0, height]),
        z = self.options.colorScale;

    self.xScale = x;
    self.yScale = y;

    var matrix = [],
        nodes = self.graph.nodes,
        n = nodes.length,
        sum_weights = [];

    // Populate the matrix with 0 entries
    nodes.forEach(function (node, i) {
        node.count = 0;
        matrix[i] = d3.range(n).map(function (j) {
            return {x: j, y: i, z: 0};
        });
        sum_weights[i] = 0;
    });

    if (self.options.colorScale == 'auto') {
        var extent =  d3.extent(self.graph.links.map(function (d) { return d.value; }));
        self.zScale.domain(extent);  
    } 
    //z.domain([0, 0.25 ])

    // Convert links to matrix; count character occurrences.
    self.graph.links.forEach(function (link) {
        //matrix[link.sourceRel][link.targetRel].z = link.value;
        //matrix[link.targetRel][link.sourceRel].z = link.value;
        matrix[link.source][link.target].z = link.value;
        matrix[link.target][link.source].z = link.value;
        sum_weights[link.source] = sum_weights[link.source] + link.value;
        sum_weights[link.target] = sum_weights[link.target] + link.value;
    });

    // Precompute the orders.
    if (self.options.orders != undefined) {
        x.domain(self.options.orders.column);
        y.domain(self.options.orders.row)
    } else {
        var orders = {
            name: d3.range(n).sort(function (a, b) {
                return d3.ascending(nodes[a].name, nodes[b].name);
            }),
            label: d3.range(n).sort(function (a, b) {
                return d3.ascending(nodes[a].label , nodes[b].label);
            })
            //weight: d3.range(n).sort(function(a, b) { return d3.ascending(sum_weights[b], sum_weights[a]); })
        };
        x.domain(orders.name);
        y.domain(orders.name);
    }

    var centered;
    var background = cellGroup.append("rect")
        .attr("class", "background")
        .attr("width", width)
        .attr("height", height);


    var row = cellGroup.selectAll(".row")
        .data(matrix)
        .enter().append("g")
        .attr("class", "row")
        .attr("transform", function (d, i) {
            return "translate(0," + y(i) + ")";
        })
        .each(createRow);

    //row.append("line")
    //    .attr("x2", width);

    rowTextGroup.selectAll("text")
        .data(matrix)
        .enter().append("text")
        .attr("transform", function (d, i) {
            return `translate(0, ${y.bandwidth() / 2 + y(i)})`;
        })
        .attr("x", (self.options.rowName == 'left') ? -5 : (width + 5))
        .attr("y", 0)
        .attr("dy", ".32em")
        .attr("text-anchor", (self.options.rowName == 'left') ? "end" : "start")
        .attr("class", "rowname")
        .text(function (d, i) {
            return nodes[i][rowLabel];
        })
        .on("mouseover", function () {
            d3.select(this).classed("active", true)
        })
        .on("mouseout", function () {
            d3.select(this).classed("active", false)
        })
        .on("click", function (d, i) {
            self.eventHandler.call("rowChanged",self,nodes[i][rowLabel]);
        });

    //var column = cellGroup.selectAll(".column")
    //    .data(matrix)
    //    .enter().append("g")
    //    .attr("class", "column")
    //    .attr("transform", function(d, i) { return "translate(" + x(i) + ")rotate(-90)"; });

    //column.append("line")
    //    .attr("x1", -width);

    colTextGroup.selectAll("text")
        .data(matrix)
        .enter().append("text")
        .attr("transform", function (d, i) {
            var ty = self.options.colName == 'top' ? 0 : height;
            return `translate(${x.bandwidth() / 2 + x(i)}, ${ty})
            rotate(-45)`;
        })
        .attr("x", 0)
        .attr("y", self.options.colName == 'top' ? -5 : 5)
        .attr("dy", ".32em")
        .attr("text-anchor", (self.options.colName == 'top') ? "start" : "end")
        .attr("class", "colname")
        .text(function (d, i) {
            return nodes[i][colLabel];
        });

    function createRow(row) {
        var cell = d3.select(this).selectAll(".cell")
            //.data(row.filter(function(d) { return d.z; }))
            .data(row.filter(function (d) {
                return d.z;
            }))
            .enter().append("rect")
            .attr("class", "cell")
            .attr("x", function (d) {
                return x(d.x);
            })
            .attr("y", 0)
            .attr("width", x.bandwidth())
            .attr("height", y.bandwidth())
            //                .style("fill", "orange")
            .style("fill", function (d) {
                return self.zScale(d.z);
            })
            .on("mouseover", row_mouseover)
            .on("mouseout", row_mouseout)
            .on("click", function(d) {
                var old = d3.select(this).classed("active");
                d3.selectAll(".Matrix .cell").classed("active", false);
                d3.select(this).classed("active", !old);
                self.eventHandler.call("cellSelected", self, d);
            })
    }


    function row_mouseover(p) {
        d3.select("#rowTextGroup").selectAll("text").classed("active", function (d, i) {
            return i == p.y;
        });
        d3.select("#colTextGroup").selectAll("text").classed("active", function (d, i) {
            return i == p.x;
        });

        // tooltip
        if (p.z) {
            d3.select(self.options.tooltipSelector)
                .style("visibility", "visible")
                .html((p.z).toFixed(3))
                .style("position", "absolute")
                .classed("tooltip", true)
                .style("top", function () {
                    return (d3.event.pageY - 20) + "px"
                })
                .style("left", function () {
                    return (d3.event.pageX - 20) + "px";
                })
        }
    }

    function row_mouseout(d) {
        d3.selectAll("text").classed("active", false);

        d3.select(this).style("fill", function (d) {
            return self.zScale(d.z);
        });
//            d3.select(this).style("fill", "orange");

        d3.select(self.options.tooltipSelector).style("visibility", "hidden")
    }

//     d3.select("#order").on("change", function() {
//                 clearTimeout(timeout);
//                 order(this.value);
//             });

};

Matrix.prototype.onReorder = function(orders, delayFactor, transitionTime) {
    var self = this;
    delayFactor = (delayFactor ? delayFactor : 1.5);
    transitionTime = transitionTime ? transitionTime : 1500;
    self.xScale.domain(self.matchNodes(orders, 'name', 'id'));
    self.yScale.domain(self.matchNodes(orders, 'name', 'id'));

    var t = d3.select(self.parentSelector).select("svg[class=Matrix]").transition().duration(transitionTime);

    t.selectAll(".Matrix .row")
        .delay(function(d, i) { return self.yScale(i) * delayFactor; })
        .attr("transform", function(d, i) { return "translate(0," + self.yScale(i) + ")"; })
        .selectAll(".cell")
        .delay(function(d) { return self.xScale(d.x) * delayFactor; })
        .attr("x", function(d) { return self.xScale(d.x); });

    t.selectAll(".Matrix .rowname")
        .delay(function(d, i) { return self.yScale(i) * delayFactor; })
        .attr("transform", function(d, i) {
            return `translate(0, ${self.yScale.bandwidth() / 2 + self.yScale(i)})`;
        });

    t.selectAll(".Matrix .column")
        .delay(function(d, i) { return self.xScale(i) * delayFactor; })
        .attr("transform", function(d, i) { return "translate(" + self.xScale(i) + ")rotate(-90)"; });

    t.selectAll(".Matrix .colname")
        .delay(function(d, i) { return self.xScale(i) * delayFactor; })
        //.attr("transform", function(d, i) {
        //    return `translate(0, ${self.yScale.bandwidth() / 2 + self.yScale(i)})`;
        //});
        .attr("transform", function(d, i) {
            var ty = self.options.colName == 'top' ? 0 : self.options.height;
            return `translate(${self.xScale.bandwidth() / 2 + self.xScale(i)}, ${ty}) rotate(-45)`;
        })
}

Matrix.prototype.matchNodes = function(inarray, infield, outfield) {
    var self = this;
    var result = inarray.map(function() {return -1});
    for (var i = 0; i < result.length; i++) {
            self.graph.nodes.forEach(function(d) {
                //(d[infield] == n) ? d[outfield] : undefined
                if (d[infield] == inarray[i]) {
                    result[i] = d[outfield];
                }
            })
    };
    return result;

}
