/**
 * Parallel coordinate vis of a given multidimensional data set,
 * adapted from the example here https://bl.ocks.org/jasondavies/1341281
 * @param {string} _parentSelector selection string for the parent element, for example "#container-1"
 * @param {array} _data the array containing data entries, each in the form of {field1: value1, field2: value2, ...}
 * @param {object} _options the object describing options, for example
 *          {width: 800px, 
 *          height: 200px,
  *         commonDomain: false 
 *          }
 * @param {eventHandler} _eventHandler
 */
ParallelCoord = function (_parentSelector, _data, _options, _eventHandler) {
    var self = this;


    self.parentSelector = _parentSelector;
    self.data = _data;
    self.eventHandler = _eventHandler;
    self.className = "ParallelCoord";

    // Setting default options
    if (!_options.nameField)
        _options.nameField = 'name';
    if (!_options.commonDomain)
        _options.commonDomain = false;
    if (!_options.rotateAxisLabel)
        _options.rotateAxisLabel = 'auto';
    if (!_options.strokeOpacity)
        _options.strokeOpacity = self.defaultOpacityFunction(_data.length);
    if (!_options.defaultScale)
        _options.defaultScale = 'log';
    if (!_options.axisOrder)
        _options.axisOrder = 'input';
    self.showingLog = (_options.defaultScale == "log");
    self.options = _options;
    self.init();
};

/** -----------------------------
 *      PCP Drawing
 *  -----------------------------
 */

ParallelCoord.prototype.init = function () {
    var self = this;
    self.selectedSample = [];
    self.dimensions = [];
    $(window).resize(function () {
        clearTimeout(window.resizeFinished);
        window.resizeFinished = setTimeout(function () {
            self.draw(self.parentSelector, $(self.parentSelector).width(), $(self.parentSelector).height());
        }, 250);
    });
    self.y = {};
    self.ylog = {};
    self.draw(self.parentSelector, self.options.width, self.options.height);
};


ParallelCoord.prototype.draw = function (selector, containerWidth, containerHeight) {
    var self = this;
    d3.select(selector).html("");

    var controlId = self.drawVisControl(self);
    var margin = {top: 20, right: 40, bottom: 10, left: 40},
        width = containerWidth - margin.left - margin.right,
        height = containerHeight - margin.top - margin.bottom - $("#" + controlId).height();

    var svg = d3.select(selector).append("svg")
        .attr("width", containerWidth)
        .attr("height", containerHeight - $("#" + controlId).height())
        .classed(self.className, true);

    // Extract the list of dimensions and create a scale for each.
    // x scale map the dimension name to the x-coordinate of the axis
    self.dimensions = d3.keys(self.data[0]).filter(function (d) {
        return d != self.options.nameField;
    });

    // TODO
    // axisOrder to be implemented here
    if (self.options.axisOrder) {
        if (Array.isArray(self.options.axisOrder)) {
            var order = self.options.axisOrder.map(function(i) {return self.dimensions.indexOf(i);});
            // sanity check
            if (order.some(function(i) { return (i < 0);})) {
                throw "Bad input axisOrder. Please make sure all the dimension names are correct.";
            } else {
                // var newDim  = order.map(function(j) {return self.dimensions[j];});
                self.dimensions = self.options.axisOrder;
            }
        } else {
            throw "Non-array axis order is not supported yet.";
        };
    };
 
    if (self.options.commonDomain) {
        var mapped = [];
        self.data.forEach(function (p) {
            self.dimensions.forEach(function (d) {
                // +a, or a*1.0 --> to cast string to numeric type
                p[d] = self.globalDataTransform(p[d]);
                mapped.push(+p[d]);
            });
        });
        var dataDomain = d3.extent(mapped);
        self.dimensions.forEach(function (d) {
            self.y[d] = d3.scaleLinear()
                .domain(dataDomain)
                .range([height, margin.top]);
            self.ylog[d] = d3.scaleLog()
                .domain([Math.max(dataDomain[0], 0.001), dataDomain[1]])
                .range([height, margin.top]);
        })
    } else {
        var mapped = [];
        self.dimensions.forEach(function (d) {
            var mapped = self.data.map(function (p) {
                p[d] = self.globalDataTransform(p[d]);
                return p[d];
            });
            self.y[d] = d3.scaleLinear()
                .domain(d3.extent(mapped))
                .range([height, margin.top]);
            self.ylog[d] = d3.scaleLog()
                .domain(d3.extent(mapped))
                .range([height, margin.top]);
        });
    }
    self.drawLines(svg);
};

