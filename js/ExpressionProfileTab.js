/**
 * Created by trang on 12/19/16.
 */

function ExpressionProfileTab() {
    var self = this;
    self.ui = {
        genesInput: 'expr-genesInput',
        geneDropDown: 'expr-genesDropDown',
        geneSingle: 'expr-geneSingle',
        geneSet: 'expr-geneSet',
        geneSelect: 'expr-gene-select',
        groupsInputs: [
            {
                radioName: 'expr-grouping-option',
                radioId: 'expr-grouping-option-1',
                fieldName: 'SMTS',
                container: 'expr-container-option-1',
                searchbox: 'expr-searchbox-option-1'
            },
            {
                radioName: 'expr-grouping-option',
                radioId: 'expr-grouping-option-2',
                fieldName: 'SMTSD',
                container: 'expr-container-option-2',
                searchbox: 'expr-searchbox-option-2'
            }
        ],
        parplotPanel: 'expr-parplotPanel',
        tablePanel: 'expr-tablePanel',
        barchartPanel: 'expr-barchartContainer',
        table: 'expr-sampleTable',
        execButton: 'expr-plot',
        copyGeneButton: 'expr-copyGenes',
        togglePercentage: 'expr-showPercentage',
        status: "expr-status"

    };

    self.showingPercentage = false;
    self.summarizedFields = ['SMTS', 'SMTSD', "GENDER", "RACE", "ONTOTERM"];
    self.sampleMetaFields = ["SAMPID", "SMTS", "SMTSD", "AGE", "GENDER", "RACE", "ONTOTERM"];
    self.geneSelectorHandler = d3.dispatch("selectionChanged");
    self.geneSetSelectorHandler = d3.dispatch("selectionChanged");
    self.groupSelectorHandler = d3.dispatch("selectionChanged");
    self.sampleSelectorHandler = d3.dispatch("selectionChanged");
    //self.selectedGenes = ["ENSG00000176022.3", "ENSG00000027847.9", "ENSG00000103489.7", "ENSG00000015532.5", "ENSG00000158008.5", "ENSG00000162694.9", "ENSG00000012232.4"];
    // self.selectedGenes = ["ENSG00000002587.5", "ENSG00000122254.6", "ENSG00000153976.2", "ENSG00000125430.4", "ENSG00000182601.6", "ENSG00000249853.3", "ENSG00000162040.5"];
    self.selectedGenes = ["ENSG00000176022", "ENSG00000027847", "ENSG00000103489", "ENSG00000015532", "ENSG00000158008", "ENSG00000162694", "ENSG00000012232"];
    self.geneIdNameMap = {
        "ENSG00000176022": "B3GALT6",
        "ENSG00000027847": "B4GALT7",
        "ENSG00000103489": "XYLT1",
        "ENSG00000015532": "XYLT2",
        "ENSG00000158008": "EXTL1",
        "ENSG00000162694": "EXLT2",
        "ENSG00000012232": "EXLT3",
        "ENSG00000002587": "HS3ST1",
        "ENSG00000122254": "HS3ST2",
        "ENSG00000153976": "HS3ST3A1",
        "ENSG00000125430": "HS3ST3B1",
        "ENSG00000182601": "HS3ST4",
        "ENSG00000249853": "HS3ST5",
        "ENSG00000162040": "HS3ST6"
    };
    self.sampleMetaFieldMap = global.sampleMetaFieldMap;
    self.selectedGeneSet = [{
        name: 'hs',
        label: 'Heparan sulfate',
        value: ["ENSG00000002587.5", "ENSG00000122254.6", "ENSG00000153976.2", "ENSG00000125430.4", "ENSG00000182601.6", "ENSG00000249853.3", "ENSG00000162040.5"]
    }];
    self.selectedSamples = [];
    // self.selectedGroups = {'SMTS': ['Brain'], 'SMTSD': ['Brain - Cerebellum']};
    self.selectedGroups = {'SMTS': ['Brain'], 'SMTSD': ['Brain - Cerebellum', 'Brain - Hippocampus']};

    self.expressionDataPromise = $.Deferred();
    self.sampleMetadataPromise = $.Deferred();
    self.tableView;
    self.pcpView;
    self.searchBox;
    self.hbcViews = {};
    self.initView();
}


