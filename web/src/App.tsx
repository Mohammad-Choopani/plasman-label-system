import { useEffect, useMemo, useRef, useState } from "react";
import { getStationConfig, loginOperator } from "./api/client";
type FeedbackKind = "success" | "error" | "complete" | "defect";
type AppScreen = "login" | "partMenu" | "hmi";
type ScanStage = "idle" | "labelCamera" | "labelQtyCamera" | "partCamera";
type ScanStatus = "idle" | "success" | "error";
type AlertLevel = "info" | "success" | "warning" | "error";
type SessionScanStatus = "active" | "defect";

type StationConfigData = {
  stationId: string;
  hmiCellCode?: string;
  hmiTitle?: string;
  version?: string;
};

type CatalogPart = {
  externalPartNumber: string;
  internalNumber: string;
  description: string;
};

type AlertItem = {
  id: string;
  level: AlertLevel;
  message: string;
  createdAt: number;
};

type SessionScanRecord = {
  id: string;
  rawBarcode: string;
  resolvedExternalPartNumber: string;
  status: SessionScanStatus;
  scannedAt: number;
};

type LabelDetailsDraft = {
  externalPartNumber: string;
  internalNumber: string;
  description: string;
  packagingQty: string;
  skdQty: string;
};

type LabelSession = {
  sessionId: string;
  externalPartNumber: string;
  internalNumber: string;
  description: string;
  packagingQty: number;
  skdQty: number;
  packedQty: number;
  remainingQty: number;
  defectQty: number;
  status: "idle" | "active" | "completed" | "error";
  startedAt: number;
  lastScannedValue: string;
  lastResolvedExternalPartNumber: string;
  scanHistory: SessionScanRecord[];
  actionHistory: string[];
};

