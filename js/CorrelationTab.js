/**
 * Created by trang on 12/19/16.
 */

function CorrelationTab() {
    var self = this;
    self.ui = {
        genesInput: 'corr-genesInput',
        copyGeneButton: 'corr-copyGenes',
        geneDropDown: 'corr-genesDropDown',
        geneSingle: 'corr-geneSingle',
        geneSet: 'corr-geneSet',

        groupsInputs: [
            {
                radioName: 'corr-grouping-option',
                radioId: 'corr-grouping-option-1',
                fieldName: 'SMTS',
                container: 'corr-container-option-1',
                searchbox: 'corr-searchbox-option-1'
            },
            {
                radioName: 'corr-grouping-option',
                radioId: 'corr-grouping-option-2',
                fieldName: 'SMTSD',
                container: 'corr-container-option-2',
                searchbox: 'corr-searchbox-option-2'
            }
        ],

        tooltip: 'corr-tooltip',

        scatterPlot: 'corr-scatterPlot',
        infoTable: 'corr-infoTable',
        genecard: 'corr-genecard',
        mainPanel: 'corr-mainPanel',
        calculate: 'corr-calculate',
        status: 'corr-status'
    };
    self.geneSelectorHandler = d3.dispatch("selectionChanged");
    self.geneSetSelectorHandler = d3.dispatch("selectionChanged");
    self.groupSelectorHandler = d3.dispatch("selectionChanged");
    self.matrixEventHandler = d3.dispatch("cellSelected");
    self.selectedGenes = ["ENSG00000176022", "ENSG00000027847", "ENSG00000103489", "ENSG00000015532", "ENSG00000158008", "ENSG00000162694", "ENSG00000012232"];
    self.selectedGeneSets = [];
    self.selectedPair = ["ENSG00000176022", "ENSG00000027847"];
    self.selectedGroups = {'SMTS': ['Brain'], 'SMTSD': ['Brain - Cerebellum', 'Brain - Hippocampus']};
    self.heatmapPromise = $.Deferred();
    self.scatterPromise = $.Deferred();
    self.scatterData = {'xlabel': 'B3GALT6', 'ylabel': 'B4GALT7', 'data': [{x: 0.1, y: 0.2}, {x: 0.3, y: 1.2}]};
    self.sampleMetaFields = ['SMTS', 'SMTSD', 'GENDER', 'RACE', 'ONTOTERM'];
    self.sampleMetaFieldMap = global.sampleMetaFieldMap;
    self.heatmapView = undefined;
    self.grouping2fieldname = {
        'corr-grouping-tissue': 'SMTS',
        'corr-grouping-bodysite': 'SMTSD'
    };
    self.initView();
}
// populate the control widget
// attach the data retrieval function
// and event upon receiving data

// generate plotting widgets
// coordinate the interaction between them


/** --------------------------
 *  SECTION: Scatterplot
 *  --------------------------
 */
CorrelationTab.prototype.requestScatterData = function (self) {
    // reset the promise
    self.scatterPromise = $.Deferred();

    // make function call and retrieve data 
    var sel = $("input[name='" + self.ui.groupsInputs[0].radioName + "']:checked").val();
    var fun = "getScatterData";
    var args = {
        "x": self.selectedPair[0],
        "y": self.selectedPair[1],
        "sampleGroups": self.selectedGroups[sel],
        "sampleGrouping": sel,
        "sampleMetaFields": self.sampleMetaFields,
        "db": "gtex",
        "processing": global.selectedDataset.processing,
        "unit": global.selectedDataset.unit
    };

    return ocpuCall(fun, args, self, 'scatterPromise');

};

CorrelationTab.prototype.showScatterPlot = function (self, data) {
    var output = JSON.parse(data[0]);
    var isSingleVar = (output['data'][0]['y'] == undefined) ? true : false;
    if (isSingleVar) {
        output.data = cloneDataPoint(output['data'], 'x', 'y');
        var xDim = output.dimensions.filter(function (d) {
            return (d.name == 'x')
        })[0];
        var yDim = JSON.parse(JSON.stringify(xDim));
        yDim.name = 'y';
        output.dimensions.push(yDim);
    }

    output.dimensions.forEach(function(d) {
        if (d.name != 'x' && d.name != 'y')
            d.label = self.sampleMetaFieldMap[d.name]; 
    });
    // var dat = {
    //     'data': (isSingleVar) ? cloneDataPoint(output['data']) : output['data']
    // };
    var dim = $("#" + self.ui.scatterPlot).width();
    new Scatterplot("#" + self.ui.scatterPlot,
        output,
        {
            width: dim,
            height: dim + 50,
            margin: {top: 8, left: 40, bottom: 55, right: 8},
            radius: 5,
            colorControl: true,
            defaultScale: 'log',
            tooltipSelector: self.ui.tooltip
        });
};


