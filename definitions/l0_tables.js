// Delcare input tables so they can be used as reference
// marketingDataFunctions.declareInputTables(config.client);
marketingDataFunctions.declareInputTables(clientSpecific.client, campaignData = true); // campaign_data
marketingDataFunctions.declareInputTables(clientSpecific.client, campaignData = false); // ga4 data

// Join metadata on GA4 session sources table
marketingDataFunctions.joinGA4MetaAndBaseTable(clientSpecific.client);

// Create joined campaigns table
marketingDataFunctions.createL1CampaignsTable(clientSpecific.client);
