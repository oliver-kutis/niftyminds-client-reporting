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
        'facebook',
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
            { property_id: '327331458', project_id: 'monkeymum_cz', project_name: 'monkeymum_cz' },
            { property_id: '327379837', project_id: 'monkeymum_de', project_name: 'monkeymum_de' },
            { property_id: '327373684', project_id: 'monkeymum_en', project_name: 'monkeymum_en' },
            { property_id: '327364097', project_id: 'monkeymum_es', project_name: 'monkeymum_es' },
            { property_id: '374115092', project_id: 'monkeymum_fi', project_name: 'monkeymum_fi' },
            { property_id: '327351271', project_id: 'monkeymum_fr', project_name: 'monkeymum_fr' },
            { property_id: '348603801', project_id: 'monkeymum_gr', project_name: 'monkeymum_gr' },
            { property_id: '327335909', project_id: 'monkeymum_hr', project_name: 'monkeymum_hr' },
            { property_id: '327347972', project_id: 'monkeymum_hu', project_name: 'monkeymum_hu' },
            { property_id: '327342577', project_id: 'monkeymum_it', project_name: 'monkeymum_it' },
            { property_id: '327373281', project_id: 'monkeymum_nl', project_name: 'monkeymum_nl' },
            { property_id: '327374690', project_id: 'monkeymum_pl', project_name: 'monkeymum_pl' },
            { property_id: '374056600', project_id: 'monkeymum_pt', project_name: 'monkeymum_pt' },
            { property_id: '327345849', project_id: 'monkeymum_ro', project_name: 'monkeymum_ro' },
            { property_id: '348618406', project_id: 'monkeymum_se', project_name: 'monkeymum_se' },
            { property_id: '327338731', project_id: 'monkeymum_sk', project_name: 'monkeymum_sk' },
            { property_id: '327385365', project_id: 'monkeymum_sl', project_name: 'monkeymum_sl' }
        ],
        google_ads: 'custom',
        // google_ads: [
        //     {property_id: '4438085976', project_id: 'monkeymum_com', project_name: 'monkeymum_com'},
        // ],
        sklik: [
            {property_id: '123', project_id: '321', project_name: 'monkeymum_cz'}
        ],
        facebook: [
            {property_id: '447736129796848', project_id: 'monkeymum_com', project_name: 'monkeymum_com'}
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