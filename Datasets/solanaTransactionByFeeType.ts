import { DuneClient } from "@duneanalytics/client-sdk";

const dune = new DuneClient("E9EJIuW0TsbdotGqc4hyggQpPRnNHp3F");

// Remove top-level await and wrap in async function
async function fetchDuneData() {
  try {
    const query_result = await dune.getLatestResult({queryId: 4314353});
    console.log(query_result);
    return query_result;
  } catch (error) {
    console.error("Error fetching Dune data:", error);
    return null;
  }
}

// Export the function to be used elsewhere
export { fetchDuneData };

// If you need to execute this immediately when imported, use this:
// This won't cause TypeScript errors
fetchDuneData().catch(console.error);
