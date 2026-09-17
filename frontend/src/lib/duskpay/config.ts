// Midnight Preview testnet (public), per docs.midnight.network/guides/networks-and-environments.
// The proof server is always local — even against a public network, proving
// happens on your own machine (see docker-compose.yml's proof-server service).
export const NETWORK_ID = 'preview';

export const NODE_URL = import.meta.env.VITE_NODE_URL ?? 'wss://rpc.preview.midnight.network';
export const INDEXER_HTTP_URL =
  import.meta.env.VITE_INDEXER_HTTP_URL ?? 'https://indexer.preview.midnight.network/api/v4/graphql';
export const INDEXER_WS_URL =
  import.meta.env.VITE_INDEXER_WS_URL ?? 'wss://indexer.preview.midnight.network/api/v4/graphql/ws';
export const PROOF_SERVER_URL =
  import.meta.env.VITE_PROOF_SERVER_URL ?? 'http://localhost:6300';

// Deployed contract address, set after running the deploy script. Stored in
// localStorage under this key so the UI can pick up a freshly deployed address.
export const CONTRACT_ADDRESS_STORAGE_KEY = 'duskpay:contractAddress';

export const DEFAULT_CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS ?? '';
