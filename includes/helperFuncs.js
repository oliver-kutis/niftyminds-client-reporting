/*
    tableType:
        - "outPlatform": is always the same in format: "<client_name>_<client_id>_<platform>"
        - "ga4_ecomm_session_sources": "<client_name>_<client_id>_ecomm_session_sources"
*/
function createTableName(clientId, clientName, tableType) {
    // const baseTableName = `${clientId}_${clientName}`;
    const baseTableName = `${clientName}`; // clientId is omitted 

    if (tableType === "l0") return;
    if (tableType === "l1_campaigns") return `${baseTableName}_joined`;
    if (tableType.includes("ga4")) {
        // const splited = tableType.split('_');
        // const splitedTableName = splited.slice(1).join('_');

        return `${baseTableName}_add_property_account_name`;
    }
    
    // TODO
}

function getDatabaseName(project) {
    return project || 'niftyminds-client-reporting';
}

function createGlobalConfigs(clientId, clientName, out_gcp_project = 'niftyminds-client-reporting') {
    
}

module.exports = {
    createTableName,
    getDatabaseName
}

