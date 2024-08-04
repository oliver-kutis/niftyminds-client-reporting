// const creators = require('./includes/tablesAndViesCreators');
const {
    getFacebookJoinQuery, 
    addSourceMediumFromPlatform, 
    adjustGa4SourceMedium,
    normalizeCampaignName,
    addClicksColumn, 
    addCostsColumn, 
    addHeurekaPlatformAccountName,
    addHeurekaCurrency,
} = require('./includes/helpers')
const {platformColumns} = require('./includes/constants');


class ClientReporting {
    constructor(clientConfig) {
        this._clientName = clientConfig.name;
        this._clientId = clientConfig.id || this._clientName;
        this._inputDatabase = clientConfig.inputDataGcpProject || 'niftyminds-client-reporting';
        this._outputDatabase = clientConfig.outputDataGcpProject  || 'niftyminds-client-reporting';
        this._inputPlatforms = clientConfig.platforms;
        this._projectMappings = clientConfig.projects;
        this._currencyTableId = clientConfig.currencyTableId || 'niftyminds-client-reporting.00_currencies.vw_all_currencies_czk';
        this._currencyTableConfig = {
            database: this._currencyTableId.split('.')[0],
            schema: this._currencyTableId.split('.')[1],
            name: this._currencyTableId.split('.')[2],
            tags: ['source_definition', 'declaration']
        }
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
                name: tableName,
                tags: ['source_definition', 'view']
            }).query(() => `
                SELECT 
                    * 
                    ${
                        schema.includes('campaigns') 
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

    publishDefinitions(type) {
        const queries = [];
        let platforms;
        if (type === 'campaigns') {
            platforms = this._inputPlatforms.filter(p => p !== 'ga4');
        } else if (type === 'ga4') {
            platforms = ['ga4_ecomm', 'ga4_meta'];
        } else if (type === 'currencies') {
            return declare(this._currencyTableConfig);
        }

        platforms.forEach((platform) => {
            
            let schema = type === 'campaigns' ? `l0_${platform}_campaigns` : `l0_${platform}`;
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
                            '${addSourceMediumFromPlatform(platform).source}' as source,
                            '${addSourceMediumFromPlatform(platform).medium}' as medium,
                            platform_account_id as platform_account_id,
                            ${!this._campaignsUnionConfig.platformColumns[platform].includes('platform_account_name') ? addHeurekaPlatformAccountName(platform, this._clientName) : 'platform_account_name'} as platform_account_name,
                            ${!this._campaignsUnionConfig.platformColumns[platform].includes('currency_code') ? addHeurekaCurrency(platform) : 'currency_code'} as currency_code,
                            ${!this._campaignsUnionConfig.platformColumns[platform].includes('campaign_name') ? `NULL` : 'campaign_name'} as campaign_name,
                            ${!this._campaignsUnionConfig.platformColumns[platform].includes('campaign_id') ? `NULL` : 'campaign_id'} as campaign_id,
                            ${!this._campaignsUnionConfig.platformColumns[platform].includes('impressions') ? `NULL` : 'impressions'} as impressions,
                            ${addClicksColumn(platform)},
                            ${addCostsColumn(platform)},
                            conversions,
                            conversion_value_original_currency,
                        FROM 
                            ${platform === 'facebook' ? getFacebookJoinQuery(ctx, this._clientName) : ctx.ref(`vw_l0_${platform}_campaigns_${this._clientName}`)}
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
            tags: ['layer_1', 'campaigns']
        }).query(ctx => this._createUnionForCampaignData(ctx))
    };

    joinGa4EcommAndMeta() {
        const {database, schema, name, inputSuffixes} = this._ga4EcommAndMetaJoinConfig;
        return publish(name, {
                type: 'table',
                database: database,
                schema: schema,
                tags: ['layer_1', 'ga4']
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

class Layer2 extends ClientReporting {
    constructor(clientConfig) {
        super(clientConfig)

        this._constructJoinColumnsCaseStatements = (platforms, campaigns, propertyIdKey, customPlatformCaseWhen = {}) => {
            // Initialize an object to store case statements for project IDs and project names
            const platformCases = {
                project_id: [],
                project_name: []
            }

            // Construct case statements for each platform
            platforms.forEach(platform => {
                 // Add platform name condition if campaigns are true
                const platformNameCondition = campaigns ? `platform_name = '${platform}' and` : '';
                const platformProjects = this._projectMappings[platform];
                let caseStatementProjectName = ``;
                let caseStatementProjectId = ``;

                if (platformProjects === 'custom') {
                    if (!customPlatformCaseWhen[platform]) {
                        throw new Error(`
                            Error in Layer2.addJoinColumnsCampaigns() in nested method: _constructJoinColumnsCaseStatements():
                                When the value for platform '${platform}' is undefined in, 'clientConfig.projects' the when statements for the platform's
                                'project_id' and 'project_name' must be provided in the last 'customPlatformCaseWhen' argument of the function. 
                        `)
                    } 
                    if(Object.keys(customPlatformCaseWhen[platform]).filter(p => ['project_id', 'project_name'].includes(p)).length !== 2) {
                        throw new Error(`
                            Error in Layer2.addJoinColumnsCampaigns() in nested method: _constructJoinColumnsCaseStatements():
                                Both 'project_id' and 'project_name' WHEN ... THEN statements must be provided 
                                when the value for platform '${platform}' is undefined in, 'clientConfig.projects'
                        `)
                    }

                    caseStatementProjectName = customPlatformCaseWhen[platform].project_name;
                    caseStatementProjectId = customPlatformCaseWhen[platform].project_id;
                } else {
                    // Construct case statements for project IDs
                    caseStatementProjectId = platformProjects.map(project => 
                        `when ${platformNameCondition} ${propertyIdKey} = '${project.property_id}' then '${project.project_id}'`
                    ).join('\n ');

                    // Construct case statements for project names
                    caseStatementProjectName = platformProjects.map(project =>
                        `when ${platformNameCondition} ${propertyIdKey} = '${project.property_id}' then '${project.project_name}'`
                    ).join('\n ');

                }


                // Append the constructed case statements to platformCases
                platformCases.project_id.push(caseStatementProjectId);
                platformCases.project_name.push(caseStatementProjectName);
            });

            return {
                project_id: platformCases.project_id.join('\n '),
                project_name: platformCases.project_name.join('\n ')    
            };
        }

        this._addJoinColumnsAndCurrencyConversion = (campaigns = true, customPlatformCaseWhen) => {
            const platforms = campaigns ? this._inputPlatforms.filter((platform) => platform !== 'ga4') : ['ga4'];

            const propertyIdKey = campaigns ? 'platform_account_id' : 'platform_property_id';
            const schemaPrefix = campaigns ? 'l2_add_join_columns_and_currency_conversion_campaigns_' : 'l2_add_join_columns_and_currency_conversion_ga4_ecomm_';
            const refNamePrefix = campaigns ? 'l1_campaigns_' : 'l1_ga4_ecomm_';

            // Define schema and reference name based on client configuration name
            const schema = `${schemaPrefix}${this._clientName}`;
            const refName = `${refNamePrefix}${this._clientName}`; 

            const caseStatemets = this._constructJoinColumnsCaseStatements(platforms, campaigns, propertyIdKey, customPlatformCaseWhen);

            return publish(`vw_${schema}`, {
                type: 'view',
                database: this._outputDatabase,
                schema: 'views_l2_add_join_columns_and_currency_conversion',
                tags: ['layer_2', `${campaigns === true ? 'campaigns' : 'ga4'}`, 'view']
            }).query(ctx => `
                select 
                    base_table.*,
                    ${
                        campaigns === true 
                        ? `case 
                                when currency_code = 'CZK' THEN cost_original_currency
                                else SAFE_MULTIPLY(
                                    SAFE_DIVIDE(cost_original_currency, eur_curr_rate),
                                    eur_czk_rate
                                ) 
                            end as cost_czk, 
                            case 
                                when eur_curr_rate is null THEN cost_original_currency
                                else SAFE_DIVIDE(cost_original_currency, eur_curr_rate) 
                            end as cost_eur,
                            case
                                when currency_code = 'CZK' THEN conversion_value_original_currency
                                else SAFE_MULTIPLY(
                                    SAFE_DIVIDE(conversion_value_original_currency, eur_curr_rate),
                                    eur_czk_rate
                                ) 
                            end as conversion_value_czk, 
                            case 
                                when eur_curr_rate is null THEN conversion_value_original_currency
                                else SAFE_DIVIDE(conversion_value_original_currency, eur_curr_rate) 
                            end as conversion_value_eur,
                        ` 
                        : `
                            case
                                when currency_code = 'CZK' THEN revenue_original_currency
                                else SAFE_MULTIPLY(
                                    SAFE_DIVIDE(revenue_original_currency, eur_curr_rate),
                                    eur_czk_rate
                                ) 
                            end as revenue_czk, 
                            case 
                                when eur_curr_rate is null THEN revenue_original_currency
                                else SAFE_DIVIDE(revenue_original_currency, eur_curr_rate) 
                            end as revenue_eur,
                        `
                    }
                from (
                    select 
                        ${campaigns === false ? `* replace(${adjustGa4SourceMedium()}),` : '*,'}
                        '${this._clientName}' as client_name,
                        '${this._clientId}' as client_id,
                        case ${caseStatemets.project_id} else null end as project_id, 
                        case ${caseStatemets.project_name} else null end as project_name, 
                        ${normalizeCampaignName('campaign_name')} as campaign_name_join,
                    from 
                        ${ctx.ref(`${refName}`)}
                ) as base_table
                left join (
                    select 
                        date,
                        toCurrency,
                        rate as eur_curr_rate,
                        eur_czk_rate
                    from 
                        ${ctx.ref(this._currencyTableConfig.name)} 
                ) as curr
                on base_table.date = curr.date and base_table.currency_code = curr.toCurrency
                where 
                    project_id is not null
            `)
        }

        this._constructDeduplQuery = (campaigns) => {
            const getQuery = (ctx) => `
                select 
                    * except(rn)
                from (
                    select 
                        *,
                        row_number() over (
                            partition by                     
                                date,
                                client_id,
                                client_name,
                                project_id,
                                project_name,
                                platform_name,
                                currency_code,
                                ${campaigns === true ? 'campaign_id,' : ''}
                                campaign_name,
                                campaign_name_join,
                                ${campaigns === true ? 'CAST(cost_original_currency as string),' : ''}
                                ${campaigns === true ? 'CAST(clicks as string),' : ''}
                                ${campaigns === true ? 'CAST(impressions as string),' : ''}
                                ${campaigns === true ? 'CAST(conversions as string),' : 'CAST(transactions as string),'}
                                ${campaigns === true ? 'CAST(conversion_value_original_currency as string)' : 'CAST(revenue_original_currency as string)'}
                            order by 
                                date
                        ) as rn    
                    from 
                        ${ctx.ref(`vw_l2_add_join_columns_and_currency_conversion_${campaigns === true ? 'campaigns' : 'ga4_ecomm'}_${this._clientName}`)}
                )
                where rn = 1
            `;

            const suffix = campaigns === true ? 'campaigns' : 'ga4_ecomm';

            return publish(`vw_l2_remove_duplicates_${suffix}_${this._clientName}`, {
                type: 'view',
                database: this._outputDatabase,
                schema: 'views_l2_remove_duplicates',
                tags: ['layer_2', `${campaigns === true ? 'campaigns' : 'ga4'}`, 'view'],
            })
            .query(ctx => getQuery(ctx));
        }
    }

    // Adding join columns
    addJoinColumnsAndCurrencyConversionCampaigns(customPlatformCaseWhen) {
        return this._addJoinColumnsAndCurrencyConversion(true, customPlatformCaseWhen);
    }
    addJoinColumnsAndCurrencyConversionGa4() {
        return this._addJoinColumnsAndCurrencyConversion(false, {});
    }

    // Remove duplicates before the join in Layer3
    removeDuplicatesCampaigns() {
        return this._constructDeduplQuery(true);
    }
    removeDuplicatesGa4() {
        return this._constructDeduplQuery(false);
    }
    
    // Create a materialzed table
    publishLayer() {
        const names = ['campaigns', 'ga4_ecomm'];
        const queries = names.map(name => {
            return publish(`l2_${name}_${this._clientName}`, {
                type: 'table',
                database: this._outputDatabase,
                schema: `l2_${name}`,
                tags: ['layer_2', `${name === 'campaigns' ? 'campaigns' : 'ga4'}`],
                // assertions: {
                //     uniqueKey: ['date', 'source', 'medium', 'campaign_name']
                // }
            }).query(ctx => `
                select * from ${ctx.ref(`vw_l2_remove_duplicates_${name}_${this._clientName}`)}
            `);
        });

        return queries;
    }
}

class Layer3 extends ClientReporting {
    constructor(clientConfig) {
        super(clientConfig)
    }

    publishLayer() {
        return publish(`l3_out_marketing_${this._clientName}`, {
            type: 'table',
            database: this._outputDatabase,
            schema: 'l3_out_marketing',
            tags: ['layer_3', 'out'],
        }).query(ctx => `
            with base as (
                select 
                    COALESCE(ga4.date, cpg.date) as date,
                    COALESCE(ga4.client_id, cpg.client_id) as client_id,
                    COALESCE(ga4.client_name, cpg.client_name) as client_name,
                    COALESCE(ga4.project_id, cpg.project_id) as project_id,
                    COALESCE(ga4.project_name, cpg.project_name) as project_name,
                    COALESCE(ga4.source, cpg.source) as source,
                    COALESCE(ga4.medium, cpg.medium) as medium,
                    concat(COALESCE(ga4.source, cpg.source), " / ", COALESCE(ga4.medium, cpg.medium)) as source_medium,
                    COALESCE(ga4.campaign_name, cpg.campaign_name) as campaign_name,
                    COALESCE(ga4.campaign_name_join, cpg.campaign_name_join) as campaign_name_join,
                    sum(sessions) as sessions,
                    sum(clicks) as clicks,
                    sum(impressions) as impressions,
                    sum(cost_original_currency) as cost_original_currency,
                    sum(cost_czk) as cost_czk,
                    sum(cost_eur) as cost_eur,
                    sum(revenue_original_currency) as ga4_revenue_original_currency,
                    sum(revenue_czk) as ga4_revenue_czk,
                    sum(revenue_eur) as ga4_revenue_eur,
                    sum(transactions) as ga4_transactions,
                    sum(conversion_value_original_currency) as mkt_conversion_value_original_currency,
                    sum(conversion_value_czk) as mkt_conversion_value_czk,
                    sum(conversion_value_eur) as mkt_conversion_value_eur,
                    sum(conversions) as mkt_conversions,
                from 
                    ${ctx.ref(`l2_ga4_ecomm_${clientConfig.name}`)} as ga4
                full join  
                    ${ctx.ref(`l2_campaigns_${clientConfig.name}`)} as cpg
                USING (
                    date, 
                    client_id,
                    client_name,
                    project_id,
                    project_name,
                    source,
                    medium,
                    campaign_name_join
                )
                group by 
                    all
            )
            , agg as (
                select 
                    date,
                    client_id,
                    client_name,
                    project_id,
                    project_name,
                    source,
                    medium,
                    source_medium,
                    campaign_name,
                    campaign_name_join,
                    sum(sessions) as sessions,
                    sum(clicks) as clicks,
                    sum(impressions) as impressions,
                    sum(cost_original_currency) as cost_original_currency,
                    sum(cost_czk) as cost_czk,
                    sum(cost_eur) as cost_eur,
                    sum(ga4_revenue_original_currency) as ga4_revenue_original_currency,
                    sum(ga4_revenue_czk) as ga4_revenue_czk,
                    sum(ga4_revenue_eur) as ga4_revenue_eur,
                    sum(ga4_transactions) as ga4_transactions,
                    sum(mkt_conversion_value_original_currency) as mkt_conversion_value_original_currency,
                    sum(mkt_conversion_value_czk) as mkt_conversion_value_czk,
                    sum(mkt_conversion_value_eur) as mkt_conversion_value_eur,
                    sum(mkt_conversions) as mkt_conversions,
                from 
                    base 
                group by 
                    all
            )
            select 
                current_datetime() as updated_datetime,
                *
                -- date,
                -- client_id,
                -- client_name,
                -- project_id,
                -- project_name,
                -- source,
                -- medium,
                -- source_medium,
                -- campaign_name,
                -- campaign_name_join,
                -- sessions,
                -- clicks,
                -- impressions,
                -- cost_original_currency,
                -- cost_czk,
                -- cost_eur,
                -- ga4_revenue_original_currency,
                -- ga4_revenue_czk,
                -- ga4_revenue_eur,
                -- ga4_transactions,
                -- mkt_conversion_value_original_currency,
                -- mkt_conversion_value_czk,
                -- mkt_conversion_value_eur,
                -- mkt_conversions,
            from agg
        `)
    }
}

module.exports = {
    ClientReporting,
    Layer0,
    Layer1,
    Layer2,
    Layer3
}