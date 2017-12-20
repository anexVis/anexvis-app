/**
 * Created by trang on 12/29/15.
 */
function Scatterplot(_parentSelector, _data, _options) {
    var self = this;

    self.parentSelector = _parentSelector;
    self.data = _data;
    self.className = 'Scatterplot';

    if (!_options)
        _options = {};
    if (!_options.width)
        _options.width = 300;
    if (!_options.height)
        _options.height = 300;
    if (!_options.radius)
        _options.radius = 3;
    if (!_options.margin)
        _options.margin = {top: 10, left: 40, right: 7, bottom: 40};
    if (!_options.colorControl)
        _options.colorControl = false;
    if (!_options.pointOpacity)
        _options.pointOpacity = self.defaultOpacityFunction(_data.data.length);
    if (!_options.logBase)
        _options.logBase = 2;
    if (!_options.defaultScale)
        self.showingLog = false;
    if (!_options.minLogDomain)
        _options.minLogDomain = 1e-3;
    if (!_options.tooltipSelector)
        _options.tooltipSelector = "#tooltip";

    if (!_options.defaultScale)
        _options.defaultScale = 'linear';
    self.showingLog = (_options.defaultScale == "log");

    self.options = _options;
    self.init();
}

Scatterplot.prototype.init = function () {
    var self = this;
    self.colorScheme = d3.scaleOrdinal(d3.schemeCategory20);
    self.dimensions = [];

    self.xLabel = '';
    self.yLabel = '';
    var dat = self.data.data;
    self.data.dimensions.forEach(function (dim) {
        if (dim.name == 'x') self.xLabel = dim.label;
        else if (dim.name == 'y') self.yLabel = dim.label;
        else self.dimensions.push(dim);
    });
    self.dimensions.push({name: 'none', label: 'None'});

    var getPaddedDomain = function (a) {
        var buffer = (d3.max(a) - d3.min(a)) * 0.02;
        return ([d3.min(a) - buffer, d3.max(a) + buffer])
    };

    self.linearXDomain = getPaddedDomain(dat.map(function (d) {
        return d['x']
    }));
    self.linearYDomain = getPaddedDomain(dat.map(function (d) {
        return d['y']
    }));


    self.xScale = d3.scaleLinear().domain(self.linearXDomain);
    self.yScale = d3.scaleLinear().domain(self.linearYDomain);
    if (self.showingLog) {
        self.xScale = self.convert2Log(self.xScale, self.options.logBase, 0.001);
        self.yScale = self.convert2Log(self.yScale, self.options.logBase, 0.001);

    }

    $(window).resize(function () {
        clearTimeout(window.resizeFinished);
        window.resizeFinished = setTimeout(function () {
            self.draw($(self.parentSelector).width(), $(self.parentSelector).height());
        }, 250);
    });
    self.draw(self.options.width, self.options.height);
};