/** --------------------------
 *  SECTION: Info table
 *  --------------------------
 */
CorrelationTab.prototype.showInfoTable = function (queries) {
    var self = this;
    var outstr = "";
    var i = 0;
    var gcards = [];
    for (i = 0; i < queries.length; i++) {
        // gcards[i] = new GeneCard("#doesntMatter", 'hgnc', queries[i], false);
        gcards[i] = new GeneCard("#doesntMatter", 'ensembl', queries[i], false);
    }
    $.when(gcards[0].requestPromise, gcards[1].requestPromise).done(function (d1, d2) {
        new GeneTable("#" + self.ui.infoTable,
            [d1, d2],
            { displayFields: ["id", "description", "biotype"],
              titleField: "display_name"
            }
        );
    })
};

CorrelationTab.prototype.onCellSelected = function (self, d) {
    self.selectedPair = self.heatmapView.matchNodes([d.x, d.y], 'id', 'name');
    // signal for the wait 
    $("#" + self.ui.scatterPlot).html('<img src="assets/loading_circle.gif" style="width:120px;height:120px;display:block;margin: 0 auto;">');

    // request
    self.requestScatterData(self);

    // visualize
    $.when(self.scatterPromise).done(function (data) {
        self.showScatterPlot(self, data)
    });
    self.showInfoTable(self.heatmapView.matchNodes([d.x, d.y], 'id', 'name'));
};


/** --------------------------
 *  SECTION: Gene input
 *  --------------------------
 */

CorrelationTab.prototype.createGeneInput = function () {
    var self = this;
    // initialize default choice
    d3.select("#" + self.ui.genesInput).html("");
    self.createGeneSearchBox(self.ui.genesInput,
        self.ui.geneSingle,
        global.geneList,
        self.geneSelectorHandler,
        self.selectedGenes);

    self.createGeneDropDown(self.ui.geneDropDown,
        self.ui.geneSet,
        global.geneSets,
        self.geneSetSelectorHandler,
        self.selectedGeneSet);

};


CorrelationTab.prototype.createGeneSearchBox = function (parentId, controlId, geneList, eventHandler, selectedGenes) {
    var self = this;
    self.searchBox = new SearchBox(document.getElementById(parentId), controlId, geneList,
        {"valueField": 'EnsemblID', 'labelField': 'HGNC', 'searchField': 'HGNC'},
        eventHandler);
    if (selectedGenes != undefined && selectedGenes.length > 0) {
        self.searchBox.setValue(selectedGenes, true);
    }
};

CorrelationTab.prototype.createGeneDropDown = function (parentId, controlId, geneSets, eventHandler, selectedSets) {
    // d3.select("#" + self.ui.genesInput).html("a dropdown comes here");
    var smenu = new SelectMenu(document.getElementById(parentId),
        controlId,
        geneSets,
        {"valueField": 'value', 'labelField': 'name', 'searchField': 'name'},
        eventHandler);
    // select the selectedSet 
    return smenu;
};

/** --------------------------
 *  SECTION: Sample input
 *  --------------------------
 */


CorrelationTab.prototype.createSampleInput = function () {
    var self = this;

    var radioName = "";
    self.ui.groupsInputs.forEach(function (grouping) {
        radioName = grouping.radioName;
        self.createGroupingSearchbox(grouping.container,
            grouping.searchbox,
            grouping.fieldName,
            global.groupList[grouping.fieldName],
            self.selectedGroups[grouping.fieldName],
            self.groupSelectorHandler);
    });

    // then toggle with the radio
    $("[name=" + radioName + "]").on("change", function (e) {
        self.toggleGroupingInput(self, e)
    }).trigger("change");
};

CorrelationTab.prototype.toggleGroupingInput = function (self, e) {
    self.ui.groupsInputs.forEach(function (grouping) {
        if (grouping.radioId == e.target.id) {
            // doesn't work with selectize
            // document.getElementById(grouping.container).removeAttribute('disabled');
            $('#' + grouping.searchbox)[0].selectize.enable();
        } else {
            $('#' + grouping.searchbox)[0].selectize.disable();
        }
    });
};

CorrelationTab.prototype.createGroupingSearchbox = function (parentId, controlId, grouping, data, selectedGroups, eventHandler) {
    var sbox = new SearchBox(document.getElementById(parentId),
        controlId,
        data,
        {
            'valueField': grouping,
            'labelField': grouping,
            'searchField': grouping
        },
        eventHandler);
    if (selectedGroups != undefined && selectedGroups.length > 0) {
        sbox.setValue(selectedGroups, true);
    }
    return sbox;
};

