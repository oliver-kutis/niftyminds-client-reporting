/*
    tableType:
        - "outPlatform": is always the same in format: "<client_name>_<client_id>_<platform>"
        - "ga4_meta": "<client_name>_<client_id>_properties_meta"
        - "ga4_ecomm_session_sources": "<client_name>_<client_id>_ecomm_session_sources"
*/
function createTableName(clientId, clientName, tableType) {
    const baseTableName = `${clientId, clientName}`;
    if (tableType === "out") return baseTableName;
    if (tableType.includes("ga4")) {
        const splited = ga4.split('_')[1];
        
        return baseTableName + splited;
    }
    
    // TODO
}

function createGlobalConfigs(clientId, clientName, out_gcp_project = 'niftyminds-client-reporting') {
    
}

module.exports = {
    createTableName
}