type CameraScanModalProps = {
  isOpen: boolean;
  title: string;
  helperText: string;
  onClose: () => void;
  onDetected: (value: string) => void;
  onDefectLast?: () => void;
};
/*
  IMPORTANT:
  Keep your full RAW_PART_CATALOG block here exactly as it is in your current file.
  Do not remove any part rows.
*/
const RAW_PART_CATALOG = `
Part_Number	Plasman P/N	Part_Desc
71510-TYS-A00ZF	612540112	MDX RR SKID GARN WHITE DIAMOND
71510-TYS-A00ZE	612540256	MDX RR SKID GARN MODERN STEEL
71510TYSA00ZD	612540532	GARN, RR. *NH830M*
71510TYSA00ZG	612540611	GARNISH, RR. *B621P*
71510TYSA00ZB	612540613	GARNISH, RR. *R568P*
71510-TYS-A00ZC	612540616	MDX RR SKID GARN FATH BLACK
71110-TYA-A00	613530000	21 MDX SKID GARN FRT BPR SERV
71110-TYB-A00	617990000	21 MDX SKID FRT ULTRA MIC SERV
71152-30A-A00	620680000	ACCORD 23 FMC BPR LWR SERV
71551-30A-A00	620690000	ACCORD 23 FMC BPR RR
71550-30B-A10	622130570	23 ACCD LWR GARN RR BPR SERV
04716-TYB-A20ZZ	622270720	21 MDX RR SKID GRN BLK
04712-TYB-A10ZZ	622280720	21 MDX SKID FRT ULTRA SERV BLK
74890-T1W-A51	627620000	CRV LPG W/CAM 2015 SERVICE
74890-T2F-A31	605460000	ACC GARN w/SWI w/CAM SERVICE
71200-3D4-A31	617830000	23 CRV WITH 1R1V RDR FHEV SERV
71106-TJB-A20	617460000	22 RDX GRILLE SERV
71553-31M-A01	621240000	HONDA ILX 2023 COVER FINISHER
74890-T1W-A41	617610000	CRV LPG BASE MEXICO SERV
75312-TP6-A01ZL	603996206	HONDA TP6 FRT LDM RH BASQU RED
74160-31M-A01ZA	621230570	23 INT HOOD AIR OUTLET BERLINA
71102-SZN-A00	603962000	ACURA SZN FRONT BUMP LWR SERV
74902-3A0-A20	616560570	23 CRV PTD LOWER SERVICE
75333-TP6-A01ZE	604007500	HONDA TP6 RR LDM LH CRY BLACK
71700-TBJ-A01ZB	610750532	CIVIC SI 2DR SPLR LUNAR SILVER
71125-T1W-A01	611130	LOWER GRILLE CHROME
71200-3A0-A31	619140000	23 CRV WITH RADAR BERL BL SERV
71185-TLA-C50	614801000	20 CRV UPR LH BLK SERV
71705-TEY-Y01ZK	613990027	CIVIC SI 4DR TURK SPLR SERVICE
71200-3A0-A11	616410000	23 CRV NO RADAR BERL BLACK SER
71110TYAA50	622580000	GARNISH, FR.
74450-TYA-A20	617601570	21 MDX RR WF LH BERL BL SERV
71700-TK4-A01ZM	603470021	ACURA TL SPLR GRAPHITE LUSTER
75313-TP6-A01ZE	604008500	HONDA TP6 RR LDM RH CRY BLACK
74115-TP6-A00ZF	604016115	TP6 LWR FRT GARN RH POL METAL
71700-TBJ-A01ZE	610750500	CIVIC SI 2DR SPLR CRY BLACK
71700-TK4-X01ZM	603490021	TL SPOILER GRAPHITE LUSTER MEX
71180-TLA-A60	613512000	20 CRV UPR RH HEX SERV
71118-TLA-A50	613785000	20 CRV MLDG SIDE FR LH SERV
71127-T0G-A01	604620000	HONDA CRV 2012 FRT GARN FRT GR
71113-TLA-A50	613786000	20 CRV MLDG SIDE FR RH SERV
71121-TLA-A10	609880000	CRV GRILLE BASE RADAR SERVICE
71128-T1W-A01	611115	MLDG UPPER LEFT GRILLE/CHRM
71123-T1W-A01	611110	MLDG UPPER RIGHT GRILLE/CHRM
71185-TLA-A60	613511000	20 CRV UPR LH HEX SERV
71113-TLA-A70	614506000	20 CRV LWR RH HEX SERV
75390-TYA-A01	613648000	21 MDX PROT RR W/ARC RH SERV
71121-TLA-A00	609840590	CRV GRILLE BASE BLACK SERVICE
71560-3D4-A01	619200000	23 CRV SKID GARN RR BPR SERV
71517-TLA-A50	614271000	20 CRV MLDG RR BMP END LH SER
71129-T1W-A01	607630000	HONDA CRV 2015 STAY FRT GRILLE
74450-TYA-A00	613621000	21 MDX RR WHL PROT LH SERV
71128-T0A-A01	604630919	HONDA CRV 2012 STAY FR GR SER
91504-TJB-A01	686030	RDX 91504TJBAA000 CLIP/SEAL
71511-TLA-A50	614260000	20 CRV CTR MLDG RR BPR SERV
71510-TLA-A00	609920000	CRV 2017 RR SKID GRN W/FIN SER
74115-TYA-A00	613602000	21 MDX FRT WHL PROT RH SERV
71510-T1W-A11	607540000	CRV 2015 REAR BUMPER LOWER GAR
71110TYAA60ZD	622590573	GARN, FR. *NH883P*
74410-TYA-A00	613622000	21 MDX RR WHL PROT RH SERV
71540-TPG-A50	614552000	20 CRV LWR TOUR RH SERV
74890-TVA-A11ZJ	610700500	ACC LPG W/CAM CRY BLACK
71112-TLA-A70	614460000	20 CRV LWR CTR HEX SERV
71122-TA0-A11	600122	CHR CENT FRT GRL ACC 11 RH
71125-T0G-A01	600148	MLDG LWR, FR GRILLE/CHROME CRV
71510-TLA-A10	609930000	CRV 2017 RR SKID GRN SERVICE
71125-TA0-A11	600125	CHR UPPER FRT GRL ACC 11 RH
71112-TLA-A50	613760000	20 CRV MLDG CTR BPR, MIC SERV
71545-TPG-A50	614551000	20 CRV LWR TOUR LH SERV
71110TYAA60ZA	622590613	GARNISH, FR. *R568P*
71102-TVA-F00	617166000	HONDA ACC FRT FOG COVER RH
71122-TLA-A60	613430570	20 CRV FRT GRILL GARN BLK SERV
71127-TA0-A11	600121	CHR CENT FRT GRL ACC 11 LH
75395-TYA-A01	613647000	21 MDX PROT RR W/ARC LH SERV
71107-SZA-A00ZZ	603181000	HONDA PILOT CV FRT FOG LIG LH
74890-TVA-A11ZM	610700699	18 ACC LPG W/CAM SONIC GREY
71520-TLE-R00	610980000	CRV 2017 RR BUMPR NO FIN SERV
71103-STK-A01	604152506	ACURA STK R FR FOG - GLTR SLVR
71126-T0G-A01	604610000	HONDA CRV 2012 FRT EMBLEM
71122-T0G-A01	600145	MLDG UPR, FR GRILLE/CHROME CRV
74890-T2F-A11	605440000	ACC LIC GARN w/CAM SERVICE
74890-T2G-A11	608500000	2016 ACC LIC GARN W/CAM
71203-TZ3-A00	610891000	TLX BLOCKER FRT GRL LH HONDA
74890-TVA-A11ZF	610700532	ACC LPG W/CAM LUNAR SILVER
71110TYAA60ZB	622590616	GARN, FR. *NH893P*
71105-TYS-A00	612530570	MDX GARN FRT BMP BERL BLK SERV
74890-T1W-A71	607600000	CRV LPG W/CAM 2015 SERVICE
71121-T0G-A01ZA	604600203	CRV GRILL ASSY FRT-ELP
74890-T20-A11	614290000	22 CIVIC LPG W/ CAM/SWTCH SERV
71118-TLA-C50	614525000	20 CRV LWR LH BLK SERV
71711-TEY-Y01	606900	2016 CIVIC SI SEAL KIT
74890-TBA-A11ZG	607930533	CVC 2016 LPG W/CAM DRK BLUE
74115-TYA-A20	617592570	21 MDX FRT WF RH BERL BL SERV
71102-STX-A00	604102000	MDX 2010 MESH FRT BUMPER LW RH
74890-TBA-A11ZM	607930573	CVC 2016 LPG W/CAM PLATNM WHIT
71160-3D4-A01	619210000	23 CRV SKID GARN FRT BPR SERV
71102-SZA-A00ZZ	603182000	HONDA PILOT CV FRT FOG LIG RH
71124-TLA-A50	613450000	20 CRV GRL RDR COVER SERV
74890-TBA-A11ZB	607930532	CVC 2016 LPG W/CAM LUN SILVER
74890-TBA-A11ZC	607930256	CVC 2016 LPG W/CAM MOD STEEL
71180-TLA-C50	614802000	20 CRV UPR RH BLK SERV
75150-SVA-A00	601690919	SVAA 2 DR FRT GRILLE CVR SERV.
74890-TVA-A11ZG	610700256	ACC LPG W/CAM MOD STEEL
74890-TBA-A11ZA	607930535	CVC 2016 LPG W/CAM BRG BLACK
71206-TZ3-A00	610891000	TLX BLOCKER FRT GRL LH HONDA
74890-TWA-A01ZC	618030573	21 ACC LPG BLUE H PLATINUM WH
71124-TE0-A11	604410919	HONDA ACCORD 2 DR GRL 2011 SER
75660-TJB-A01	611881570	RDX D-PILL LH BER BLACK SERVIC
71510-TYB-A00	614150000	21 MDX SKID RR ULTRA MIC SERV
74890-TWA-A01ZD	618030699	21 ACC LPG BLUE H SONIC GREY
74165-TYA-A20	617591570	21 MDX FRT WF LH BERL BL SERV
71126-TA5-A00	600051	CHROME SURR71126-TA0A-A001 SER
71103-TJB-A20	617442000	22 RDX INTAKE GARN RH MIC SERV
71181-TGV-A00ZH	613150256	21TLX UPR FRT BMPR M STEEL
71180-TLC-R50	614102000	20 CRV UPR RH TRI SERV
74890-TBA-A11ZJ	607930536	CVC 2016 LPG W/CAM RALLY RED
71124-TA0-A11	600124	CHR LOWER FRT GRL ACC 11 RH
71187-TYB-A00	617021000	21 MDX ULTRA FRT BPR LH SERV
71201-TZ3-A00	610892000	TLX BLOCKER FRT GRL RH HONDA
71110TYBA50	622600000	25 MDX SKID FRT ULTRA MIC
71520-TLA-A00	610300000	CRV 2017 RR BUMPR W/FIN SERV
74890-TBA-A11ZH	607930537	CVC 2016 LPG W/CAM SPORTY BLUE
74895-TA5-A01ZG	603020115	GARNISH +NH737M+
74890-TVA-A11ZE	610700573	ACC LPG W/CAM PLATINUM WHITE
75395-31M-A01ZB	621207613	23 INT RR DOOR W/A LH EXT CRIM
71181-TGV-A00ZF	613150573	21TLX UPR FRT BMPR PLAT WHT
74890-TVA-A11ZC	610700379	ACC LPG W/CAM SAN MAR RED
71200-3A0-A21	619130000	23 CRV WITH RADAR MIC SERV
71203-3A0-A11	619150000	23 CRV FRT GR SUB PTD SERVICE
71181-TGV-A50ZA	622290649	24 TLX FRT BUMP GRN TIG EYE
75610-TJB-A01	611882570	RDX D-PILL RH BER BLACK SERVIC
71121-TA0-A00	603140919	HONDA 4 DR ACC GRILLE FR BUMPE
74895-TA5-A01ZD	603020306	GARNISH +NH578+
71110-T1W-A11	607560000	CRV 2015 LOWER GARNISH FRONT B
71108-TJB-A20	617441000	22 RDX INTAKE GARN LH MIC SERV
74890-TVA-A11ZK	610700077	ACC LPG W/CAM OBSID BLUE
71121-TE0-A01	603040919	HONDA 2 DR ACC GR FR BUMPE SPO
71512-TLA-A50	614272000	20 CRV MLDG RR BMP END RH SER
75390-31M-A01ZB	621208613	23 INT RR DOOR W/A RH EXT CRIM
75395-31M-A01ZA	621207649	23 INT RR DOOR W/A LH TIG EYE
74890-TBA-A11ZD	607930020	CVC 2016 LPG W/CAM ORC WHITE
75395-31M-A01ZC	621207616	23 INT RR DOOR W/A LH FAT BLK
74890-TVA-A11ZL	610700577	ACC LPG W/CAM STILL NIGHT
74895-TA5-A21ZG	604450115	4DR ACC TRNK NO CAM-P METAL
75620-TA5-A01	604552000	4DR ACC TRUNK GARN CHROME RH
74890-TYA-A01ZK	613580255	21MDX RR LPG OBS BLUE SERV
74890-TYA-A01ZF	613580648	21MDX RR LPG LIQUID CARB SERV
71703-TBJ-A01	610712000	2016 HONDA SI SPOILER - CVR RH
75332-TP6-A01ZE	603995500	HONDA TP6 FRT LDM LH CRY BLACK
71112-SZA-A00ZA	603552901	HONDA PILOT FOGL COVER CAP RH
74895-TA5-A21ZC	604450306	4DR ACC TRNK NO CAM-T WHITE
71118-TLC-R50	614515000	20 CRV LWR LH TRI SERV
71127-TLA-A00	610090000	CRV 2017 STAY SERVICE
74890-TBA-A11ZF	607930306	CVC 2016 LPG W/CAM TAF WHITE
71850-TZ3-A01ZD	610601256	TLX SIDE SILL LH MOD STEEL
90303-TA0-003	675302	NUT GARN M6 - 90303-TA0A-0030
71800-TZ3-A01ZF	610602500	TLX SIDE SILL RH CRYS BLACK
71850-TZ3-A01ZF	610601500	TLX SIDE SILL LH CRYS BLACK
75390-31M-A01ZG	621208611	23 INT RR DOOR W/A RH SIG BLUE
71700-TK4-A01ZK	603470022	ACURA TL SPOILER FORGED SILVER
75390-31M-A01ZF	621208532	23 INT RR DOOR W/A RH LUN SIL
74950-3A0-A01ZB	623850738	23 CRV SPLR MIC LWR URBAN SERV
71700-TK4-A01ZL	603470020	ACURA TL SPOILER ORCHID WHITE
74950-3A0-A21ZD	623870573	23 CRV SPLR PTD LWR PLAT W SER
74950-3A0-A01ZD	623850573	23 CRV SPLR MIC LWR PLAT W SER
74890-TYA-A01ZG	613580573	21MDX RR LPG PLATNM WHITE SERV
71181-TGV-A50ZH	622290611	24 TLX FRT BUMP GRN SIG BLUE
74950-3A0-A01ZA	623850574	23 CRV SPLR MIC LWR CARM R SER
71125-SNA-A00	601650919	SNAA 4 DR FRT GRILLE CVR SERV.
74950-3A0-A01ZF	623850500	23 CRV SPLR MIC LWR CRY BL SER
75395-31M-A01ZD	621207648	23 INT RR DOOR W/A LH LIQ GRA
75390-31M-A01ZD	621208648	23 INT RR DOOR W/A RH LIQ GRAY
71700-TBJ-A01ZC	610750256	CIVIC SI 2DR SPLR MOD STEEL
75390-31M-A01ZC	621208616	23 INT RR DOOR W/A RH FAT BLK
75312-TP6-A01ZE	603996500	HONDA TP6 FRT LDM RH CRY BLACK
75313-TP6-A01ZB	604008509	HONDA TP6 RR LDM RH OP SAGE
74494-T6N-A00	607861407	NSX RR FENDER TAIL GAR LH BLK
75333-TP6-A01ZD	604007436	HONDA TP6 RR LDM LH AL SILVER
71800-TZ3-A01ZL	610602616	TLX SIDE SILL RH FATHOM BLACK
71800-TZ3-A01ZD	610602256	TLX SIDE SILL RH MOD STEEL
75313-TP6-A01ZC	604008112	HONDA TP6 RR LDM RH WHT DIMND
74902-3A0-A00	616550000	23 CRV MIC LOWER SERVICE
74895-TA5-A01ZF	603020436	GARNISH +NH700M+
71705-TEY-Y01ZH	609610537	CIVIC SI 4DR SPLR SPORTY BLUE
74895-TA5-A31ZG	604390115	4DR ACC TRNK CAM-POLISHD METAL
71181-TGV-A50ZD	622290616	24 TLX FRT BUMP GRN FAT BLK
74890-TYA-A01ZD	613580641	21MDX RR LPG MID VIOLET SERV
74890-TYA-A01ZA	613580649	21MDX RR LPG TIGER EYE SERV
71700-TE0-A01ZE	603090115	SPOILER +NH737M+
75313-TP6-A01ZD	604008436	HONDA TP6 RR LDM RH AL SILVER
75333-TP6-A01ZF	604007115	HONDA TP6 RR LDM LH P METAL
71700-TK4-A01ZP	603470206	ACURA TL SPOILER BASQUE RED
74895-TA5-A21ZE	604450436	4DR ACC TRNK NO CAM-AL SILVER
74165-TP6-A52	605521000	2013 HONDA CROSSTOUR FRT FD LH
74115-TP6-A52	605522000	2013 HONDA CROSSTOUR FRT FD RH
71515-TYA-A00	613660000	21 MDX HITCH GARN RR BPR SERV
71700-TE0-A01ZB	603090304	SPOILER ASSY. +B92P+
75313-TP6-A01ZK	604008194	HONDA TP6 RR LDM RH TWLGT BLUE
71700-TE0-A01ZG	603090500	SPOILER NH731P
71800-TZ3-A01ZC	610602532	TLX SIDE SILL RH LUN SILVER
71110TYBA60	622610570	25 MDX SKID FRT ULTRA BER BLK
71700-TE0-A01ZC	603090306	SPOILER +NH578+
75395-31M-A01ZG	621207611	23 INT RR DOOR W/A LH SIG BLUE
75332-TP6-A01ZF	603995115	HONDA TP6 FRT LDM LH P METAL
71104-SZN-A00	603970000	ACURA SZN TOWHOOK CAP SERVICE
71700-TK4-A01ZE	603470501	SPOILER A+NH736M+
71510-3S4-A00	617060000	21MDX RR BPR FACE SKID SERVICE
71850-TZ3-A22ZF	610831573	TLX ROCKER LH PLATINUM WHITE
71702-TBJ-A01	610732000	2016 HONDA 2 DR FRT STAN RH
71752-TBJ-A01	610731000	2016 HONDA 2 DR FRT STAN LH
71700-TE0-A01ZF	603090379	SPOILER, TRUNK +R94+
74900-SZN-A02	603730407	ACURA SZN SPOILER - BLACK
74890-TYA-A01ZE	613580616	21MDX RR LPG FATHOM BLACK SERV
75333-TP6-A51	605757517	CROSS RR LDM LH SILVER SERVICE
74890-T0G-A11ZA	604650101	CRV RR LIC GARN W/ CAM-SERVICE
71852-T6N-A02	607821000	NSX SIDE SILL BLADE LH
74895-TA5-A01ZH	603020113	GARNISH +R530P+
74895-TA5-A31ZD	604390112	4DR ACC TRNK CAM-WHITE DIAMOND
74950-3A0-A21ZC	623870736	23 CRV SPLR PTD LWR METEOR SER
74890-TYA-A01ZH	613580532	21MDX RR LPG LUNAR SILVER SERV
71800-TZ3-A22ZE	610832577	TLX ROCKER RH STILL NIGHT
33102-3D4-A01	617946000	23 CRV HEADLIGHT ASSY RH SERV
33152-3D4-A01	617945000	23 CRV HEADLIGHT ASSY LH SERV
73162-SZN-A02ZB	603771149	SZN FRT WSHLD LH ASPEN WHITE
74410-31M-A01ZF	621198532	23 INT RR W/A PROT RH LUN SILV
74450-31M-A01ZB	621197613	23 INT RR W/A PROT LH EXT CRIM
74450-31M-A01ZE	621197573	23 INT RR W/A PROT LH PLAT WH
71700-TK4-A01ZG	603470502	SPOILER A+NH743M+
75495-T6N-A02	608851407	NSX MIRROR GARN ASSY BLK LH
74450-31M-A01ZF	621197532	23 INT RR W/A PROT LH LUN SILV
74410-31M-A01ZE	621198573	23 INT RR W/A PROT RH PLAT WH
71850-TZ3-A22ZA	610831379	TLX ROCKER LH SAN MAR RED
74410-31M-A01ZB	621198613	23 INT RR W/A PROT RH EXT CRI
74450-31M-A01ZA	621197649	23 INT RR W/A PROT LH TIG EYE
74450-31M-A01ZG	621197611	23 INT RR W/A PROT LH SIG BLUE
74410-31M-A01ZA	621198649	23 INT RR W/A PROT RH TIG EYE
74450-31M-A01ZC	621197616	23 INT RR W/A PROT LH FAT BLK
74410-31M-A01ZD	621198648	23 INT RR W/A PROT RH LIQ GRAY
74450-31M-A01ZD	621197648	23 INT RR W/A PROT LH LIQ GRAY
75312-TP6-A01ZF	603996115	HONDA TP6 FRT LDM RH P METAL
74410-31M-A01ZG	621198611	23 INT RR W/A PROT RH SIG BLUE
75333-TP6-A01ZA	604007511	HONDA TP6 RR LDM LH GLAC BLUE
74165-TP6-A00ZQ	604015206	TP6 LWR FRT GARN LH BASQUE RED
74410-31M-A01ZC	621198616	23 INT RR W/A PROT RH FAT BLK
75333-TP6-A01ZL	604007206	HONDA TP6 RR LDM LH BASQUE RED
71705-TEY-Y01ZD	609610256	CIVIC SI 4DR SPLR MODERN STEEL
74895-TA5-A21ZB	604450002	4DR ACC TRNK NO CAM-SILVR BLUE
75490-T6N-A01	608852407	NSX MIRROR GARN ASSY BLK RH
75332-TP6-A01ZB	603995509	HONDA TP6 FRT LDM LH OP SAGE
75313-TP6-A01ZA	604008511	HONDA TP6 RR LDM RH GLAC BLUE
73152-SZN-A01ZK	603772207	SZN FRT WSHLD RH ASPEN WHITE
73162-SZN-A01ZB	603771149	SZN FRT WSHLD LH ASPEN WHITE
75333-TP6-A01ZK	604007194	HONDA TP6 RR LDM LH TWLGT BLUE
74115-TP6-A00ZA	604016511	TP6 LWR FRT GARN RH GLAC BLUE
71150-T95-A01	622510570	24 CALRITY LWR FR BPR SERV
71802-T6N-A02	607822000	NSX SIDE SILL BLADE RH
74165-TP6-A00ZD	604015436	TP6 LWR FRT GARN LH A SILVER
75312-TP6-A01ZC	603996112	HONDA TP6 FRT LDM RH WHT DIMND
71124-TLA-A00	609890000	CRV GRILLE BASE RADAR DOOR SER
71515-TYB-A00	614170000	21 MDX RR HITCH GARN MIC SERV
71850-TZ3-A22ZB	610831256	TLX ROCKER LH MOD STEEL
71800-TZ3-A22ZF	610832573	TLX ROCKER RH PLATINUM WHITE
71850-TZ3-A22ZD	610831500	TLX ROCKER LH CRYS BLACK
75395-31M-A01ZE	621207573	23 INT RR DOOR W/A LH PLAT WH
71181-TGV-A00ZG	613150532	21TLX UPR FRT BMPR LUN SIL
71181-TGV-A00ZE	613150616	21TLX UPR FRT BMPR FATH BLK
71181-TGV-A00ZC	613150613	21TLX UPR FRT BMPR EX CRIMS
74950-3A0-A01ZH	623850577	23 CRV SPLR MIC LWR STL N SERV
71102-TYS-A00	612552000	MDX BLACK ED FOG GARN RH SERVC
71107-TYS-A00	612551000	MDX BLACK ED FOG GARN LH SERVC
74950-3A0-A01ZC	623850736	23 CRV SPLR MIC LWR METEOR SER
74165-TYA-A00	613601000	21 MDX FRT WHL PROT LH SERV
75332-TP6-A01ZC	603995112	HONDA TP6 FRT LDM LH WHT DIMND
71140-T95-A01	622482570	24 CLARITY FRT GRN RH SERV
75312-TP6-A52	605746517	CROSS FRT LDM RH SILVER SERVIC
74895-TA5-A01ZA	603020439	GARNISH +B536P+
75332-TP6-A52	605745517	CROSS FRT LDM LH SILVER SERVIC
74890-T2G-A31	608520000	2016 ACC LIC GARN W/CAM+SWI
74410-TYA-A20	617602570	21 MDX RR WF RH BERL BL SERV
71113-TLA-C50	614526000	20 CRV LWR RH BLK SERV
71700-TK4-A01ZD	603470500	SPOILER A+NH731P+
74895-TA5-A01ZK	603020500	4DR ACC LWR TRUNK SKIN-CRY BLK
74890-SZN-A01	603700407	SZN RR LIC GARN NO HOLE - BLK
71117-SZA-A00ZA	603551901	HONDA PILOT FOGL COVER CAP LH
74895-TA5-A21ZF	604450500	4DR ACC TRNK NO CAM-CRY BLACK
73162-SZN-A02ZE	603771502	SZN FRT WSHLD LH BURAN SILVER
74165-TP6-A00ZF	604015115	TP6 LWR FRT GARN LH POL METAL
71181-TGV-A00ZJ	613150611	21TLX UPR FRT BMPR SIGN BLU
71190-T95-A01	622481570	24 CLARITY FRT GRN LH SERV
74890-TBA-A11ZE	607930142	CVC 2016 LPG W/CAM CRY BLACK
74890-TWA-A01ZJ	618030577	21 ACC LPG BLUE H STILL NIGHT
71850-TZ3-A01ZH	610601573	TLX SIDE SILL LH PLATINUM WHIT
74950-3A0-A01ZG	623850737	23 CRV SPLR MIC LWR CAN RI SER
74895-TA5-A21ZM	604450020	4DR ACC TRNK NO CAM-ORCHID WHT
74890-T20-A21	617490000	22 CIVIC LPG W/CAM W/O SW SERV
74115-TP6-A00ZQ	604016206	TP6 LWR FRT GARN RH BASQUE RED
71200-3A0-A01	616400000	23 CRV NO RADAR MIC SERV
75390-31M-A01ZE	621208573	23 INT RR DOOR W/A RH PLAT WHI
74165-TP6-A00ZA	604015511	TP6 LWR FRT GARN LH GLAC BLUE
75313-TP6-A01ZF	604008115	HONDA TP6 RR LDM RH P METAL
75333-TP6-A01ZB	604007509	HONDA TP6 RR LDM LH OP SAGE
75312-TP6-A01ZD	603996436	HONDA TP6 FRT LDM RH AL SILVER
71510-TYA-A00	623880000	21 MDX RR SKID W/O KICK SERV
75670-TA5-A01	604551000	4DR ACC TRUNK GARN CHROME LH
71112-TLC-R50	614470000	20 CRV LWR CTR TRI SERV
71107-TVA-F00	617165000	HONDA ACC FRT FOG COVER LH
71124-T1W-B01	608430000	CRV 2015 LOWER BASE GRILLE HOT
73162-SZN-A02ZC	603771142	SZN FRT WSHLD LH CRYSTAL BLACK
75313-TP6-A51	605758517	CROSS RR LDM RH SILVER SERVICE
74450-TYA-A61ZF	#N/A	#N/A
71118-TLA-A70	614505000	20 CRV LWR LH HEX SERV
71110TLAA00	609910000	#N/A
`;

