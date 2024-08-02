// const creators = require('./includes/tablesAndViesCreators');
const {getFacebookJoinQuery, addSourceMediumFromPlatform, addClicksColumn, addCostsColumn} = require('./includes/helpers')
const {platformColumns} = require('./includes/columnMappings');


class ClientReporting {
    constructor(clientConfig) {
        this._clientName = clientConfig.name;
        this._clientId = clientConfig.id || this._clientName;
        this._inputDatabase = clientConfig.inputDataGcpProject || 'niftyminds-client-reporting';
        this._outputDatabase = clientConfig.outputDataGcpProject  || 'niftyminds-client-reporting';
        this._inputPlatforms = clientConfig.platforms;
        this._projectMappings = clientConfig.projects;
    }
};

class Layer0 extends ClientReporting {
    constructor(clientConfig) {
        super(clientConfig)

        this._createLayer0Query = (schema, tableName, platform) => {
            return publish(`vw_${schema}_${tableName}`, {
                type: 'view',
                database: this._outputDatabase,
                schema: 'views_l0_define_inputs',
                name: tableName
            }).query(() => `
                SELECT 
                    * 
                    ${
                        campaigns === true 
                        ? `REPLACE(
                            cast(platform_account_id as string) as platform_account_id
                            ${platform.includes('heureka') ? `` : `,cast(platform_account_name as string) as platform_account_name`}
                        )`
                        : ''    
                    }
                FROM \`${this._inputDatabase}.${schema}.${tableName}\`
            `)
          };
    }

    publishDefinitions(campaigns) {
        const queries = [];
        let platforms;
        if (campaigns === true) {
            platforms = this._inputPlatforms.filter(p => p !== 'ga4');
        } else {
            platforms = ['ga4_ecomm', 'ga4_meta'];
        }

        platforms.forEach((platform) => {
            
            let schema = campaigns === true ? `l0_${platform}_campaigns` : `l0_${platform}`;
            let name = `${this._clientName}`; // `${clientConfig.name}_${clientConfig.id}`

            // Add 2 facebook tables
            if (platform === 'facebook') {
                const fbTables = ['spend_impressions', 'conversions_clicks'];
                fbTables.forEach((fbt) => {
                    // const fbName = `${name}_${fbt}`;
                    const fbSchema = `${schema}_${fbt}`;
                    queries.push(this._createLayer0Query(fbSchema, name, platform));
                })
            } else {
                // temperaty solution for google ads where data are currently not possible to query for monkeymum_com account / client
                // if (platform === 'google_ads') name = 'niftyminds_mcc';

                queries.push(
                   this._createLayer0Query(schema, name, platform)
                )
            }

        });

        return queries;
    }
}

