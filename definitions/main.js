// const {
//   Layer0,
//   Layer1,
//   Layer2,
//   Layer3,
// } = require("@niftyminds/dataform-client-reporting");
// const { client } = require("../includes/clientConfig");

// const layer0 = new Layer0((clientConfig = client));
// const layer1 = new Layer1((clientConfig = client));
// const layer2 = new Layer2((clientConfig = client));
// const layer3 = new Layer3((clientConfig = client));

// layer0.publishDefinitions("campaigns");
// layer0.publishDefinitions("ga4");
// layer0.publishDefinitions("currencies");
// layer0.publishDefinitions("clients_and_projects");

// layer1.unionCampaignData();
// layer1.joinGa4EcommAndMeta();

// layer2.addJoinColumnsAndCurrencyConversionCampaigns(
//   (customPlatformCaseWhen = {
//     google_ads: {
//       project_name: `
//             when platform_name = 'google_ads' then CONCAT(
//                 '${client.name.split("_")[0]}',
//                 '_',
//                 lower(split(campaign_name, ' | ')[safe_offset(0)])
//         )`,
//       project_id: `when platform_name = 'google_ads' then CONCAT(
//             '${client.name.split("_")[0]}',
//             '_',
//             lower(split(campaign_name, ' | ')[safe_offset(0)])
//         )`,
//     },
//     facebook: {
//       project_name: `
//             when platform_name = 'facebook' then CONCAT(
//                 '${client.name.split("_")[0]}',
//                 '_',
//                 lower(split(campaign_name, ' | ')[safe_offset(0)])
//             )`,
//       project_id: `when platform_name = 'facebook' then CONCAT(
//             '${client.name.split("_")[0]}',
//             '_',
//             lower(split(campaign_name, ' | ')[safe_offset(0)])
//         )`,
//     },
//     bing_ads: {
//       project_name: `
//             when platform_name = 'bing_ads' then CONCAT(
//                 '${client.name.split("_")[0]}',
//                 '_',
//                 lower(split(campaign_name, ' | ')[safe_offset(0)])
//             )`,
//       project_id: `when platform_name = 'bing_ads' then CONCAT(
//             '${client.name.split("_")[0]}',
//             '_',
//             lower(split(campaign_name, ' | ')[safe_offset(0)])
//         )`,
//     },
//     sklik: {
//       project_name: `
//             when platform_name = 'sklik' then 'project-name'
//         `,
//       project_id: `
//             when platform_name = 'sklik' then 'project-name'
//         `,
//     },
//     cj_affil: {
//       project_name: `
//             when platform_name = 'cj_affil'
//                 then CONCAT(
//                     'project-name',
//                     IF(
//                         SPLIT(campaign_name, '_')[safe_offset(1)] = 'com'
//                             or campaign_name is null,
//                         'cz',
//                         SPLIT(campaign_name, '_')[safe_offset(1)]
//                     )
//                 )
//         `,
//       project_id: `when platform_name = 'cj_affil' then CONCAT('project-name', IF(SPLIT(campaign_name, '_')[safe_offset(1)] = 'com' or campaign_name is null, 'cz', SPLIT(campaign_name, '_')[safe_offset(1)]))`,
//     },
//   })
// );
// layer2.addJoinColumnsAndCurrencyConversionGa4();

// layer2.removeDuplicatesCampaigns();
// layer2.removeDuplicatesGa4();

// layer2.publishLayer();

// layer3.publishLayer(`
//     select
//         * replace(
//             case
//                 when starts_with(lower(campaign_name), "de")
//                     and (
//                             contains_substr(lower(campaign_name), "at")
//                             or contains_substr(lower(campaign_name), "lu")
//                         ) then 'project-name'
//                 else project_name
//             end as project_name,
//             case
//                 when starts_with(lower(campaign_name), "de")
//                     and (
//                             contains_substr(lower(campaign_name), "at")
//                             or contains_substr(lower(campaign_name), "lu")
//                         ) then true
//                 else is_project_defined
//             end as is_project_defined,
//             case
//                 when starts_with(lower(campaign_name), "de")
//                     and (
//                             contains_substr(lower(campaign_name), "at")
//                             or contains_substr(lower(campaign_name), "lu")
//                         ) then 'project-name'
//                 else project_id
//             end as project_id
//         )
//     from
//         agg
// `);