function buildCatalogFromRaw(raw: string): CatalogPart[] {
  return raw
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("\t");
      const externalPartNumber = (parts[0] || "").trim();
      const internalNumber = (parts[1] || "#N/A").trim() || "#N/A";
      const description = parts.slice(2).join(" ").trim() || "#N/A";

      return {
        externalPartNumber,
        internalNumber,
        description,
      };
    })
    .filter((item) => item.externalPartNumber);
}

const PART_CATALOG: CatalogPart[] = buildCatalogFromRaw(RAW_PART_CATALOG);

type CameraScanMode = "labelPart" | "labelQty" | "partBarcode";

function stripPartScanPrefix(value: string) {
  return String(value || "")
    .toUpperCase()
    .replace(/^PARTNO/, "")
    .replace(/^PARTNUMBER/, "")
    .replace(/^PN/, "")
    .replace(/^P(?=[0-9A-Z]{5,})/, "")
    .trim();
}

function normalizeCatalogKey(value: string) {
  const withoutPrefix = stripPartScanPrefix(value);

  return withoutPrefix
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/-/g, "")
    .replace(/[()]/g, "")
    .replace(/O/g, "0")
    .replace(/I/g, "1")
    .replace(/L/g, "1")
    .trim();
}

function normalizeScanValue(value: string) {
  return String(value || "").toUpperCase().replace(/\s+/g, "").trim();
}

function tryExtractPartNumber(rawValue: string) {
  return stripPartScanPrefix(rawValue)
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[()]/g, "")
    .replace(/O/g, "0")
    .replace(/I/g, "1")
    .replace(/L/g, "1")
    .trim();
}

function extractQuantityFromScan(rawValue: string) {
  const cleaned = String(rawValue || "").toUpperCase().trim();

  const keywordMatch = cleaned.match(
    /(?:QTY|QUANTITY|PACK|PKG|PACKAGE|COUNT)[^\d]*(\d{1,5})/
  );

  if (keywordMatch?.[1]) {
    return keywordMatch[1];
  }

  const compact = cleaned.replace(/\s+/g, "");

  if (/^\d{1,5}$/.test(compact)) {
    return compact;
  }

  const allNumbers = compact.match(/\d{1,5}/g) || [];

  const reasonableQty = allNumbers
    .map((value) => Number(value))
    .filter((value) => value > 0 && value <= 999)
    .sort((a, b) => a - b)[0];

  return reasonableQty ? String(reasonableQty) : "";
}

function findCatalogPartByLabelScan(rawValue: string) {
  const extracted = tryExtractPartNumber(rawValue);
  const normalizedExtracted = normalizeCatalogKey(extracted);

  const exactMatch = PART_CATALOG.find(
    (item) => normalizeCatalogKey(item.externalPartNumber) === normalizedExtracted
  );

  if (exactMatch) return exactMatch;

  const containedMatch = PART_CATALOG.find((item) => {
    const catalogKey = normalizeCatalogKey(item.externalPartNumber);

    return (
      normalizedExtracted.includes(catalogKey) ||
      catalogKey.includes(normalizedExtracted)
    );
  });

  return containedMatch || null;
}

function resolveExternalPartFromScan(rawValue: string) {
  const foundPart = findCatalogPartByLabelScan(rawValue);
  if (foundPart) return foundPart.externalPartNumber;

  return tryExtractPartNumber(rawValue);
}

function formatUiDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatUiTime(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function buildSessionAction(message: string) {
  return `${formatUiTime(new Date())} - ${message}`;
}

function appendSessionAction(session: LabelSession, message: string): string[] {
  const createdEntry = session.actionHistory.find((item) =>
    String(item).toUpperCase().includes("LABEL SESSION CREATED")
  );

  const otherEntries = session.actionHistory.filter(
    (item) => !String(item).toUpperCase().includes("LABEL SESSION CREATED")
  );

  const nextEntries = [...otherEntries, buildSessionAction(message)].slice(-19);

  return createdEntry ? [createdEntry, ...nextEntries] : nextEntries;
}

function buildSessionMetrics(session: LabelSession): LabelSession {
  const packedQty = session.scanHistory.filter((item) => item.status === "active").length;
  const defectQty = session.scanHistory.filter((item) => item.status === "defect").length;
  const remainingQty = Math.max(session.packagingQty - packedQty, 0);

  let status: LabelSession["status"] = "active";
  if (remainingQty === 0) status = "completed";

  return {
    ...session,
    packedQty,
    defectQty,
    remainingQty,
    status,
  };
}

function getScanBoxByMode(scanMode: CameraScanMode) {
  if (scanMode === "labelQty") {
    return {
      width: "34%",
      height: "18%",
      top: "41%",
      left: "33%",
    };
  }

  if (scanMode === "labelPart") {
    return {
      width: "76%",
      height: "22%",
      top: "24%",
      left: "12%",
    };
  }

  return {
    width: "76%",
    height: "24%",
    top: "32%",
    left: "12%",
  };
}

function getVideoCropRect(videoWidth: number, videoHeight: number, scanMode: CameraScanMode) {
  if (scanMode === "labelQty") {
    const width = Math.round(videoWidth * 0.34);
    const height = Math.round(videoHeight * 0.18);

    return {
      x: Math.round(videoWidth * 0.33),
      y: Math.round(videoHeight * 0.41),
      width,
      height,
    };
  }

  if (scanMode === "labelPart") {
    const width = Math.round(videoWidth * 0.76);
    const height = Math.round(videoHeight * 0.22);

    return {
      x: Math.round(videoWidth * 0.12),
      y: Math.round(videoHeight * 0.24),
      width,
      height,
    };
  }

  const width = Math.round(videoWidth * 0.76);
  const height = Math.round(videoHeight * 0.24);

  return {
    x: Math.round(videoWidth * 0.12),
    y: Math.round(videoHeight * 0.32),
    width,
    height,
  };
}

let sharedAudioContext: AudioContext | null = null;

function getAudioContext() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return null;

    if (!sharedAudioContext) {
      sharedAudioContext = new AudioContextClass();
    }

    if (sharedAudioContext.state === "suspended") {
      void sharedAudioContext.resume();
    }

    return sharedAudioContext;
  } catch {
    return null;
  }
}

function unlockOperatorAudio() {
  const audioContext = getAudioContext();
  if (!audioContext) return;

  try {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 1;
    gain.gain.value = 0.001;

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.02);
  } catch {
    // Ignore audio unlock errors.
  }
}

function playTone(frequency: number, durationMs: number, volume = 0.22, delayMs = 0) {
  const audioContext = getAudioContext();
  if (!audioContext) return;

  try {
    const startTime = audioContext.currentTime + delayMs / 1000;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(frequency, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + durationMs / 1000);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + durationMs / 1000 + 0.03);
  } catch {
    // Ignore beep errors.
  }
}

function playFeedbackSound(kind: FeedbackKind) {
  unlockOperatorAudio();

  if (kind === "complete") {
    return;
  }

  if (kind === "success") {
    playTone(1150, 75, 0.24, 0);
    playTone(1450, 85, 0.22, 105);
    return;
  }

  if (kind === "defect") {
    playTone(420, 140, 0.24, 0);
    playTone(320, 180, 0.24, 170);
    return;
  }

  playTone(260, 220, 0.26, 0);
  playTone(210, 180, 0.24, 250);
}

function speakShort(message: string) {
  try {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 0.95;

    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignore speech errors.
  }
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>("login");
  const [scanStage, setScanStage] = useState<ScanStage>("idle");

  const [employeeId, setEmployeeId] = useState("");
  const [crewSize, setCrewSize] = useState("1");
  const [machineMessage, setMachineMessage] = useState("System ready.");

  const [stationConfig, setStationConfig] = useState<StationConfigData>({
    stationId: "WP3-0031",
    hmiCellCode: "WP3 - WP3-0031",
    hmiTitle: "WP3 - WP3-0031",
    version: "v 3.1.33.275",
  });

  const [labelDetailsDraft, setLabelDetailsDraft] =
    useState<LabelDetailsDraft | null>(null);
  const [activeSession, setActiveSession] = useState<LabelSession | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const stationId = stationConfig.stationId || "WP3-0031";
  const hmiCellCode =
    stationConfig.hmiCellCode || stationConfig.hmiTitle || "WP3 - WP3-0031";
  const hmiVersion = stationConfig.version || "v 3.1.33.275";

  const catalogCount = useMemo(() => PART_CATALOG.length, []);

  const displayMachineMessage = useMemo(() => {
    const normalized = String(machineMessage || "").toLowerCase();

    if (screen === "partMenu" && normalized.includes("demo mode")) {
      return "Ready to scan EXT label.";
    }

    return machineMessage;
  }, [screen, machineMessage]);

  const pushAlert = (level: AlertLevel, message: string) => {
    setAlerts((prev) =>
      [
        {
          id: `${Date.now()}-${Math.random()}`,
          level,
          message,
          createdAt: Date.now(),
        },
        ...prev,
      ].slice(0, 8)
    );
  };

  useEffect(() => {
    const loadStationConfig = async () => {
      try {
        const configResponse = await getStationConfig();

        if (configResponse?.ok && configResponse?.data) {
          setStationConfig({
            stationId: configResponse.data.stationId || "WP3-0031",
            hmiCellCode:
              configResponse.data.hmiCellCode ||
              configResponse.data.hmiTitle ||
              "WP3 - WP3-0031",
            hmiTitle:
              configResponse.data.hmiTitle ||
              configResponse.data.hmiCellCode ||
              "WP3 - WP3-0031",
            version: configResponse.data.version || "v 3.1.33.275",
          });
        }
      } catch (error) {
        console.error("Station config load failed:", error);
      }
    };

    void loadStationConfig();
  }, []);

  const handleLogin = async () => {
    unlockOperatorAudio();

    if (!employeeId.trim() || !crewSize.trim()) {
      setMachineMessage("Please enter Employee ID and Crew Size.");
      pushAlert("warning", "Login validation failed.");
      return;
    }

    try {
      const result = await loginOperator({
        employeeId: employeeId.trim(),
        crewSize: Number(crewSize),
      });

      setEmployeeId(result.data.employeeId);
      setCrewSize(String(result.data.crewSize));
      setMachineMessage(result.message || "Login successful.");
      pushAlert("success", "Operator login accepted.");
      setScreen("partMenu");
    } catch (error: unknown) {
      const isNetworkError =
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message?: string }).message === "string" &&
        (error as { message: string }).message.toLowerCase().includes("network");

      if (isNetworkError) {
        setMachineMessage("Demo mode login active. Backend is not reachable.");
        pushAlert("warning", "Demo mode login active.");
        setScreen("partMenu");
        return;
      }

      setMachineMessage("Login failed. Please try again.");
      pushAlert("error", "Login failed.");
    }
  };

  const handleOpenDisplayPart = () => {
  setLabelDetailsDraft(null);
  setScanStage("labelCamera");
  setMachineMessage("Step 1: scan the top Part No barcode.");
};

const applyLabelPartScan = (value: string, nextStage: ScanStage) => {
  const foundPart = findCatalogPartByLabelScan(value);
  const extracted = tryExtractPartNumber(value);

  if (!foundPart) {
    setLabelDetailsDraft({
      externalPartNumber: extracted,
      internalNumber: "#N/A",
      description: "#N/A",
      packagingQty: "",
      skdQty: "",
    });

    setScanStage(nextStage);
    setMachineMessage("Part number scanned. Next: scan Package Qty.");
    pushAlert("warning", "Catalog row not found. Scan Package Qty next.");
    speakShort(`External label ${extracted}`);
    return;
  }

  setLabelDetailsDraft({
    externalPartNumber: foundPart.externalPartNumber,
    internalNumber: foundPart.internalNumber,
    description: foundPart.description,
    packagingQty: "",
    skdQty: "",
  });

  setScanStage(nextStage);
  setMachineMessage("Part number scanned. Next: scan Package Qty.");
  pushAlert("success", "Label part number scanned successfully.");
  speakShort(`External label ${foundPart.externalPartNumber}`);
};

const handleLabelDetected = (value: string) => {
  applyLabelPartScan(value, "labelQtyCamera");
};

