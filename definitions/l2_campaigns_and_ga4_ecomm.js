// // Initialization
// const database = clientSpecific.client.inputDataGcpProject || 'niftyminds-client-reporting';

// // Create L2 campaigns table
// publish(`l2_campaigns_${clientSpecific.client.name}`, {
//     type: 'table',
//     database: database,
//     schema: 'l2_campaigns',
// })
// .query(ctx => `
//     select 
//         * replace(
//             case 
//                 when platform_name in ('google_ads', 'facebook')
//                     then concat(
//                         '${clientSpecific.client.name.split('_')[0]}',
//                         '_', 
//                         lower(split(campaign_name, " | ")[safe_offset(0)])
//                     )
//                 else project_id
//             end as project_id,
//             case when platform_name = 'google_ads'
//                 then concat(
//                     '${clientSpecific.client.name.split('_')[0]}',
//                     '_', 
//                     lower(split(campaign_name, " | ")[safe_offset(0)])
//                 )
//                 else project_name
//             end as project_name
//         )
//     from 
//         ${ctx.ref(`vw_l2_remove_duplicates_campaigns_${clientSpecific.client.name}`)}

// `);

// // Create L2 ga4_ecomm_session_sources table
// publish(`l2_ga4_ecomm_${clientSpecific.client.name}`, {
//     type: 'table',
//     database: database,
//     schema: 'l2_ga4_ecomm',
// })
// .query(ctx => `
//     select 
//         *
//     from 
//         ${ctx.ref(`vw_l2_remove_duplicates_ga4_ecomm_${clientSpecific.client.name}`)}
// `)