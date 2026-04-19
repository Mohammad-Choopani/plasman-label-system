export type PartMaster = {
  id: string;
  externalPartNumber: string;
  description: string;
  customerPartNumber: string;
  arNumber: string;
  position: string;
  colour: string;
  fixtureId: string;
};

export type SchedulerLineupItem = {
  lineupId: string;
  sequence: string;
  orderQty: string;
  packQty: string;
  part: PartMaster;
};

export type StationSession = {
  stationId: string;
  employeeId: string;
  crewSize: number;
};

export const stationMock = {
  stationId: "WP3-0031",
  hmiCellCode: "WP3 - WP3-0031",
  hmiTitle: "WP3 - WP3-0031",
  version: "v 3.1.2.273",
};

export const partMastersMock: PartMaster[] = [
  {
    id: "part-1",
    externalPartNumber: "921690689H",
    description: "C1YX-2 SPLR W/CAM BAE-GE",
    customerPartNumber: "26618535",
    arNumber: "AR036758",
    position: "220",
    colour: "8",
    fixtureId: "220",
  },
  {
    id: "part-2",
    externalPartNumber: "74165-TYA-A50",
    description: "25 MDX FRT WHL PROTECTOR",
    customerPartNumber: "74165-TYA-A50",
    arNumber: "AR041220",
    position: "110",
    colour: "1",
    fixtureId: "110",
  },
  {
    id: "part-3",
    externalPartNumber: "COSMONUT-200",
    description: "COSMONUT 200 UPPER TRIM",
    customerPartNumber: "COS-200-TRIM",
    arNumber: "AR052200",
    position: "305",
    colour: "2",
    fixtureId: "305",
  },
  {
    id: "part-4",
    externalPartNumber: "70490535",
    description: "C1YC SPOILER UPPER TRIM",
    customerPartNumber: "26619021",
    arNumber: "AR039112",
    position: "305",
    colour: "2",
    fixtureId: "305",
  },
  {
    id: "part-5",
    externalPartNumber: "26620001",
    description: "C1XX LOWER GARNISH BLACK",
    customerPartNumber: "26620001",
    arNumber: "AR045500",
    position: "410",
    colour: "3",
    fixtureId: "410",
  },
];

export const schedulerLineupMock: SchedulerLineupItem[] = [
  {
    lineupId: "lineup-1",
    sequence: "10",
    orderQty: "24",
    packQty: "12",
    part: partMastersMock[0],
  },
  {
    lineupId: "lineup-2",
    sequence: "20",
    orderQty: "26",
    packQty: "26",
    part: partMastersMock[1],
  },
  {
    lineupId: "lineup-3",
    sequence: "30",
    orderQty: "18",
    packQty: "18",
    part: partMastersMock[2],
  },
  {
    lineupId: "lineup-4",
    sequence: "40",
    orderQty: "20",
    packQty: "18",
    part: partMastersMock[3],
  },
  {
    lineupId: "lineup-5",
    sequence: "50",
    orderQty: "",
    packQty: "",
    part: partMastersMock[4],
  },
];