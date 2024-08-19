const platformColumns = {
    google_ads: [
        'platform_account_id',
        'platform_account_name',
        'currency_code',
        'date',
        'campaign_id',
        'campaign_name',
        'impressions',
        'clicks',
        'cost_origianal_currency',
        'conversions',
        'conversion_value_original_currency',
    ],
    heureka_cz: [
        'platform_account_id',
        'date',
        'cost_original_currency',
        'cost_original_currency_per_click',
        'conversions',
        'conversion_value_original_currency'
    ],
    heureka_sk: [
        'platform_account_id',
        'date',
        'cost_original_currency',
        'cost_original_currency_per_click',
        'conversions',
        'conversion_value_original_currency'
    ],
    facebook: [
        'date',
        'platform_account_id',
        'platform_account_name',
        'currency_code',
        'campaign_id',
        'campaign_name',
        'impressions',
        'clicks',
        'conversions',
        'conversion_value_original_currency'
    ],
    bing_ads: [
        'date',
        'platform_account_id',
        'platform_account_name',
        'currency_code',
        'campaign_id',
        'campaign_name',
        'impressions',
        'clicks',
        'conversions',
        'conversion_value_original_currency'
    ],
    sklik: [
        'date',
        'platform_account_id',
        'campaign_id',
        'campaign_name',
        'impressions',
        'clicks',
        'conversions',
        'conversion_value_original_currency'
    ],
    cj_affil: [
        'date',
        'platform_account_id',
        'click_referring_url',
        'publisher_id',
        'publisher_name',
        'website_id',
        'website_name',
        'date',
        'action_status',
        'action_type',
        'commission_id',
        'cost_original_currency',
        'conversion_value_original_currency',
        'campaign_name',
        'campaign_id',
    ]
}

// layer 2 currency conversion view queery

// "   select 
//        base_table.*,
//        ${
//            campaigns === true 
//            ? `case 
//                    when currency_code = 'CZK' THEN cost_original_currency
//                    else SAFE_MULTIPLY(
//                        SAFE_DIVIDE(cost_original_currency, eur_curr_rate),
//                        eur_czk_rate
//                    ) 
//                end as cost_czk, 
//                case 
//                    when eur_curr_rate is null THEN cost_original_currency
//                    else SAFE_DIVIDE(cost_original_currency, eur_curr_rate) 
//                end as cost_eur,
//                case
//                    when currency_code = 'CZK' THEN conversion_value_original_currency
//                    else SAFE_MULTIPLY(
//                        SAFE_DIVIDE(conversion_value_original_currency, eur_curr_rate),
//                        eur_czk_rate
//                    ) 
//                end as conversion_value_czk, 
//                case 
//                    when eur_curr_rate is null THEN conversion_value_original_currency
//                    else SAFE_DIVIDE(conversion_value_original_currency, eur_curr_rate) 
//                end as conversion_value_eur,
//            ` 
//            : `
//                case
//                    when currency_code = 'CZK' THEN revenue_original_currency
//                    else SAFE_MULTIPLY(
//                        SAFE_DIVIDE(revenue_original_currency, eur_curr_rate),
//                        eur_czk_rate
//                    ) 
//                end as revenue_czk, 
//                case 
//                    when eur_curr_rate is null THEN revenue_original_currency
//                    else SAFE_DIVIDE(revenue_original_currency, eur_curr_rate) 
//                end as revenue_eur,
//            `
//        }
//    from (
//        select 
//            ${campaigns === false ? `* replace(${adjustGa4SourceMedium()}),` : '*,'}
//            '${this._clientName}' as client_name,
//            '${this._clientId}' as client_id,
//            case ${caseStatemets.project_id} else null end as project_id, 
//            case ${caseStatemets.project_name} else null end as project_name, 
//            ${normalizeCampaignName('campaign_name')} as campaign_name_join,
//        from 
//            ${ctx.ref(`${refName}`)}
//    ) as base_table
//    left join (
//        select 
//            date,
//            toCurrency,
//            rate as eur_curr_rate,
//            eur_czk_rate
//        from 
//            ${ctx.ref(this._currencyTableConfig.name)} 
//    ) as curr
//    on base_table.date = curr.date and base_table.currency_code = curr.toCurrency
//    where 
//        project_id is not null
// "


