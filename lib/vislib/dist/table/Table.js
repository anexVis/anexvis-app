/**
 * A thin wrapper of DataTables jQuery plugin
 *
 * @param {string} _parentSelector string for selecting the parent element of this Table
 * @param {string} _myid string to use as `id` of this Table
 * @param {[Object]} _data the data for rows of the  table
 * @param {string} _primaryKey the name of the column to be used as the primary key (i.e. to identify a unique record in the table)
 * @param {Object} _options the DataTables options. Consult DataTable reference for the complete list. Some options will not be available such as `data`
 * @param {eventHandler} _eventHandler the output of d3.dispatch
 */
function Table(_parentSelector, _myid, _data, _primaryKey, _options, _eventHandler) {
    var self = this;
    self.parentSelector = _parentSelector;
    self.data = _data;
    self.primaryKey = _primaryKey;
    self.options = _options;
    self.eventHandler = _eventHandler;
    self.ctrlID = _myid;
    self.initVis();
}


Table.prototype.initVis = function () {
    var self = this;
    d3.select(self.parentSelector).html("");
    var tab = d3.select(self.parentSelector).append("table")
        .attr("class", "Table")
        .attr("id", self.ctrlID);
    var thead = tab.append("thead");
    var tbody = tab.append("tbody");

    var dtoptions = self.options;
    dtoptions.data = self.data;
    dtoptions.select = {item: 'row', style: 'os'};
    dtoptions.paging = false;


    var dtab = $("#" + self.ctrlID).DataTable(dtoptions);

    $('#' + self.ctrlID + ' tbody').on('click', 'tr', function (event) {
        var nrows = dtab.rows('.selected').data().length;
        var selectedRows = dtab.rows('.selected').data().splice(0, nrows);
        self.eventHandler.call("selectionChanged", self, selectedRows);
    });
};

/** Given an array of selectedIDs
 * this function allows user to select rows programatically
 *
 */
Table.prototype.onSelectionChange = function (selectedIDs) {
    var self = this;
    $("#" + self.ctrlID + " tbody>tr").each(function (i) {
        $(this).removeClass("selected");
        var d = self.data[i];
        var idx = selectedIDs.indexOf(d[self.primaryKey]);
        if (idx >= 0) $(this).addClass("selected");
    });
};