/** --------------------------
 *  SECTION: Heatmap
 *  --------------------------
 */
CorrelationTab.prototype.requestHeatMap = function (self, event) {

    // reset the promise to hold new data
    self.heatmapPromise = $.Deferred();

    // make function call
    var sel = $("input[name='" + self.ui.groupsInputs[0].radioName + "']:checked").val();
    var fun = "coexpression.heatmap";
    var args = {
        "genes": self.selectedGenes,
        "sampleGroups": self.selectedGroups[sel],
        "sampleGrouping": sel,
        "db": "gtex",
        "processing": global.selectedDataset.processing,
        "unit": global.selectedDataset.unit,
        "method": "pearson"
    };

    return ocpuCall(fun, args, self, 'heatmapPromise');
};

CorrelationTab.prototype.showHeatMap = function (self, data) {
    var title = '';
    var matrixData = JSON.parse(data[0]);
    var dendroData = JSON.parse(data[1]);
    var metaData = JSON.parse(data[2]);
    if (metaData && metaData['sampleGroups'])
        if (typeof(metaData['sampleGroups']) == "string") title = metaData['sampleGroups'];
        else
            title = metaData['sampleGroups'].join(', ');
    var initDim = $("#" + self.ui.mainPanel).width();
    var myScale = d3.scaleSequential(d3.interpolateRdBu).domain([-1,1]);
    self.heatmapView = new Heatmap("#" + self.ui.mainPanel, matrixData, dendroData, {
            'width': initDim,
            'height': initDim,
            'rowLabel': 'label',
            'colLabel': 'label',
            'tooltipSelector': "#" + self.ui.tooltip,
            'colorScale': myScale,
            'title':  title
        },
        self.matrixEventHandler);
};

CorrelationTab.prototype.initView = function () {
    var self = this;

    $.when.apply(this, Object.values(global.groupListPromise)).done(function (a1, a2) {
        self.createSampleInput('SMTSD');
    });

    $.when(global.geneListPromise, global.geneSetPromise).done(function (a1, a2) {
        self.createGeneInput();

        self.geneSelectorHandler.on("selectionChanged", function (selection) {
            self.selectedGenes = selection;
            self.updateStatus(self);
            var geneNames = map2Field(selection, global.geneList, 'EnsemblID', 'HGNC');
            self.geneIdNameMap = {};
            for (var i = 0; i < selection.length; i++) {
                self.geneIdNameMap[stripEnsemblVersion(selection[i])] = geneNames[i];
            }
        });

        self.geneSetSelectorHandler.on("selectionChanged", function (selection) {
            // in case of multiple set, need to pool together the genes
            // and create a single non-duplicate set
            if (selection) {
                var sel = selection.join(','); 
                var items = Array.from((new Set(sel.split(","))).values());
                self.searchBox.setValue(items, true);
                self.geneSelectorHandler.call("selectionChanged", self.searchBox, items);
            }
        });

    });


    self.groupSelectorHandler.on("selectionChanged", function (selection) {
        var sel = $("input[name='" + self.ui.groupsInputs[0].radioName + "']:checked").val();
        self.selectedGroups[sel] = selection;
    });

    self.geneSelectorHandler.on("selectionChanged", function (selection) {
        self.selectedGenes = selection;
        self.updateStatus(self);
    });

    self.matrixEventHandler.on("cellSelected", function (d) {
        self.onCellSelected(self, d);
    });

    $("#" + self.ui.copyGeneButton).button().click(function (e) {
        self.searchBox.setValue(global.exprTab.selectedGenes);
    });

    $("#" + self.ui.calculate).button().click(function (e) {
        // make request for heatmap
        // generate
        self.waitSignal(self, true);
        self.requestHeatMap(self, e);

        self.heatmapPromise.always(function () {
            self.waitSignal(self, false);
        })
            .done(function(data) {
                self.showHeatMap(self, data);
        })
            .fail(function(xhr) {
                alert("Failed to calculate heatmap:\n" + xhr.statusText);
            });
        // $.when(self.heatmapPromise).done(function (data) {
        //     self.waitSignal(self, false);
        //     console.log(textStatus);
        //     // console.log(jqXHR.status);
        //     self.showHeatMap(self, data);
        // });
    });


};

CorrelationTab.prototype.waitSignal = function (parent, wait) {
    if (wait) {
        $("#" + parent.ui.calculate).button('option', 'disabled', true)
            .button("option", "label", 'Calculating <img src="assets/loading.gif">');
    } else {
        $("#" + parent.ui.calculate).button('option', 'label', 'Calculate')
            .button('option', 'disabled', false);
    }
};

CorrelationTab.prototype.updateStatus = function (self) {
    $("#" + self.ui.status).text(self.selectedGenes.length + " genes selected.");
};
