import axios from "axios";

export const apiClient = axios.create({
  baseURL: "http://localhost:4000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export type LoginRequest = {
  employeeId: string;
  crewSize: number;
};

export type LoginResponse = {
  ok: boolean;
  message: string;
  data: {
    stationId: string;
    employeeId: string;
    crewSize: number;
  };
};

export type StationConfigResponse = {
  ok: boolean;
  message: string;
  data: {
    stationId: string;
    hmiCellCode: string;
    hmiTitle: string;
    version: string;
  };
};

export type PartMasterDto = {
  id: string;
  externalPartNumber: string;
  description: string;
  customerPartNumber: string;
  arNumber: string;
  position: string;
  colour: string;
  fixtureId: string;
};

export type StationLineupItemDto = {
  lineupId: string;
  sequence: string;
  orderQty: string;
  packQty: string;
  part: PartMasterDto;
};

export type StationLineupResponse = {
  ok: boolean;
  message: string;
  data: {
    stationId: string;
    items: StationLineupItemDto[];
  };
};

export type CreateDowntimeRequest = {
  stationId: string;
  employeeId: string;
  partId: string;
  category: string;
  reason: string;
  notes?: string;
  startedAt: string;
};

export type CreateDowntimeResponse = {
  ok: boolean;
  message: string;
  data: {
    downtimeId: string;
    stationId: string;
    status: "active";
  };
};

export type CloseDowntimeRequest = {
  downtimeId: string;
  endedAt: string;
};

export type CloseDowntimeResponse = {
  ok: boolean;
  message: string;
  data: {
    downtimeId: string;
    status: "closed";
    durationSeconds: number;
  };
};

export async function loginOperator(payload: LoginRequest) {
  const response = await apiClient.post<LoginResponse>("/auth/login", payload);
  return response.data;
}

export async function getStationConfig() {
  const response = await apiClient.get<StationConfigResponse>("/station/config");
  return response.data;
}

export async function getStationLineup() {
  const response = await apiClient.get<StationLineupResponse>("/station/lineup");
  return response.data;
}

export async function createDowntime(payload: CreateDowntimeRequest) {
  const response = await apiClient.post<CreateDowntimeResponse>(
    "/station/downtime/start",
    payload
  );
  return response.data;
}

export async function closeDowntime(payload: CloseDowntimeRequest) {
  const response = await apiClient.post<CloseDowntimeResponse>(
    "/station/downtime/close",
    payload
  );
  return response.data;
}