ParallelCoord.prototype.drawLines = function (svg) {
    var self = this;

    var margin = {top: 20, right: 40, bottom: 10, left: 40},
        width = svg.attr("width") - margin.left - margin.right,
        height = svg.attr("height") - margin.top - margin.bottom;

    self.xScale = d3.scalePoint().range([0, width])
        .domain(self.dimensions);

    var grplot = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    var dragging = {};
    var line = d3.line(),
        axis = d3.axisLeft();

    // From here on the yscale should be consistent
    var yscale = self.showingLog ? self.ylog : self.y;

    // Add grey background lines for context.
    self.background = grplot.append("g")
        .attr("class", "background")
        .selectAll("path")
        .classed("inactive", true)
        .data(self.data)
        .enter().append("path")
        .attr("d", path)
        .style("stroke-opacity", self.options.strokeOpacity);

    // Add blue foreground lines for focus.
    self.foreground = grplot.append("g")
        .attr("class", "foreground")
        .selectAll("path")
        .data(self.data)
        .enter().append("path")
        .transition()
        .duration(200)
        .attr("d", path);
    self.foreground.style("stroke-opacity", self.options.strokeOpacity);
    // Add a group element for each dimension.


    var g = grplot.selectAll(".dimension")
        .data(self.dimensions)
        .enter().append("g")
        .attr("class", "dimension")
        .attr("transform", function (d) {
            return "translate(" + self.xScale(d) + ")";
        })
        .call(d3.drag()
            .subject(function (d) {
                return {x: self.xScale(d)};
            })
            .on("start", function (d) {
                dragging[d] = self.xScale(d);
                self.background.attr("visibility", "hidden");
            })
            .on("drag", function (d) {
                dragging[d] = Math.min(width, Math.max(0, d3.event.x));
                d3.select(self.parentSelector).selectAll(".foreground path").attr("d", function (d) {
                    return path(d);
                });
                self.dimensions.sort(function (a, b) {
                    return position(a) - position(b);
                });
                self.xScale.domain(self.dimensions);
                g.attr("transform", function (d) {
                    return "translate(" + position(d) + ")";
                })
            })
            .on("end", function (d) {
                delete dragging[d];
                transition(d3.select(this)).attr("transform", "translate(" + self.xScale(d) + ")");
                transition(d3.select(self.parentSelector).selectAll(".foreground path")).attr("d", path);
                self.background
                    .attr("d", path)
                    .transition()
                    .delay(500)
                    .duration(0)
                    .attr("visibility", null);
            }));


    // Add an axis and title.
    g.append("g")
        .attr("class", "axis")
        .each(function (d) {
            d3.select(this).call(axis.scale(yscale[d]))
        });

    /** Axis and brush for each one */
    g.append("g")
        .attr("class", "brush")
        .attr("id", function (d, i) {
            return "brush-" + d;
        })
        .each(function (d) {
            var y0 = yscale[d].range()[1] - 2;
            var y1 = yscale[d].range()[0] + 2;
            yscale[d].brush = d3.brush().extent([[-10, y0], [10, y1]]).on("start", self.brushstart).on("end", function () {
                self.brushend(self);
            });
            d3.select(this).call(yscale[d].brush);
        });

    /** Axis label */
    var rotationAngle = (self.options.rotateAxisLabel == 'auto') ?
        self.autoRotateAxisLabels($(self.parentSelector + " svg").width()) : self.options.rotateAxisLabel;
    g.append("text")
        .style("text-anchor", 'middle')
        .attr("y", margin.top - 9)
        .attr("transform", "rotate(" + rotationAngle + ")")
        .text(function (d) {
            return d;
        });


    function transition(g) {
        return g.transition().duration(500);
    }

    function position(d) {
        var v = dragging[d];
        return v == null ? self.xScale(d) : v;
    }

    /** Returns the path for a given data point. */
    function path(d) {
        return line(self.dimensions.map(function (p) {
            return [position(p), yscale[p](d[p])];
        }));
    }


};


