const {
    ClientReporting,
    Layer0,
    Layer1,
    Layer2,
    Layer3
} = require('index');

const layer0 = new Layer0(clientConfig = clientSpecific.client);
const layer1 = new Layer1(clientConfig = clientSpecific.client);
const layer2 = new Layer2(clientConfig = clientSpecific.client);
const layer3 = new Layer3(clientConfig = clientSpecific.client);

layer0.publishDefinitions('campaigns');
layer0.publishDefinitions('ga4');
layer0.publishDefinitions('currencies');

layer1.unionCampaignData();
layer1.joinGa4EcommAndMeta();

layer2.addJoinColumnsAndCurrencyConversionCampaigns(customPlatformCaseWhen = {
    google_ads: {
        project_name: `
            when platform_name = 'google_ads' then CONCAT(
                '${clientSpecific.client.name.split('_')[0]}',
                '_',
                lower(split(campaign_name, ' | ')[safe_offset(0)])
        )`,
        project_id: `when platform_name = 'google_ads' then CONCAT(
            '${clientSpecific.client.name.split('_')[0]}',
            '_',
            lower(split(campaign_name, ' | ')[safe_offset(0)])
        )`,
    },
    facebook: {
        project_name: `
            when platform_name = 'facebook' then CONCAT(
                '${clientSpecific.client.name.split('_')[0]}',
                '_',
                lower(split(campaign_name, ' | ')[safe_offset(0)])
            )`,
        project_id: `when platform_name = 'facebook' then CONCAT(
            '${clientSpecific.client.name.split('_')[0]}',
            '_',
            lower(split(campaign_name, ' | ')[safe_offset(0)])
        )`,
    }
});
layer2.addJoinColumnsAndCurrencyConversionGa4();

layer2.removeDuplicatesCampaigns();
layer2.removeDuplicatesGa4();

layer2.publishLayer();

layer3.publishLayer();