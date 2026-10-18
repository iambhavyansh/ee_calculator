import { apiClient } from "./client";
import { DiscoveryResponse } from "./types";

export async function fetchCalculators(): Promise<DiscoveryResponse> {
  const response = await apiClient.get<DiscoveryResponse>("/calculators");
  return response.data;
}

