/**
 * Created by trang on 12/31/15.
 */
/** Format a data object into array, given selected fields in desired order
 *
 * @param selected_fields
 * @example  dat = {'alias_name': ['glypican proteoglycan 3'],
 *        'alias_symbol': ['OCI-5', 'SGBS'],
 *        'omim_id': xxxxx
 *        }
 * a = dataobject2array(['alias_symbol', 'alias_name'])
 *
 */
function dataobject2array(data, selected_fields) {
    var a = [];
    selected_fields.forEach(function(k) {
        a.push([k, data[k]])
    });
    return a;
}

/** Given a query and a database name, return the url for database-specific request

*/
function makeRequest(dbName, query, queryType) {
    var reqStr = [];
    switch (dbName) {
        case 'Ensembl':
        case 'ensembl':
            reqStr.push(location.protocol + '//rest.ensembl.org', 'lookup', queryType, query);
            break;
        case 'HGNC':
        case 'HUGO':
        case 'genenames':
        default:
            reqStr.push(location.protocol + '//rest.genenames.org','fetch', queryType, query );
    }
    return reqStr.join("/");
}