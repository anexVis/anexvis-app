/**
 * Created by tk on 12/30/15.
 * Requires jQuery 1.8 or later
 */

/** A leaflet of gene information
 *  
 * @param {string} _parentSelector
 * @param {string} _scheme options are: "entrez", "ncbi", "hgnc"/"hugo"/"genenames"
 * @param {string} _query
 * @constructor
 */
function GeneCard(_parentSelector, _scheme, _query, _draw) {
    var self = this;
    self.parentselector = _parentSelector;
    self.requestPromise = $.Deferred();
    //self.requestUrl = _requestUrl;
    //self.args = _args;
    
    switch (_scheme.toLowerCase()) {
        case "ensembl":
            self.requestURL = makeRequest(_scheme, _query, 'id');
            var args = {url: self.requestURL, dataType: 'json'};
            $.when( $.ajax(args) ).done(function(d, status, jqxhr) {
                self.data = d;
                self.requestPromise.resolve(self.data);
                if (_draw)
                    self.initEnsembl();
            });
            break;
        case "entrez":
        case 'ncbi':
            self.requestURL = makeRequest(_scheme, _query, 'id');
            var args = {url: self.requestURL, dataType: 'json'};
            $.when( $.ajax(args) ).done(function(d, status, jqxhr) {
                self.data = d;
                self.requestPromise.resolve(self.data);
                if (_draw)
                    self.initEntrez();
            });
            break;
        case "hgnc":
        case 'hugo':
        case 'genenames':
        default:
            self.requestURL = makeRequest(_scheme, _query, 'symbol');
            var args = {url: self.requestURL, dataType: 'json'};
            $.when( $.ajax(args) ).done(function(d, status, jqxhr) {
                self.data = (d.response.docs[0]);
                self.requestPromise.resolve(self.data);
                if (_draw)
                    self.initHGNC();
            });

    }
}

GeneCard.prototype.initHGNC = function() {
    var self = this;
    var formatted_data = dataobject2array(self.data, ['name', 'alias_name', 'alias_symbol', 'location', 'locus_type', 'ensembl_gene_id', 'entrez_id']);
    d3.select(self.parentselector).html("");
    var tab = d3.select(self.parentselector).append("table")
        .attr("class", "GeneCard");
    //var thead = tab.append("thead");
    var tbody = tab.append("tbody");

    var rows = tbody.selectAll("tr")
        .data(formatted_data)
        .enter()
        .append("tr");

    rows.each(function(rowData,i) {
        rowData[0] = self.prettyFieldName(rowData[0]);
        var cell = d3.select(this).selectAll("td")
            .data(rowData)
            .enter()
            .append("td")
            .text(function(d) {return d})
            .classed("fieldname", function(d,i) {return (i==0)?true:false});
    });
    
};

GeneCard.prototype.initEnsembl = function () {
    var self = this;
    var formatted_data = dataobject2array(self.data, ['id', 'display_name', 'description', 'biotype', 'species']);
};

GeneCard.prototype.initEntrez = function() {
    var self = this;
    var formatted_data = dataobject2array(self.data, ['name', 'id']);
};


/** Utility function to convert a field name into human friendly format
 * e.g alias_name becomes Alias name
 */
GeneCard.prototype.prettyFieldName = function(fieldname) {
    return fieldname[0].toUpperCase()  + fieldname.slice(1).replace(new RegExp("_", 'g')," ")
}

