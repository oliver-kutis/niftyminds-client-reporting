// const 
const client = {
    id: 1234,
    name: 'monkeymum_com',
    out_gcp_project: ''
};

const tables = {

}

const config = {
    tables: {
        project: 'nifyminds-client-reporting',
        outDatasets: {
            ga4: {
                dataset: 'l1_ga4_ecomm_session_sources',
                table: `${client.name}_${client.id}`
            },
            marketing_platforms: {
                dataset: 'l1_marketing_platforms_campaign_data',
                table: `l1`
            }
        }
    }
};