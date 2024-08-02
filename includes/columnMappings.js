const ga4 = {
    ecomm_session_sources: {
        "property_id" : {
            "mapped_name": "property_id",
            "type": "INTEGER",
        },
        "date" : {
            "mapped_name": "date",
            "type": "DATE",
        },
        "session_source_medium" : {
            "mapped_name": "source_medium",
            "type": "STRING",
        },
        "session_campaign_name" : {
            "mapped_name": "campaign_name",
            "type": "STRING",
        },
        "sessions" : {
            "mapped_name": "sessions",
            "type": "FLOAT",
        },
        "purchase_revenue_original_currency" : {
            "mapped_name": "revenue_original_currency",
            "type": "FLOAT",
        },
        "transactions": {
            "mapped_name": "transactions",
            "type": "FLOAT",
        },
    },
};

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
    ga4,
    platformColumns
    // sklik,
    // facebook,
    // bing_ads,
    // cj_affiliate
}
