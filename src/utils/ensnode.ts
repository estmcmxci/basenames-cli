/**
 * ENSNode GraphQL Query Utilities
 * 
 * ENSNode provides indexed ENS data via a subgraph-compatible GraphQL API.
 * This is much faster than making multiple on-chain calls for read operations.
 * 
 * Alpha-Sepolia instance: https://api.alpha-sepolia.ensnode.io/subgraph
 * Supports: subgraph, basenames, lineanames plugins
 */

import { getNetworkConfig } from "../config/deployments";

export type ENSNodeDomain = {
  id: string;
  name: string;
  labelName: string | null;
  labelhash: string | null;
  owner: { id: string } | null;
  resolver: {
    id: string;
    address: string;
    texts: string[] | null;
  } | null;
  expiryDate: string | null;
  createdAt: string;
  registration: {
    registrationDate: string;
    expiryDate: string;
  } | null;
};

export type ENSNodeQueryResult<T> = {
  data: T;
  errors?: Array<{ message: string }>;
};

/**
 * Execute a GraphQL query against ENSNode
 */
export async function queryENSNode<T>(
  query: string,
  variables?: Record<string, any>,
  network?: string
): Promise<T> {
  const config = getNetworkConfig(network);
  
  const response = await fetch(config.ensNodeSubgraph, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`ENSNode query failed: ${response.status} ${response.statusText}`);
  }

  const result: ENSNodeQueryResult<T> = await response.json();

  if (result.errors && result.errors.length > 0) {
    throw new Error(`ENSNode query error: ${result.errors[0].message}`);
  }

  return result.data;
}

/**
 * Get domain info by name
 */
export async function getDomainByName(
  name: string,
  network?: string
): Promise<ENSNodeDomain | null> {
  const query = `
    query GetDomain($name: String!) {
      domains(where: { name: $name }, first: 1) {
        id
        name
        labelName
        labelhash
        owner {
          id
        }
        resolver {
          id
          address
          texts
        }
        expiryDate
        createdAt
        registration {
          registrationDate
          expiryDate
        }
      }
    }
  `;

  const result = await queryENSNode<{ domains: ENSNodeDomain[] }>(query, { name }, network);
  return result.domains[0] || null;
}

/**
 * Get all domains owned by an address
 */
export async function getDomainsForAddress(
  address: string,
  network?: string
): Promise<ENSNodeDomain[]> {
  const query = `
    query GetDomains($owner: String!) {
      domains(where: { owner: $owner }, orderBy: createdAt, orderDirection: desc) {
        id
        name
        labelName
        labelhash
        owner {
          id
        }
        resolver {
          id
          address
          texts
        }
        expiryDate
        createdAt
        registration {
          registrationDate
          expiryDate
        }
      }
    }
  `;

  const result = await queryENSNode<{ domains: ENSNodeDomain[] }>(
    query,
    { owner: address.toLowerCase() },
    network
  );
  return result.domains;
}

/**
 * Get recently registered basenames
 */
export async function getRecentRegistrations(
  parentDomain: string,
  limit: number = 10,
  network?: string
): Promise<ENSNodeDomain[]> {
  const query = `
    query GetRecent($suffix: String!, $limit: Int!) {
      domains(
        where: { name_ends_with: $suffix }
        orderBy: createdAt
        orderDirection: desc
        first: $limit
      ) {
        id
        name
        labelName
        owner {
          id
        }
        expiryDate
        createdAt
      }
    }
  `;

  const config = getNetworkConfig(network);
  const result = await queryENSNode<{ domains: ENSNodeDomain[] }>(
    query,
    { suffix: `.${config.parentDomain}`, limit },
    network
  );
  return result.domains;
}

/**
 * Resolve address to primary name via ENSNode
 * (reverse resolution)
 */
export async function getPrimaryName(
  address: string,
  network?: string
): Promise<string | null> {
  // ENSNode stores reverse records under addr.reverse
  const reverseName = `${address.toLowerCase().slice(2)}.addr.reverse`;
  
  const query = `
    query GetReverse($name: String!) {
      domains(where: { name: $name }, first: 1) {
        resolver {
          texts
        }
      }
    }
  `;

  try {
    const result = await queryENSNode<{ domains: any[] }>(query, { name: reverseName }, network);
    // The actual primary name resolution is complex - fall back to on-chain for accuracy
    return null;
  } catch {
    return null;
  }
}

/**
 * Search basenames by prefix
 */
export async function searchBasenames(
  prefix: string,
  limit: number = 10,
  network?: string
): Promise<ENSNodeDomain[]> {
  const config = getNetworkConfig(network);
  
  const query = `
    query SearchNames($prefix: String!, $suffix: String!, $limit: Int!) {
      domains(
        where: { 
          name_starts_with: $prefix,
          name_ends_with: $suffix
        }
        orderBy: createdAt
        orderDirection: desc
        first: $limit
      ) {
        id
        name
        labelName
        owner {
          id
        }
        expiryDate
        createdAt
      }
    }
  `;

  const result = await queryENSNode<{ domains: ENSNodeDomain[] }>(
    query,
    { prefix, suffix: `.${config.parentDomain}`, limit },
    network
  );
  return result.domains;
}