Scatterplot.prototype.draw = function (containerWidth, containerHeight) {
    var self = this;
    var margin = self.options.margin;
    var minLogDomain = self.options.minLogDomain;

    // clean up space
    d3.select(self.parentSelector).html("");

    var dat = self.data.data;

    // // draw the color control if requested
    // var colorControlID;
    // if (self.options.colorControl) {
    //     colorControlID = self.drawColorControl(self);
    // }

    var controlId = self.drawVisControl();

    // draw the scatter plot
    var W = containerWidth - margin.left - margin.right;
    var H = containerHeight - margin.top - margin.bottom - $("#" + controlId).height();

    var svg = d3.select(self.parentSelector).append("svg")
        .attr("style", "width:" + containerWidth + ";height:" + (containerHeight - $("#" + controlId).height()) + ";")
        // .attr("width", containerWidth)
        // .attr("height", containerHeight)
        .attr("class", self.className);
    var gr = svg.append("g")
    //.call(zoom.on("zoom", onZoom))
        .attr("transform", "translate(" + margin.left + "," + (margin.top) + ")");
    var xScale = self.xScale.range([0, W]);
    var yScale = self.yScale.range([H, 0]);

    dat.forEach(function (d) {
        if (!d['tooltip']) {
            d['tooltip'] = self.xLabel + ": " + d['x'] + "<br/>" +
                self.yLabel + ": " + d['y']
        }
    });

    // add the tooltip area to the webpage
    var tooltip = d3.select("body").selectAll("div.Scatterplot.tooltip")
        .data([""])
        .enter()
        .append("div");
    tooltip.attr("class", "Scatterplot tooltip")
        .style("opacity", 0)
        .style("position", "absolute");
    
    
    var onMouseover = function (d, i) {
        tooltip.transition()
            .duration(250)
            .style("opacity", .9);
        //tooltip.html(x.xlabel + ": " + d[x.xlabel] + "<br/>" +
        //        x.ylabel + ": " + d[x.ylabel])
        tooltip.html(d.tooltip)
            .style("left", (d3.event.pageX - 20) + "px")
            .style("top", (d3.event.pageY - 20) + "px");
        d3.select(".point" + i).classed("active", true)
            .attr("r", self.options.radius + 2);
    };
    
    var onMouseout = function (d, i) {
        tooltip.transition()
            .duration(250)
            .style("opacity", 0);
        d3.select(".point" + i).classed("active", false)
            .attr("r", self.options.radius);
        // if (d3.select(".point" + i).classed("locked") == false) {
        //     d3.select(".point" + i).classed("active", false)
        //         .attr("r", self.options.radius);
        //
        // }
    };

    var points = gr.selectAll("circle")
        .data(dat);
    points.enter().append("circle")
        .attr("class", function (d, i) {
            return "point" + i
        })
        .classed("point", true)
        .attr("cx", function (d) {
            return self.logSafeScale(d['x'], xScale, minLogDomain, self.showingLog);
        })
        .attr("cy", function (d) {
            return self.logSafeScale(d['y'], yScale, minLogDomain, self.showingLog);
        })
        .attr("r", self.options.radius)
        .style("opacity", self.options.pointOpacity);

    // var voronoi = d3.voronoi()
    //     .x(function (d) {
    //         return self.logSafeScale(d['x'], xScale, minLogDomain, self.showingLog);
    //     })
    //     .y(function (d) {
    //         return self.logSafeScale(d['y'], yScale, minLogDomain, self.showingLog);
    //     })
    //     .extent([[0, 0], [W, H]]);
    //
    // var voronoi_diag = voronoi(dat);
    // gr.selectAll("path")
    //     .data(voronoi_diag.cells) //Use vononoi() with your dataset inside
    //     .enter().append("path")
    //     .attr("d", function (cell, i) {
    //         var poly = [];
    //         cell.halfedges.forEach(function(eid) {
    //             poly.push(voronoi_diag.edges[eid]);
    //         });
    //         return "M" + poly.join("L") + "Z";
    //     })
    //     .datum(function (d, i) {
    //         return d.site.data;
    //     })
    //     //Give each cell a unique class where the unique part corresponds to the circle classes
    //     .attr("class", function(d,i) { return "voronoi " + i; })
    //     // .style("stroke", "#2074A0") //If you want to look at the cells
    //     .style("fill-opacity", "0");
        //.style("stroke", "#000")
        //.style("pointer-events", "all")
        // .on("mouseover", onMouseover)
        // .on("mouseout", onMouseout);

    // x and y axis
    var xAxis = d3.axisBottom(xScale).tickValues(self.getTickValues(xScale.domain()[0], xScale.domain()[1], 5));
    var yAxis = d3.axisLeft(yScale).tickValues(self.getTickValues(yScale.domain()[0], yScale.domain()[1], 5));

    var xgroup = svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(" + margin.left + "," + (H + margin.top) + ")");
    var xLabel = xgroup.append("text")
        .attr("class", "label")
        .style("text-anchor", "middle")
        .text(self.xLabel)
        .attr("x", W / 2)
        .attr("y", margin.bottom - $(self.parentSelector + " .x.axis .label")[0].getBBox().height);
    xgroup.call(xAxis);


    var ytransformation = "translate(" + margin.left + "," + margin.top + ")";
    svg.append("g")
        .attr("class", "y axis")
        .attr("transform", ytransformation)
        .call(yAxis)
        .append("text")
        .attr("class", "label")
        .style("text-anchor", "middle")
        .attr("transform", " rotate(-90)")
        .text(self.yLabel)
        .attr("x", -(H / 2))  // coordinate in rotated axes
        .attr("y", -margin.left + $(self.parentSelector + " .y.axis .label")[0].getBBox().height);

    var legendData = self.recolorDataPoints(self);
    self.drawLegend(legendData);

};

