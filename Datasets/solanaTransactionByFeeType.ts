import { DuneClient } from "@duneanalytics/client-sdk";
const dune = new DuneClient("E9EJIuW0TsbdotGqc4hyggQpPRnNHp3F");
const query_result = await dune.getLatestResult({queryId: 4314353});

console.log(query_result);
