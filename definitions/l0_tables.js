// Delcare input tables so they can be used as reference
// marketingDataFunctions.declareInputTables(config.client);
marketingDataFunctions.declareInputTables(clientSpecific.client);

// 
marketingDataFunctions.joinGA4MetaAndBaseTable(clientSpecific.client);


marketingDataFunctions.createL1CampaignTable(clientSpecific.client);