Scatterplot.prototype.getTickValues = function (min, max, tickNumber) {
    var interval = (max - min) / (tickNumber - 1);
    var tickValues = new Array(tickNumber);
    for (var i = 0; i < tickNumber; i++) {
        tickValues[i] = min + (interval * i);
    }
    return tickValues;
};

Scatterplot.prototype.drawVisControl = function () {
    var self = this;
    var divId = "div" + Math.random().toString().substr(3, 10);
    var container = d3.select(self.parentSelector).append("div")
        .attr("class", "ParallelCoord control")
        .attr("id", divId);
    container.append("button").attr("id", divId + "-color");
    container.append("button").attr("id", divId + "-scale");
    container.append("button").attr("id", divId + "-png");

    // TODO future enhancement
    // container.append("button").text("Settings");

    $("#" + divId + "-png").button().button("option", "label", "Export PNG")
        .on("click", function () {
            var padding = 5;
            var svgNode = document.querySelector(self.parentSelector + " svg");
            var svgW= svgNode.scrollWidth,
                svgH = svgNode.scrollHeight;
            var cssStyleText = self.getCSSStyles("." + self.className);
            self.appendCSS(cssStyleText, svgNode);
            var svgString = new XMLSerializer().serializeToString(svgNode);
            var w = window.open("", 'Exported image', "resizable");
            var canvas = document.createElement('canvas');
            canvas.setAttribute("width", svgW+ padding * 2);
            canvas.setAttribute("height", svgH + padding * 2);
            var ctx = canvas.getContext("2d");
            var blob = new Blob([svgString], {type: "image/svg+xml;charset=utf-8"});
            var url = URL.createObjectURL(blob);
            var img = new Image();
            img.onload = function () {
                ctx.drawImage(img, padding, padding, svgW, svgH);
                var png = canvas.toDataURL("image/png");
            };
            img.src = url;
            w.document.body.appendChild(canvas);
        });
    // Specify control response
    $("#" + divId + "-color").button().button("option", "label", "Color by");
    self.drawDynamicMenu(self, divId + "-color", divId, divId + "-color-menu");

    $("#" + divId + "-scale").button()
        .button("option", "label", self.showingLog ? "Linear scale" : "Log scale")
        .on("click", function () {
            self.toggleScale(self);
            $(this).button("option", "label", self.showingLog ? "Linear scale" : "Log scale");
        });
    return divId;
};

Scatterplot.prototype.drawDynamicMenu = function (self, triggerButtonId, parentDivId, menuId) {
    var menuContainer = document.createElement("div");
    var triggerButton = $("#" + triggerButtonId);
    menuContainer.setAttribute('id', menuId);
    var anchor = triggerButton.position();
    menuContainer.style.position = "absolute";
    menuContainer.style.width = $("#" + parentDivId).width() + "px";
    menuContainer.style.top = anchor.top + triggerButton.height() + "px";
    menuContainer.style.left = anchor.left + "px";
    menuContainer.style.visibility = "hidden";
    var dynMenu = document.createElement("select");

    menuContainer.appendChild(dynMenu);
    document.getElementById(parentDivId).appendChild(menuContainer);
    $(dynMenu).selectize({
        maxItems: 1,
        openOnFocus: true,
        closeAfterSelect: false,
        labelField: 'label',
        valueField: 'name',
        options: self.dimensions,
        onChange: function (value) {
            self.colorDimensionChanged(self, value);
        },
        onBlur: function () {
            menuContainer.style.visibility = "hidden";
        }
    });
    triggerButton.on("click", function () {
        menuContainer.style.visibility = "visible";
    });
    $(dynMenu).on("mouseout", function () {
        this.style.visibility = "hidden";
    });
    return menuId;
};

