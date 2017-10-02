/**
 * Created by trang on 1/4/17.
 */

/** Make a function call through OpenCPU and return a data promise
 * @param {string} fun name of the R function to be called via OpenCPU
 * @param {Object} args arguments for R-function
 * @param {Object} namespace the object containing the promise to be resolved
 * @param {string} dataPromise the name to access the promise in `namespace`
 */
function ocpuCall(fun, args, namespace, dataPromise) {
    var req = ocpu.call(fun, args, function (session) {
        session.getObject(function (data) {
            try {
                namespace[dataPromise].resolve(data);
            } catch (err) {
                namespace[dataPromise].reject( {status: 0, statusText: "Error requesting data.", responseText: err.message});
            }
            return namespace[dataPromise];
        }).fail(function (xhr) {
            // console.log("Failed to GET output from function " + fun);
            namespace[dataPromise].reject(xhr);
        })
    });
    req.fail(function (xhr) {
        // console.log("Failed to POST function call " + fun);
        namespace[dataPromise].reject(xhr);
    });
    return namespace[dataPromise];
}

function cloneDataPoint(arr, fromField, toField) {
    return arr.map(function (d) {
        d[toField] = d[fromField];
        return d;
    });
}

/** Mapping from one field to another
 *
 */
function map2Field(inArray, reference, inField, outField) {
    var result = inArray.map(function () {
        return -1
    });
    for (var i = 0; i < result.length; i++) {
        reference.forEach(function (d) {
            if (d[inField] == inArray[i]) {
                result[i] = d[outField];
            }
        })
    }
    return result;
}

function stripEnsemblVersion(ensemblId) {
    return (ensemblId.indexOf(".") >= 0) ? ensemblId.slice(0, ensemblId.indexOf(".")) : ensemblId;
}

function renameKey(object, keyOld, keyNew) {
    object[keyNew] = object[keyOld];
    delete object[keyOld];
}

