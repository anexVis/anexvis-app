/** This vis combine the dendrogram and matrix
 *
 */
Heatmap = function (_parentSelector, _graph, _tree, _options, _eventHandler) {
    var self = this;

    if (!_options) options = {}
    if (!_options.padding) _options.padding = 5;
    if (!_options.title) _options.title = "";

    self.parentSelector = _parentSelector;
    self.graph = _graph;
    self.tree = _tree;
    self.options = _options;
    self.eventHandler = _eventHandler;
    self.init();
}

Heatmap.prototype.init = function () {
    var self = this;
    $(window).resize(function () {
        clearTimeout(window.resizeFinished);
        window.resizeFinished = setTimeout(function () {
            self.draw(self.parentSelector, $(self.parentSelector).width(), $(self.parentSelector).height());
        }, 250);
    });
    self.draw(self.parentSelector, self.options.width, self.options.height);
};

/** Given the position of dendrograms (relative to matrix) to draw
 * this function will return the necessary information to arrange
 * these items. Each item is described with (x,y,className, options)
 */
Heatmap.prototype.calculateLayout = function (width, height, ratio, padding) {
    // Dendrograms top and left
    // Matrix square, mW = mH
    var self = this;
    var uW = width - 2 * padding,    // blank spaces between dendrogram-matrix and matrix-row(col)name
        uH = height - 2 * padding,
        matrixW = d3.min([uW, uH]) * ratio.matrix,    // dendroW = matrixW  = matrixH
        dendroH = d3.min([uW, uH]) * ratio.dendro,
        labelW = uW - dendroH - matrixW;
    var layout = {};
    layout['matrix'] = {
        'x': 0, 'y': 0, 'width': matrixW, 'height': matrixW,
        'margin': {
            top: dendroH + padding,
            left: dendroH + padding,
            right: labelW + padding,
            bottom: labelW + padding
        }
    };
    layout['rowDendro'] = {'x': 0, 'y': dendroH + padding, 'width': dendroH, 'height': matrixW};
    layout['colDendro'] = {'x': dendroH + padding, 'y': 0, 'width': matrixW, 'height': dendroH};
    return layout;
}

Heatmap.prototype.draw = function (selector, width, height) {
    var self = this;
    d3.select(selector).html("");
    var controlId = self.drawVisControl();

    var svg = d3.select(selector).append("svg")
        .classed("Heatmap", true)
        .attr("width", width)
        .attr("height", height);

    var ratio = (!self.options.ratio) ? {'matrix': 0.7, 'dendro': 0.12} : self.options.ratio;
    var layout = self.calculateLayout(width, height, ratio, self.options.padding);
    if (layout.rowDendro != undefined) {
        var gDendroRow = svg.append("g").attr('class', 'rowDendro')
            .attr("transform", `translate(${layout.rowDendro.x}, ${layout.rowDendro.y})`);
        var rowdendro = new Dendrogram("g.rowDendro", self.tree,
            {
                'width': layout.rowDendro.width,
                'height': layout.rowDendro.height,
                'showLeafLabel': false,
                'showNode': false,
                'rootPosition': 'left',
                'leafnamePadding': 0
            });
    }

    var gMatrix = svg.append("g").attr('class', "matrix")
        .attr("transform", `translate(${layout.matrix.x}, ${layout.matrix.y})`);
    self.matrix = new Matrix("g.matrix", self.graph,
        {
            'width': layout.matrix.width,
            'height': layout.matrix.height,
            'rowName': 'right',
            'colName': 'bottom',
            'margin': layout.matrix.margin,
            'colLabel': self.options.colLabel,
            'rowLabel': self.options.rowLabel,
            'tooltipSelector': self.options.tooltipSelector,
            'colorScale': self.options.colorScale
        },
        self.eventHandler);

    var barX = self.options.padding * 4;
    var barY = self.options.padding + layout.colDendro.height / 3 - 25;
    var cb = d3.colorbarH(self.matrix.zScale, layout.rowDendro.width - barX - self.options.padding, 30);
    svg.append("g").attr("class", "colorbar")
        .attr('transform', "translate(" + barX + "," + barY + ")")
        .call(cb);
    if (layout.colDendro != undefined) {
        var gDendroCol = svg.append("g").attr('class', 'colDendro')
            .attr("transform", `translate(${layout.colDendro.x}, ${layout.colDendro.y})`);
        var coldendro = new Dendrogram("g.colDendro", self.tree,
            {
                'width': layout.colDendro.width,
                'height': layout.colDendro.height,
                'showLeafLabel': false,
                'showNode': false,
                'rootPosition': 'top',
                'leafnamePadding': 0
            });
        self.matrix.onReorder(coldendro.getLeafOrder('name'));
    }
}

Heatmap.prototype.matchNodes = function (inarray, infield, outfield) {
    var self = this;
    return self.matrix.matchNodes(inarray, infield, outfield);
}

Heatmap.prototype.drawVisControl = function () {
    var self = this;
    var divId = "div" + Math.random().toString().substr(3, 10);
    var container = d3.select(self.parentSelector).append("div")
        .attr("class", "Heatmap control")
        .attr("id", divId);
    container.append("button").attr("id", divId + "-png");

    // TODO future enhancement
    // container.append("button").attr("id", divId + "-color");
    // container.append("button").text("Settings");

    $("#" + divId + "-png").button().button("option", "label", "Export PNG")
        .on("click", function () {
            var padding = 5;
            var svgNode = document.querySelector(self.parentSelector + " svg");
            var svgW = svgNode.scrollWidth,
                svgH = svgNode.scrollHeight;
            self.appendCSS(self.getCSSStyles(self.className), svgNode);
            self.appendCSS(self.getCSSStyles("Dendrogram"), svgNode);
            self.appendCSS(self.getCSSStyles("Matrix"), svgNode);
            var svgString = new XMLSerializer().serializeToString(svgNode);
            var w = window.open("", 'Exported image', "resizable");
            var canvas = document.createElement('canvas');
            var topPadding = padding +  ((self.options.title == "") ? 0 : 20);
            canvas.setAttribute("width", svgW + padding + topPadding );
            canvas.setAttribute("height", svgH + padding * 2);
            var ctx = canvas.getContext("2d");
            var blob = new Blob([svgString], {type: "image/svg+xml;charset=utf-8"});
            var url = URL.createObjectURL(blob);
            var img = new Image();
            img.onload = function () {
                if (self.options['title'] != "") {
                    ctx.font = "16px Arial";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "top";
                    ctx.fillText(self.options['title'], svgW / 2 + padding, 0);
                }
                ctx.drawImage(img, padding, topPadding, svgW, svgH);
                var png = canvas.toDataURL("image/png");
            };
            img.src = url;
            w.document.body.appendChild(canvas);
        });

    return divId;
};

Heatmap.prototype.getCSSStyles = function (selector) {
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

Heatmap.prototype.appendCSS = function (cssText, element) {
    var styleElement = document.createElement("style");
    styleElement.setAttribute("type", "text/css");
    styleElement.innerHTML = cssText;
    var refNode = element.hasChildNodes() ? element.children[0] : null;
    element.insertBefore(styleElement, refNode);
};