Scatterplot.prototype.colorDimensionChanged = function (self, value) {
    self.colorDimension = value;
    var legendData = self.recolorDataPoints(self);
    self.drawLegend(legendData);
};

Scatterplot.prototype.recolorDataPoints = function (self) {
    var points = d3.select(self.parentSelector).selectAll("svg .point");
    var legendData = [];
    if (self.colorDimension == undefined || self.colorDimension == 'none') {
        points.style("fill", "#000");
    } else {
        points.style("fill", function (d) {
            var currVal = d[self.colorDimension];
            var added = false;
            legendData.forEach(function (d) {
                if (d.value == currVal) added = true;
            });
            var currCol = self.colorScheme(d[self.colorDimension]);
            if (!added) legendData.push({value: currVal, color: currCol});
            return currCol;
        });
    }
    return legendData;
};

Scatterplot.prototype.toggleScale = function (self) {
    self.showingLog = !self.showingLog;
    var minLogDomain = self.options.minLogDomain;
    var prevXScale = self.xScale;
    var prevYScale = self.yScale;
    var xScale, yScale, xAxis, yAxis;
    if (self.showingLog) {
        xScale = self.convert2Log(prevXScale, self.options.logBase, minLogDomain);
        yScale = self.convert2Log(prevYScale, self.options.logBase, minLogDomain);
        xAxis = d3.axisBottom(xScale);
        yAxis = d3.axisLeft(yScale);
    } else {
        xScale = self.convert2Linear(prevXScale, self.linearXDomain);
        yScale = self.convert2Linear(prevYScale, self.linearYDomain);
        xAxis = d3.axisBottom(xScale).tickValues(self.getTickValues(xScale.domain()[0], xScale.domain()[1], 5));
        yAxis = d3.axisLeft(yScale).tickValues(self.getTickValues(yScale.domain()[0], xScale.domain()[1], 5));
    }

    self.xScale = xScale;
    self.yScale = yScale;
    d3.select(self.parentSelector).select(".x.axis").call(xAxis);
    d3.select(self.parentSelector).select(".y.axis").call(yAxis);
    d3.select(self.parentSelector).selectAll("svg .point")
        .transition()
        .duration(200)
        .attr("cx", function (d) {
            return self.logSafeScale(d['x'], xScale, minLogDomain, self.showingLog);
        })
        .attr("cy", function (d) {
            return self.logSafeScale(d['y'], yScale, minLogDomain, self.showingLog);
        });

};

/** Conversion from linear to log scale
 *  This causes information loss: negative values are all set to minLogDomain
 *
 * @param oldScale
 * @param minLogDomain
 * @returns {*}
 */
Scatterplot.prototype.convert2Log = function (oldScale, logBase, minLogDomain) {
    var oldDomain = oldScale.domain();
    var newScale = d3.scaleLog()
        .domain([Math.max(oldDomain[0], minLogDomain), oldDomain[1]])
        .range(oldScale.range());
    return newScale;
};
// 

/** Conversion from log scale to linear
 * To avoid double the information loss,
 * an input of original domain should be given
 *
 * @param oldScale
 * @param linearDomain
 */
Scatterplot.prototype.convert2Linear = function (oldScale, linearDomain) {
    return d3.scaleLinear()
        .domain(linearDomain)
        .range(oldScale.range());
};

Scatterplot.prototype.defaultOpacityFunction = function (x) {
    var minOpacity = 0.3;
    return 1 - 1 / (1 + Math.exp(-0.001 * (x - 150)) + minOpacity);
};

