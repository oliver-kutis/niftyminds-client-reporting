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
    ]
};

// each project has an entry for the platform
//  - If project doesn't have a separate property within platform, custom logic needs to be applied to assign it 
//      - In that case, empty array will be passed to the platform key (as in cj_affiliate case)
//  - In case of sklik, heureka_cz and heureka_sk (probably cj_affiliate as well), only one property_id will be present in platform data
const projects = {
    ga4: [
        {property_id: '123', project_id: '321', project_name: 'monkeymum_cz'},
        {property_id: '123', project_id: '321', project_name: 'monkeymum_sk'}
    ],
    google_ads: [
        {property_id: '123', project_id: '321', project_name: 'monkeymum_cz'}
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
        {property_id: '123', project_id: '321', project_name: 'monkeymum_cz'}
    ],
    heureka_sk: [
        {property_id: '123', project_id: '321', project_name: 'monkeymum_cz'}
    ],
    cj_affiliate: [
        // {property_id: '123', project_id: '321', project_name: 'monkeymum_cz'}
    ],

}

module.exports = {
    client,
    projects,
}