const handleHandLabelDetected = (value: string) => {
  applyLabelPartScan(value, "idle");
};

  const handleLabelQtyDetected = (value: string) => {
    const qty = extractQuantityFromScan(value);

    if (!labelDetailsDraft) {
      setScanStage("idle");
      setMachineMessage("Scan label part number first.");
      pushAlert("warning", "Package Qty scan requires a label part first.");
      return;
    }

    if (!qty || Number(qty) <= 0) {
      setScanStage("idle");
      setMachineMessage("Package Qty could not be read. Scan the Qty barcode again.");
      pushAlert("warning", "Package Qty was not detected.");
      return;
    }

    setLabelDetailsDraft((prev) =>
      prev
        ? {
            ...prev,
            packagingQty: qty,
            skdQty: qty,
          }
        : prev
    );

    setScanStage("idle");
    setMachineMessage(`Package Qty scanned: ${qty}. Press CONFIRM.`);
    pushAlert("success", `Package Qty and SKD Qty set to ${qty}.`);
    speakShort(`Package quantity ${qty}`);
  };

  const handleConfirmLabel = () => {
    if (!labelDetailsDraft) {
      setMachineMessage("Scan a label first.");
      pushAlert("warning", "No label details loaded.");
      return;
    }

    const packagingQty = Number(labelDetailsDraft.packagingQty || 0);
    const skdQty = Number(labelDetailsDraft.skdQty || 0);

    if (!packagingQty || packagingQty <= 0) {
      setMachineMessage("Please scan Package Qty before confirming.");
      pushAlert("warning", "Package Qty scan is required.");
      return;
    }

    if (!skdQty || skdQty <= 0) {
      setMachineMessage("SKD Qty was not set. Scan Package Qty again.");
      pushAlert("warning", "SKD Qty is required.");
      return;
    }

    const nextSession = buildSessionMetrics({
      sessionId: `SESSION-${Date.now()}`,
      externalPartNumber: labelDetailsDraft.externalPartNumber,
      internalNumber: labelDetailsDraft.internalNumber || "#N/A",
      description: labelDetailsDraft.description || "#N/A",
      packagingQty,
      skdQty,
      packedQty: 0,
      remainingQty: packagingQty,
      defectQty: 0,
      status: "active",
      startedAt: Date.now(),
      lastScannedValue: "",
      lastResolvedExternalPartNumber: "",
      scanHistory: [],
      actionHistory: [
        buildSessionAction(
          `Label session created - EXT ${labelDetailsDraft.externalPartNumber} - INT ${
            labelDetailsDraft.internalNumber || "#N/A"
          } - PKG ${packagingQty} - SKD ${skdQty}`
        ),
      ],
    });

    setActiveSession(nextSession);
    setScanStatus("idle");
    setScreen("hmi");
    setMachineMessage("Label confirmed. HMI is ready for hand scanner input.");
  };

  const handlePartScanFromValue = (rawValue: string): boolean => {
    if (!activeSession) {
      setMachineMessage("No active label session.");
      setScanStatus("error");
      pushAlert("error", "No active label session.");
      playFeedbackSound("error");
      return true;
    }

    const normalizedRaw = normalizeScanValue(rawValue);

    if (!normalizedRaw) {
      setMachineMessage("Scan or paste a barcode first.");
      setScanStatus("error");
      pushAlert("warning", "Barcode input is empty.");
      playFeedbackSound("error");
      return false;
    }

    const resolvedExternalPartNumber = resolveExternalPartFromScan(rawValue);

    if (activeSession.remainingQty <= 0) {
      setMachineMessage("Container already complete. Over-scan blocked.");
      setScanStatus("error");
      pushAlert("error", "Over-scan blocked.");
      playFeedbackSound("error");
      return true;
    }

    const isMatch =
      normalizeCatalogKey(resolvedExternalPartNumber) ===
      normalizeCatalogKey(activeSession.externalPartNumber);

    if (!isMatch) {
      setActiveSession({
        ...activeSession,
        status: "error",
        lastScannedValue: normalizedRaw,
        lastResolvedExternalPartNumber: resolvedExternalPartNumber,
        actionHistory: appendSessionAction(
          activeSession,
          `Rejected scan ${resolvedExternalPartNumber}.`
        ),
      });

      setMachineMessage("Wrong part barcode rejected. Continue scanning.");
      setScanStatus("error");
      pushAlert("error", "Wrong part barcode scanned.");
      playFeedbackSound("error");
      return false;
    }

    const newRecord: SessionScanRecord = {
      id: `${Date.now()}-${Math.random()}`,
      rawBarcode: normalizedRaw,
      resolvedExternalPartNumber,
      status: "active",
      scannedAt: Date.now(),
    };

    const nextSession = buildSessionMetrics({
      ...activeSession,
      lastScannedValue: normalizedRaw,
      lastResolvedExternalPartNumber: resolvedExternalPartNumber,
      scanHistory: [newRecord, ...activeSession.scanHistory],
      actionHistory: appendSessionAction(
        activeSession,
        `Accepted scan ${resolvedExternalPartNumber}.`
      ),
    });

    setActiveSession(nextSession);
    setScanStatus("success");

    if (nextSession.remainingQty === 0) {
      setMachineMessage("Container complete.");
      pushAlert("success", "Container complete.");
      speakShort("Container complete");
      return true;
    }

    setMachineMessage(`Scan accepted. Remaining ${nextSession.remainingQty}. Continue scanning.`);
    pushAlert("success", "Part barcode accepted.");
    playFeedbackSound("success");
    return false;
  };

  useEffect(() => {
    const handleHardwareScanSubmit = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      const value = String(customEvent.detail || "").trim();

      if (!value) return;

      handlePartScanFromValue(value);
    };

    window.addEventListener("hardware-scan-submit", handleHardwareScanSubmit);

    return () => {
      window.removeEventListener("hardware-scan-submit", handleHardwareScanSubmit);
    };
  }, [activeSession]);

  const handleDefect = () => {
    if (!activeSession) {
      setMachineMessage("No active label session.");
      pushAlert("warning", "Defect action requires active session.");
      playFeedbackSound("error");
      return;
    }

    const candidate = activeSession.scanHistory.find((item) => item.status === "active");

    if (!candidate) {
      setMachineMessage("No active scanned part available to mark as defect.");
      pushAlert("warning", "No active scanned part available.");
      playFeedbackSound("error");
      return;
    }

    const nextHistory = activeSession.scanHistory.map((item) =>
      item.id === candidate.id ? { ...item, status: "defect" as const } : item
    );

    const nextSession = buildSessionMetrics({
      ...activeSession,
      scanHistory: nextHistory,
      actionHistory: appendSessionAction(
        activeSession,
        `Marked ${candidate.resolvedExternalPartNumber} as defect. Replacement scan required.`
      ),
    });

    setActiveSession(nextSession);
    setScanStatus("error");
    setMachineMessage("Defect recorded. Replacement scan required.");
    pushAlert("error", "Defect recorded.");
    playFeedbackSound("defect");
  };

  const handleChangePart = () => {
    setActiveSession(null);
    setLabelDetailsDraft(null);
    setScanStatus("idle");
    setScreen("partMenu");
    setMachineMessage("Start a new label session.");
  };

  const handleLogout = () => {
    setEmployeeId("");
    setCrewSize("1");
    setLabelDetailsDraft(null);
    setActiveSession(null);
    setScanStatus("idle");
    setAlerts([]);
    setScreen("login");
    setScanStage("idle");
    setMachineMessage("Operator logged out.");
  };

  return (
    <main style={mainShellStyle}>
      <style>{responsiveCss}</style>

      {screen === "login" && (
        <LoginScreen
          stationId={stationId}
          hmiVersion={hmiVersion}
          employeeId={employeeId}
          crewSize={crewSize}
          onEmployeeIdChange={setEmployeeId}
          onCrewSizeChange={setCrewSize}
          onLogin={handleLogin}
        />
      )}

      {screen === "partMenu" && (
        <PartMenuScreen
  hmiCellCode={hmiCellCode}
  hmiVersion={hmiVersion}
  machineMessage={displayMachineMessage}
  catalogCount={catalogCount}
  labelDetailsDraft={labelDetailsDraft}
  onDisplayPart={handleOpenDisplayPart}
  onHandLabelSubmit={handleHandLabelDetected}
  onScanPackageQty={() => setScanStage("labelQtyCamera")}
  onHandQtySubmit={handleLabelQtyDetected}
  onConfirmLabel={handleConfirmLabel}
  onLogout={handleLogout}
/>
      )}

      {screen === "hmi" && activeSession && (
        <HmiScreen
          hmiCellCode={hmiCellCode}
          hmiVersion={hmiVersion}
          stationId={stationId}
          employeeId={employeeId}
          crewSize={crewSize}
          machineMessage={machineMessage}
          activeSession={activeSession}
          alerts={alerts}
          scanStatus={scanStatus}
          onOpenCamera={() => setScanStage("partCamera")}
          onDefect={handleDefect}
          onChangePart={handleChangePart}
          onLogout={handleLogout}
        />
      )}

      <CameraScanModal
        isOpen={scanStage === "labelCamera"}
        title="SCAN LABEL PART #"
        helperText="Align only the TOP Part No barcode inside the scan box."
        scanMode="labelPart"
        onClose={() => setScanStage("idle")}
        onDetected={handleLabelDetected}
      />

      <CameraScanModal
        isOpen={scanStage === "labelQtyCamera"}
        title="SCAN PACKAGE QTY"
        helperText="Align only the small Package Qty barcode inside the scan box."
        scanMode="labelQty"
        onClose={() => setScanStage("idle")}
        onDetected={handleLabelQtyDetected}
      />

      <CameraScanModal
        isOpen={scanStage === "partCamera"}
        title="AUTO PART SCAN"
        helperText="Keep this screen open. Scan parts one by one until container complete."
        scanMode="partBarcode"
        continuous
        onClose={() => setScanStage("idle")}
        onDefectLast={handleDefect}
        onDetected={(value) => {
          const shouldClose = handlePartScanFromValue(value);

          if (shouldClose) {
            window.setTimeout(() => {
              setScanStage("idle");
            }, 550);
          }
        }}
      />
    </main>
  );
}

