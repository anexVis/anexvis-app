/**
 * Created by tk on 1/7/16.
 * GenericMatrix class to visualize a given matrix with arbitrary dimension
 * m x n. This does not requires m = n as in AdjacencyMatrix.
 * Input network in json format must specify a 'nodeType' property for each node.
 * When initiating, user must specify which nodeType to be drawn on the rows,
 * and which to be drawn on the columns. This option will also dictates how
 * links are understood: source node is on the rows and target node is on the column.
 */
function GenericMatrix(_parentSelector, _graph, _options, _eventHandler) {
    var self = this;

    self.parentSelector = _parentSelector;
    self.graph = _graph;
    self.options = _options;
    self.eventHandler = _eventHandler;
    self.matrix = [];
    self.zscale = d3.scaleLinear();
    self.init();
}

GenericMatrix.prototype.init = function () {
    this.draw(this.parentSelector, this.options.width, this.options.height);
};

GenericMatrix.prototype.draw = function (selector, width, height) {
    var self = this;

    // margin is also used to provide space for row and column labeling.
    // If not specified, margin will be determined based on positioning
    // of the labels (rowName and colName).
    // However, user must be careful when specifying margin and label position
    // to ensure compatibility.
    var margin = {top: 10, right: 10, bottom: 10, left: 10};

    if ( !self.options.margin) {
        if (self.options.rowName == 'left') { margin.left = 100 }
        else {margin.right = 100}
        if (self.options.colName == 'top') {margin.top = 100; margin.right = 50}
        else {margin.bottom = 100; margin.left = 50}
    } else {
        margin = self.options.margin
    }

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
        .classed("GenericMatrix", true)
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("margin-left", 0+ "px");
    var cellGroup =  svg.append("g").attr("id", "cellGroup")
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
        y = d3.scaleBand().range([0, height]);
    self.xscale = x;
    self.yscale = y;

    var matrix = [],
        nodes = self.graph.nodes,
        n = nodes.length,
        sum_weights = [];

    // Populate the matrix with 0 entries
    var rowNodes = nodes.filter(function(d) {return (d.nodeType == self.options.rowType)});
    var colNodes = nodes.filter(function(d) {return (d.nodeType == self.options.colType)});
    rowNodes.forEach( function(rn, i) {
        matrix[i] = d3.range(colNodes.length).map(function(j) {return {x:j, y: i, z: 0}})
    });


    //self.zscale.domain([d3.min(self.graph.links.map(function(d) {return d.value})), d3.max(self.graph.links.map(function(d) {return d.value})) ])
    //    .range(["#deebf7", "#9ecae1", "#3182bd"]);
    var zmin = d3.min(self.graph.links.map(function(d) {return d.value}));
    var zmax = d3.max(self.graph.links.map(function(d) {return d.value}));
    if (zmin <0 & zmax >0) {
        self.zscale.domain([d3.min(self.graph.links.map(function(d) {return d.value})), 0, d3.max(self.graph.links.map(function(d) {return d.value})) ])
            .range(['#d7191c', '#ffffbf', '#2c7bb6']);

    } else {
        self.zscale.domain([d3.min(self.graph.links.map(function(d) {return d.value})), 0, d3.max(self.graph.links.map(function(d) {return d.value})) ])
            .range(['#deebf7','#9ecae1', '#3182bd']);
    }
    //z.domain([0, 0.25 ])

    // Convert links to matrix; count character occurrences.
    self.graph.links.forEach(function(link) {
        //matrix[link.sourceRel][link.targetRel].z = link.value;
        //matrix[link.targetRel][link.sourceRel].z = link.value;
        if (self.options.sourceNodeOnCol) {
            matrix[link.target][link.source].z = link.value;
        } else {
            matrix[link.source][link.target].z = link.value;
        }
        //matrix[link.target][link.source].z = link.value;
    });

    // Precompute the orders.
    if (self.options.orders != undefined) {
        x.domain(self.options.orders.column);
        y.domain(self.options.orders.row)
    } else {
        var orders = {
            row: d3.range(rowNodes.length).sort(function(a, b) { return d3.ascending(rowNodes[a].name, rowNodes[b].name); }),
            column: d3.range(colNodes.length).sort(function(a, b) { return d3.ascending(colNodes[a].name, colNodes[b].name); })
            //weight: d3.range(n).sort(function(a, b) { return d3.ascending(sum_weights[b], sum_weights[a]); })
        };
    }
    x.domain(orders.column);
    y.domain(orders.row);

    var centered;
    var background = cellGroup.append("rect")
        .attr("class", "background")
        .attr("width", width)
        .attr("height", height);


    var row = cellGroup.selectAll(".row")
        .data(matrix)
        .enter().append("g")
        .attr("class", "row")
        .attr("transform", function(d, i) { return "translate(0," + y(i) + ")"; })
        .each(createRow);

    //row.append("line")
    //    .attr("x2", width);

    rowTextGroup.selectAll("text")
        .data(matrix)
        .enter().append("text")
        .attr("transform", function(d, i) {
            return `translate(0, ${y.bandwidth() / 2 + y(i)})`;
        })
        .attr("x", (self.options.rowName == 'left') ? -5 : (width + 5) )
        .attr("y", 0)
        .attr("dy", ".32em")
        .attr("text-anchor", (self.options.rowName == 'left') ? "end" : "start")
        .attr("class", "rowname")
        .text(function(d, i) { return rowNodes[i].name; })
        .on("mouseover", function() {d3.select(this).classed("active", true)})
        .on("mouseout", function() {d3.select(this).classed("active", false)})
        .on("click", function(d,i) {
            self.eventHandler.call("rowChanged", self,rowNodes[i].name);
        });

    //var column = cellGroup.selectAll(".column")
    //    .data(matrix)
    //    .enter().append("g")
    //    .attr("class", "column")
    //    .attr("transform", function(d, i) { return "translate(" + x(i) + ")rotate(-90)"; });

    //column.append("line")
    //    .attr("x1", -width);

    colTextGroup.selectAll("text")
        .data(colNodes)
        .enter().append("text")
        .attr("transform", function(d, i) {
            var ty = self.options.colName == 'top' ? 0 : height;
            return `translate(${x.bandwidth() / 2 + x(i)}, ${ty}) rotate(-45)`;
        })
        .attr("x", 0)
        .attr("y", self.options.colName == 'top' ? -5 :  5)
        .attr("dy", ".32em")
        .attr("text-anchor", (self.options.colName == 'top') ? "start" : "end")
        .attr("class", "colname")
        .text(function(d, i) { return d.name })
        .on("mouseover", function() {d3.select(this).classed("active", true)})
        .on("mouseout", function() {d3.select(this).classed("active", false)})
        .on("click", function(d,i) {
            self.eventHandler.colChanged(colNodes[i].name);
        });

    function createRow(row) {
        var cell = d3.select(this).selectAll(".cell")
            .data(row.filter(function(d) { return d.z; }))
            .enter().append("rect")
            .attr("class", "cell")
            .attr("x", function(d) { return x(d.x); })
            .attr("y", 0)
            .attr("width", x.bandwidth())
            .attr("height", y.bandwidth())
//                .style("fill", "orange")
            .style("fill", function(d) { return self.zscale(d.z); })
            .on("mouseover", row_mouseover)
            .on("mouseout", row_mouseout);
    }


    function row_mouseover(p) {
        d3.select("#rowTextGroup").selectAll("text").classed("active", function(d, i) { return i == p.y; });
        d3.select("#colTextGroup").selectAll("text").classed("active", function(d, i) { return i == p.x; });

        //d3.select(this).style("fill", "f92515");
        // tooltip
        if (p.z) {
            d3.select("#tooltip")
                .style("top", function () { return (d3.event.pageY + 15)+"px"})
                .style("left", function () { return (d3.event.pageX - 15)+"px";})
                .style("visibility", "visible")
                .html(p.z);
        }
    }

    function row_mouseout(d) {
        d3.selectAll("text").classed("active", false);
        d3.select("#tooltip").style("visibility", "hidden")
    }

//     d3.select("#order").on("change", function() {
//                 clearTimeout(timeout);
//                 order(this.value);
//             });

    //function order(value) {
    //    x.domain(orders[value]);
    //
    //    var t = svg.transition().duration(2500);
    //
    //    t.selectAll(".row")
    //        .delay(function(d, i) { return x(i) * 4; })
    //        .attr("transform", function(d, i) { return "translate(0," + x(i) + ")"; })
    //        .selectAll(".cell")
    //        .delay(function(d) { return x(d.x) * 4; })
    //        .attr("x", function(d) { return x(d.x); });
    //
    //    t.selectAll(".column")
    //        .delay(function(d, i) { return x(i) * 4; })
    //        .attr("transform", function(d, i) { return "translate(" + x(i) + ")rotate(-90)"; });
    //}


};

