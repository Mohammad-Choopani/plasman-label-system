import { Request, Response } from "express";
import { stationMock, type StationSession } from "../data/mockData";

export function loginController(req: Request, res: Response) {
  const { employeeId, crewSize } = req.body as {
    employeeId?: string;
    crewSize?: number;
  };

  if (!employeeId || !String(employeeId).trim()) {
    return res.status(400).json({
      ok: false,
      message: "Employee ID is required.",
    });
  }

  if (!crewSize || Number.isNaN(Number(crewSize)) || Number(crewSize) < 1 || Number(crewSize) > 15) {
    return res.status(400).json({
      ok: false,
      message: "Crew Size must be a number between 1 and 15.",
    });
  }

  const session: StationSession = {
    stationId: stationMock.stationId,
    employeeId: String(employeeId).trim(),
    crewSize: Number(crewSize),
  };

  return res.status(200).json({
    ok: true,
    message: "Login successful.",
    data: session,
  });
}