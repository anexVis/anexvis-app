/**
 * Horizontal Barchart,
 * adapted from the example here http://bl.ocks.org/juan-cb/ab9a30d0e2ace0d2dc8c
 * @param {string} _parentSelector selection string for the parent element, for example "#container-1"
 * @param {Array} _data the array containing data entries, each in the form of {field1: value1, field2: value2, ...}
 * @param {object} _options the object describing options, for example
 *          {width: 800px, 
 *          height: 200px,
  *         commonDomain: false 
 *          }
 * @param {eventHandler} _eventHandler
 */
HBarChart = function (_parentSelector, _data, _options, _eventHandler) {
    var self = this;


    self.parentSelector = _parentSelector;
    self.data = _data;
    self.eventHandler = _eventHandler;

    // default options
    if (!_options.barPadding) {
        _options.barPadding = 5;
    }

    if (!_options.margin) {
        _options.margin = {top: 10, bottom: 30, left: 30, right: 10};
    }

    if (!_options.maxBarHeight) {
        _options.maxBarHeight = 20;
    }

    if (!_options.title) {
        _option.title = "";
    }

    self.options = _options;
    self.showingPercentage = false;
    self.className= "HBarChart";
    self.init();
};

/** -----------------------------
 *      HBC Drawing
 *  -----------------------------
 */

HBarChart.prototype.init = function () {
    var self = this;
    $(window).resize(function () {
        clearTimeout(window.resizeFinished);
        window.resizeFinished = setTimeout(function () {
            self.draw(self.parentSelector, $(self.parentSelector).width(), $(self.parentSelector).height());
        }, 250);
    });
    self.draw(self.parentSelector, self.options.width, self.options.height);
};