function CameraScanModal({
  isOpen,
  title,
  helperText,
  scanMode,
  continuous,
  onClose,
  onDetected,
  onDefectLast,
}: CameraScanModalProps & {
  scanMode: CameraScanMode;
  continuous?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const resetTimerRef = useRef<number | null>(null);
  const detectedOnceRef = useRef(false);
  const stableValueRef = useRef("");
  const stableCountRef = useRef(0);
  const onDetectedRef = useRef(onDetected);

  const [statusText, setStatusText] = useState("Starting camera...");
  const [manualValue, setManualValue] = useState("");

  const scanBox = getScanBoxByMode(scanMode);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  const resetContinuousScanner = (message = "Ready for next barcode.") => {
    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }

    resetTimerRef.current = window.setTimeout(() => {
      detectedOnceRef.current = false;
      stableValueRef.current = "";
      stableCountRef.current = 0;
      setStatusText(message);
    }, continuous ? 1150 : 0);
  };

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;

    detectedOnceRef.current = false;
    stableValueRef.current = "";
    stableCountRef.current = 0;
    setStatusText(continuous ? "Auto scan ready. Scan first part." : "Starting camera...");

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setStatusText("Camera API is not available. Use manual input below.");
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (!mounted) return;

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const DetectorCtor = (
          window as unknown as {
            BarcodeDetector?: new (options?: unknown) => {
              detect: (
                source: HTMLVideoElement | HTMLCanvasElement
              ) => Promise<Array<{ rawValue?: string }>>;
            };
          }
        ).BarcodeDetector;

        if (!DetectorCtor) {
          setStatusText("BarcodeDetector is not supported here. Use manual input below.");
          return;
        }

        const detector = new DetectorCtor({
          formats: ["code_39", "code_128", "qr_code", "ean_13", "ean_8", "upc_a", "upc_e"],
        });

        setStatusText(
          continuous
            ? "Auto scan ready. Keep barcode inside the red box."
            : "Align barcode inside the red scan box."
        );

        scanTimerRef.current = window.setInterval(async () => {
          try {
            if (!videoRef.current || !canvasRef.current || detectedOnceRef.current) return;

            const video = videoRef.current;
            const canvas = canvasRef.current;

            if (!video.videoWidth || !video.videoHeight) return;

            const crop = getVideoCropRect(video.videoWidth, video.videoHeight, scanMode);

            canvas.width = crop.width;
            canvas.height = crop.height;

            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            ctx.drawImage(
              video,
              crop.x,
              crop.y,
              crop.width,
              crop.height,
              0,
              0,
              crop.width,
              crop.height
            );

            const barcodes = await detector.detect(canvas);
            const rawValue = String(barcodes?.[0]?.rawValue || "").trim();

            if (rawValue && !detectedOnceRef.current) {
              const normalizedValue = normalizeScanValue(rawValue);
              const requiredStableCount = continuous ? 2 : scanMode === "labelQty" ? 2 : 3;

              if (stableValueRef.current === normalizedValue) {
                stableCountRef.current += 1;
              } else {
                stableValueRef.current = normalizedValue;
                stableCountRef.current = 1;
              }

              setStatusText(
                `Hold steady... ${Math.min(
                  stableCountRef.current,
                  requiredStableCount
                )}/${requiredStableCount}`
              );

              if (stableCountRef.current >= requiredStableCount) {
                detectedOnceRef.current = true;
                stableValueRef.current = "";
                stableCountRef.current = 0;

                setStatusText(continuous ? "Scan received. Move to next part." : "Barcode detected.");
                onDetectedRef.current(rawValue);

                if (continuous) {
                  resetContinuousScanner("Ready for next part barcode.");
                }
              }
            }
          } catch {
            // Ignore frame scan errors.
          }
        }, continuous ? 360 : 420);
      } catch {
        setStatusText("Camera access failed. Use manual input below.");
      }
    };

    void start();

    return () => {
      mounted = false;

      if (scanTimerRef.current) {
        window.clearInterval(scanTimerRef.current);
        scanTimerRef.current = null;
      }

      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      setManualValue("");
      detectedOnceRef.current = false;
      stableValueRef.current = "";
      stableCountRef.current = 0;
    };
  }, [isOpen, scanMode, continuous]);

  if (!isOpen) return null;

  return (
    <div style={modalOverlayStyle}>
      <div style={cameraModalPanelStyle}>
        <div style={cameraModalHeaderStyle}>{title}</div>
        <div style={cameraHelperTextStyle}>{helperText}</div>

        <div style={cameraVideoWrapStyle}>
          <video ref={videoRef} style={cameraVideoStyle} playsInline muted autoPlay />

          <div
            style={{
              ...cameraScanFrameStyle,
              width: scanBox.width,
              height: scanBox.height,
              top: scanBox.top,
              left: scanBox.left,
            }}
          >
            <div style={cameraScanFrameLabelStyle}>
              {scanMode === "labelPart"
                ? "PART NO BARCODE"
                : scanMode === "labelQty"
                ? "PACKAGE QTY BARCODE"
                : continuous
                ? "AUTO PART SCAN"
                : "PART BARCODE"}
            </div>
          </div>
        </div>

        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div style={cameraStatusStyle}>{statusText}</div>

        <textarea
          value={manualValue}
          onChange={(e) => setManualValue(e.target.value)}
          placeholder={
            scanMode === "labelQty"
              ? "Manual fallback: enter Package Qty, example 15"
              : "Manual fallback: paste barcode text here"
          }
          style={cameraManualInputStyle}
        />

        <div style={modalButtonsRowStyle}>
          <button
            style={modalSubmitButtonStyle}
            onClick={() => {
              const value = manualValue.trim();

              if (!value) return;

              onDetectedRef.current(value);

              if (continuous) {
                setManualValue("");
                setStatusText("Manual scan submitted. Ready for next barcode.");
                resetContinuousScanner("Ready for next part barcode.");
                return;
              }

              detectedOnceRef.current = true;
            }}
          >
            USE VALUE
          </button>

          {continuous && onDefectLast ? (
            <button
              style={modalDefectButtonStyle}
              onClick={() => {
                onDefectLast();
                setStatusText("Defect recorded. Scan replacement part.");
                resetContinuousScanner("Ready for replacement part barcode.");
              }}
            >
              DEFECT LAST
            </button>
          ) : null}

          <button style={modalCancelButtonStyle} onClick={onClose}>
            {continuous ? "BACK TO HMI" : "CLOSE"}
          </button>
        </div>
      </div>
    </div>
  );
}
function LoginScreen({
  stationId,
  hmiVersion,
  employeeId,
  crewSize,
  onEmployeeIdChange,
  onCrewSizeChange,
  onLogin,
}: {
  stationId: string;
  hmiVersion: string;
  employeeId: string;
  crewSize: string;
  onEmployeeIdChange: (value: string) => void;
  onCrewSizeChange: (value: string) => void;
  onLogin: () => void;
}) {
  return (
    <section style={loginScreenStyle}>
      <div style={loginHeaderStyle}>
        <div style={loginTitleStyle}>WP3 - {stationId}</div>
        <div style={loginVersionStyle}>{hmiVersion}</div>
      </div>

      <div style={loginFormCardStyle}>
        <div style={loginGridStyle}>
          <label style={loginLabelStyle}>STATION ID</label>
          <input value={stationId} readOnly style={loginInputStyle} />

          <label style={loginLabelStyle}>EMPLOYEE ID</label>
          <input
            value={employeeId}
            onChange={(e) => onEmployeeIdChange(e.target.value)}
            style={loginInputStyle}
          />

          <label style={loginLabelStyle}>CREW SIZE</label>
          <select
            value={crewSize}
            onChange={(e) => onCrewSizeChange(e.target.value)}
            style={loginInputStyle}
          >
            {Array.from({ length: 15 }, (_, i) => String(i + 1)).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <button style={primaryButtonStyle} onClick={onLogin}>
          LOGIN
        </button>
      </div>
    </section>
  );
}

function PartMenuScreen({
  hmiCellCode,
  hmiVersion,
  machineMessage,
  catalogCount,
  labelDetailsDraft,
  onDisplayPart,
  onHandLabelSubmit,
  onScanPackageQty,
  onHandQtySubmit,
  onConfirmLabel,
  onLogout,
}: {
  hmiCellCode: string;
  hmiVersion: string;
  machineMessage: string;
  catalogCount: number;
  labelDetailsDraft: LabelDetailsDraft | null;
  onDisplayPart: () => void;
  onHandLabelSubmit: (value: string) => void;
  onScanPackageQty: () => void;
  onHandQtySubmit: (value: string) => void;
  onConfirmLabel: () => void;
  onLogout: () => void;
}) {
  const [handLabelValue, setHandLabelValue] = useState("");
  const [handQtyValue, setHandQtyValue] = useState("");
  const handLabelInputRef = useRef<HTMLInputElement | null>(null);
  const handQtyInputRef = useRef<HTMLInputElement | null>(null);

  const submitHandLabel = () => {
    const value = handLabelValue.trim();

    if (!value) return;

    onHandLabelSubmit(value);
    setHandLabelValue("");

    window.setTimeout(() => {
      handQtyInputRef.current?.focus();
    }, 180);
  };

  const submitHandQty = () => {
    const value = handQtyValue.trim();

    if (!value || !labelDetailsDraft) return;

    onHandQtySubmit(value);
    setHandQtyValue("");

    window.setTimeout(() => {
      handQtyInputRef.current?.focus();
    }, 180);
  };

  useEffect(() => {
    const value = handLabelValue.trim();

    if (value.length < 6) return;

    const timer = window.setTimeout(() => {
      submitHandLabel();
    }, 450);

    return () => window.clearTimeout(timer);
  }, [handLabelValue]);

  useEffect(() => {
    const value = handQtyValue.trim();

    if (!labelDetailsDraft || value.length < 1) return;

    const timer = window.setTimeout(() => {
      submitHandQty();
    }, 850);

    return () => window.clearTimeout(timer);
  }, [handQtyValue, labelDetailsDraft]);

  return (
    <section style={mobileAppShellStyle}>
      <div style={mobileTopHeaderStyle}>
        <div style={mobileTopHeaderTitleStyle}>{hmiCellCode}</div>
        <div style={mobileTopHeaderMetaStyle}>{hmiVersion}</div>
        <div style={mobileTopHeaderSubMetaStyle}>PART CATALOG: {catalogCount}</div>
      </div>

      <div style={mobileCardStyle}>
        <div style={mobileSectionTitleStyle}>DISPLAY PART</div>

        <div style={mobileDetailGridStyle}>
          <MobileDetailField
            label="External Part #"
            value={labelDetailsDraft?.externalPartNumber ?? ""}
          />
          <MobileDetailField
            label="Internal Number"
            value={labelDetailsDraft?.internalNumber ?? ""}
          />
          <MobileDetailField
            label="Description"
            value={labelDetailsDraft?.description ?? ""}
            multiline
          />
        </div>

        <div style={mobileInputGridStyle}>
          <div>
            <div style={mobileFieldLabelStyle}>Packaging Qty</div>
            <input
              value={labelDetailsDraft?.packagingQty ?? ""}
              readOnly
              style={readonlyMobileInputStyle}
              inputMode="numeric"
              placeholder="Package Qty"
            />
          </div>

          <div>
            <div style={mobileFieldLabelStyle}>SKD Qty</div>
            <input
              value={labelDetailsDraft?.skdQty ?? ""}
              readOnly
              style={readonlyMobileInputStyle}
              inputMode="numeric"
              placeholder="SKD Qty"
            />
          </div>
        </div>
      </div>

      <div style={hardwareScannerPanelStyle}>
        <div style={hardwareScannerTitleStyle}>EXT LABEL HAND SCANNER</div>

        <input
          ref={handLabelInputRef}
          value={handLabelValue}
          onChange={(e) => setHandLabelValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitHandLabel();
            }
          }}
          placeholder="Tap here, then scan external label barcode"
          style={hardwareScannerInputStyle}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />

        <button style={blueActionButtonStyle} onClick={submitHandLabel}>
          USE EXT LABEL SCAN
        </button>
      </div>

      <div
        style={{
          ...hardwareScannerPanelStyle,
          opacity: labelDetailsDraft ? 1 : 0.55,
        }}
      >
        <div style={hardwareScannerTitleStyle}>PACKAGE QTY HAND SCANNER</div>

        <input
          ref={handQtyInputRef}
          value={handQtyValue}
          onChange={(e) => setHandQtyValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitHandQty();
            }
          }}
          placeholder={
            labelDetailsDraft
              ? "Tap here, then scan package quantity barcode"
              : "Scan EXT label first"
          }
          style={hardwareScannerInputStyle}
          inputMode="numeric"
          disabled={!labelDetailsDraft}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />

        <button
          style={{
            ...blueActionButtonStyle,
            opacity: labelDetailsDraft ? 1 : 0.65,
            cursor: labelDetailsDraft ? "pointer" : "not-allowed",
          }}
          onClick={submitHandQty}
          disabled={!labelDetailsDraft}
        >
          USE PACKAGE QTY SCAN
        </button>
      </div>

      <div style={mobileButtonGridTwoStyle}>
        <button style={primaryButtonStyle} onClick={onDisplayPart}>
          CAMERA EXT LABEL
        </button>

        <button
          style={{
            ...blueActionButtonStyle,
            opacity: labelDetailsDraft ? 1 : 0.55,
            cursor: labelDetailsDraft ? "pointer" : "not-allowed",
          }}
          onClick={onScanPackageQty}
          disabled={!labelDetailsDraft}
        >
          CAMERA PACKAGE
        </button>

        <button style={secondaryButtonStyle} onClick={onConfirmLabel}>
          CONFIRM
        </button>

        <button style={dangerButtonStyle} onClick={onLogout}>
          LOGOUT
        </button>
      </div>

      {machineMessage ? <div style={mobileMessageBarStyle}>{machineMessage}</div> : null}
    </section>
  );
}

