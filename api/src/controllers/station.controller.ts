import { Request, Response } from "express";
import { schedulerLineupMock, stationMock } from "../data/mockData";

export function getStationConfigController(_req: Request, res: Response) {
  return res.status(200).json({
    ok: true,
    message: "Station config loaded successfully.",
    data: stationMock,
  });
}

export function getStationLineupController(_req: Request, res: Response) {
  return res.status(200).json({
    ok: true,
    message: "Station line-up loaded successfully.",
    data: {
      stationId: stationMock.stationId,
      items: schedulerLineupMock,
    },
  });
}