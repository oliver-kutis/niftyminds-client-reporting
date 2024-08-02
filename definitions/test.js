const layers = require('index');
const layer0 = new layers.Layer0(clientConfig=clientSpecific.client);
const layer1 = new layers.Layer1(clientConfig=clientSpecific.client);

layer0.publishDefinitions(campaigns=true);
layer0.publishDefinitions(campaigns=false);

layer1.unionCampaignData();
layer1.joinGa4EcommAndMeta();
