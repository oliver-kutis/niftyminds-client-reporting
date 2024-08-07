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
    ]
}

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

module.exports = {
    platformColumns
}
