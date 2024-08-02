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
                schema: 'views_l0_define_inputs',
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
            'ga4_ecomm' as platform_name,
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
                ${ctx.ref(`vw_l2_add_join_columns_${campaigns === true ? 'campaigns' : 'ga4_ecomm'}_${clientConfig.name}`)}
        )
        where rn = 1
    `

    return publish(`vw_l2_remove_duplicates_${campaigns === true ? 'campaigns' : 'ga4_ecomm'}_${clientConfig.name}`, {
        type: 'view',
        database: database,
        schema: 'views_l2_remove_duplicates'
    }).query(ctx => getQuery(ctx));
}

function l2ViewsAddJoinColumns(clientConfig, campaigns = true) {
    // Extract projects and database information from client configuration
    const projects = clientConfig.projects;
    const database = clientConfig.inputDataGcpProject || 'niftminds-client-reporting';

    // Determine present platforms and keys based on whether campaigns are true or false
    const presentPlatforms = campaigns 
        ? Object.keys(projects).filter(p => clientConfig.platforms.includes(p) && p !== 'ga4')
        : ['ga4'];
    const propertyIdKey = campaigns ? 'platform_account_id' : 'platform_property_id';
    const schemaPrefix = campaigns ? 'l2_add_join_columns_campaigns_' : 'l2_add_join_columns_ga4_ecomm_';
    const refNamePrefix = campaigns ? 'l1_campaigns_' : 'l1_ga4_ecomm_';
    // Define schema and reference name based on client configuration name
    const schema = `${schemaPrefix}${clientConfig.name}`;
    const refName = `${refNamePrefix}${clientConfig.name}`;

    // Initialize an object to store case statements for project IDs and project names
    const platformCases = {
        project_id: [],
        project_name: []
    };

    // Construct case statements for each platform
    presentPlatforms.forEach(platform => {
        // Add platform name condition if campaigns are true
        const platformNameCondition = campaigns ? `platform_name = '${platform}' and` : '';
        const platformProjects = projects[platform];

        // Construct case statements for project IDs
        const caseStatementProjectId = platformProjects.map(project =>
            `when ${platformNameCondition} ${propertyIdKey} = '${project.property_id}' then '${project.project_id}'`
        ).join('\n ');

        // Construct case statements for project names
        const caseStatementProjectName = platformProjects.map(project =>
            `when ${platformNameCondition} ${propertyIdKey} = '${project.property_id}' then '${project.project_name}'`
        ).join('\n ');

        // Append the constructed case statements to platformCases
        platformCases.project_id.push(caseStatementProjectId);
        platformCases.project_name.push(caseStatementProjectName);
    });



    // Return the SQL query with the constructed case statements
    return publish(`vw_${schema}`, {
        type: 'view',
        database: database,
        schema: 'views_l2_add_join_columns',
    }).query(ctx => `
        select 
            *
        from (
            select 
                ${campaigns === false ? `* replace(${helperFuncs.adjustGa4SourceMedium()}),` : '*,'}
                '${clientConfig.name}' as client_name,
                '${clientConfig.id}' as client_id,
                case ${platformCases.project_id.join('\n ')} else null end as project_id, 
                case ${platformCases.project_name.join('\n ')} else null end as project_name, 
                ${helperFuncs.normalizeCampaignName('campaign_name')} as campaign_name_join
            from 
                ${ctx.ref(`${refName}`)}
        )
        where 
            project_id is not null
    `);
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
    l2ViewsAddJoinColumns,
    l3JoinGA4AndCampaignData
}
