// Initialization
const database = clientSpecific.client.inputDataGcpProject || 'niftyminds-client-reporting';

// Add project_id and project_name to l2_campaigns 
marketingDataFunctions.l2ViewsRemoveDuplicates(clientSpecific.client, database, campaigns=true);
marketingDataFunctions.l2ViewsAddJoinColumns(clientSpecific.client, campaigns=true);
// Add project_id and project_name to l2_ga4_ecomm_session_sources 
marketingDataFunctions.l2ViewsRemoveDuplicates(clientSpecific.client, database, campaigns=false);
marketingDataFunctions.l2ViewsAddJoinColumns(clientSpecific.client, campaigns=false);