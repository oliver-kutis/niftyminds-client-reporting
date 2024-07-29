// Delcare input tables so they can be used as reference
// marketingDataFunctions.declareInputTables(config.client);
marketingDataFunctions.declareInputTables(clientSpecific.client, campaignData = true); // campaign_data
marketingDataFunctions.declareInputTables(clientSpecific.client, campaignData = false); // ga4 data

// Join metadata on GA4 session sources table
marketingDataFunctions.joinGA4MetaAndBaseTable(clientSpecific.client);

// Create joined campaigns table
marketingDataFunctions.createL1CampaignsTable(clientSpecific.client);

// Add project_id and project_name to l2_campaigns 
marketingDataFunctions.addProjectIdToCampaignsTable(clientSpecific.client);

publish(`${clientSpecific.client.name}_campaings_with_project_id`, {
    database: clientSpecific.client.inputDataGcpProject || 'niftyminds-client-reporting';
    schema: 'l2_campaigns',
})
.query(ctx => `
    select 
        * except(project_id),
        case when platform_name = 'google_ads'
            then concat(clientlower(split(campaign_name)[safe_offset(0)])
    
`)