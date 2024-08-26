// const creators = require('./includes/tablesAndViesCreators');
const {
  getLayer1JoinQuery,
  addSourceMediumFromPlatform,
  adjustGa4SourceMedium,
  normalizeCampaignName,
  addClicksColumn,
  addCostsColumn,
  addPlatformAccountName,
  addCurrency,
  addConversionsColumn,
  addDateColumn,
} = require("./includes/helpers");
const { platformColumns } = require("./includes/constants");

class ClientReporting {
  /**
   * @class ClientReporting
   * @description Class ClientReporting is the main class for generating client reporting views.
   * @param {Object} clientConfig - client configuration object
   * @param {string} clientConfig.name - client name
   * @param {string} [clientConfig.id] - client id (optional, defaults to client name)
   * @param {string} [clientConfig.inputDataGcpProject] - client's input data GCP project id (optional, defaults to 'niftyminds-client-reporting')
   * @param {string} [clientConfig.outputDataGcpProject] - client's output data GCP project id (optional, defaults to 'niftyminds-client-reporting')
   * @param {string[]} clientConfig.platforms - list of platforms for which to create views
   * @param {Object} clientConfig.projects - object containing project mappings for each platform
   * @param {string} [clientConfig.currencyTableId] - id of currency table (optional, defaults to 'niftyminds-client-reporting.00_currencies.vw_all_currencies_add_eur_eur')
   * @param {string} [clientConfig.clientsAndProjectsTableId] - id of clients and projects table (optional, defaults to 'niftyminds-client-reporting.00_other.clients_and_projects')
   */
  constructor(clientConfig) {
    /**
     * Client name
     * @type {string}
     */
    this._clientName = clientConfig.name;

    /**
     * Client id
     * @type {string}
     */
    this._clientId = clientConfig.id || this._clientName;

    /**
     * Client's input data GCP project id
     * @type {string}
     */
    this._inputDatabase =
      clientConfig.inputDataGcpProject || "niftyminds-client-reporting";

    /**
     * Client's output data GCP project id
     * @type {string}
     */
    this._outputDatabase =
      clientConfig.outputDataGcpProject || "niftyminds-client-reporting";

    /**
     * List of platforms for which to create views
     * @type {string[]}
     */
    this._inputPlatforms = clientConfig.platforms;

    /**
     * Object containing project mappings for each platform
     * @type {Object}
     */
    this._projectMappings = clientConfig.projects;

    /**
     * Id of currency table
     * @type {string}
     */
    this._currencyTableId =
      clientConfig.currencyTableId ||
      "niftyminds-client-reporting.00_currencies.vw_all_currencies_add_eur_eur";

    /**
     * Id of clients and projects table
     * @type {string}
     */
    this._clientsAndProjectsTableId =
      clientConfig.clientsAndProjectsTableId ||
      "niftyminds-client-reporting.00_other.clients_and_projects";

    /**
     * Currency table config
     * @type {Object}
     */
    this._currencyTableConfig = {
      database: this._currencyTableId.split(".")[0],
      schema: this._currencyTableId.split(".")[1],
      name: this._currencyTableId.split(".")[2],
      tags: ["source_definition", "declaration"],
    };

    /**
     * Clients and projects table config
     * @type {Object}
     */
    this._clientsAndProjectsTableConfig = {
      database: this._clientsAndProjectsTableId.split(".")[0],
      schema: this._clientsAndProjectsTableId.split(".")[1],
      name: this._clientsAndProjectsTableId.split(".")[2],
      tags: ["source_definition", "declaration"],
    };
  }
}

