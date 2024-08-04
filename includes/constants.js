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
        'conversions',
        'conversion_value_original_currency'
    ]
}

module.exports = {
    platformColumns
}