Scatterplot.prototype.drawLegend = function (items) {
    var self = this;

    d3.select(self.parentSelector).select("svg").selectAll("g.legend").remove();
    if (items.length == 0) return;

    var paddingFromOutside = 10;
    var paddingFromInside = 3;
    var mySelector = self.parentSelector + " svg g.legend";
    var sep = $(self.parentSelector + " svg .y.axis text")[0].getBBox().height;
    var legendGr = d3.select(self.parentSelector).select("svg")
        .append("g")
        .attr("class", "legend draggable")
        .style("position", "absolute");

    var myBounding = legendGr.append("rect");

    legendGr.selectAll("circle")
        .data(items)
        .enter()
        .append("circle")
        .attr("cx", paddingFromInside * 2)
        .attr("cy", function (d, i) {
            return sep * (i + 1)
        })
        .attr("r", self.options.radius * 0.9)
        .style("fill", function (d) {
            return d.color;
        });
    legendGr.selectAll("text")
        .data(items)
        .enter()
        .append("text")
        .style("text-anchor", "start")
        .attr("dominant-baseline", "central")
        .attr("x", paddingFromInside * 2 + self.options.radius * 2)
        .attr("y", function (d, i) {
            return sep * (i + 1)
        })
        .text(function (d) {
            return d.value;
        })
        .style("font-size", "0.71em");
    var lbbox = legendGr._groups[0][0].getBBox();
    var xAxisElement = d3.select(self.parentSelector + " .x.axis")._groups[0][0];
    var xAxisCoord = self.revertTranslation(xAxisElement);
    var parentSvg = $(self.parentSelector + " svg");
    var moveX = parentSvg.width() - lbbox.width - paddingFromOutside;
    var moveY = xAxisCoord.y - paddingFromOutside - lbbox.height - paddingFromInside;
    legendGr.attr("transform", "translate(" + moveX + "," + moveY + ")");

    myBounding.attr("x", -paddingFromInside)
        .attr("y", -paddingFromInside)
        .attr("width", paddingFromInside * 2 + lbbox.width)
        .attr("height", paddingFromInside * 3 + lbbox.height)
        .style("stroke-width", 1)
        .style("stroke", "black")
        .style("fill-opacity", 0);

    var absX, absY;
    legendGr.call(d3.drag()
        .on("start", function () {
            var ctm = this.getCTM();
            moveX = ctm.e;
            moveY = ctm.f;
            absX = d3.event.x;
            absY = d3.event.y;
        })
        .on("drag", function () {
            d3.select(this).attr("transform", "translate(" + (moveX + d3.event.x - absX) + "," + (moveY + d3.event.y - absY) + ")");
        }));

    return legendGr;
};

Scatterplot.prototype.revertTranslation = function (element) {
    var bbox = element.getBBox();
    var matrix = element.getCTM();
    var oldX = bbox.x + matrix.e;
    var oldY = bbox.y + matrix.f;
    return {x: oldX, y: oldY};
};

Scatterplot.prototype.logSafeScale = function (x, scale, minLogDomain, showingLog) {
    return showingLog ?
        ((x >= minLogDomain) ? scale(x) : scale(minLogDomain)) :
        scale(x);
};

/** Return all the css rules containing the given selector
 *
 * @param selector
 * @returns {string}
 */
Scatterplot.prototype.getCSSStyles = function (selector) {
    // Extract CSS Rules
    var extractedCSSText = "";
    for (var i = 0; i < document.styleSheets.length; i++) {
        var s = document.styleSheets[i];
        try {
            if (!s.cssRules) continue;
        } catch (e) {
            if (e.name !== 'SecurityError') throw e; // for Firefox
            continue;
        }
        var cssRules = s.cssRules;
        for (var r = 0; r < cssRules.length; r++) {
            if (cssRules[r].selectorText && cssRules[r].selectorText.indexOf(selector) >= 0)
                extractedCSSText += cssRules[r].cssText;
        }
    }
    return extractedCSSText;
};

Scatterplot.prototype.appendCSS = function (cssText, element) {
    var styleElement = document.createElement("style");
    styleElement.setAttribute("type", "text/css");
    styleElement.innerHTML = cssText;
    var refNode = element.hasChildNodes() ? element.children[0] : null;
    element.insertBefore(styleElement, refNode);
};