// Layer 3 query:
        //     with base as (
        //         select 
        //             COALESCE(ga4.date, cpg.date) as date,
        //             COALESCE(ga4.client_id, cpg.client_id) as client_id,
        //             COALESCE(ga4.client_name, cpg.client_name) as client_name,
        //             COALESCE(ga4.project_id, cpg.project_id) as project_id,
        //             COALESCE(ga4.project_name, cpg.project_name) as project_name,
        //             COALESCE(ga4.source, cpg.source) as source,
        //             COALESCE(ga4.medium, cpg.medium) as medium,
        //             concat(COALESCE(ga4.source, cpg.source), " / ", COALESCE(ga4.medium, cpg.medium)) as source_medium,
        //             COALESCE(ga4.campaign_name, cpg.campaign_name) as campaign_name,
        //             COALESCE(ga4.campaign_name_join, cpg.campaign_name_join) as campaign_name_join,
        //             sum(sessions) as sessions,
        //             sum(clicks) as clicks,
        //             sum(impressions) as impressions,
        //             sum(cost_original_currency) as cost_original_currency,
        //             sum(cost_czk) as cost_czk,
        //             sum(cost_eur) as cost_eur,
        //             sum(revenue_original_currency) as ga4_revenue_original_currency,
        //             sum(revenue_czk) as ga4_revenue_czk,
        //             sum(revenue_eur) as ga4_revenue_eur,
        //             sum(transactions) as ga4_transactions,
        //             sum(conversion_value_original_currency) as mkt_conversion_value_original_currency,
        //             sum(conversion_value_czk) as mkt_conversion_value_czk,
        //             sum(conversion_value_eur) as mkt_conversion_value_eur,
        //             sum(conversions) as mkt_conversions,
        //         from 
        //             ${ctx.ref(`l2_ga4_ecomm_${clientConfig.name}`)} as ga4
        //         full join  
        //             ${ctx.ref(`l2_campaigns_${clientConfig.name}`)} as cpg
        //         USING (
        //             date, 
        //             client_id,
        //             client_name,
        //             project_id,
        //             project_name,
        //             source,
        //             medium,
        //             campaign_name_join
        //         )
        //         group by 
        //             all
        //     )
        //     , agg as (
        //         select 
        //             date,
        //             client_id,
        //             client_name,
        //             project_id,
        //             project_name,
        //             source,
        //             medium,
        //             source_medium,
        //             campaign_name,
        //             campaign_name_join,
        //             sum(sessions) as sessions,
        //             sum(clicks) as clicks,
        //             sum(impressions) as impressions,
        //             sum(cost_original_currency) as cost_original_currency,
        //             sum(cost_czk) as cost_czk,
        //             sum(cost_eur) as cost_eur,
        //             sum(ga4_revenue_original_currency) as ga4_revenue_original_currency,
        //             sum(ga4_revenue_czk) as ga4_revenue_czk,
        //             sum(ga4_revenue_eur) as ga4_revenue_eur,
        //             sum(ga4_transactions) as ga4_transactions,
        //             sum(mkt_conversion_value_original_currency) as mkt_conversion_value_original_currency,
        //             sum(mkt_conversion_value_czk) as mkt_conversion_value_czk,
        //             sum(mkt_conversion_value_eur) as mkt_conversion_value_eur,
        //             sum(mkt_conversions) as mkt_conversions,
        //         from 
        //             base 
        //         group by 
        //             all
        //     )
        //     select 
        //         current_datetime() as updated_datetime,
        //         *
        //         -- date,
        //         -- client_id,
        //         -- client_name,
        //         -- project_id,
        //         -- project_name,
        //         -- source,
        //         -- medium,
        //         -- source_medium,
        //         -- campaign_name,
        //         -- campaign_name_join,
        //         -- sessions,
        //         -- clicks,
        //         -- impressions,
        //         -- cost_original_currency,
        //         -- cost_czk,
        //         -- cost_eur,
        //         -- ga4_revenue_original_currency,
        //         -- ga4_revenue_czk,
        //         -- ga4_revenue_eur,
        //         -- ga4_transactions,
        //         -- mkt_conversion_value_original_currency,
        //         -- mkt_conversion_value_czk,
        //         -- mkt_conversion_value_eur,
        //         -- mkt_conversions,
        //     from agg
        // `)

module.exports = {
    platformColumns
}
