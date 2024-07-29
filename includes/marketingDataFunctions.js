/*
    Function joins metadata tabble with ecommerce session sources table
    in order to obtain the name of the GA4 property
*/
function joinGA4MetaAndBaseTable(clientConfig) {
    const database = clientConfig.inputDataGcpProject || 'niftyminds-client-reporting';
    const outSchema = 'l1_ga4_ecomm_session_sources';
    const outTableName = helperFuncs.createTableName(clientConfig.id, clientConfig.name, "ga4_ecomm_session_sources");
    const inputSuffixes = ['ecomm_session_sources', 'meta'];
    
    return publish(outTableName, {
        type: 'table',
        database: database,
        schema: outSchema,
        // dependencies: inputSuffixes.map((suffix) => createInputTableName(database, `l0_ga4_${suffix}`, clientConfig.name)),
        hermetic: true
    })
    .query(ctx => `
        SELECT 
            *
        FROM 
            -- \`${createInputTableName(database, `l0_ga4_${inputSuffixes[0]}`, clientConfig.name)}\` as ecomm_session_sources
            ${ctx.ref(`vw_l0_ga4_${inputSuffixes[0]}_${clientConfig.name}`)} as ecomm_session_sources
        LEFT JOIN (
            SELECT 
                SAFE_CAST(SPLIT(property_key, '/')[SAFE_OFFSET(1)] as INT64) as property_id,
                property_name,
                SAFE_CAST(SPLIT(property_key, '/')[SAFE_OFFSET(1)] as INT64) as account_key,
                account_name
            FROM 
               -- \`${createInputTableName(database, `l0_ga4_${inputSuffixes[1]}`, clientConfig.name)}\`
               ${ctx.ref(`vw_l0_ga4_${inputSuffixes[1]}_${clientConfig.name}`)}
        ) USING (property_id )
    `);
}

function addProjectIdToCampaignsTable(clientConfig) {
    const database = helperFuncs.getDatabaseName(clientConfig.project);
    const schema = `l2_`
}

/* 
    Needed for all sources of data in order to join them with GA4 data correctly
*/
function addSourceMediumCampaign(source, medium, forDataset) {
    let sourceAndMedium = `
        ${source} as source,
        ${medium} as medium,
    `;
    const sourceMedium = `CONCAT(${source}, '_', ${medium}) as source_medium,`;
    sourceAndMedium += sourceMedium;

    if (!columnMappings[forDataset] || !columnMappings[forDataset].campaigns || !columnMappings[forDataset].campaings.campaign_name) {
        sourceAndMedium += `
            CONCAT(${source}, '_', ${medium}) as campaign_name,
        `
    }

    return sourceAndMedium;
}

function createInputTableName(database, schema, name) {
    return `${database}.${schema}.${name}`;
}

