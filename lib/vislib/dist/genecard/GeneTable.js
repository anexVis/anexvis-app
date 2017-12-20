/** Construct a table to display gene information, with each gene in a column
 * 
 * @param _parentSelector
 * @param _data {Array} Example: [ {name: 'ACTB', alias: 'ACTNB', locus: '12p2.1', ...},
 * {name: 'geneX', alias: 'xgene', locus: 'somewhereinthegenome',...},
 * ... ]
 * @param _options
 * @constructor
 */
function GeneTable (_parentSelector, _data, _options) {
    var self = this;
    self.parentSelector = _parentSelector;
    self.data = _data;

    if (!_options) _options = {};
    if (!_options.displayFields) {
        _options.displayFields = ['name', 'alias_name', 'alias_symbol', 'location', 'locus_type', 'ensembl_gene_id', 'entrez_id', 'refseq_accession', 'uniprot_ids'];
    }

    if (!_options.titleField) {
        _options.titleField = 'symbol';
    }
    self.options = _options;
   
    self.draw();
}

// GeneTable.prototype.init = function() {
    // var self = this;
    // self.draw(self.options.width, self.options.height);
    //  $(window).resize(function() {
    //     clearTimeout(window.resizeFinished);
    //     window.resizeFinished = setTimeout(function() {
    //         self.draw($(self.parentSelector).width(), $(self.parentSelector).height());
    //     }, 250);
    // });
// }

GeneTable.prototype.draw = function() {
    var self = this;
    d3.select(self.parentSelector).html("");

    var tab = d3.select(self.parentSelector).append("table")
        .attr("class", "GeneTable");
    headers = [""];
    self.data.forEach(function(d) { headers.push(d[self.options.titleField]); });
    tab.append("thead").selectAll("td")
        .data(headers)
        .enter()
        .append("td")
        .text(function(d) {return d});
    var tbody = tab.append("tbody");

    var fields = self.options.displayFields; 
    
    var rows = tbody.selectAll("tr")
        .data(fields)
        .enter()
        .append("tr");
    
    rows.each(function(rname) {
        var prettyFieldName= GeneCard.prototype.prettyFieldName(rname);
        d3.select(this).append("td")
            .classed("fieldname", true)
            .text(prettyFieldName);
        for (var i=0;i<self.data.length;i++) {
           var cell = d3.select(this).append("td")
               .text(self.data[i][rname]);
        }
    });
};

