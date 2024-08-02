function l0ViewsDefineInputs(clientConfig, campaignData = true) {
    const queries = [];
    let platforms;
    if (campaignData === true) {
        platforms = clientConfig.platforms.filter(p => p !== 'ga4');
    } else {
        platforms = ['ga4_ecomm', 'ga4_meta'];
    }

    platforms.forEach((platform) => {
        const createQuery = (database, schema, name) => {
            return publish(`vw_${schema}_${name}`, {
                type: 'view',
                database: database,
                schema: 'l0_views_define_inputs',
                name: name
            }).query(ctx => `
                SELECT 
                    * 
                    ${
                        campaignData === true 
                        ? `REPLACE(
                            cast(platform_account_id as string) as platform_account_id
                            ${platform.includes('heureka') ? `` : `,cast(platform_account_name as string) as platform_account_name`}
                        )`
                        : ''    
                    }
                FROM \`${database}.${schema}.${name}\`
            `)
        };
        const database = clientConfig.project || 'niftyminds-client-reporting';
        let schema = campaignData === true ? `l0_${platform}_campaigns` : `l0_${platform}`;
        let name = `${clientConfig.name}`; // `${clientConfig.name}_${clientConfig.id}`

        // Add 2 facebook tables
        if (platform === 'facebook') {
            const fbTables = ['spend_impressions', 'conversions_clicks'];
            fbTables.forEach((fbt) => {
                // const fbName = `${name}_${fbt}`;
                const fbSchema = `${schema}_${fbt}`;
                queries.push(createQuery(database, fbSchema, name));
            })
        } else {
            // temperaty solution for google ads where data are currently not possible to query for monkeymum_com account / client
            // if (platform === 'google_ads') name = 'niftyminds_mcc';

            queries.push(
                createQuery(database, schema, name)
            )
        }

    });

    return queries;
}
/*
    Function joins metadata tabble with ecommerce session sources table
    in order to obtain the name of the GA4 property
*/
function l1JoinGA4EcommAndMeta(clientConfig) {
    const database = clientConfig.inputDataGcpProject || 'niftyminds-client-reporting';
    const outSchema = 'l1_ga4_ecomm';
    const outTableName = `l1_ga4_ecomm_${clientConfig.name}`;
    const inputSuffixes = ['ecomm', 'meta'];

    return publish(outTableName, {
            type: 'table',
            database: database,
            schema: outSchema,
        })
        .query(ctx => `
        SELECT 
            * EXCEPT(property_id, property_name, account_id, account_name),
            cast(property_id as string) as platform_property_id,
            cast(property_name as string) as platform_property_name,
            cast(account_id as string) as platform_account_id,
            cast(account_name as string) as platform_account_name,
            '${clientConfig.name}' as client_name,
            '${clientConfig.id}' as client_id,
        FROM 
            ${ctx.ref(`vw_l0_ga4_${inputSuffixes[0]}_${clientConfig.name}`)} as ga4_ecomm
        LEFT JOIN (
            SELECT 
                SPLIT(property_key, '/')[SAFE_OFFSET(1)] as property_id,
                property_name,
                SPLIT(account_key, '/')[SAFE_OFFSET(1)] as account_id,
                account_name
            FROM 
               ${ctx.ref(`vw_l0_ga4_${inputSuffixes[1]}_${clientConfig.name}`)}
        ) USING (property_id)
    `);
}

function l1UnionCampaignData(clientConfig) {
    const database = clientConfig.project || 'niftyminds-client-reporting';
    let schema = `l1_campaigns`;
    const name = `${schema}_${clientConfig.name}`; // `${clientConfig.name}_${clientConfig.id}`

    return publish(name, {
            type: 'table',
            database: database,
            schema: schema
        })
        .query(ctx => helperFuncs.createUnionForCampaignData(ctx, clientConfig))
}

function l2ViewsRemoveDuplicates(clientConfig, database, campaigns = true) {
    const getQuery = (ctx) => `
        select 
            * except(rn)
        from (
            select 
                *,
                row_number() over (partition by                     
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
                    ${campaigns === true ? 'cost_original_currency,' : ''}
                    ${campaigns === true ? 'clicks,' : ''}
                    ${campaigns === true ? 'impressions,' : ''}
                    ${campaigns === true ? 'conversions,' : 'transactions,'}
                    ${campaigns === true ? 'conversion_value_original_currency,' : 'revenue_original_currency,'}

                    order by 
                        date
                ) as rn    
                -- count(*) as duplicates,
            from 
                ${ctx.ref(`l0_${campaigns === true ? 'campaigns' : 'ga4_ecomm'}_${clientConfig.name}`)}
        )
        where rn = 1
    `

    return publish(`vw_l2_${campaigns === true ? 'campaigns' : 'ga4_ecomm'}_${clientConfig.name}`, {
        type: 'view',
        database: database,
        schema: 'l2_remove_duplicates'
    }).query(ctx => getQuery(ctx));
}