class Layer1 extends ClientReporting {
    constructor(clientConfig) {
        super(clientConfig) 


        this._ga4EcommAndMetaJoinConfig = {
            database: this._outputDatabase,
            schema: 'l1_ga4_ecomm',
            name: `l1_ga4_ecomm_${this._clientName}`,
            inputSuffixes: ['ecomm', 'meta'],
        };

        this._campaignsUnionConfig = {
            database: this._outputDatabase,
            schema: 'l1_campaigns',
            name: `l1_campaigns_${this._clientName}`,
            platformColumns: platformColumns
        };

        this._campaignsUnionHelpers = {
            getFacebookJoinQuery: (ctx) => {
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
                        ${ctx.ref(`vw_l0_facebook_campaigns_spend_impressions_${this._clientName}`)} as si
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
                                    ${ctx.ref(`vw_l0_facebook_campaigns_conversions_clicks_${this._clientName}`)} 
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
            },
            addClicksColumn: (platform) => {
                let col = ``
                if (platform.includes('heureka'))  col += `SAFE_DIVIDE(cost_original_currency, cost_original_currency_per_click) as clicks`;
                else col += `clicks`;

                return col;
            },
            addCostsColumn: (platform) => {
                if (platform === 'google_ads') {
                    return `SAFE_DIVIDE(cost_micros_original_currency, 1000000) as cost_original_currency`;
                }

                return `cost_original_currency`;
            },
            addHeurekaCurrency: (platform) => {
                if (platform.includes('cz')) return "'CZK'";
                if (platform.includes('sk')) return "'EUR'";
            },
            addHeurekaPlatformAccountName: (platform) => {
                if (platform.includes('cz')) return `'${this._clientName}_cz'`;
                if (platform.includes('sk')) return `'${this._clientName}_sk'`;
            },
            addSourceMediumFromPlatform: (platformName) => {
                let source = '';
                let medium = '';
                if (platformName === 'google_ads') [source, medium] = ['google', 'cpc'];
                if (platformName === 'sklik') [source, medium] = ['seznam', 'cpc'];
                if (platformName.includes('heureka')) [source, medium] = ['heureka', 'product'];
                if (platformName === 'facebook') [source, medium] = ['facebook', 'cpc'];
                // if (platformName === '')
                
                return {source: source, medium: medium};
            }
        }

        this._createUnionForCampaignData = (ctx) => {
                let query = this._inputPlatforms.map((platform, ix) => {        
                    // ga4
                    if (ix === 0) return ``;

                    // // google_ads - temporary solution
                    // if (platform === 'google_ads') tableName = 'niftyminds_mcc';
                    
                    return `
                        SELECT 
                            date,
                            '${platform}' as platform_name,
                            '${this._campaignsUnionHelpers.addSourceMediumFromPlatform(platform).source}' as source,
                            '${this._campaignsUnionHelpers.addSourceMediumFromPlatform(platform).medium}' as medium,
                            platform_account_id as platform_account_id,
                            ${!this._campaignsUnionConfig.platformColumns[platform].includes('platform_account_name') ? this._campaignsUnionHelpers.addHeurekaPlatformAccountName(platform, this._clientName) : 'platform_account_name'} as platform_account_name,
                            ${!this._campaignsUnionConfig.platformColumns[platform].includes('currency_code') ? this._campaignsUnionHelpers.addHeurekaCurrency(platform) : 'currency_code'} as currency_code,
                            ${!this._campaignsUnionConfig.platformColumns[platform].includes('campaign_name') ? `NULL` : 'campaign_name'} as campaign_name,
                            ${!this._campaignsUnionConfig.platformColumns[platform].includes('campaign_id') ? `NULL` : 'campaign_id'} as campaign_id,
                            ${!this._campaignsUnionConfig.platformColumns[platform].includes('impressions') ? `NULL` : 'impressions'} as impressions,
                            ${this._campaignsUnionHelpers.addClicksColumn(platform)},
                            ${this._campaignsUnionHelpers.addCostsColumn(platform)},
                            conversions,
                            conversion_value_original_currency,
                        FROM 
                            ${platform === 'facebook' ? this._campaignsUnionHelpers.getFacebookJoinQuery(ctx) : ctx.ref(`vw_l0_${platform}_campaigns_${this._clientName}`)}
                    `;
                });

                return query.slice(1).join('  UNION ALL  ');
            }
    };

    unionCampaignData() {
        const {database, schema, name} = this._campaignsUnionConfig;
        return publish(name, {
            type: 'table',
            database: database,
            schema: schema,
        }).query(ctx => this._createUnionForCampaignData(ctx))
    };

    joinGa4EcommAndMeta() {
        const {database, schema, name, inputSuffixes} = this._ga4EcommAndMetaJoinConfig;
        return publish(name, {
                type: 'table',
                database: database,
                schema: schema,

            })
            .query(ctx => `
                SELECT 
                    * EXCEPT(property_id, property_name, account_id, account_name),
                    cast(property_id as string) as platform_property_id,
                    cast(property_name as string) as platform_property_name,
                    cast(account_id as string) as platform_account_id,
                    cast(account_name as string) as platform_account_name,
                    'ga4_ecomm' as platform_name,
                FROM 
                    ${ctx.ref(`vw_l0_ga4_${inputSuffixes[0]}_${this._clientName}`)} as ga4_ecomm
                LEFT JOIN (
                    SELECT 
                        SPLIT(property_key, '/')[SAFE_OFFSET(1)] as property_id,
                        property_name,
                        SPLIT(account_key, '/')[SAFE_OFFSET(1)] as account_id,
                        account_name
                    FROM 
                    ${ctx.ref(`vw_l0_ga4_${inputSuffixes[1]}_${this._clientName}`)}
                ) USING (property_id)
            `);
    }
}

module.exports = {
    Layer0,
    Layer1
}