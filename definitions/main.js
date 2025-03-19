const {
    Layer0,
    Layer1,
    Layer2,
    Layer3
} = require('index');

// } = require('@niftyminds/dataform-client-reporting');

const { client } = require('../includes/clientConfig');

const layer0 = new Layer0(clientConfig = client);
const layer1 = new Layer1(clientConfig = client);
const layer2 = new Layer2(clientConfig = client);
const layer3 = new Layer3(clientConfig = client);

layer0.publishDefinitions('campaigns');
layer0.publishDefinitions('ga4');
layer0.publishDefinitions('currencies');
layer0.publishDefinitions('clients_and_projects');

layer1.unionCampaignData();
layer1.joinGa4EcommAndMeta();

layer2.addJoinColumnsAndCurrencyConversionCampaigns(customPlatformCaseWhen = {
    google_ads: {
        project_name: `
            when platform_name = 'google_ads' then CONCAT(
                '${client.name.split('_')[0]}',
                '_',
                lower(split(IF(campaign_name LIKE "%myTimi%",TRIM(REPLACE(replace(campaign_name, "myTimi |", ""),"PMax:","")), campaign_name), ' | ')[safe_offset(0)])
        )`,
        project_id: `when platform_name = 'google_ads' then CONCAT(
            '${client.name.split('_')[0]}',
            '_',
            lower(split(IF(campaign_name LIKE "%myTimi%",TRIM(REPLACE(replace(campaign_name, "myTimi |", ""),"PMax:","")), campaign_name), ' | ')[safe_offset(0)])
        )`,
    },
    facebook: {
        project_name: `
            when platform_name = 'facebook' then CONCAT(
                '${client.name.split('_')[0]}',
                '_',
                lower(split(IF(campaign_name LIKE "%myTimi%",TRIM(REPLACE(replace(campaign_name, "myTimi |", ""),"PMax:","")), campaign_name), ' | ')[safe_offset(0)])
            )`,
        project_id: `when platform_name = 'facebook' then CONCAT(
            '${client.name.split('_')[0]}',
            '_',
            lower(split(IF(campaign_name LIKE "%myTimi%",TRIM(REPLACE(replace(campaign_name, "myTimi |", ""),"PMax:","")), campaign_name), ' | ')[safe_offset(0)])
        )`,
    },
    bing_ads: {
        project_name: `
            when platform_name = 'bing_ads' then CONCAT(
                '${client.name.split('_')[0]}',
                '_',
                lower(split(IF(campaign_name LIKE "%myTimi%",TRIM(REPLACE(replace(campaign_name, "myTimi |", ""),"PMax:","")), campaign_name), ' | ')[safe_offset(0)])
            )`,
        project_id: `when platform_name = 'bing_ads' then CONCAT(
            '${client.name.split('_')[0]}',
            '_',
            lower(split(IF(campaign_name LIKE "%myTimi%",TRIM(REPLACE(replace(campaign_name, "myTimi |", ""),"PMax:","")), campaign_name), ' | ')[safe_offset(0)])
        )`,
    },
    sklik: {
        project_name: `
            when platform_name = 'sklik' then 'monkeymum_cz'
        `,
        project_id: `
            when platform_name = 'sklik' then 'monkeymum_cz'
        `
    },
    cj_affil: {
        project_name: `
            when platform_name = 'cj_affil' 
                then CONCAT(
                    'monkeymum_', 
                    IF(
                        SPLIT(campaign_name, '_')[safe_offset(1)] = 'com' 
                            or campaign_name is null,
                        'cz', 
                        SPLIT(campaign_name, '_')[safe_offset(1)]
                    )
                )
        `,
        project_id: `when platform_name = 'cj_affil' then CONCAT('monkeymum_', IF(SPLIT(campaign_name, '_')[safe_offset(1)] = 'com' or campaign_name is null, 'cz', SPLIT(campaign_name, '_')[safe_offset(1)]))`
    }
});
layer2.addJoinColumnsAndCurrencyConversionGa4();

layer2.removeDuplicatesCampaigns();
layer2.removeDuplicatesGa4();

layer2.publishLayer();

layer3.publishLayer(`
    select 
        * replace(
            case 
                when starts_with(lower(campaign_name), "de") 
                    and (
                            contains_substr(lower(campaign_name), "at") 
                            or contains_substr(lower(campaign_name), "lu")
                        ) then 'monkeymum_de' 
                when starts_with(lower(campaign_name), "de") then 'monkeymum_de'
                when starts_with(lower(campaign_name), "at") then 'monkeymum_de'
                when starts_with(lower(campaign_name), "ie") then 'monkeymum_en'
                when starts_with(lower(campaign_name), "se |") then 'monkeymum_sv'
                when starts_with(lower(campaign_name), "be") and ends_with(lower(campaign_name), "dutch") then 'monkeymum_nl'
                when starts_with(lower(campaign_name), "be") and ends_with(lower(campaign_name), "french") then 'monkeymum_fr'
                when starts_with(lower(campaign_name), "3_pla") then concat('monkeymum_', if(split(lower(campaign_name), " | ")[safe_offset(2)] = 'sw', 'sv', split(lower(campaign_name), " | ")[safe_offset(2)]))
                else if(is_project_defined = false, 'monkeymum_OTHER', project_name)     
            end as project_name,
            case 
                when starts_with(lower(campaign_name), "de") 
                    and (
                            contains_substr(lower(campaign_name), "at") 
                            or contains_substr(lower(campaign_name), "lu")
                        ) then true
                when starts_with(lower(campaign_name), "de") then true
                when starts_with(lower(campaign_name), "at") then true
                when starts_with(lower(campaign_name), "ie") then true
                when starts_with(lower(campaign_name), "se |") then true
                when starts_with(lower(campaign_name), "be") and ends_with(lower(campaign_name), "dutch") then true
                when starts_with(lower(campaign_name), "be") and ends_with(lower(campaign_name), "french") then true
                when starts_with(lower(campaign_name), "3_pla") then true
                else is_project_defined   
            end as is_project_defined,
            case 
                when starts_with(lower(campaign_name), "de") 
                    and (
                            contains_substr(lower(campaign_name), "at") 
                            or contains_substr(lower(campaign_name), "lu")
                        ) then 'monkeymum_de' 
                when starts_with(lower(campaign_name), "de") then 'monkeymum_de'
                when starts_with(lower(campaign_name), "at") then 'monkeymum_de'
                when starts_with(lower(campaign_name), "ie") then 'monkeymum_en'
                when starts_with(lower(campaign_name), "se |") then 'monkeymum_sv'
                when starts_with(lower(campaign_name), "be") and ends_with(lower(campaign_name), "dutch") then 'monkeymum_nl'
                when starts_with(lower(campaign_name), "be") and ends_with(lower(campaign_name), "french") then 'monkeymum_fr'
                when starts_with(lower(campaign_name), "3_pla") then concat('monkeymum_', if(split(lower(campaign_name), " | ")[safe_offset(2)] = 'sw', 'sv', split(lower(campaign_name), " | ")[safe_offset(2)]))
                else if(is_project_defined = false, 'monkeymum_OTHER', project_id)
            end as project_id
        ),
        project_name as original_project_name,
        project_id as original_project_id,
    from 
        agg
`);