function declareInputTables(clientConfig, campaignData = true) {
    const queries = [];
    let platforms;
    if (campaignData === true) {
        platforms = clientConfig.platforms.filter(p => p !== 'ga4');
    } else {
        platforms = ['ecomm_session_sources', 'meta'];
    }

    platforms.forEach((platform) => {
        const database = clientConfig.project || 'niftyminds-client-reporting';
        let schema = campaignData === true ? `l0_${platform}_campaigns` : `l0_ga4_${platform}`;
        let name = `${clientConfig.name}`; // `${clientConfig.name}_${clientConfig.id}`

        // temperaty solution for google ads where data are currently not possible to query for monkeymum_com account / client
        if (platform === 'google_ads') name = 'niftyminds_mcc';

        queries.push(
            publish(`vw_${schema}_${name}`, {
                type: 'view',
                database: database,
                schema: 'l0_helper_views',
                name: name
            }).query(ctx => `SELECT * FROM \`${database}.${schema}.${name}\``)
        )

        // // google_ads - temporary solution
        // if (platform === 'google_ads') name = 'niftyminds_mcc'; 

        // if (platform === 'ga4') {
        //     // const ga4Suffixes = ['ecomm_session_sources', 'meta'];
        //     const ga4Suffixes = ['meta', 'tvojtatko']

        //     return ga4Suffixes.map(suffix => {
        //         schema = `l0_${platform}_${suffix}`;
                
        //         return publish(`vw_${schema}_${name}`, {
        //             type: 'view',
        //             database: database,
        //             schema: 'l0_helper_views',
        //             name: name
        //         }).query(ctx => `SELECT * FROM \`${database}.${schema}.${name}\``)
        //         // declare({
        //         //     database: database,
        //         //     schema: schema,
        //         //     name: `${schema}_${name}`
        //         // });
        //     })
        // } else {
        //     publish(`vw_${schema}_${name}`, {
        //             type: 'view',
        //             database: database,
        //             schema: 'l0_helper_views',
        //             name: name
        //     }).query(ctx => `SELECT * FROM \`${database}.${schema}.${name}\``)
        //     // declare({
        //     //     database: clientConfig.project || 'niftyminds-client-reporting',
        //     //     schema: schema,
        //     //     name: `${schema}_${name}` // `${clientConfig.name}_${clientConfig.id}` 
        //     // });
        // }
    });


    return queries;
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

function joinCampaignData(ctx, clientConfig, database) {

    let query = clientConfig.platforms.map((platform, ix) => {        
        let tableName = clientConfig.name;
        // ga4
        if (ix === 0) return ``;

        // google_ads - temporary solution
        if (platform === 'google_ads') tableName = 'niftyminds_mcc';
        
        // let q = ``;
        // if (ix === 1) q += `with ${platform} as `
        // else q += `${platform} as `
        
        return `
            SELECT 
                date,
                '${platform}' as platform_name,
                CAST(platform_account_id as STRING) as platform_account_id,
                ${!columnMappings.platformColumns[platform].includes('platform_account_name') ? addHeurekaPlatformAccountName(platform, clientConfig.name) : 'platform_account_name'} as platform_account_name,
                ${!columnMappings.platformColumns[platform].includes('currency_code') ? addHeurekaCurrency(platform) : 'currency_code'} as currency_code,
                ${!columnMappings.platformColumns[platform].includes('campaign_name') ? `NULL` : 'campaign_name'} as campaign_name,
                ${!columnMappings.platformColumns[platform].includes('campaign_id') ? `NULL` : 'campaign_id'} as campaign_id,
                ${!columnMappings.platformColumns[platform].includes('impressions') ? `NULL` : 'impressions'} as impressions,
                ${addClicksColumn(platform)},
                ${addCostsColumn(platform)},
                conversions,
                conversion_value,
            FROM 
                -- \`${database}.l0_${platform}_campaigns.${tableName}\`
                ${ctx.ref(`vw_l0_${platform}_campaigns_${tableName}`)}
        `;
    });

    return query.slice(1).join('  UNION ALL  ');
}

function createL1CampaignsTable(clientConfig) {
    const database = clientConfig.project || 'niftyminds-client-reporting';
    let schema = `l1_campaigns`;
    const name = `${clientConfig.name}_campaigns_joined`; // `${clientConfig.name}_${clientConfig.id}`
    
    return publish(name, {
        type: 'table',
        database: database,
        schema: schema
    })
    .query(ctx => joinCampaignData(ctx, clientConfig, database))
}

function addProjectIdToCampaignsTable(clientConfig) {
    const projects = clientConfig.projects;
    const presentPlatforms = Object.keys(projects).filter(p => clientConfig.platforms.includes(p) && p !== 'ga4');
    const platformCases = {
        project_id: [],
        project_name: []
    };
    presentPlatforms.forEach(platform => {
        const platformProjects = projects[platform];
        const caseStatementProjectId = platformProjects.map((project) => {
            let caseProjectId = `when platform_name = '${platform}' and platform_account_id = '${project.property_id}' then '${project.project_id}'`;
            return caseProjectId;
        }).join('\n ');
        const caseStatementProjectName = platformProjects.map((project) => {
            let caseProjectName = `when platform_name = '${platform}' and platform_account_id = '${project.property_id}' then '${project.project_name}'`;
            return caseProjectName;
        }).join('\n ');

        platformCases.project_id.push(caseStatementProjectId);
        platformCases.project_name.push(caseStatementProjectName);
    })

    const database = clientConfig.inputDataGcpProject || 'niftminds-client-reporting';
    const schema = 'l2_campaigns';
    const name = `${clientConfig.name}_campaigns_with_project_id`;
    
    return publish(`vw_${schema}_${name}`, {
        type: 'view',
        database: database,
        schema: 'l2_helper_views',
    })
    .query(ctx => `
        select 
            *
        from (
            select
                case ${platformCases.project_id.join('\n ')} else null end as project_id, 
                case ${platformCases.project_name.join('\n ')} else null end as project_name, 
                *
            from 
                ${ctx.ref(name.replace("campaigns_with_project_id", "campaigns_joined"))}
        )
        where 
            project_id is not null
    `)
}

module.exports = {
    joinGA4MetaAndBaseTable,
    addSourceMediumCampaign,
    declareInputTables,
    createL1CampaignsTable,
    addProjectIdToCampaignsTable
}