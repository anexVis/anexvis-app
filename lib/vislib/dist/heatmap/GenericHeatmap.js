/** This vis combine the Dendrogram and GenericMatrix
 *
 */
GenericHeatmap = function(_parentSelector, _graph, _rtree, _ctree, _options, _eventHandler) {
    var self = this;
    self.parentSelector = _parentSelector;
    self.graph = _graph;
    self.rowtree = _rtree;
    self.coltree = _ctree;
    self.options =_options;
    self.eventHandler = _eventHandler;
    self.init();
}

GenericHeatmap.prototype.init = function() {
    var self = this;
    var layout = self.calculateLayout(self.options);
    self.draw(self.parentSelector, self.options.width, self.options.height);
}

/** Given the position of dendrograms (relative to matrix) to draw
 * this function will return the necessary information to arrange
 * these items. Each item is described with (x,y,className, options)
 */
GenericHeatmap.prototype.calculateLayout = function(ratio, padding) {
    // Dendrograms top and left
    // Matrix rectangle mW x mH
    var self = this;
    var uW = self.options.width - 2*padding,    // blank spaces between dendrogram-matrix and matrix-row(col)name
        uH = self.options.height - 2*padding,
        matrixW = uW * ratio.matrix,
        matrixH = uH * ratio.matrix,
        //rowdendroH = uW * ratio.dendro,    // Should calculate dendroH to agree with "maxDepth" of the dendrogram
        //coldendroH = uW * ratio.dendro,    //
        rowdendroH = d3.min([uW, uH]) * ratio.dendro,
        coldendroH = d3.min([uW, uH]) * ratio.dendro,
        rowlabelW = uW - rowdendroH - matrixW
        collabelW = uH - coldendroH - matrixH;
    var layout = {};
    layout['matrix']    = { 'x': 0,                 'y': 0, 'width': matrixW , 'height': matrixH ,
                            'margin': { top: coldendroH + padding,
                                        left: rowdendroH + padding,
                                        right: rowlabelW + padding,
                                        bottom: collabelW + padding}
                            } ;
    layout['rowDendro'] = { 'x': 0,                 'y': coldendroH + padding, 'width': rowdendroH, 'height': matrixH};
    layout['colDendro'] = { 'x': rowdendroH + padding, 'y': 0,       'width': matrixW, 'height': coldendroH};
    return layout;
}

GenericHeatmap.prototype.draw = function(selector, width, height) {
    var self = this;
    d3.select(selector).html("");
    var svg = d3.select(selector).append("svg")
        .classed("Heatmap", true)
        .attr("width",width)
        .attr("height", height);

    var padding = (!self.options.padding) ? 5 : (self.options.padding);
    var ratio = (!self.options.ratio) ? {'matrix': 0.7, 'dendro': 0.12} : self.options.ratio;
    var layout = self.calculateLayout(ratio,padding);

    var gMatrix = svg.append("g").attr('class', "matrix")
        .attr("transform", `translate(${layout.matrix.x}, ${layout.matrix.y})` );
    var matrix = new GenericMatrix("g.matrix", self.graph ,
        {'width' : layout.matrix.width,
            'height':  layout.matrix.height,
            'rowName': 'right',
            'colName': 'bottom',
            'margin': layout.matrix.margin,
            'rowType': self.options.rowType,
            'colType': self.options.colType
        },
        self.eventHandler);

    if (layout.rowDendro != undefined) {
        var gDendroRow = svg.append("g").attr('class', 'rowDendro')
            .attr("transform", `translate(${layout.rowDendro.x}, ${layout.rowDendro.y})`);
        var rowdendro = new Dendrogram("g.rowDendro", self.rowtree,
            {'width': layout.rowDendro.width,
                'height': layout.rowDendro.height,
                'showLeafLabel' : false,
                'showNode': false,
                'rootPosition': 'left',
                'leafnamePadding': 0
                //'separationFunc': function(a,b) {return (a.parent == b.parent)? 1: 2}   // also the default separation function of d3 cluster layout
            });
    }



    if (layout.colDendro != undefined) {
        var gDendroCol = svg.append("g").attr('class', 'colDendro')
            .attr("transform", `translate(${layout.colDendro.x}, ${layout.colDendro.y})`);

        var coldendro = new Dendrogram("g.colDendro", self.coltree,
            {'width': layout.colDendro.width,
                'height': layout.colDendro.height,
                'showLeafLabel' : false,
                'showNode': false,
                'rootPosition': 'top',
                'leafnamePadding': 0
            });
    }
    matrix.onReorder(coldendro.getLeafOrder('name'),rowdendro.getLeafOrder('name'));


}
