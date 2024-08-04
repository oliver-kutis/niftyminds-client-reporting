function adjustGa4SourceMedium() {
    let source = `
        case 
            when lower(source) like '%heureka%' then 'heureka' 
            when lower(source) like '%facebook%' and lower(medium) = 'referral' then 'facebook'
            when lower(source) like '%instagram%' and lower(medium) = 'referral' then 'instagram'
            when lower(source) like '%zbozi%' and lower(medium) = 'referral' then 'zbozi'
            when lower(source) like '%sklik%' or lower(source) like '%seznam%' and lower(medium) != 'referral' then 'seznam'
            when lower(source) like '%fb%' or lower(source) like '%facebook%' and lower(medium) != 'referral' then 'facebook'
            else source
        end as source,
    `;
    let medium = `
        case 
            when lower(source) like '%heureka%' then 'product' 
            when lower(source) like '%zbozi%' and lower(medium) = 'referral' then 'cpc'
            when lower(source) like '%sklik%' or lower(source) like '%seznam%' and lower(medium) != 'referral' then 'cpc'
            when lower(source) like '%fb%' or lower(source) like '%facebook%' and lower(medium) != 'referral' then 'cpc'
            else medium
        end as medium
    `;

    return [source, medium].join('\n');
}

function addSourceMediumFromPlatform(platformName) {
    let source = '';
    let medium = '';
    if (platformName === 'google_ads') [source, medium] = ['google', 'cpc'];
    if (platformName === 'sklik') [source, medium] = ['seznam', 'cpc'];
    if (platformName.includes('heureka')) [source, medium] = ['heureka', 'product'];
    if (platformName === 'facebook') [source, medium] = ['facebook', 'cpc'];
    
    return {source: source, medium: medium};
}

function normalizeCampaignName(campaignNameCol) {
    return `
        UPPER(REGEXP_REPLACE(TRIM(${campaignNameCol}), r'\\W', "_"))
    `;
}


function addHeurekaCurrency(platform) {
    if (platform.includes('cz')) return "'CZK'";
    if (platform.includes('sk')) return "'EUR'";
}

function addHeurekaPlatformAccountName(platform, clientName) {
    if (platform.includes('cz')) return `'${clientName}_cz'`;
    if (platform.includes('sk')) return `'${clientName}_sk'`;
}

function addClicksColumn(platform) {
    let col = ``
    if (platform.includes('heureka'))  col += `SAFE_DIVIDE(cost_original_currency, cost_original_currency_per_click) as clicks`;
    else col += `clicks`;

    return col;
}

function addCostsColumn(platform) {
    if (platform === 'google_ads') {
        return `SAFE_DIVIDE(cost_micros_original_currency, 1000000) as cost_original_currency`;
    }

    return `cost_original_currency`;
}

function createUnionForCampaignData(ctx, clientConfig) {

    let query = clientConfig.platforms.map((platform, ix) => {        
        let tableName = clientConfig.name;
        // ga4
        if (ix === 0) return ``;

        // // google_ads - temporary solution
        // if (platform === 'google_ads') tableName = 'niftyminds_mcc';
        
        return `
            SELECT 
                date,
                '${platform}' as platform_name,
                '${helperFuncs.addSourceMediumFromPlatform(platform).source}' as source,
                '${helperFuncs.addSourceMediumFromPlatform(platform).medium}' as medium,
                platform_account_id as platform_account_id,
                ${!columnMappings.platformColumns[platform].includes('platform_account_name') ? addHeurekaPlatformAccountName(platform, clientConfig.name) : 'platform_account_name'} as platform_account_name,
                ${!columnMappings.platformColumns[platform].includes('currency_code') ? addHeurekaCurrency(platform) : 'currency_code'} as currency_code,
                ${!columnMappings.platformColumns[platform].includes('campaign_name') ? `NULL` : 'campaign_name'} as campaign_name,
                ${!columnMappings.platformColumns[platform].includes('campaign_id') ? `NULL` : 'campaign_id'} as campaign_id,
                ${!columnMappings.platformColumns[platform].includes('impressions') ? `NULL` : 'impressions'} as impressions,
                ${addClicksColumn(platform)},
                ${addCostsColumn(platform)},
                conversions,
                conversion_value_original_currency,
            FROM 
                ${platform === 'facebook' ? getFacebookJoinQuery(ctx, clientConfig.name) : ctx.ref(`vw_l0_${platform}_campaigns_${tableName}`)}
        `;
    });

    return query.slice(1).join('  UNION ALL  ');
}

function getFacebookJoinQuery(ctx, clientName) {
    return `(
        SELECT 
            si.date_start as date,
            si.platform_account_id,
            si.platform_account_name,
            si.currency_code,
            si.campaign_id,
            si.campaign_name,
            sum(cc.clicks) as clicks,
            sum(impressions) as impressions,
            sum(cost_original_currency) as cost_original_currency,
            sum(cc.conversions) as conversions,
            sum(cc.conversion_value_original_currency) as conversion_value_original_currency,
        FROM
            ${ctx.ref(`vw_l0_facebook_campaigns_spend_impressions_${clientName}`)} as si
        LEFT JOIN (
            select 
                date_start,
                platform_account_id,
                platform_account_name,
                currency_code,
                campaign_id,
                campaign_name,
                SUM(clicks) as clicks,
                SUM(conversions) as conversions,
                SUM(conversion_value_original_currency) as conversion_value_original_currency
                from (
                    select 
                        date_start,
                        platform_account_id,
                        platform_account_name,
                        currency_code,
                        campaign_id,
                        campaign_name,
                        case when action_type = 'link_click' and ads_action_name = 'actions' then sum(value) end as clicks,
                        case when action_type = 'offsite_conversion.fb_pixel_purchase' and ads_action_name = 'actions' then sum(value) end as conversions,
                        case when action_type = 'offsite_conversion.fb_pixel_purchase' and ads_action_name = 'action_values' then sum(value) end as conversion_value_original_currency,
                    from 
                        ${ctx.ref(`vw_l0_facebook_campaigns_conversions_clicks_${clientName}`)} 
                    group by 
                        date_start,
                        platform_account_id,
                        platform_account_name,
                        currency_code,
                        campaign_id,
                        campaign_name,
                        action_type,
                        ads_action_name
                )
                group by 
                    all
        ) as cc
            USING (platform_account_id, platform_account_name, date_start, campaign_id, campaign_name)
        group by all
    )`
}


module.exports = {
    adjustGa4SourceMedium,
    addSourceMediumFromPlatform,
    normalizeCampaignName,
    addHeurekaCurrency,
    addHeurekaPlatformAccountName,
    addClicksColumn,
    addCostsColumn,
    createUnionForCampaignData,
    getFacebookJoinQuery,
}

