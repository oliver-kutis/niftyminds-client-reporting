const client = {
    id: 'monkeymum_com',
    name: 'monkeymum_com',
    inputDataGcpProject: 'niftyminds-client-reporting',
    outputDataGcpProject: '',
    ga4SourceType: 'ecomm', // can be only 'ecomm' for now
    // all currently supported platforms
    platforms: [
        'ga4',
        'google_ads',
        // 'sklik',
        // 'facebook',
        // 'bing_ads',
        'heureka_cz',
        'heureka_sk',
        // 'cj_affiliate',
    ],
    platformsWithCustomProjectDefinition: {
        byCampaignName: {
            google_ads: {
                regex: false, // TODO: regex to use in REGEXP_EXTRACT
                split: {
                    index: 0,
                    character: " | " // for split, provide split character and index to pick for country
                } 
            }
        }
    },
    // each project has an entry for the platform
    //  - If project doesn't have a separate property within platform, custom logic needs to be applied to assign it 
    //      - In that case, empty array will be passed to the platform key (as in cj_affiliate case)
    //  - In case of sklik, heureka_cz and heureka_sk (probably cj_affiliate as well), only one property_id will be present in platform data
    projects: {
        ga4: [
            {property_id: '123', project_id: 'monkeymum_cz', project_name: 'monkeymum_cz'},
            // {property_id: '123', project_id: '321', project_name: 'monkeymum_sk'}
        ],
        google_ads: [
            {property_id: '4438085976', project_id: 'monkeymum_cz', project_name: 'monkeymum_cz'},
            // {property_id: '123', project_id: '321', project_name: 'monkeymum_cz'}
        ],
        sklik: [
            {property_id: '123', project_id: '321', project_name: 'monkeymum_cz'}
        ],
        facebook: [
            {property_id: '123', project_id: '321', project_name: 'monkeymum_cz'}
        ],
        bing_ads: [
            {property_id: '123', project_id: '321', project_name: 'monkeymum_cz'}
        ],
        heureka_cz: [
            {property_id: 'b3a277632ca7b1f67901d293e21f6e2d', project_id: 'monkeymum_cz', project_name: 'monkeymum_cz'}
        ],
        heureka_sk: [
            {property_id: '4a107449e02fa5adee21d5d7abfa3076', project_id: 'monkeymum_sk', project_name: 'monkeymum_sk'}
        ],
        cj_affiliate: [
            // {property_id: '123', project_id: '321', project_name: 'monkeymum_cz'}
        ],
    }   
};



module.exports = {
    client,
}