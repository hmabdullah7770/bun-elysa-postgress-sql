import { Client as ElasticsearchClient } from "@elastic/elasticsearch";
import { Client as OpenSearchClient } from "@opensearch-project/opensearch";
import { flags } from "./flags";

type SearchClient = ElasticsearchClient | OpenSearchClient;

let searchClient: SearchClient | null = null;

const getSearchClient = (): SearchClient => {
  if (searchClient) return searchClient;

  const useOpenSearch = flags.useOpenSearch;
  const node = useOpenSearch ? process.env.OPENSEARCH_URL : process.env.ES_URL;
  const apiKey = useOpenSearch ? process.env.OPENSEARCH_API_KEY : process.env.ES_API_KEY;
  if (!node) throw new Error(`${useOpenSearch ? "OPENSEARCH_URL" : "ES_URL"} is required`);

  searchClient = useOpenSearch
    ? new OpenSearchClient({ node, ...(apiKey ? { auth: { apiKey } } : {}) })
    : new ElasticsearchClient({ node, ...(apiKey ? { auth: { apiKey } } : {}) });
  return searchClient;
};

export default getSearchClient;