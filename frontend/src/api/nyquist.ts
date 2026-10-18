import { apiClient } from "./client";
import { NyquistRequest, NyquistResponse } from "./types";

export async function calculateNyquist(request: NyquistRequest): Promise<NyquistResponse> {
  const response = await apiClient.post<NyquistResponse>("/control/nyquist", request);
  return response.data;
}