class Layer0 extends ClientReporting {
  /**
   * Creates a Layer 0 query for the given schema, table name, and platform.
   *
   * Layer 0 queries are the first step in the data transformation process.
   * They select all columns from the input table and perform simple transformations
   * such as casting the platform_account_id column to string and renaming it to
   * platform_account_name if the platform is not heureka or sklik or cj_affil.
   *
   * If the platform is cj_affil, it also recalculates cost_original_currency to
   * positive numbers and casts date to date type.
   * Additionally, campaign_id and campaign_name columns are added.
   * Note that the approach for cj_affil is really different from other platforms.
   *
   * The query is published as a view in the views_l0_define_inputs schema.
   *
   * @param {string} schema - The schema of the table.
   * @param {string} tableName - The name of the table.
   * @param {string} platform - The platform for which the query is being created.
   * @return {object} The created query object.
   */
  constructor(clientConfig) {
    super(clientConfig);

    /**
     * Creates a Layer 0 query for the given schema, table name, and platform.
     *
     * Layer 0 queries are the first step in the data transformation process.
     * They select all columns from the input table and perform simple transformations
     * such as casting the platform_account_id column to string and renaming it to
     * platform_account_name if the platform is not heureka or sklik or cj_affil.
     * If the platform is cj_affil, it also recalculates cost_original_currency to
     * positive numbers and casts date to date type.
     * Additionally, campaign_id and campaign_name columns are added.
     * Note that the approach for cj_affil is really different from other platforms.
     *
     * The query is published as a view in the views_l0_define_inputs schema.
     *
     * @param {string} schema - The schema of the table.
     * @param {string} tableName - The name of the table.
     * @param {string} platform - The platform for which the query is being created.
     * @return {object} The created query object.
     */
    this._createLayer0Query = (schema, tableName, platform) => {
      /**
       * If the platform is not heureka or sklik or cj_affil, add the platform_account_name column.
       */
      let platformAccNameCondition = ``;
      if (
        !platform.includes("heureka") &&
        !["sklik", "cj_affil"].includes(platform)
      ) {
        platformAccNameCondition = `,cast(platform_account_name as string) as platform_account_name`;
      }

      /**
       * If the platform is cj_affil, rename the cost_original_currency column to cost_original_currency and the date column to date.
       */
      let cjAffilReplaceCols = ``;
      let cjAffilNewCols = ``;
      if (platform === "cj_affil") {
        cjAffilReplaceCols = `, safe_multiply(cost_original_currency, -1) as cost_original_currency, date(date) as date`;
        cjAffilNewCols = `
                    , REGEXP_REPLACE( 
                        REGEXP_REPLACE(NET.REG_DOMAIN(click_referring_url), r"^www\\.", "" ), 
                            r"\\.", 
                            "_" 
                    ) as campaign_name
                    , website_id as campaign_id,
                    date as timestamp,
                `;
      }

      return publish(`vw_${schema}_${tableName}`, {
        type: "view",
        database: this._outputDatabase,
        schema: "views_l0_define_inputs",
        name: tableName,
        tags: ["source_definition", "view"],
      }).query(
        () => `
                SELECT 
                    * 
                    ${
                      schema.includes("campaigns")
                        ? `REPLACE(
                            cast(platform_account_id as string) as platform_account_id
                            ${platformAccNameCondition}
                            ${cjAffilReplaceCols}
                        )`
                        : ""
                    }
                    ${cjAffilNewCols}

                FROM \`${this._inputDatabase}.${schema}.${tableName}\`
            `
      );
    };
  }

  /**
   * Publishes definitions for the given type.
   *
   * Generates and returns an array of queries based on the provided type.
   * Supports different types such as 'campaigns', 'ga4', 'currencies', and 'clients_and_projects'.
   * For 'campaigns' and 'ga4' types, it generates queries for multiple platforms.
   * For 'currencies' and 'clients_and_projects' types, it returns a single query.
   *
   * @param {string} type - The type of definitions to publish. Can be 'campaigns', 'ga4', 'currencies', or 'clients_and_projects'.
   * @return {array} An array of queries for the given type.
   */
  publishDefinitions(type) {
    const queries = [];

    let platforms;
    switch (type) {
      case "campaigns":
        platforms = this._inputPlatforms.filter(
          (platform) => platform !== "ga4"
        );
        break;
      case "ga4":
        platforms = ["ga4_ecomm", "ga4_meta"];
        break;
      case "currencies":
        return declare(this._currencyTableConfig);
      case "clients_and_projects":
        return declare(this._clientsAndProjectsTableConfig);
      default:
        throw new Error(
          `Error in Layer1.publishDefinitions: Invalid type: ${type}`
        );
    }

    platforms.forEach((platform) => {
      const schema =
        type === "campaigns" ? `l0_${platform}_campaigns` : `l0_${platform}`;
      const name = this._clientName;

      if (platform === "facebook") {
        const fbTables = ["spend_impressions", "conversions_clicks"];
        fbTables.forEach((table) => {
          const schemaName = `${schema}_${table}`;
          queries.push(this._createLayer0Query(schemaName, name, platform));
        });
      } else {
        queries.push(this._createLayer0Query(schema, name, platform));
      }
    });

    return queries;
  }
}