ExpressionProfileTab.prototype.createGeneInput = function () {
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

    // attach event
    // $("[name='expr-gene-selection']").on("change", function (e) {
    //     self.toggleGeneInput(self, e)
    // });
};

ExpressionProfileTab.prototype.createGeneSearchBox = function (parentId, controlId, geneList, eventHandler, selectedGenes) {
    var self = this;
    self.searchBox = new SearchBox(document.getElementById(parentId), controlId, geneList,
        {"valueField": 'EnsemblID', 'labelField': 'HGNC', 'searchField': 'HGNC'},
        eventHandler);
    if (selectedGenes != undefined && selectedGenes.length > 0) {
        self.searchBox.setValue(selectedGenes, true);
    }
};

ExpressionProfileTab.prototype.createGeneDropDown = function (parentId, controlId, geneSets, eventHandler, selectedSets) {
    // d3.select("#" + self.ui.genesInput).html("a dropdown comes here");
    var smenu = new SelectMenu(document.getElementById(parentId),
        controlId,
        geneSets,
        {"valueField": 'value', 'labelField': 'name', 'searchField': 'name'},
        eventHandler);
    // select the selectedSet 
    return smenu;
};

ExpressionProfileTab.prototype.toggleGeneInput = function (self, e) {
    d3.select("#" + self.ui.genesInput).html("");
    self.createGeneSearchBox(self.ui.genesInput, self.ui.geneSingle, global.geneList, self.geneSelectorHandler, self.selectedGenes);

    // if (e.target.id == self.ui.geneSelect + "-1") {
    //     self.createGeneSearchBox(self.ui.genesInput, self.ui.geneSingle, global.geneList, self.geneSelectorHandler, self.selectedGenes);
    // } else {
    //     // self.createGeneDropDown(self.ui.geneDropDown, self.ui.geneSet,global.geneSets, eventHandler);
    //     self.createGeneSearchBox(self.ui.genesSets, self.ui.geneSingle, global.geneList, self.geneSelectorHandler, self.selectedGenes);
    // }
};


/** --------------------------
 *  SECTION: Sample input
 *  --------------------------
 */