HBarChart.prototype.draw = function (selector, containerWidth, containerHeight) {
    var self = this;
    var parent = d3.select(selector).html("");

    var margin = self.options.margin;
    self.currentWidth = containerWidth - margin.left - margin.right;
    self.currentHeight = containerHeight - margin.top - margin.bottom;


    // var tooltip = d3.select("body").append("div").attr("class", "HBarChart tooltip");
    var barPadding = self.options.barPadding;
    var barHeight = (self.currentHeight - self.data.length * barPadding) / self.data.length;
    if (barHeight > self.options.maxBarHeight) {
        barHeight = self.options.maxBarHeight;
        self.currentHeight = (barHeight + barPadding) * self.data.length;
    }

    var labels = self.data.map(function (d) {
        return d['label']
    });
    var yScale = d3.scaleBand()
        .domain(labels)
        .range([0, self.currentHeight]);


    var max = d3.max(self.data, function (d) {
        return d.value;
    });
    var xScale = d3.scaleLinear()
        .range([0, self.currentWidth])
        .domain([0, max]);

    // The ExportImage button
    var btnImage = parent.append("div")
        .attr("class", self.className + " Button")
        .style("display", "none")
        .on("click", function () {
            var padding = 5;
            var svgNode = document.querySelector(selector+ " svg");
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
    btnImage.append("img")
        .attr("src", "assets/camera.png")
        .attr("width", "20px");

    parent.on("mouseover", function () {
        btnImage.style("display", "block");
    })
        .on("mouseout", function () {
            btnImage.style("display", "none");
        });
    // The title
    if (self.options.title) {
        parent.append("div")
            .attr("class", self.className +  " title")
            .html(self.options.title);
    }


    // The barchart
    var svg = parent.append("svg")
        .attr("width", containerWidth)
        .attr("height", containerHeight)
        .classed(self.className, true);

    var bar = svg.selectAll("g")
        .data(self.data)
        .enter()
        .append("g");

    bar.attr("class", "bar")
        .attr("transform", function (d, i) {
            return "translate(" + margin.left + "," + (i * (barHeight + barPadding) + barPadding) + ")";
        });

    // background bars
    bar.append("rect")
        .attr("class", "background")
        .attr("x", 0)
        .attr("y", 0)
        .attr("height", barHeight)
        .attr("width", function (d) {
            return xScale(d.value);
        });
    // foreground bars
    bar.append("rect")
        .attr("class", "foreground")
        .attr("x", 0)
        .attr("y", 0)
        .attr("height", barHeight)
        .attr("width", function (d) {
            return xScale(d.selected)
        });

    // y-axis
    svg.append("g")
        .attr("transform", "translate(" + margin.left + ",0)")
        .attr("class", "y axis")
        .call(d3.axisLeft(yScale))
        .selectAll(".tick text")
        .call(self.wrapText, margin.left);

    // x-axis
    var tickValues = (self.showingPercentage) ?
        self.getTickValues(0, 1., 5) :
        self.getTickValues(0, max, 5);
    svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + (self.currentHeight + margin.top) + ")")
        .attr("class", "x axis")
        .call(d3.axisBottom(xScale).tickValues(tickValues));
};

HBarChart.prototype.togglePercentage = function (self) {
    var duration = 500;
    var bgBar = d3.select(self.parentSelector).selectAll(".bar rect.background");
    var fgBar = d3.select(self.parentSelector).selectAll(".bar rect.foreground");
    var xScale = d3.scaleLinear()
        .range([0, self.currentWidth]);
    if (self.showingPercentage) {
        var max = d3.max(self.data, function (d) {
            return d.value;
        });
        xScale.domain([0, max]);
        d3.select(self.parentSelector + " .x.axis")
            .call(d3.axisBottom(xScale).tickValues(self.getTickValues(0, max, 5)));
        bgBar.data(self.data);
        fgBar.data(self.data);
    } else {
        xScale.domain([0, 1.0]);
        var percentSelected = self.calculatePercent(self.data);
        d3.select(self.parentSelector + " .x.axis")
            .call(d3.axisBottom(xScale).tickValues(self.getTickValues(0, 1, 5)));
        bgBar.data(percentSelected);
        fgBar.data(percentSelected);
    }

    bgBar.transition()
        .duration(duration)
        .attr('width', function (d) {
            return xScale(d.value)
        });

    fgBar.transition()
        .duration(duration)
        .attr("width", function (d) {
            return xScale(d.selected)
        });
    self.showingPercentage = !self.showingPercentage;

};

HBarChart.prototype.calculatePercent = function (rawData) {
    var percent = rawData.map(function (d) {
        return {
            label: d.label,
            selected: d.selected / d.value,
            value: 1.
        };
    });
    return percent;
};

HBarChart.prototype.updateSelection = function (newData) {
    var self = this;
    var duration = 500;
    var fgBar = d3.select(self.parentSelector).selectAll(".bar rect.foreground");
    var xScale = d3.scaleLinear()
        .range([0, self.currentWidth]);
    self.data = newData;
    if (self.showingPercentage) {
        xScale.domain([0, 1.]);
        var percentSelected = self.calculatePercent(newData);
        fgBar.data(percentSelected);
    } else {
        var max = d3.max(self.data, function (d) {
            return d.value;
        });
        xScale.domain([0, max]);
        fgBar.data(self.data);
    }

    fgBar.transition()
        .duration(duration)
        .attr("width", function (d) {
            return xScale(d.selected)
        });
};

HBarChart.prototype.wrapText = function (text, width) {
    text.each(function () {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1., // ems
            y = text.attr("y"),
            dy = parseFloat(text.attr("dy")),
            tspan = text.text(null).append("tspan").attr("x", -2).attr("y", y).attr("dy", dy + "em");
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("x", -2).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
            }
        }
    });
};

HBarChart.prototype.getTickValues = function (min, max, tickNumber) {
    var interval = (max - min) / (tickNumber - 1);
    var tickValues = new Array(tickNumber);
    for (i = 0; i < tickNumber; i++) {
        tickValues[i] = min + (interval * i);
    }
    return tickValues;
};

HBarChart.prototype.getCSSStyles = function (selector) {
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

HBarChart.prototype.appendCSS = function (cssText, element) {
    var styleElement = document.createElement("style");
    styleElement.setAttribute("type", "text/css");
    styleElement.innerHTML = cssText;
    var refNode = element.hasChildNodes() ? element.children[0] : null;
    element.insertBefore(styleElement, refNode);
};
