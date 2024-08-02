// Initialization
const database = clientSpecific.client.inputDataGcpProject || 'niftyminds-client-reporting';

// Join metadata on GA4 session sources table
marketingDataFunctions.l1JoinGA4EcommAndMeta(clientSpecific.client);

// Create joined campaigns table
marketingDataFunctions.l1UnionCampaignData(clientSpecific.client);