function l2HelperViews(clientConfig, campaigns = true) {
    const projects = clientConfig.projects;
    const database = clientConfig.inputDataGcpProject || 'niftminds-client-reporting';
    // varying variablews
    let presentPlatforms = [];
    let propertyIdKey = ``;
    let platformNameCondition = ``;
    let schema = '';
    let refName = ``;
    let name = `${clientConfig.name}`;

    if (campaigns) {
        presentPlatforms = Object.keys(projects).filter(p => clientConfig.platforms.includes(p) && p !== 'ga4');
        propertyIdKey = 'platform_account_id';
        // platformNameCondition = `platform_name = '${platform}'`;
        schema = `l2_campaigns_${clientConfig.name}`;
        refName = `l1_campaigns_${clientConfig.name}`;
    } else {
        presentPlatforms = ['ga4'];
        propertyIdKey = 'platform_property_id';
        // platformNameCondition = ``;
        schema = `l2_ga4_ecomm_${clientConfig.name}`;
        refName = `l1_ga4_ecomm_${clientConfig.name}`
    }

    const platformCases = {
        project_id: [],
        project_name: []
    };
    presentPlatforms.forEach(platform => {
        platformNameCondition = campaigns ? `platform_name = '${platform}' and` : ``;
        const platformProjects = projects[platform];
        const caseStatementProjectId = platformProjects.map((project) => {
            let caseProjectId = `when ${platformNameCondition} ${propertyIdKey} = '${project.property_id}' then '${project.project_id}'`;
            return caseProjectId;
        }).join('\n ');
        const caseStatementProjectName = platformProjects.map((project) => {
            let caseProjectName = `when ${platformNameCondition} ${propertyIdKey} = '${project.property_id}' then '${project.project_name}'`;
            return caseProjectName;
        }).join('\n ');

        platformCases.project_id.push(caseStatementProjectId);
        platformCases.project_name.push(caseStatementProjectName);
    })

    return publish(`vw_${schema}`, {
            type: 'view',
            database: database,
            schema: 'l2_helper_views',
        })
        .query(ctx => `
        select 
            *
        from (
            select
                ${campaigns === false ? `* replace(${helperFuncs.adjustGa4SourceMedium()}),` : '*,'}
                case ${platformCases.project_id.join('\n ')} else null end as project_id, 
                case ${platformCases.project_name.join('\n ')} else null end as project_name, 
                ${helperFuncs.normalizeCampaignName('campaign_name')} as campaign_name_join,
            from 
                ${ctx.ref(`${refName}`)}
        )
        where 
            project_id is not null
    `)
}

function l3JoinGA4AndCampaignData(clientConfig) {
    // Create L3 - Joined campaign data with GA4 data
    // TODO: Fix currency conversion
    return publish(`l3_out_marketing_${clientConfig.name}`, {
            type: 'table',
            database: clientConfig.inputDataGcpProject || 'niftyminds-client-reporting',
            schema: 'l3_out_marketing'
        })
        .query(ctx => `
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
                sum(revenue_original_currency) as ga4_revenue_original_currency,
                sum(transactions) as ga4_transactions,
                sum(conversion_value_original_currency) as mkt_conversion_value_original_currency,
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
                sum(ga4_revenue_original_currency) as ga4_revenue_original_currency,
                sum(ga4_transactions) as ga4_transactions,
                sum(mkt_conversion_value_original_currency) as mkt_conversion_value_original_currency,
                sum(mkt_conversions) as mkt_conversions,
            from 
                base 
            group by 
                all
        )
        -- , convert_currencies as (
        --     select
        --         *,
        --         cost_original_currency
        --         ga4_revenue_original_currency
        --         mkt_conversion_value_original_currency
        --     from 
        --         agg
        --     left join 
        --         __PLACEHOLDER__
        --     USING ( date, currency_code )
        -- )
        select * from agg
    `);
}

module.exports = {
    l0ViewsDefineInputs,
    l1JoinGA4EcommAndMeta,
    l1UnionCampaignData,
    l2ViewsRemoveDuplicates,
    l2HelperViews,
    l3JoinGA4AndCampaignData
}
