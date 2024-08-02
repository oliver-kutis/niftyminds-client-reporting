// Initialization
const database = clientSpecific.client.inputDataGcpProject || 'niftyminds-client-reporting';

// Delcare input tables so they can be used as reference
// marketingDataFunctions.declareInputTables(config.client);
marketingDataFunctions.l0ViewsDefineInputs(clientSpecific.client, campaignData = true); // campaign_data
marketingDataFunctions.l0ViewsDefineInputs(clientSpecific.client, campaignData = false); // ga4 data