function HmiScreen({
  hmiCellCode,
  hmiVersion,
  stationId,
  employeeId,
  crewSize,
  machineMessage,
  activeSession,
  alerts,
  scanStatus,
  onOpenCamera,
  onDefect,
  onChangePart,
  onLogout,
}: {
  hmiCellCode: string;
  hmiVersion: string;
  stationId: string;
  employeeId: string;
  crewSize: string;
  machineMessage: string;
  activeSession: LabelSession;
  alerts: AlertItem[];
  scanStatus: ScanStatus;
  onOpenCamera: () => void;
  onDefect: () => void;
  onChangePart: () => void;
  onLogout: () => void;
}) {
  const [now, setNow] = useState(new Date());
  const [hardwareScanValue, setHardwareScanValue] = useState("");
  const hardwareInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const focusTimer = window.setTimeout(() => {
      hardwareInputRef.current?.focus();
    }, 250);

    return () => window.clearTimeout(focusTimer);
  }, []);

  const historyRows =
    activeSession.actionHistory.length > 0
      ? activeSession.actionHistory
      : alerts.map((alert) => alert.message);

  const submitHardwareScan = () => {
    const value = hardwareScanValue.trim();

    if (!value) return;

    const submitEvent = new CustomEvent("hardware-scan-submit", {
      detail: value,
    });

    window.dispatchEvent(submitEvent);
    setHardwareScanValue("");

    window.setTimeout(() => {
      hardwareInputRef.current?.focus();
    }, 80);
  };
  useEffect(() => {
  const value = hardwareScanValue.trim();

  if (value.length < 6) return;

  const timer = window.setTimeout(() => {
    submitHardwareScan();
  }, 180);

  return () => window.clearTimeout(timer);
}, [hardwareScanValue]);

  return (
    <section style={mobileAppShellStyle}>
      <div style={mobileTopHeaderStyle}>
        <div style={mobileTopHeaderTitleStyle}>{hmiCellCode}</div>
        <div style={mobileTopHeaderMetaStyle}>{hmiVersion}</div>
      </div>

      <div style={mobileDescriptionCardStyle}>
        <div style={mobileDescriptionLabelStyle}>PART DESCRIPTION</div>
        <div style={mobileDescriptionValueStyle}>
          {activeSession.description || "#N/A"}
        </div>

        <div style={mobileDescriptionMetaRowStyle}>
          <span style={mobileDescriptionMetaPillStyle}>
            EXT: {activeSession.externalPartNumber || "#N/A"}
          </span>
          <span style={mobileDescriptionMetaPillStyle}>
            INT: {activeSession.internalNumber || "#N/A"}
          </span>
        </div>
      </div>

      <div style={mobileCardStyle}>
        <div style={mobileCardHeaderRowStyle}>
          <div style={mobileSectionTitleStyle}>SESSION HISTORY</div>
          <div
            style={{
              ...mobileStatusPillStyle,
              background:
                scanStatus === "success"
                  ? "#16a34a"
                  : scanStatus === "error"
                  ? "#dc2626"
                  : "#475569",
            }}
          >
            {(activeSession.status || "idle").toUpperCase()}
          </div>
        </div>

        <div style={mobileHistoryListStyle}>
          {historyRows.length ? (
            historyRows.map((item, index) => {
              const normalizedItem = String(item).toUpperCase();

              const isCreated = normalizedItem.includes("LABEL SESSION CREATED");
              const isAccepted = normalizedItem.includes("ACCEPTED SCAN");
              const isRejected = normalizedItem.includes("REJECTED SCAN");
              const isDefect = normalizedItem.includes("DEFECT");

              return (
                <div
                  key={`${item}-${index}`}
                  style={{
                    ...mobileHistoryItemStyle,
                    borderLeft: isCreated
                      ? "5px solid #2563eb"
                      : isAccepted
                      ? "5px solid #16a34a"
                      : isRejected
                      ? "5px solid #f59e0b"
                      : isDefect
                      ? "5px solid #dc2626"
                      : "5px solid #94a3b8",
                    background: isCreated
                      ? "#dbeafe"
                      : isAccepted
                      ? "#dcfce7"
                      : isRejected
                      ? "#fef3c7"
                      : isDefect
                      ? "#fee2e2"
                      : "#f8fafc",
                    color: isDefect
                      ? "#991b1b"
                      : isRejected
                      ? "#92400e"
                      : isAccepted
                      ? "#166534"
                      : "#0f172a",
                  }}
                >
                  {item}
                </div>
              );
            })
          ) : (
            <div style={mobileHistoryEmptyStyle}>No session history yet.</div>
          )}
        </div>

        <div style={hardwareScannerPanelStyle}>
          <div style={hardwareScannerTitleStyle}>HAND SCANNER READY</div>

          <input
            ref={hardwareInputRef}
            value={hardwareScanValue}
            onChange={(e) => setHardwareScanValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitHardwareScan();
              }
            }}
            onBlur={() => {
              window.setTimeout(() => {
                hardwareInputRef.current?.focus();
              }, 150);
            }}
            placeholder="Tap here once, then scan with Eyoyo"
            style={hardwareScannerInputStyle}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />

          <button style={blueActionButtonStyle} onClick={submitHardwareScan}>
            SUBMIT HAND SCAN
          </button>
        </div>

        <div style={scannerFabWrapStyle}>
          <button style={scannerFabButtonStyle} onClick={onOpenCamera}>
            <span style={scannerFabPrimaryTextStyle}>CAM</span>
            <span style={scannerFabSecondaryTextStyle}>SCAN</span>
          </button>
        </div>

        <div style={mobileOperatorActionGridStyle}>
          <button style={warningButtonStyle} onClick={onDefect}>
            DEFECT
          </button>
          <button style={secondaryButtonStyle} onClick={onChangePart}>
            CHANGE PART
          </button>
        </div>

        <button style={fullWidthDangerButtonStyle} onClick={onLogout}>
          LOGOUT
        </button>
      </div>

      <div style={mobileCardStyle}>
        <div style={mobileSectionTitleStyle}>CONTAINER / PROCESS</div>

        <div style={mobileStatGridStyle}>
          <MobileStatCard label="PACKED" value={String(activeSession.packedQty)} />
          <MobileStatCard label="REMAINING" value={String(activeSession.remainingQty)} />
          <MobileStatCard label="DEFECT" value={String(activeSession.defectQty)} danger />
          <MobileStatCard label="PKG QTY" value={String(activeSession.packagingQty)} />
          <MobileStatCard label="SKD QTY" value={String(activeSession.skdQty)} />
          <MobileStatCard label="STATUS" value={activeSession.status.toUpperCase()} />
        </div>

        <div style={mobileInfoStripStyle}>
          <div style={mobileInfoStripItemStyle}>
            <span style={mobileInfoStripLabelStyle}>Last Scan</span>
            <span style={mobileInfoStripValueStyle}>
              {activeSession.lastScannedValue || "-"}
            </span>
          </div>

          <div style={mobileInfoStripItemStyle}>
            <span style={mobileInfoStripLabelStyle}>Resolved Part</span>
            <span style={mobileInfoStripValueStyle}>
              {activeSession.lastResolvedExternalPartNumber || "-"}
            </span>
          </div>
        </div>
      </div>

      <div style={mobileMetaGridStyle}>
        <MobileMetaCard label="SHIFT" value="Hand Scanner Mode" />
        <MobileMetaCard label="CREW SIZE" value={crewSize || "-"} />
        <MobileMetaCard label="DATE" value={formatUiDate(now)} />
        <MobileMetaCard label="TIME" value={formatUiTime(now)} />
        <MobileMetaCard label="STATION" value={stationId || "-"} />
        <MobileMetaCard label="EMPLOYEE" value={employeeId || "-"} />
      </div>

      {machineMessage ? <div style={mobileMessageBarStyle}>{machineMessage}</div> : null}
    </section>
  );
}

function MobileDetailField({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div style={{ marginBottom: 10, minWidth: 0 }}>
      <div style={mobileFieldLabelStyle}>{label}</div>
      <div
        style={{
          ...mobileFieldValueStyle,
          minHeight: multiline ? 64 : 44,
          alignItems: multiline ? "flex-start" : "center",
          paddingTop: multiline ? 10 : 0,
          lineHeight: multiline ? 1.35 : 1.1,
        }}
      >
        {value || "-"}
      </div>
    </div>
  );
}

function MobileStatCard({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div style={mobileStatCardStyle}>
      <div style={mobileStatLabelStyle}>{label}</div>
      <div
        style={{
          ...mobileStatValueStyle,
          color: danger ? "#ef4444" : "#f8d34b",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MobileMetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={mobileMetaCardStyle}>
      <div style={mobileMetaCardLabelStyle}>{label}</div>
      <div style={mobileMetaCardValueStyle}>{value}</div>
    </div>
  );
}

const responsiveCss = `
* {
  box-sizing: border-box;
}

html, body, #root {
  width: 100%;
  min-height: 100%;
  margin: 0;
  overflow-x: hidden;
  background: #262c35;
}

button, input, select, textarea {
  font: inherit;
  max-width: 100%;
}

button {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

button:disabled {
  filter: grayscale(0.25);
}

textarea[readonly] {
  user-select: none;
}

@media (max-width: 640px) {
  main {
    padding: 8px !important;
  }

  button {
    min-height: 52px !important;
    font-size: 13px !important;
    border-radius: 14px !important;
  }

  input, select, textarea {
    font-size: 16px !important;
  }
}

@media (max-width: 420px) {
  button {
    font-size: 12px !important;
    padding-left: 5px !important;
    padding-right: 5px !important;
  }
}
`;

const mainShellStyle = {
  width: "100%",
  minHeight: "100vh",
  background: "#262c35",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  padding: "12px",
  fontFamily: "Arial, sans-serif",
  overflowX: "hidden" as const,
  overflowY: "auto" as const,
};

const loginScreenStyle = {
  width: "100%",
  maxWidth: 560,
  minHeight: "calc(100vh - 24px)",
  display: "grid",
  gap: 14,
  alignContent: "center",
};

const loginHeaderStyle = {
  background: "linear-gradient(180deg, #7c8598 0%, #6d7688 100%)",
  border: "1px solid #7e8797",
  borderRadius: 20,
  padding: 18,
  color: "#ffffff",
  boxShadow: "0 12px 24px rgba(0,0,0,0.22)",
};

const loginTitleStyle = {
  fontSize: "clamp(22px, 6vw, 28px)",
  fontWeight: 900,
  lineHeight: 1.05,
  wordBreak: "break-word" as const,
};

const loginVersionStyle = {
  marginTop: 8,
  fontSize: 12,
  fontWeight: 700,
  color: "#e5e7eb",
};

const loginFormCardStyle = {
  width: "100%",
  background: "#e5e7eb",
  border: "1px solid #cbd5e1",
  borderRadius: 20,
  padding: 16,
  display: "grid",
  gap: 16,
  boxShadow: "0 10px 22px rgba(15,23,42,0.14)",
};

const loginGridStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(100px, 150px) minmax(0, 1fr)",
  gap: 12,
  alignItems: "center",
};

const loginLabelStyle = {
  fontSize: 14,
  fontWeight: 800,
  color: "#1f2937",
};

const loginInputStyle = {
  minHeight: 46,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  borderRadius: 14,
  padding: "0 12px",
  fontSize: 16,
  color: "#111827",
  outline: "none",
  minWidth: 0,
};

const mobileAppShellStyle = {
  width: "100%",
  maxWidth: 560,
  margin: "0 auto",
  display: "grid",
  gap: 12,
  minWidth: 0,
};

const mobileTopHeaderStyle = {
  background: "linear-gradient(180deg, #7c8598 0%, #6d7688 100%)",
  border: "1px solid #7e8797",
  borderRadius: 20,
  padding: 14,
  color: "#ffffff",
  boxShadow: "0 12px 24px rgba(0,0,0,0.22)",
  minWidth: 0,
};

const mobileTopHeaderTitleStyle = {
  fontSize: "clamp(18px, 5vw, 22px)",
  fontWeight: 900,
  lineHeight: 1.1,
  wordBreak: "break-word" as const,
};

const mobileTopHeaderMetaStyle = {
  marginTop: 6,
  fontSize: 12,
  fontWeight: 700,
  color: "#e5e7eb",
};

const mobileTopHeaderSubMetaStyle = {
  marginTop: 6,
  fontSize: 11,
  fontWeight: 700,
  color: "#dbeafe",
};

const mobileDescriptionCardStyle = {
  background: "linear-gradient(180deg, #5b6374 0%, #4d5567 100%)",
  border: "1px solid #6b7280",
  borderRadius: 20,
  padding: 14,
  color: "#ffffff",
  boxShadow: "0 12px 24px rgba(0,0,0,0.24)",
  minWidth: 0,
};

const mobileDescriptionLabelStyle = {
  fontSize: 11,
  fontWeight: 800,
  color: "#cbd5e1",
  letterSpacing: 0.4,
};

const mobileDescriptionValueStyle = {
  marginTop: 8,
  fontSize: "clamp(17px, 5vw, 22px)",
  fontWeight: 900,
  color: "#fde047",
  lineHeight: 1.2,
  wordBreak: "break-word" as const,
};

const mobileDescriptionMetaRowStyle = {
  marginTop: 12,
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 8,
  minWidth: 0,
};

const mobileDescriptionMetaPillStyle = {
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 800,
  color: "#ffffff",
  wordBreak: "break-word" as const,
  maxWidth: "100%",
};

const mobileCardStyle = {
  background: "#e5e7eb",
  border: "1px solid #cbd5e1",
  borderRadius: 20,
  padding: 14,
  boxShadow: "0 10px 22px rgba(15,23,42,0.14)",
  minWidth: 0,
};

const mobileSectionTitleStyle = {
  fontSize: 15,
  fontWeight: 900,
  color: "#0f172a",
  marginBottom: 10,
  letterSpacing: 0.3,
  textAlign: "center" as const,
};

const mobileCardHeaderRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  marginBottom: 10,
  minWidth: 0,
};