class Layer1 extends ClientReporting {
  constructor(clientConfig) {
    super(clientConfig);

    this._ga4EcommAndMetaJoinConfig = {
      database: this._outputDatabase,
      schema: "l1_ga4_ecomm",
      name: `l1_ga4_ecomm_${this._clientName}`,
      inputSuffixes: ["ecomm", "meta"],
    };

    this._campaignsUnionConfig = {
      database: this._outputDatabase,
      schema: "l1_campaigns",
      name: `l1_campaigns_${this._clientName}`,
      platformColumns: platformColumns,
    };

    this._createUnionForCampaignData = (ctx) => {
      let query = this._inputPlatforms.map((platform, ix) => {
        // ga4
        if (ix === 0) return ``;

        // facebook or cj_affil

        // if (['facebook', 'cj_affil'].includes(platform)) {

        // ${platform === 'facebook' ? getFacebookJoinQuery(ctx, this._clientName) : ctx.ref(`vw_l0_${platform}_campaigns_${this._clientName}`)}
        return `
                        SELECT 
                            ${addDateColumn(platform)},
                            '${platform}' as platform_name,
                            '${
                              addSourceMediumFromPlatform(platform).source
                            }' as source,
                            '${
                              addSourceMediumFromPlatform(platform).medium
                            }' as medium,
                            platform_account_id as platform_account_id,
                            ${
                              !this._campaignsUnionConfig.platformColumns[
                                platform
                              ].includes("platform_account_name")
                                ? addPlatformAccountName(
                                    platform,
                                    this._clientName
                                  )
                                : "platform_account_name"
                            } as platform_account_name,
                            ${
                              !this._campaignsUnionConfig.platformColumns[
                                platform
                              ].includes("currency_code")
                                ? addCurrency(platform)
                                : "currency_code"
                            } as currency_code,
                            ${
                              !this._campaignsUnionConfig.platformColumns[
                                platform
                              ].includes("campaign_name")
                                ? `concat('${
                                    addSourceMediumFromPlatform(platform).source
                                  }', '_', '${
                                    addSourceMediumFromPlatform(platform).medium
                                  }')`
                                : "campaign_name"
                            } as campaign_name,
                            ${
                              !this._campaignsUnionConfig.platformColumns[
                                platform
                              ].includes("campaign_id")
                                ? `ABS(FARM_FINGERPRINT((concat('${
                                    addSourceMediumFromPlatform(platform).source
                                  }', '_', '${
                                    addSourceMediumFromPlatform(platform).medium
                                  }'))))`
                                : "campaign_id"
                            } as campaign_id,
                            ${
                              !this._campaignsUnionConfig.platformColumns[
                                platform
                              ].includes("impressions")
                                ? `NULL`
                                : "impressions"
                            } as impressions,
                            ${addClicksColumn(platform)},
                            ${addCostsColumn(platform)},
                            ${addConversionsColumn(platform)},
                            -- conversions,
                            conversion_value_original_currency,
                        FROM 
                            ${getLayer1JoinQuery(
                              ctx,
                              platform,
                              this._clientName
                            )}
                        WHERE 
                            date is not null 
                            or cast(date as string) != ''
                    `;
      });

      return query.slice(1).join("  UNION ALL  ");
    };
  }

  unionCampaignData() {
    const { database, schema, name } = this._campaignsUnionConfig;
    return publish(name, {
      type: "incremental",
      database: database,
      schema: schema,
      tags: ["layer_1", "campaigns", "incremental"],
      uniqueKey: [
        "date",
        "platform_name",
        "platform_account_id",
        "source",
        "medium",
        "campaign_id",
        "campaign_name",
      ],
      bigquery: {
        partitionBy: "date",
        clusterBy: ["platform_name", "platform_account_id", "campaign_id"],
      },
    }).query((ctx) => this._createUnionForCampaignData(ctx));
  }

  joinGa4EcommAndMeta() {
    const { database, schema, name, inputSuffixes } =
      this._ga4EcommAndMetaJoinConfig;
    return publish(name, {
      type: "incremental",
      database: database,
      schema: schema,
      tags: ["layer_1", "ga4", "incremental"],
      uniqueKey: [
        "date",
        "platform_account_id",
        "platform_property_id",
        "source",
        "medium",
        "campaign_name",
        "currency_code",
      ],
      bigquery: {
        partitionBy: "date",
        clusterBy: [
          "platform_account_id",
          "platform_property_id",
          "source",
          "medium",
        ],
      },
    }).query(
      (ctx) => `
                SELECT 
                    * EXCEPT(property_id, property_name, account_id, account_name, currency_code, sessions, revenue_original_currency, transactions),
                    'ga4_ecomm' as platform_name,
                    cast(property_id as string) as platform_property_id,
                    cast(property_name as string) as platform_property_name,
                    cast(account_id as string) as platform_account_id,
                    cast(account_name as string) as platform_account_name,
                    ga4_ecomm.currency_code,
                    sum(sessions) as sessions,
                    sum(revenue_original_currency) as revenue_original_currency,
                    sum(transactions) as transactions,
                FROM 
                    ${ctx.ref(
                      `vw_l0_ga4_${inputSuffixes[0]}_${this._clientName}`
                    )} as ga4_ecomm
                LEFT JOIN (
                    SELECT 
                        SPLIT(property_key, '/')[SAFE_OFFSET(1)] as property_id,
                        property_name,
                        SPLIT(account_key, '/')[SAFE_OFFSET(1)] as account_id,
                        account_name
                    FROM 
                    ${ctx.ref(
                      `vw_l0_ga4_${inputSuffixes[1]}_${this._clientName}`
                    )}
                ) USING (property_id)
                group by all
            `
    );
  }
}

class Layer2 extends ClientReporting {
  constructor(clientConfig) {
    super(clientConfig);
    /**
     * Constructs case statements for project IDs, project names, and currency codes based on the given platforms, campaigns, propertyIdKey, customPlatformCaseWhen, and customPlatformCurrencyCode.
     *
     * @param {Array} platforms - An array of platforms.
     * @param {boolean} campaigns - A boolean indicating whether campaigns are true or false.
     * @param {string} propertyIdKey - The key for the property ID.
     * @param {Object} customPlatformCaseWhen - An optional object containing custom case statements for the platform's project ID and project name.
     * @param {Object} customPlatformCurrencyCode - An optional object containing custom currency codes for each platform.
     * @return {Object} An object containing the constructed case statements for project IDs, project names, and currency codes.
     * @throws {Error} When the value for a platform is undefined in clientConfig.projects and the when statements for the platform's project ID and project name are not provided.
     * @throws {Error} When both project ID and project name WHEN ... THEN statements are not provided when the value for a platform is undefined in clientConfig.projects.
     */
    this._constructJoinColumnsCaseStatements = (
      platforms,
      campaigns,
      propertyIdKey,
      customPlatformCaseWhen = {},
      customPlatformCurrencyCode
    ) => {
      // Initialize an object to store case statements for project IDs and project names
      const platformCases = {
        project_id: [],
        project_name: [],
        currency_code: [],
      };

      // Construct case statements for each platform
      platforms.forEach((platform) => {
        // Add platform name condition if campaigns are true
        const platformNameCondition = campaigns
          ? `platform_name = '${platform}' and`
          : "";
        const platformProjects = this._projectMappings[platform];
        let caseStatementProjectName = ``;
        let caseStatementProjectId = ``;
        let caseStatementCurrencyCode = ``;

        if (platformProjects === "custom") {
          if (!customPlatformCaseWhen[platform]) {
            throw new Error(`
                            Error in Layer2.addJoinColumnsCampaigns() in nested method: _constructJoinColumnsCaseStatements():
                                When the value for platform '${platform}' is undefined in, 'clientConfig.projects' the when statements for the platform's
                                'project_id' and 'project_name' must be provided in the last 'customPlatformCaseWhen' argument of the function. 
                        `);
          }
          if (
            Object.keys(customPlatformCaseWhen[platform]).filter((p) =>
              ["project_id", "project_name"].includes(p)
            ).length !== 2
          ) {
            throw new Error(`
                            Error in Layer2.addJoinColumnsCampaigns() in nested method: _constructJoinColumnsCaseStatements():
                                Both 'project_id' and 'project_name' WHEN ... THEN statements must be provided 
                                when the value for platform '${platform}' is undefined in, 'clientConfig.projects'
                        `);
          }

          caseStatementProjectName =
            customPlatformCaseWhen[platform].project_name;
          caseStatementProjectId = customPlatformCaseWhen[platform].project_id;
        } else {
          // Construct case statements for project IDs
          caseStatementProjectId = platformProjects
            .map(
              (project) =>
                `when ${platformNameCondition} ${propertyIdKey} = '${project.property_id}' then '${project.project_id}'`
            )
            .join("\n ");

          // Construct case statements for project names
          caseStatementProjectName = platformProjects
            .map(
              (project) =>
                `when ${platformNameCondition} ${propertyIdKey} = '${project.property_id}' then '${project.project_name}'`
            )
            .join("\n ");
        }

        if (
          customPlatformCurrencyCode &&
          customPlatformCurrencyCode[platform]
        ) {
          caseStatementCurrencyCode = `when ${platformNameCondition.replace(
            " and",
            ""
          )} then ${customPlatformCurrencyCode[platform]}`;
        }

        // Append the constructed case statements to platformCases
        platformCases.project_id.push(caseStatementProjectId);
        platformCases.project_name.push(caseStatementProjectName);
        platformCases.currency_code.push(caseStatementCurrencyCode);
      });

      return {
        project_id: platformCases.project_id.join("\n "),
        project_name: platformCases.project_name.join("\n "),
        currency_code: platformCases.currency_code.join("\n "),
      };
    };

    /**
     * Adds join columns and currency conversion to the input data.
     *
     * @param {boolean} [campaigns=true] - Whether to process campaigns or GA4 data.
     * @param {object} [customPlatformCaseWhen] - Custom case when statements for platforms.
     * @param {string} [customPlatformCurrencyCode] - Custom currency code for platforms.
     * @return {object} The modified data with join columns and currency conversion.
     */
    this._addJoinColumnsAndCurrencyConversion = (
      campaigns = true,
      customPlatformCaseWhen,
      customPlatformCurrencyCode
    ) => {
      const platforms = campaigns
        ? this._inputPlatforms.filter((platform) => platform !== "ga4")
        : ["ga4"];

      const propertyIdKey = campaigns
        ? "platform_account_id"
        : "platform_property_id";
      const schemaPrefix = campaigns
        ? "l2_add_join_columns_and_currency_conversion_campaigns_"
        : "l2_add_join_columns_and_currency_conversion_ga4_ecomm_";
      const refNamePrefix = campaigns ? "l1_campaigns_" : "l1_ga4_ecomm_";

      // Define schema and reference name based on client configuration name
      const schema = `${schemaPrefix}${this._clientName}`;
      const refName = `${refNamePrefix}${this._clientName}`;

      const caseStatemets = this._constructJoinColumnsCaseStatements(
        platforms,
        campaigns,
        propertyIdKey,
        customPlatformCaseWhen,
        customPlatformCurrencyCode
      );

      return publish(`vw_${schema}`, {
        type: "view",
        database: this._outputDatabase,
        schema: "views_l2_add_join_columns_and_currency_conversion",
        tags: [
          "layer_2",
          `${campaigns === true ? "campaigns" : "ga4"}`,
          "view",
        ],
      }).query(
        (ctx) => `
                with joined as (
                    select 
                        ${
                          campaigns === false
                            ? `* replace(${adjustGa4SourceMedium()}),`
                            : `
                                * 
                                ${
                                  customPlatformCurrencyCode &&
                                  caseStatemets.currency_code
                                    ? `REPLACE(
                                        case ${caseStatemets.currency_code} else currency_code end as currency_code
                                    )`
                                    : ``
                                }, 
                            `
                        }
                        -- base_table.date as date,
                        -- curr.date as curr_date,
                        '${this._clientName}' as client_name,
                        '${this._clientId}' as client_id,
                        case ${
                          caseStatemets.project_id
                        } else null end as project_id, 
                        case ${
                          caseStatemets.project_name
                        } else null end as project_name, 
                        ${
                          customPlatformCurrencyCode &&
                          caseStatemets.currency_code
                            ? caseStatemets.currency_code
                            : ``
                        }
                        ${normalizeCampaignName(
                          "campaign_name"
                        )} as campaign_name_join,
                    from 
                        ${ctx.ref(`${refName}`)} as base_table
                    left join (
                        select 
                            date as curr_date,
                            toCurrency,
                            rate as eur_curr_rate,
                            eur_czk_rate
                        from
                            ${ctx.ref(this._currencyTableConfig.name)} 

                    ) as curr
                    on base_table.date = curr.curr_date and base_table.currency_code = curr.toCurrency
                )
                , currency_conversion as (
                    select 
                        * EXCEPT(curr_date, eur_curr_rate, eur_czk_rate),
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
                                    when currency_code = 'EUR' THEN cost_original_currency
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
                                    when currency_code = 'EUR' THEN conversion_value_original_currency
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
                                    when currency_code = 'EUR' THEN revenue_original_currency
                                    else SAFE_DIVIDE(revenue_original_currency, eur_curr_rate) 
                                end as revenue_eur,
                            `
                        }
                    from 
                        joined
                    where 
                        project_id is not null
                )
                select 
                    * EXCEPT(
                        ${
                          campaigns === true
                            ? `
                                campaign_name, campaign_name_join,
                                cost_czk, cost_eur, cost_original_currency, 
                                conversion_value_czk, conversion_value_eur, conversion_value_original_currency, 
                                conversions
                            `
                            : `
                                campaign_name, campaign_name_join,
                                revenue_czk, revenue_eur, revenue_original_currency, 
                                sessions, transactions
                            `
                        }
                    ),
                    ${
                      campaigns === true
                        ? `
                            case 
                                when source = 'cj' and medium = 'affiliate' then project_name
                                when source = 'heureka' and medium = 'product' then 'heureka_product'
                                else campaign_name
                            end as campaign_name,
                            case 
                                when source = 'cj' and medium = 'affiliate' then ${normalizeCampaignName(
                                  "project_name"
                                )}
                                when source = 'heureka' and medium = 'product' then 'HEUREKA_PRODUCT'
                                else campaign_name_join
                            end as campaign_name_join,
                            SUM(cost_czk) as cost_czk , 
                            SUM(cost_eur) as cost_eur , 
                            SUM(cost_original_currency) as cost_original_currency , 
                            SUM(conversion_value_czk) as conversion_value_czk , 
                            SUM(conversion_value_eur) as conversion_value_eur , 
                            SUM(conversion_value_original_currency) as conversion_value_original_currency , 
                            SUM(conversions) as conversions ,
                        `
                        : `
                            case 
                                when source = 'cj' and medium = 'affiliate' then project_name
                                when source = 'heureka' and medium = 'product' then 'heureka_product'
                                else campaign_name
                            end as campaign_name,
                            case 
                                when source = 'cj' and medium = 'affiliate' then ${normalizeCampaignName(
                                  "project_name"
                                )}
                                when source = 'heureka' and medium = 'product' then 'HEUREKA_PRODUCT'
                                else campaign_name_join
                            end as campaign_name_join,
                            SUM(revenue_czk) as revenue_czk, 
                            SUM(revenue_eur) as revenue_eur, 
                            SUM(revenue_original_currency) as revenue_original_currency, 
                            SUM(sessions) as sessions, 
                            SUM(transactions) as transactions,
                        `
                    }
                from 
                    currency_conversion
                group by 
                    all
            `
      );
    };

    /**
     * Constructs a deduplication query for removing duplicate records.
     *
     * @param {boolean} isCampaigns - indicates whether the query is for campaigns or GA4 e-commerce data
     * @return {string} the constructed deduplication query
     */
    this._constructDeduplicationQuery = (isCampaigns) => {
      const deduplicationSuffix = isCampaigns ? "campaigns" : "ga4_ecomm";

      return publish(
        `vw_l2_remove_duplicates_${deduplicationSuffix}_${this._clientName}`,
        {
          type: "view",
          database: this._outputDatabase,
          schema: "views_l2_remove_duplicates",
          tags: ["layer_2", `${isCampaigns ? "campaigns" : "ga4"}`, "view"],
        }
      ).query((ctx) => {
        const removeDuplicatesColumns = `
                    date,
                    client_id,
                    client_name,
                    project_id,
                    project_name,
                    platform_name,
                    currency_code,
                    ${isCampaigns ? "campaign_id," : ""}
                    campaign_name,
                    campaign_name_join
                `;

        const deduplicationColumns = `
                    row_number() over (
                        partition by
                            ${removeDuplicatesColumns}
                        order by
                            date
                    ) as rn
                `;

        const removeDuplicatesQuery = `
                    select
                        * except(rn),
                        case
                            when project_name not in (select distinct project_name from ${ctx.ref(
                              "clients_and_projects"
                            )}) then false
                            else true
                        end as is_project_defined
                    from (
                        select
                            *,
                            ${deduplicationColumns}
                        from
                            ${ctx.ref(
                              `vw_l2_add_join_columns_and_currency_conversion_${deduplicationSuffix}_${this._clientName}`
                            )}
                    )
                    where rn = 1
                `;

        return removeDuplicatesQuery;
      });
    };
  }

  /**
   * Adds join columns and currency conversion for campaigns.
   *
   * @param {Object} customPlatformCaseWhen - Object containing custom platform case when statements.
   * @return {string} SQL query to add join columns and currency conversion for campaigns.
   */
  addJoinColumnsAndCurrencyConversionCampaigns(customPlatformCaseWhen) {
    // Call the private method _addJoinColumnsAndCurrencyConversion to add join columns and currency conversion for campaigns.
    // The first argument is set to true to indicate that it is for campaigns.
    // The second argument is the custom platform case when statements.
    return this._addJoinColumnsAndCurrencyConversion(
      true,
      customPlatformCaseWhen
    );
  }
  /**
   * Adds join columns and currency conversion for GA4 data.
   *
   * @return {string} SQL query to add join columns and currency conversion for GA4 data.
   */
  addJoinColumnsAndCurrencyConversionGa4() {
    // Call the private method _addJoinColumnsAndCurrencyConversion to add join columns and currency conversion for GA4 data.
    // The first argument is set to false to indicate that it is for GA4 data.
    // The second argument is an empty object to indicate that there are no custom platform case when statements.
    return this._addJoinColumnsAndCurrencyConversion(false, {});
  }

  /**
   * Removes duplicates before the join in Layer3 for campaigns.
   *
   * @return {string} SQL query to remove duplicates before the join in Layer3 for campaigns.
   */
  removeDuplicatesCampaigns() {
    // Call the private method _constructDeduplicationQuery to remove duplicates before the join in Layer3.
    // The first argument is set to true to indicate that it is for campaigns.
    return this._constructDeduplicationQuery(true);
  }
  /**
   * Removes duplicates before the join in Layer3 for GA4 data.
   *
   * @return {string} SQL query to remove duplicates before the join in Layer3 for GA4 data.
   */
  removeDuplicatesGa4() {
    // Call the private method _constructDeduplicationQuery to remove duplicates before the join in Layer3.
    // The first argument is set to false to indicate that it is for GA4 data.
    return this._constructDeduplicationQuery(false);
  }

  /**
   * Publishes materialized tables for campaigns and GA4 eCommerce data.
   *
   * @return {Array} Array of queries to publish materialized tables.
   */
  publishLayer() {
    // Define an array of names for the tables to be published.
    const names = ["campaigns", "ga4_ecomm"];

    // Map over the names array and create a query for each name.
    const queries = names.map((name) => {
      // Create a publish statement for a materialized table.
      return (
        publish(`l2_${name}_${this._clientName}`, {
          type: "table", // Set the type to 'table'.
          database: this._outputDatabase, // Set the database to the value of _outputDatabase.
          schema: `l2_${name}`, // Set the schema to 'l2_<name>'.
          tags: ["layer_2", `${name === "campaigns" ? "campaigns" : "ga4"}`], // Set the tags based on the name.
          // assertions: {
          //     uniqueKey: ['date', 'source', 'medium', 'campaign_name']
          // }
        })
          // Set the query to select all from a view that removes duplicates based on the name.
          .query(
            (ctx) => `
                select * from ${ctx.ref(
                  `vw_l2_remove_duplicates_${name}_${this._clientName}`
                )}
            `
          )
      );
    });

    // Return the array of queries.
    return queries;
  }
}

class Layer3 extends ClientReporting {
  constructor(clientConfig) {
    super(clientConfig);
  }

