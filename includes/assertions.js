// function Layer1Assertions(campaigns = true, clientName) {
//     const assertions = {
//         campaigns: []
//         ga4: []
//     };

//     if (campaigns) {
//     const notNullAssertion = assert('l1_assertion').query(ctx => `
//         select 
//             *
//         from 
//             ${ref(`l1_campaigns_${clientName}`)}
//         where 
//             date is null or 
//             platform_name is null or 
//             source is null or 
//             medium is null or 
//             platform_account_id is null or 
//             platform_account_name is null or 
//             currency_code is null or 
//             campaign_name is null 
//     `)

//     }
// }