const mobileStatusPillStyle = {
  minWidth: 92,
  minHeight: 34,
  padding: "0 12px",
  borderRadius: 999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#ffffff",
  fontWeight: 900,
  fontSize: 12,
  flexShrink: 0,
};

const mobileDetailGridStyle = {
  display: "grid",
  gap: 0,
  minWidth: 0,
};

const mobileInputGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
  minWidth: 0,
};

const mobileFieldLabelStyle = {
  fontSize: 11,
  fontWeight: 800,
  color: "#334155",
  marginBottom: 5,
  textAlign: "center" as const,
};

const mobileFieldValueStyle = {
  width: "100%",
  minHeight: 44,
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  borderRadius: 14,
  padding: "0 12px",
  display: "flex",
  color: "#111827",
  fontSize: 14,
  fontWeight: 700,
  wordBreak: "break-word" as const,
  minWidth: 0,
};

const mobileInputStyle = {
  width: "100%",
  minHeight: 46,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  borderRadius: 14,
  padding: "0 12px",
  fontSize: 16,
  fontWeight: 700,
  color: "#111827",
  outline: "none",
  minWidth: 0,
};

const readonlyMobileInputStyle = {
  ...mobileInputStyle,
  background: "#f1f5f9",
  color: "#0f172a",
  border: "1px solid #94a3b8",
  cursor: "default",
};

const mobileButtonGridTwoStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
  minWidth: 0,
};

const baseButtonStyle = {
  minHeight: 54,
  border: "none",
  borderRadius: 16,
  fontWeight: 950,
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "0 10px 18px rgba(0,0,0,0.18)",
  minWidth: 0,
  padding: "0 8px",
  whiteSpace: "normal" as const,
};

const primaryButtonStyle = {
  ...baseButtonStyle,
  background: "linear-gradient(180deg, #4ade80 0%, #16a34a 100%)",
  color: "#ffffff",
};

const secondaryButtonStyle = {
  ...baseButtonStyle,
  background: "linear-gradient(180deg, #8b5cf6 0%, #6d28d9 100%)",
  color: "#ffffff",
};

const blueActionButtonStyle = {
  ...baseButtonStyle,
  background: "linear-gradient(180deg, #38bdf8 0%, #1d4ed8 100%)",
  color: "#ffffff",
};

const warningButtonStyle = {
  ...baseButtonStyle,
  background: "linear-gradient(180deg, #fde047 0%, #eab308 100%)",
  color: "#111827",
};

const dangerButtonStyle = {
  ...baseButtonStyle,
  background: "linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)",
  color: "#ffffff",
};

const fullWidthDangerButtonStyle = {
  ...dangerButtonStyle,
  width: "100%",
  marginTop: 10,
};

const mobileOperatorActionGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
  marginTop: 14,
  minWidth: 0,
};

const scannerFabWrapStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  marginTop: 14,
  marginBottom: 6,
};

const scannerFabButtonStyle = {
  width: 132,
  height: 132,
  borderRadius: "50%",
  border: "none",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  background: "radial-gradient(circle at 30% 30%, #67e8f9 0%, #2563eb 55%, #1e3a8a 100%)",
  color: "#ffffff",
  cursor: "pointer",
  boxShadow:
    "0 18px 34px rgba(37,99,235,0.34), inset 0 3px 10px rgba(255,255,255,0.18)",
};

const scannerFabPrimaryTextStyle = {
  fontSize: 24,
  fontWeight: 950,
  letterSpacing: 1,
  lineHeight: 1,
};

const scannerFabSecondaryTextStyle = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 1.4,
  opacity: 0.92,
};

const mobileHistoryListStyle = {
  display: "grid",
  gap: 8,
  maxHeight: 210,
  overflowY: "auto" as const,
  paddingRight: 2,
};

const mobileHistoryItemStyle = {
  borderRadius: 14,
  padding: "11px 12px",
  fontSize: 14,
  fontWeight: 900,
  lineHeight: 1.45,
  wordBreak: "break-word" as const,
};

const mobileHistoryEmptyStyle = {
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  borderRadius: 14,
  padding: "14px 12px",
  fontSize: 13,
  color: "#475569",
  fontWeight: 700,
  textAlign: "center" as const,
};

const mobileStatGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 9,
  minWidth: 0,
};

const mobileStatCardStyle = {
  background: "#374151",
  border: "1px solid #4b5563",
  borderRadius: 16,
  padding: "11px 8px",
  minWidth: 0,
  textAlign: "center" as const,
};

const mobileStatLabelStyle = {
  fontSize: 10,
  fontWeight: 800,
  color: "#d1d5db",
  marginBottom: 6,
  letterSpacing: 0.3,
};

const mobileStatValueStyle = {
  fontSize: "clamp(20px, 6vw, 25px)",
  fontWeight: 950,
  lineHeight: 1,
  wordBreak: "break-word" as const,
};

const mobileInfoStripStyle = {
  marginTop: 12,
  display: "grid",
  gap: 8,
};

const mobileInfoStripItemStyle = {
  background: "#f8fafc",
  border: "1px solid #cbd5e1",
  borderRadius: 14,
  padding: "10px 12px",
  display: "grid",
  gap: 4,
  minWidth: 0,
};

const mobileInfoStripLabelStyle = {
  fontSize: 10,
  fontWeight: 800,
  color: "#64748b",
};

const mobileInfoStripValueStyle = {
  fontSize: 13,
  fontWeight: 800,
  color: "#0f172a",
  wordBreak: "break-word" as const,
};

const mobileMetaGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
  minWidth: 0,
};

const mobileMetaCardStyle = {
  background: "#374151",
  border: "1px solid #4b5563",
  borderRadius: 16,
  padding: 12,
  color: "#ffffff",
  minWidth: 0,
};

const mobileMetaCardLabelStyle = {
  fontSize: 10,
  fontWeight: 800,
  color: "#cbd5e1",
  marginBottom: 4,
};

const mobileMetaCardValueStyle = {
  fontSize: 13,
  fontWeight: 800,
  color: "#ffffff",
  wordBreak: "break-word" as const,
};

const mobileMessageBarStyle = {
  border: "1px solid #cbd5e1",
  background: "#e2e8f0",
  color: "#111827",
  borderRadius: 14,
  padding: "10px 12px",
  fontSize: 13,
  fontWeight: 800,
  lineHeight: 1.4,
  wordBreak: "break-word" as const,
  minWidth: 0,
  textAlign: "center" as const,
};

const modalOverlayStyle = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(15, 23, 42, 0.62)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 12,
  zIndex: 999,
};

const cameraModalPanelStyle = {
  width: "min(96vw, 560px)",
  maxHeight: "92vh",
  overflowY: "auto" as const,
  background: "#111827",
  border: "2px solid #334155",
  boxShadow: "0 18px 48px rgba(0,0,0,0.45)",
  padding: 14,
  boxSizing: "border-box" as const,
  borderRadius: 18,
};

const cameraModalHeaderStyle = {
  color: "#ffffff",
  fontSize: 20,
  fontWeight: 800,
  marginBottom: 10,
  textAlign: "center" as const,
};

const cameraHelperTextStyle = {
  color: "#cbd5e1",
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 10,
  textAlign: "center" as const,
};

const cameraVideoWrapStyle = {
  width: "100%",
  background: "#000000",
  border: "1px solid #475569",
  overflow: "hidden" as const,
  borderRadius: 14,
  position: "relative" as const,
};

const cameraVideoStyle = {
  width: "100%",
  display: "block",
  aspectRatio: "4 / 5",
  objectFit: "cover" as const,
};

const cameraScanFrameStyle = {
  position: "absolute" as const,
  border: "4px solid #ef4444",
  borderRadius: 10,
  boxShadow: "0 0 0 999px rgba(0,0,0,0.42), 0 0 22px rgba(239,68,68,0.72)",
  zIndex: 4,
  pointerEvents: "none" as const,
};

const cameraScanFrameLabelStyle = {
  position: "absolute" as const,
  left: 8,
  top: -28,
  background: "#ef4444",
  color: "#ffffff",
  borderRadius: 999,
  padding: "5px 10px",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: 0.5,
  whiteSpace: "nowrap" as const,
};

const cameraStatusStyle = {
  color: "#e5e7eb",
  fontSize: 13,
  fontWeight: 700,
  textAlign: "center" as const,
  marginTop: 10,
};

const cameraManualInputStyle = {
  marginTop: 12,
  width: "100%",
  minHeight: 88,
  resize: "none" as const,
  background: "#f8fafc",
  color: "#111827",
  border: "1px solid #9ca3af",
  padding: 10,
  fontSize: 15,
  boxSizing: "border-box" as const,
  borderRadius: 14,
};

const modalButtonsRowStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 12,
  marginTop: 18,
};

const modalSubmitButtonStyle = {
  minHeight: 54,
  border: "none",
  borderRadius: 16,
  background: "linear-gradient(180deg, #16a34a 0%, #15803d 100%)",
  color: "#ffffff",
  fontSize: 16,
  fontWeight: 800,
  cursor: "pointer",
};

const modalDefectButtonStyle = {
  minHeight: 54,
  border: "none",
  borderRadius: 16,
  background: "linear-gradient(180deg, #fde047 0%, #eab308 100%)",
  color: "#111827",
  fontSize: 16,
  fontWeight: 900,
  cursor: "pointer",
};

const modalCancelButtonStyle = {
  minHeight: 54,
  border: "none",
  borderRadius: 16,
  background: "linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)",
  color: "#ffffff",
  fontSize: 16,
  fontWeight: 800,
  cursor: "pointer",
};
const hardwareScannerPanelStyle = {
  marginTop: 14,
  background: "#dbeafe",
  border: "1px solid #93c5fd",
  borderRadius: 18,
  padding: 12,
  display: "grid",
  gap: 10,
};

const hardwareScannerTitleStyle = {
  fontSize: 13,
  fontWeight: 950,
  color: "#1e3a8a",
  textAlign: "center" as const,
  letterSpacing: 0.4,
};

const hardwareScannerInputStyle = {
  width: "100%",
  minHeight: 52,
  border: "2px solid #2563eb",
  background: "#ffffff",
  borderRadius: 14,
  padding: "0 12px",
  fontSize: 16,
  fontWeight: 800,
  color: "#111827",
  outline: "none",
};