  /**
   * Publishes materialized tables for out marketing data.
   *
   * @param {boolean} [addFinalModificationQuery=false] - Whether to add a final modification query.
   * @return {Object} A query to publish materialized tables.
   */
  publishLayer(addFinalModificationQuery = false) {
    // Define the query to publish materialized tables for out marketing data.
    return publish(`l3_out_marketing_${this._clientName}`, {
      type: "table", // Set the type to 'table'.
      database: this._outputDatabase, // Set the database to the value of _outputDatabase.
      schema: "l3_out_marketing", // Set the schema to 'l3_out_marketing'.
      tags: ["layer_3", "out"], // Set the tags to ['layer_3', 'out'].
    }).query(
      (ctx) => `
            /*
             * Unite the campaigns and GA4 eCommerce data.
             */
            with base as (
                /*
                 * Query the campaigns table.
                 */
                select 
                    date,
                    client_id,
                    client_name,
                    project_id,
                    project_name,
                    is_project_defined,
                    source,
                    medium,
                    campaign_name,
                    campaign_name_join,
                    SUM(0) AS sessions,
                    SUM(clicks) AS clicks,
                    SUM(impressions) AS impressions,
                    SUM(cost_original_currency) AS cost_original_currency,
                    SUM(cost_czk) AS cost_czk,
                    SUM(cost_eur) AS cost_eur,
                    SUM(0) AS ga4_revenue_original_currency,
                    SUM(0) AS ga4_revenue_czk,
                    SUM(0) AS ga4_revenue_eur,
                    SUM(0) AS ga4_transactions,
                    SUM(conversion_value_original_currency) AS mkt_conversion_value_original_currency,
                    SUM(conversion_value_czk) AS mkt_conversion_value_czk,
                    SUM(conversion_value_eur) AS mkt_conversion_value_eur,
                    SUM(conversions) AS mkt_conversions,
                from 
                    ${ctx.ref(`l2_campaigns_${this._clientName}`)}
                group by all
                union all 
                /*
                 * Query the GA4 eCommerce table.
                 */
                select 
                    date,
                    client_id,
                    client_name,
                    project_id,
                    project_name,
                    is_project_defined,
                    source,
                    medium,
                    campaign_name,
                    campaign_name_join,
                    sum(sessions) AS sessions,
                    SUM(0) AS clicks,
                    SUM(0) AS impressions,
                    SUM(0) AS cost_original_currency,
                    SUM(0) AS cost_czk,
                    SUM(0) AS cost_eur,
                    SUM(revenue_original_currency) AS ga4_revenue_original_currency,
                    SUM(revenue_czk) AS ga4_revenue_czk,
                    SUM(revenue_eur) AS ga4_revenue_eur,
                    SUM(transactions) AS ga4_transactions,
                    SUM(0) AS mkt_conversion_value_original_currency,
                    SUM(0) AS mkt_conversion_value_czk,
                    SUM(0) AS mkt_conversion_value_eur,
                    SUM(0) AS mkt_conversions,
                from 
                     ${ctx.ref(`l2_ga4_ecomm_${this._clientName}`)}
                group by all
            )
            /*
             * Add new columns
             */
            , addCols as (
              select 
                *,
                CONCAT(source, ' / ', medium) as source_medium,
                case 
                    when medium in ('affiliate', 'cpc', 'product', 'ppc', 'paid') then 'paid'
                    else 'non-paid'
                end as is_paid,
                case 
                    when source = 'cj' and medium = 'affiliate' then 'affiliate'
                    when source = 'heureka' and medium = 'product' then 'product'
                    when contains_substr(campaign_name, ' | ') and SPLIT(campaign_name, " | ")[safe_offset(1)] is not null
                        then SPLIT(campaign_name, " | ")[safe_offset(1)] 
                    else 'Other'
                end as campaign_type,
                case 
                    when source = 'cj' and medium = 'affiliate' then 'All'
                    when source = 'heureka' and medium = 'product' then 'All'
                    when contains_substr(campaign_name, ' | ') and SPLIT(campaign_name, " | ")[safe_offset(2)] is not null 
                        then SPLIT(campaign_name, " | ")[safe_offset(2)] 
                    when contains_substr(campaign_name, ' | ') and SPLIT(campaign_name, " | ")[safe_offset(2)] is null 
                        then 'All'
                    else 'Other'
                end as campaign_targeting,
              from 
                base
            )
            /*
             * Aggregate the united data.
             */
            , agg as (
                select 
                    date,
                    client_id,
                    client_name,
                    project_id,
                    project_name,
                    is_project_defined,
                    source,
                    medium,
                    source_medium,
                    is_paid,
                    campaign_type,
                    campaign_targeting,
                    campaign_name,
                    campaign_name_join,
                    SUM(sessions) AS sessions,
                    SUM(clicks) AS clicks,
                    SUM(impressions) AS impressions,
                    SUM(cost_original_currency) AS cost_original_currency,
                    SUM(cost_czk) AS cost_czk,
                    SUM(cost_eur) AS cost_eur,
                    SUM(ga4_revenue_original_currency) AS ga4_revenue_original_currency,
                    SUM(ga4_revenue_czk) AS ga4_revenue_czk,
                    SUM(ga4_revenue_eur) AS ga4_revenue_eur,
                    SUM(ga4_transactions) AS ga4_transactions,
                    SUM(mkt_conversion_value_original_currency) AS mkt_conversion_value_original_currency,
                    SUM(mkt_conversion_value_czk) AS mkt_conversion_value_czk,
                    SUM(mkt_conversion_value_eur) AS mkt_conversion_value_eur,
                    SUM(mkt_conversions) AS mkt_conversions,
                from 
                    addCols 
                group by all
            )
            /*
             * Add a final modification query if specified.
             */
            , lastQuery as (
                ${
                  addFinalModificationQuery
                    ? `
                        /* 
                         * Add a final modification query.
                         */
                        ${addFinalModificationQuery}
                    `
                    : `
                        /*
                         * Select all columns from the aggregated data.
                         */
                        select 
                            *
                        from 
                            agg
                    `
                }
            )
            /*
             * Select all columns from the last query.
             */
            select 
                *
            from 
                lastQuery

        `
    );
  }
}

module.exports = {
  ClientReporting,
  Layer0,
  Layer1,
  Layer2,
  Layer3,
};