GenericMatrix.prototype.setColorScale = function(domain, range) {
    var self = this;
    if ( domain != undefined) { self.zscale.domain(domain) }
    if ( range  != undefined) { self.zscale.range(range) }
}

GenericMatrix.prototype.onScaleChanged = function(newScale) {
    var self = this;
    self.zscale = newScale;
    self.draw(self.parentSelector, self.options.width, self.options.height);
}

GenericMatrix.prototype.onReorder = function(xOrdered, yOrdered, delayFactor, transitionTime) {
    var self = this;
    delayFactor = (delayFactor ? delayFactor : 1.5);
    transitionTime = transitionTime ? transitionTime : 1500;
    self.xscale.domain(self.matchNodes(self.options.colType, xOrdered, 'name', 'id'));
    self.yscale.domain(self.matchNodes(self.options.rowType, yOrdered, 'name', 'id'));

    var t = d3.select(self.parentSelector).select("svg[class=GenericMatrix]").transition().duration(transitionTime);

    t.selectAll(".GenericMatrix .row")
        .delay(function(d, i) { return self.yscale(i) * delayFactor; })
        .attr("transform", function(d, i) { return "translate(0," + self.yscale(i) + ")"; })
        .selectAll(".cell")
        .delay(function(d) { return self.xscale(d.x) * delayFactor; })
        .attr("x", function(d) { return self.xscale(d.x); });

    t.selectAll(".GenericMatrix .rowname")
        .delay(function(d, i) { return self.yscale(i) * delayFactor; })
        .attr("transform", function(d, i) {
            return `translate(0, ${self.yscale.bandwidth() / 2 + self.yscale(i)})`;
        });

    t.selectAll(".GenericMatrix .column")
        .delay(function(d, i) { return self.xscale(i) * delayFactor; })
        .attr("transform", function(d, i) { return "translate(" + self.xscale(i) + ")rotate(-90)"; });

    t.selectAll(".GenericMatrix .colname")
        .delay(function(d, i) { return self.xscale(i) * delayFactor; })
        //.attr("transform", function(d, i) {
        //    return `translate(0, ${self.yscale.bandwidth() / 2 + self.yscale(i)})`;
        //});
        .attr("transform", function(d, i) {
            var ty = self.options.colName == 'top' ? 0 : self.options.height;
            return `translate(${self.xscale.bandwidth() / 2 + self.xscale(i)}, ${ty}) rotate(-45)`;
        })
}

GenericMatrix.prototype.matchNodes = function( nodeType, inarray, infield) {
    var self = this;
    var targetArray = self.graph.nodes.filter(function(d) {return (d.nodeType == nodeType)})
        .map(function(d) { return d[infield]});
    //var result = inarray.map(function() {return -1});
    //for (var i = 0; i< result.length; i++) {
    //    targetArray.forEach(function(d) {
    //        if (d[infield] == inarray[i]) { result[i] = d[outfield]; }
    //    });
    //}
    result = inarray.map(function(d) { return targetArray.indexOf(d)  });
    return result;

}
