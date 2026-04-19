import { Router } from "express";
import {
  getStationConfigController,
  getStationLineupController,
} from "../controllers/station.controller";

const stationRouter = Router();

stationRouter.get("/config", getStationConfigController);
stationRouter.get("/lineup", getStationLineupController);

export default stationRouter;