ParallelCoord.prototype.reset = function (self) {
    self.adjustOpacity(self, self.data.length);
    self.dimensions.forEach(function (d, i) {
        var yscale = (self.showingLog) ? self.ylog : self.y;
        d3.select("#brush-" + d).call(yscale[d].brush.move, null);
    });
    self.eventHandler.call("selectionChanged", self, []);
};

ParallelCoord.prototype.onSelectionChange = function (selection) {
    var self = this;

    self.adjustOpacity(self, selection.length);
    d3.select(self.parentSelector).selectAll(".foreground path")
        .each(function (d) {
            var path = d3.select(this)
                .classed("inactive", true);
            selection.forEach(function (selected) {
                if (d[self.options.nameField] === selected) {
                    path.classed("inactive", false);
                }
            });
        });
    d3.select(self.parentSelector).selectAll(".background path")
        .each(function (d) {
            var path = d3.select(this)
                .classed("inactive", false);
            selection.forEach(function (selected) {
                if (d[self.options.nameField] === selected) {
                    path.classed("inactive", true);
                }
            });
        });
};


ParallelCoord.prototype.drawVisControl = function (self) {
    var divId = Math.random().toString().substr(3, 10);
    var container = d3.select(self.parentSelector).append("div")
        .attr("class", self.className + " control")
        .attr("id", divId);
    container.append("button").attr("id", divId + "-reset").text("Reset");
    container.append("button").attr("id", divId + "-scale").text("Linear scale");
    container.append("button").attr("id", divId + "-png");
    // container.append("button").text("Settings");

    $("#" + divId + "-png").button().button("option", "label", "Export PNG")
        .on("click", function () {
            var padding = 5;
            var svgNode = document.querySelector(self.parentSelector + " svg");
            var svgW = svgNode.scrollWidth,
                svgH = svgNode.scrollHeight;
            var cssStyleText = self.getCSSStyles("." + self.className);
            self.appendCSS(cssStyleText, svgNode);
            var svgString = new XMLSerializer().serializeToString(svgNode);
            var w = window.open("", 'Exported image', "resizable");
            var canvas = document.createElement('canvas');
            canvas.setAttribute("width", svgW + padding * 2);
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

    $("#" + divId + "-reset").button().on("click", function (e) {
        self.reset(self);
    });
    $("#" + divId + "-scale").button().on("click", function (e) {
        self.toggleScale(self);
        $(this).button("option", "label", self.showingLog ? "Linear scale" : "Log scale");
    });
    return divId;
};

ParallelCoord.prototype.toggleScale = function (self) {
    self.showingLog = !self.showingLog;


    var yScale = self.showingLog ? self.ylog : self.y;
    var prevScale = self.showingLog ? self.y : self.ylog;

    // Just reset so don't worry about moving brush
    // May consider moving brush later
    self.dimensions.forEach(function (d, i) {
        d3.select("#brush-" + d).call(prevScale[d].brush.move, null);
    });


    d3.select(self.parentSelector).selectAll(".dimension")
        .each(function (d) {
            d3.select(this).select(".axis").call(d3.axisLeft().scale(yScale[d]))
        });

    /** Axis and brush for each one */
    d3.select(self.parentSelector).selectAll(".dimension .brush")
        .each(function (d) {
            var y0 = yScale[d].range()[1] - 2;
            var y1 = yScale[d].range()[0] + 2;
            yScale[d].brush = d3.brush().extent([[-10, y0], [10, y1]])
                .on("start", self.brushstart)
                .on("end", function () {
                    self.brushend(self);
                });
            d3.select(this).call(yScale[d].brush);
        });


    d3.select(self.parentSelector).select("svg").selectAll(".background path,.foreground path")
        .transition()
        .duration(500)
        .attr("d", function (d) {
            return self.dataPath(d, self.dimensions, self.xScale, yScale);
        });
};

ParallelCoord.prototype.brushstart = function () {
    if (d3.event.sourceEvent)
        d3.event.sourceEvent.stopPropagation();
};

/** Handles a brush event, toggling the display of foreground lines. */
ParallelCoord.prototype.brushend = function (self) {
    var actives = [];
    var brushed = [];
    var yScale = self.showingLog ? self.ylog : self.y;
    self.dimensions.forEach(function (d) {
        if (d3.brushSelection(document.getElementById("brush-" + d))) {
            actives.push(d);
            brushed.push(d3.brushSelection(document.getElementById("brush-" + d)));
        }
    });

    var fgPaths = d3.select(self.parentSelector).selectAll(".foreground path")
        .classed("inactive", function (d) {
            // will be cast to boolean
            return !actives.every(function (p, i) {
                return (brushed[i][0][1] <= yScale[p](d[p]) && yScale[p](d[p]) <= brushed[i][1][1]);
            });
        });

    // if foreground is active, background is inactive
    var bgPaths = d3.select(self.parentSelector).selectAll(".background path")
        .classed("inactive", function (d) {
            // negate twice to cast to boolean
            return !!actives.every(function (p, i) {
                return (brushed[i][0][1] <= yScale[p](d[p]) && yScale[p](d[p]) <= brushed[i][1][1]);
            });
        });

    var selectedSamples = [];
    fgPaths.each(function (d) {
        if (!d3.select(this).classed("inactive")) {
            selectedSamples.push(d[self.options.nameField]);
        }
    });

    // Recalculate the opacity for optimal visibility
    self.adjustOpacity(self, selectedSamples.length);

    // Will not invoke the event if everything is active (nothing is brushed)
    if (selectedSamples.length < self.data.length) {
        self.eventHandler.call("selectionChanged", self, selectedSamples);
    } else {
        self.eventHandler.call("selectionChanged", self, []);
    }
};

ParallelCoord.prototype.dataPath = function (data, dimensions, xScale, yScale) {
    return d3.line()(dimensions.map(function (a) {
        return [xScale(a), yScale[a](data[a])];
    }));
};

ParallelCoord.prototype.adjustOpacity = function (self, nActive) {
    d3.select(self.parentSelector).selectAll(".foreground path").style("stroke-opacity", self.defaultOpacityFunction(nActive));
    d3.select(self.parentSelector).selectAll(".background path").style("stroke-opacity", self.defaultOpacityFunction(self.data.length - nActive));
};

ParallelCoord.prototype.globalDataTransform = function (x) {
    return (+x + 0.001);
};

/** -----------------------------
 *      Visual enhancement
 *  -----------------------------
 */

ParallelCoord.prototype.autoRotateAxisLabels = function (containerWidth) {
    var self = this;
    if (containerWidth / (self.dimensions.length + 1) < 75)
        return -45;
    return 0;
};

/** A negative sigmoid function to calculate line opacity,
 * given the number of lines to be display in the plot
 *
 * @param x number of data points (or lines, in case of PCP)
 * @returns {number}
 */
ParallelCoord.prototype.defaultOpacityFunction = function (x) {
    var minOpacity = 0.1;
    return 1 - 1 / (1 + Math.exp(-0.005 * (x - 150)) + minOpacity);
};


/** Return all the css rules containing the given selector
 *
 * @param selector
 * @returns {string}
 */
ParallelCoord.prototype.getCSSStyles = function (selector) {
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

ParallelCoord.prototype.appendCSS = function (cssText, element) {
    var styleElement = document.createElement("style");
    styleElement.setAttribute("type", "text/css");
    styleElement.innerHTML = cssText;
    var refNode = element.hasChildNodes() ? element.children[0] : null;
    element.insertBefore(styleElement, refNode);
};
