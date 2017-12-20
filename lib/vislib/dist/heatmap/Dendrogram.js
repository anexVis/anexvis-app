/**
 * Created by tk on 1/4/16.
 * Adapted from http://www.meccanismocomplesso.org/en/dendrogramma-d3-parte3/
 *
*/
function Dendrogram(_parentSelector, _json, _options) {
    var self = this;
    self.parentSelector = _parentSelector;
    self.json = _json;
    self.options = _options;
    if (self.options.separationFunc == undefined) { self.options.separationFunc = function() {return 1}}
    self.init();
}

Dendrogram.prototype.init = function() {
    this.draw(this.parentSelector, this.options['width'], this.options['height']);
}

Dendrogram.prototype.draw = function(selector, width, height) {
    var self = this;

    var svg = d3.select(selector).append("svg")
        .classed("Dendrogram", true)
        .attr("width",width)
        .attr("height",height)
        .append("g");

    //.attr("transform","translate(0,0)");
    var nodeHeights = [];
    function getHeightfromJSONTree(node){
        nodeHeights.push(node.height);
        if(typeof node.children != 'undefined'){
            for ( j in node.children){
                getHeightfromJSONTree(node.children[j]);
            }
        }
    }


    getHeightfromJSONTree(self.json);
    if (['left', 'right'].indexOf(self.options.rootPosition) >= 0) {
        tmp = width;
        width = height;
        height = tmp;
    }

    var tree = d3.cluster()
        .size([width, height]);

    var root = d3.hierarchy(self.json);
    tree(root);
   
    var nodes = root.descendants();
    var links = root.links();

    var heightMax = 0;
    var leaves = [];
    nodes.forEach( function(d,i){
        // d.data.height is provided from json data, 
        // d.height is auto-filled by d3, taking values from [0,1...]
        // Since we want the position of nodes to reflect their distance from root
        // we replace y-coordinate by the height
        d.y = d.data.height;        
        if (d.height == 0) {
            leaves.push(d)
        };
        if (heightMax < d.data.height) {heightMax = d.data.height}
    });
    // distribute the leaves evenly
    function compareX(a,b) { return a.x- b.x};
    self.Leaves = (leaves.sort(compareX));
    for (var i =0; i< leaves.length; i++) {
        self.Leaves[i].x = (i+0.5) * (width/leaves.length);
    };

    var hscale = self.getScale(0, heightMax, width, height, (self.options.leafnamePadding != undefined) ? self.options.leafnamePadding : 100 , self.options.rootPosition);
    var diagonal = function(d) {
        var source = self.nodeTransform(d.source, self.options.rootPosition, hscale);
        var target = self.nodeTransform(d.target, self.options.rootPosition, hscale);

        if ( ['left', 'right'].indexOf(self.options.rootPosition) >= 0) {
            var derived = ["M", source.x, source.y, "L", source.x, target.y, "L", target.x, target.y];
        } else {
            var derived = ["M", source.x, source.y, "L", target.x, source.y, "L", target.x, target.y];
        }
        return derived.join(" ");
        
    };
    var link = svg.selectAll(".Dendrogram .link")
        .data(links)
        .enter().append("path")
        .classed("link",true)
        .attr("d", diagonal);
    var node = svg.selectAll(".Dendrogram .node")
        .data(nodes)
        .enter().append("g")
        .attr("class","node")
        .classed("leaf", function(d) { return(d.height == 0) })
        .attr("transform", function(d) {
            var dd = self.nodeTransform(d, self.options.rootPosition, hscale);
            return "translate(" + dd.x + "," + dd.y + ")";
        });
    if (self.options['showNode'] == true) {
        node.append("circle")
            .attr("r", 4.5)
    }

    if (self.options['showNodeLabel'] == true) {
        svg.selectAll(".Dendrogram .node,:not(.leaf)").append("text")
            .attr("dx", function(d) { return d.children ? -8 : 8; })
            .attr("dy", 3)
            .style("text-anchor", function(d) { return d.children ? "end" : "start"; })
            .text( function(d){ return d.name;});
    }

    if (self.options['showLeafLabel'] == true) {
        var labels = svg.selectAll(".leaf").append("text")
            .text( function(d){ return d.data.name;});
        self.setLabelXY(labels, self.options.rootPosition);
    }

    //if (self.options['showScale'] == true) {
    //    var g = svg.append("g")
    //        .attr("transform","translate(100,40)");
    //    g.append("line")
    //        .attr("x1",x(ymin))
    //        .attr("y1",0)
    //        .attr("x2",x(ymax))
    //        .attr("y2",0);
    //    g.selectAll(".ticks")
    //        .data(x.ticks(5))
    //        .enter().append("line")
    //        .attr("class","ticks")
    //        .attr("x1", function(d) { return xinv(d); })
    //        .attr("y1", -5)
    //        .attr("x2", function(d) {return xinv(d); })
    //        .attr("y2", 5);
    //    g.selectAll(".label")
    //        .data(x.ticks(5))
    //        .enter().append("text")
    //        .attr("class","label")
    //        .text(String)
    //        .attr("x", function(d) {return xinv(d); })
    //        .attr("y", -5)
    //        .attr("text-anchor","middle");
    //}

}

Dendrogram.prototype.nodeTransform = function(d, rootPosition, hscale) {
    switch (rootPosition) {
        case 'left':
            return {x: hscale(d.y), y: d.x}
        case 'right':
            return {x: hscale(d.y), y: d.x}
        case 'bottom':
            return {x: d.x, y: hscale(d.y)}
        case 'top':
        default:
            return {x: d.x, y: hscale(d.y)}
    }
}

Dendrogram.prototype.getScale = function(hmin, hmax, width, height, padding, rootposition) {
    var hscale = d3.scaleLinear();
    // width and height are switched in the case of left/right dendrogram, such that 'height'
    // will always corresponding to the distance values given in the input json
    switch (rootposition) {
        case 'right':
        case 'bottom':
            hscale.domain([hmin, hmax]).range([padding, height-3]); // a bit blank space to completely contain the root
            break;
        case 'left':
        case 'top':
        default:
            hscale.domain([hmax, hmin]).range([3, height - padding]);
            break;
    }
    return hscale;
}

Dendrogram.prototype.setLabelXY = function(d3object, rootPosition) {
    switch (rootPosition) {
        case 'left':
            d3object.attr("x", 3)
                .attr("y", 5)
                .style("text-anchor", "start");
            break;
        case 'right':
            d3object.attr("x", -3)
                .attr('y',5)
                .style("text-anchor", "end");
            break;
        case 'bottom':
            d3object.attr("x", 8)
                .attr("y", -20)
                .attr("transform", "rotate(-45)")
                .style("text-anchor", "start");
            break;
        case 'top':
        default:
            d3object.attr("x", -8)
                .attr("y", 8)
                .attr("transform", "rotate(-45)")
                .style("text-anchor", "end");
    }
}

Dendrogram.prototype.getLeafOrder = function(field) {
    if ( !field) {
        return this.Leaves;
    } else {
        return this.Leaves.map(function (d) {return d.data[field] })
    }
}
