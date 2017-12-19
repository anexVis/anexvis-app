/**
 * Created by trang on 09/30/2016
 */

var global;

function getGeneList() {
    // If both POST and GET are successful, resolve the promise with JSON-formatted output string
    // and return it.
    // Otherwise return the POST request for chaining
    return ocpuCall("getGeneList", 
                        { db: "gtex",
                        cols: ['EnsemblID', 'HGNC'],
                        expect: 'json',
                        withEnsemblVersion: false},
                        global,
                        'geneListPromise');
};

function getGeneSets() {
    return ocpuCall("getGeneSets",
                    {db: "gtex",
                    processing: "toil-rsem",
                    expect: 'json'},
                    global,
                    'geneSetPromise');
};

function getSampleGroupingList() {
    var promises = {};
    
    (['SMTS', 'SMTSD']).forEach(function (d) {
        promises[d] = ocpu.call("getSampleGroupingList",
            {
                "db": "gtex",
                "grouping": d,
                "expect": "json"    
            }, function(session) {
                 session.getObject(function(data) { global.groupListPromise[d].resolve(data); })
                    .fail(function(xhr) {
                        console.log("Failed to retrieve data.")
                    });
            })
            .fail(function(xhr) {
                console.log("Failed to make function call.");
            });
            
    });
    return promises;
}

function initPage() {
    global = {
        grouping2fieldname:{
            'grouping-tissue': 'SMTS',
            'grouping-bodysite': 'SMTSD'
        },
        groupList: {},
        geneList: [],
        geneSets: [],
        geneListPromise: $.Deferred(),
        groupListPromise: {'SMTS': $.Deferred(), 'SMTSD': $.Deferred()},
        geneSetPromise: $.Deferred(),
        selectedDataset: null
    };
    global.sampleMetaFieldMap = {
        'SAMPID': 'Sample ID',
        'SMTS': 'Organ system',
        'SMTSD': 'Tissue type',
        'SMATSSCR': 'Autolysis Score',
        'SMUBRID': 'Uberon ID',
        'AGE': 'Age',
        'GENDER': 'Gender',
        'RACE': 'Race',
        'ONTOTERM': 'Ontology term',
        'SMNABTCHT': 'Type of nucleic acid isolation batch'
    };
    ocpu.seturl("//" + ocpuserver + "/ocpu/library/ranexvis/R");
    
    getGeneList();
    getSampleGroupingList();
    getGeneSets();
    // global.geneSetPromise.resolve([JSON.stringify([{id: 'hs','name':'heparan sulfate'}]), "success", {"status": 200}]);

    $.when(global.groupListPromise['SMTS'], global.groupListPromise['SMTSD']).done(function (a1, a2) {
        global.groupList['SMTS'] = JSON.parse(a1[0]);
        global.groupList['SMTSD'] = JSON.parse(a2[0]);
    });


    $.when(global.geneListPromise, global.geneSetPromise).done(function (a1, a2) {
        if (a1 && a2) {
            global.geneList = JSON.parse(a1[0]);
            global.geneSets = JSON.parse(a2[0]);
        }
    });
    
    $("#tabs").tabs({
        ajaxOptions: {cache: true},
        active: 2,
        beforeLoad: function (event, ui) {
            return ui.panel.html() == "";
        }
    });
};

$(document).ready(initPage);