ExpressionProfileTab.prototype.createSampleInput = function () {
    var self = this;

    var radioName = "";
    self.ui.groupsInputs.forEach(function(grouping) {
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

ExpressionProfileTab.prototype.toggleGroupingInput = function (self, e) {
    self.ui.groupsInputs.forEach(function(grouping) {
        if (grouping.radioId == e.target.id) {
            // doesn't work with selectize
            // document.getElementById(grouping.container).removeAttribute('disabled');
            $('#' + grouping.searchbox)[0].selectize.enable();
        } else {
            $('#' + grouping.searchbox)[0].selectize.disable();
        }
    });
};

ExpressionProfileTab.prototype.createGroupingSearchbox = function (parentId, controlId, grouping, data, selectedGroups, eventHandler) {
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
        sbox.setValue(selectedGroups, true)
    }
};

/** --------------------------
 *  SECTION: Data Requests
 *  --------------------------
 */
ExpressionProfileTab.prototype.requestExpressionData = function (self, event) {

    // reset the promise to hold new data
    self.expressionDataPromise = $.Deferred();

    // make function call
    var sel = $("input[name='" + self.ui.groupsInputs[0].radioName + "']:checked").val();
    var fun = "getGeneExpressionMatrix";
    var args = {
        "genes": self.selectedGenes,
        "sampleGroups": self.selectedGroups[sel],
        "sampleGrouping": sel,
        "sampleMetaFields": "SAMPID",
        "db": "gtex",
        "processing": global.selectedDataset.processing,
        "unit": global.selectedDataset.unit,
        "expect": "json"
    };

    return ocpuCall(fun, args, self, 'expressionDataPromise');
};

ExpressionProfileTab.prototype.requestSampleMetadata = function (self, event) {
    self.sampleMetadataPromise = $.Deferred();
    var sel = $("input[name='" + self.ui.groupsInputs[0].radioName + "']:checked").val();
    var fun = "getSampleMetadataByGroup";
    var args = {
        "sampleGroups": self.selectedGroups[sel],
        "sampleGrouping": sel,
        "db": "gtex",
        "cols": self.sampleMetaFields,
        "expect": "json"
    };

    return ocpuCall(fun, args, self, 'sampleMetadataPromise');
}

ExpressionProfileTab.prototype.initView = function () {
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

    self.sampleSelectorHandler.on("selectionChanged", function (selection) {
        // The selection can be one of the 2 types, depending on which Class trigger the event
        // Brushing on ParallelCoord plot will return an array of string ID
        // Clicking on Table will return an array of Sample record

        if (selection[0] && selection[0]['SAMPID']) {
            // Clicking on Table
            self.selectedSamples = [];
            if (selection.length == 0) {
                // if nothing is selected, highlight everything 
                self.tableData.forEach(function (row) {
                    row['selected'] = true;
                });
            } else {
                self.tableData.forEach(function (row) {
                    row['selected'] = false;
                });
                selection.forEach(function (d) {
                    self.selectedSamples.push(d['SAMPID']);
                    d['selected'] = true;
                });
            }
            self.pcpView.onSelectionChange(self.selectedSamples);
        } else {
            // Brushing on parallel coordinate plot
            self.selectedSamples = selection;
            if (selection.length == 0) {
                self.tableData.forEach(function (row) {
                    row['selected'] = true;
                });
            } else {
                self.tableData.forEach(function (row) {
                    row['selected'] = (selection.indexOf(row['SAMPID']) >= 0) ? true : false;
                });
            }
            self.tableView.onSelectionChange(selection);
        }

        self.updateSelectionCount('selected');
        self.summarizedFields.forEach(function (field) {
            self.hbcViews[field].updateSelection(self.summary[field]);
        })

    });

    /** ----------------------------
     Button click events
     ---------------------------- */
    $("#" + self.ui.copyGeneButton).button().click(function() {
        self.searchBox.setValue(global.corrTab.selectedGenes, false);
    });
    $("#" + self.ui.execButton).button().click(function (e) {

        self.waitSignal(self, true);
        self.requestExpressionData(self, e);
        self.requestSampleMetadata(self, e);

        self.expressionDataPromise.always(function() {
            self.waitSignal(self,false);
        }).fail(function(xhr) {
            alert("Failed to request expression data:\n" + xhr.statusText);
        });
        $.when(self.expressionDataPromise).done(function (data) {
            var plotData = JSON.parse(data[0]);
            plotData = plotData.map(function (d) {
                Object.keys(d).forEach(function (field) {
                    if (self.geneIdNameMap[field]) {
                        renameKey(d, field, self.geneIdNameMap[field]);
                    }
                });
                return d;
            });

            self.pcpView = new ParallelCoord("#" + (self.ui.parplotPanel),
                plotData,
                {
                    nameField: 'SAMPID',
                    width: $("#" + self.ui.parplotPanel).width(),
                    height: 370,
                    commonDomain: true,
                    axisOrder: self.selectedGenes.map(function(d) {return self.geneIdNameMap[d];})
                },
                self.sampleSelectorHandler
            );
        });


        $.when(self.sampleMetadataPromise, self.expressionDataPromise).done(function (a1, a2) {
            self.waitSignal(self, false);
            var plotData = (JSON.parse(a2[0]));

            // TODO: Is there any less expensive way?
            self.tableData = (JSON.parse(a1[0])).filter(function (t) {
                var points = plotData.map(function (p) {
                    return p['SAMPID']
                });
                return points.indexOf(t['SAMPID']) >= 0;
            });
            self.tableView = new Table("#" + self.ui.tablePanel, self.ui.table,
                self.tableData,
                'SAMPID',
                {
                    columns: self.sampleMetaFields.map(function (field) {
                        return {
                            'data': field,
                            'title': self.sampleMetaFieldMap[field],
                            'defaultContent': ""
                        };
                    }),
                    scrollY: '500px'
                },
                self.sampleSelectorHandler
            );
            self.summarize(self.summarizedFields, 'selected');
            $("#" + self.ui.togglePercentage).button({
                label: "Show Percentage"
            }).css("visibility", "visible");
            var bcWidth = $("#" + self.ui.barchartPanel).width();
            self.summarizedFields.forEach(function (field) {
                var myId = "expr-barchart-" + field;
                d3.select("#" + self.ui.barchartPanel).append("div")
                    .attr("id", myId);
                var barHeight = 25;
                var bcHeight = self.summary[field].length * (barHeight + 5) + 30;
                self.hbcViews[field] = new HBarChart("#" + myId,
                    self.summary[field], {
                        width: bcWidth,
                        height: bcHeight,
                        margin: {top: 10, bottom: 20, left: 80, right: 10},
                        barPadding: 5,
                        maxBarHeight: barHeight,
                        title: self.sampleMetaFieldMap[field]
                    }, undefined);
            });
        });
    });
    $("#" + self.ui.togglePercentage).click(function () {
        if (self.showingPercentage)
            $("#" + self.ui.togglePercentage).button("option", "label", "Show Percentage");
        else
            $("#" + self.ui.togglePercentage).button("option", "label", "Show Frequency");
        self.summarizedFields.forEach(function (field) {
            self.hbcViews[field].togglePercentage(self.hbcViews[field]);
        });
        self.showingPercentage = !self.showingPercentage;
    });
};

/** Return a histogram-like count for each field
 *  output is an array
 *  [
 *      {label: 'category1', value: 10, selected: 5},
 *      {label: 'category2', value: 6, selected: 5}
 *      ...
 *  ]
 * @param fields
 * @param selectionMark
 */
ExpressionProfileTab.prototype.summarize = function (fields, selectionMark) {
    var self = this;
    var summary = {};
    fields.forEach(function (fieldName) {
        summary[fieldName] = {}
    });
    self.tableData.forEach(function (row) {
        fields.forEach(function (field) {
            var val = row[field];
            if (!summary[field][val]) summary[field][val] = {'label': val, 'value': 0, 'selected': 0};
            summary[field][val]['value'] = (summary[field][val]['value'] + 1);
            summary[field][val]['selected'] = (summary[field][val]['value']);
            // if (row[selectionMark])
            //     summary[field][val]['selected'] = (summary[field][val]['selected'] + 1) ;
        });
    });
    self.summary = {};
    fields.forEach(function (fieldName) {
        self.summary[fieldName] = Object.values(summary[fieldName])
    });
};

ExpressionProfileTab.prototype.updateSelectionCount = function (selectionMark) {
    var self = this;
    var fields = Object.keys(self.summary);
    // Reset
    fields.forEach(function (field) {
        (self.summary[field]).forEach(function (bar) {
            bar['selected'] = 0;
        });
    });

    self.tableData.forEach(function (row) {
        if (row[selectionMark]) {
            fields.forEach(function (field) {
                (self.summary[field]).forEach(function (bar) {
                    if (bar['label'] == row[field])
                        bar['selected'] = bar['selected'] + 1;
                });
            });
        }
    });
};


ExpressionProfileTab.prototype.waitSignal = function (parent, wait) {
    if (wait) {
        $("#" + parent.ui.execButton).button('option', 'disabled', true)
            .button("option", "label", 'Retrieving data <img src="assets/loading.gif">');
    } else {
        $("#" + parent.ui.execButton).button('option', 'label', 'Plot')
            .button('option', 'disabled', false);
    }
};

ExpressionProfileTab.prototype.updateStatus = function (self) {
    $("#" + self.ui.status).text(self.selectedGenes.length + " genes selected.");
};
