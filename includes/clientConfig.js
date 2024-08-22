// const client = {
//   id: "client-id",
//   name: "client-name",
//   inputDataGcpProject: "gcp-project-name",
//   outputDataGcpProject: "",
//   ga4SourceType: "ecomm", // can be only 'ecomm' for now
//   // all currently supported platforms
//   platforms: [
//     "ga4",
//     "google_ads",
//     "sklik",
//     "facebook",
//     "bing_ads",
//     "heureka_cz",
//     "heureka_sk",
//     "cj_affil",
//   ],
//   // each project has an entry for the platform
//   //  - If project doesn't have a separate property within platform, custom logic needs to be applied to assign it
//   //      - In that case, empty array will be passed to the platform key (as in cj_affiliate case)
//   //  - In case of sklik, heureka_cz and heureka_sk (probably cj_affiliate as well), only one property_id will be present in platform data
//   projects: {
//     ga4: [
//       {
//         property_id: "123",
//         project_id: "project-id",
//         project_name: "project-name",
//       },
//       {
//         property_id: "123",
//         project_id: "project-id",
//         project_name: "project-name",
//       },
//     ],
//     // ...
//     google_ads: "custom",
//     sklik: "custom",
//     facebook: "custom",
//     bing_ads: "custom",
//     heureka_cz: [
//       {
//         property_id: "123",
//         project_id: "project-id",
//         project_name: "project-name",
//       },
//     ],
//     heureka_sk: [
//       {
//         property_id: "123",
//         project_id: "project-id",
//         project_name: "project-name",
//       },
//     ],
//     cj_affil: "custom",
//   },
// };

// module.exports = {
//   client,
// };
