import { useEffect, useMemo, useState } from "react";
import { getStationConfig, getStationLineup, loginOperator } from "./api/client";

type AppScreen = "login" | "partMenu" | "hmi" | "downtime";

type PartMaster = {
  id: string;
  externalPartNumber: string;
  description: string;
  customerPartNumber: string;
  arNumber: string;
  position: string;
  colour: string;
  fixtureId: string;
};

type StationConfigData = {
  stationId: string;
  hmiCellCode?: string;
  hmiTitle?: string;
  version?: string;
};

type SchedulerLineupItem = {
  lineupId: string;
  sequence: string;
  orderQty: string;
  packQty: string;
  part: PartMaster;
};

type DisplayPart = PartMaster & {
  lineupId: string;
  sequence: string;
  orderQty: string;
  packQty: string;
};

type DowntimeRecord = {
  category: string;
  reason: string;
  startedAt: number;
  endedAt?: number;
  notes: string;
};

function App() {
  const [screen, setScreen] = useState<AppScreen>("login");
  const [employeeId, setEmployeeId] = useState("");
  const [crewSize, setCrewSize] = useState("1");
  const [highlightedLineupId, setHighlightedLineupId] = useState("");
  const [selectedLineupId, setSelectedLineupId] = useState("");
  const [machineMessage, setMachineMessage] = useState("System ready.");
  const [showLineupList, setShowLineupList] = useState(false);

  const [stationConfig, setStationConfig] = useState<StationConfigData>({
    stationId: "WP3-0031",
    hmiCellCode: "WP3 - WP3-0031",
    hmiTitle: "WP3 - WP3-0031",
    version: "v 3.1.2.273",
  });

  const [displayParts, setDisplayParts] = useState<DisplayPart[]>([]);
  const [isLoadingLineup, setIsLoadingLineup] = useState(false);

  const [goodCount, setGoodCount] = useState(0);
  const [suspectCount] = useState(0);
  const [packedFgCount, setPackedFgCount] = useState(0);
  const [containerCount, setContainerCount] = useState(1);
  const [packedSerials, setPackedSerials] = useState<string[]>([]);
  const [scanStatus, setScanStatus] = useState<"idle" | "success" | "error">("idle");

  const [activeDowntime, setActiveDowntime] = useState<DowntimeRecord | null>(null);

  const stationId = stationConfig.stationId || "WP3-0031";
  const hmiCellCode =
    stationConfig.hmiCellCode || stationConfig.hmiTitle || "WP3 - WP3-0031";
  const hmiVersion = stationConfig.version || "v 3.1.2.273";

  const highlightedPart = useMemo(
    () => displayParts.find((part) => part.lineupId === highlightedLineupId) ?? null,
    [displayParts, highlightedLineupId]
  );

  const selectedPart = useMemo(
    () => displayParts.find((part) => part.lineupId === selectedLineupId) ?? null,
    [displayParts, selectedLineupId]
  );

  const scheduledQtyNumber = Number(selectedPart?.orderQty || 0);
  const packQtyNumber = Number(selectedPart?.packQty || 0);

  const resetProductionState = () => {
    setGoodCount(0);
    setPackedFgCount(0);
    setContainerCount(1);
    setPackedSerials([]);
    setScanStatus("idle");
  };

  const loadStationData = async () => {
    setIsLoadingLineup(true);

    try {
      const [configResponse, lineupResponse] = await Promise.all([
        getStationConfig(),
        getStationLineup(),
      ]);

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
          version: configResponse.data.version || "v 3.1.2.273",
        });
      }

      const rawItems = lineupResponse?.data?.items;

      if (Array.isArray(rawItems)) {
        const mappedParts: DisplayPart[] = rawItems.map((item: SchedulerLineupItem) => ({
          ...item.part,
          lineupId: item.lineupId,
          sequence: item.sequence,
          orderQty: item.orderQty,
          packQty: item.packQty,
        }));

        setDisplayParts(mappedParts);
      } else {
        setDisplayParts([]);
      }
    } catch (error) {
      console.error("Station data load failed:", error);
      setDisplayParts([]);
    } finally {
      setIsLoadingLineup(false);
    }
  };

  const handleLogin = async () => {
    if (!employeeId.trim() || !crewSize.trim()) {
      setMachineMessage("Please enter Employee ID and Crew Size.");
      return;
    }

    try {
      const result = await loginOperator({
        employeeId: employeeId.trim(),
        crewSize: Number(crewSize),
      });

      setEmployeeId(result.data.employeeId);
      setCrewSize(String(result.data.crewSize));
      setShowLineupList(false);
      setHighlightedLineupId("");
      setSelectedLineupId("");
      resetProductionState();
      setMachineMessage(result.message || "Login successful.");
      setScreen("partMenu");
    } catch (error) {
      console.error("Login failed:", error);
      setMachineMessage("Login failed. Please check the form and try again.");
    }
  };

  const handleLoginFormLogout = () => {
    setEmployeeId("");
    setCrewSize("1");
    setHighlightedLineupId("");
    setSelectedLineupId("");
    setShowLineupList(false);
    setDisplayParts([]);
    resetProductionState();
    setMachineMessage("Login form cleared.");
  };

  const handleLoginFormExit = () => {
    window.close();
    setMachineMessage("Window close requested.");
  };

  const handleDisplayPart = async () => {
    setShowLineupList(true);
    setMachineMessage("Loading scheduler line-up...");
    await loadStationData();
  };

  const handleHighlightPart = (lineupId: string) => {
    const nextPart = displayParts.find((part) => part.lineupId === lineupId) ?? null;
    setHighlightedLineupId(lineupId);

    if (nextPart) {
      setMachineMessage(`Part highlighted: ${nextPart.externalPartNumber}`);
    }
  };

  const handleSelectPart = () => {
    if (!highlightedLineupId) {
      setMachineMessage("Please choose a part from the line-up first.");
      return;
    }

    const nextPart = displayParts.find((part) => part.lineupId === highlightedLineupId) ?? null;

    if (!nextPart) {
      setMachineMessage("Selected part could not be loaded.");
      return;
    }

    setSelectedLineupId(highlightedLineupId);
    resetProductionState();
    setMachineMessage(`Part loaded into HMI: ${nextPart.externalPartNumber}`);
    setScreen("hmi");
  };

  const handleChangePart = () => {
    setShowLineupList(false);
    setHighlightedLineupId("");
    setSelectedLineupId("");
    resetProductionState();
    setMachineMessage("Change Part requested.");
    setScreen("partMenu");
  };

  const handleLogout = () => {
    setEmployeeId("");
    setCrewSize("1");
    setHighlightedLineupId("");
    setSelectedLineupId("");
    setShowLineupList(false);
    setDisplayParts([]);
    resetProductionState();
    setMachineMessage("Operator logged out.");
    setScreen("login");
  };

  const handleExitPartMenu = () => {
    setShowLineupList(false);
    setHighlightedLineupId("");
    setSelectedLineupId("");
    setMachineMessage("Part menu closed.");
    setScreen("login");
  };

  const handleSimulateValidScan = () => {
    if (!selectedPart) {
      setMachineMessage("No active part selected.");
      setScanStatus("error");
      return;
    }

    if (!selectedPart.orderQty) {
      setMachineMessage("Scheduler must enter Order Qty first.");
      setScanStatus("error");
      return;
    }

    if (scheduledQtyNumber > 0 && goodCount >= scheduledQtyNumber) {
      setMachineMessage("Scheduled target already reached.");
      setScanStatus("error");
      return;
    }

    const nextGood = goodCount + 1;
    const nextPackedFg = packedFgCount + 1;

    setGoodCount(nextGood);
    setPackedFgCount(nextPackedFg);
    setPackedSerials((prev) => [...prev, `SCAN-${String(nextGood).padStart(4, "0")}`]);
    setScanStatus("success");

    if (packQtyNumber > 0 && nextPackedFg > 0 && nextPackedFg % packQtyNumber === 0) {
      setContainerCount((prev) => prev + 1);
      setMachineMessage("Scan accepted. Pack complete for current container.");
      return;
    }

    if (scheduledQtyNumber > 0 && nextGood === scheduledQtyNumber) {
      setMachineMessage("Scan accepted. Scheduled target reached.");
      return;
    }

    setMachineMessage("Scan accepted.");
  };

  const handleOpenDowntime = () => {
    setMachineMessage("Downtime screen opened.");
    setScreen("downtime");
  };

  const handleStartDowntime = (category: string, reason: string, notes: string) => {
    setActiveDowntime({
      category,
      reason,
      notes,
      startedAt: Date.now(),
    });
    setMachineMessage(`Downtime active: ${category} / ${reason}`);
  };

  const handleResumeFromDowntime = () => {
    if (activeDowntime) {
      setActiveDowntime({
        ...activeDowntime,
        endedAt: Date.now(),
      });
    }

    setMachineMessage("Downtime closed. Returned to HMI.");
    setScreen("hmi");
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#262c35",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
        boxSizing: "border-box",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {screen === "login" && (
        <LoginScreen
          stationId={stationId}
          employeeId={employeeId}
          crewSize={crewSize}
          onEmployeeIdChange={setEmployeeId}
          onCrewSizeChange={setCrewSize}
          onLogin={handleLogin}
          onLogout={handleLoginFormLogout}
          onExit={handleLoginFormExit}
        />
      )}

      {screen === "partMenu" && (
        <PartMenuScreen
          stationId={stationId}
          employeeId={employeeId}
          crewSize={crewSize}
          parts={displayParts}
          showLineupList={showLineupList}
          highlightedPart={highlightedPart}
          highlightedLineupId={highlightedLineupId}
          isLoadingLineup={isLoadingLineup}
          onDisplayPart={handleDisplayPart}
          onHighlightPart={handleHighlightPart}
          onSelectPart={handleSelectPart}
          onExit={handleExitPartMenu}
        />
      )}

      {screen === "hmi" && selectedPart && (
        <HmiScreen
          hmiCellCode={hmiCellCode}
          hmiVersion={hmiVersion}
          stationId={stationId}
          employeeId={employeeId}
          crewSize={crewSize}
          part={selectedPart}
          machineMessage={machineMessage}
          goodCount={goodCount}
          suspectCount={suspectCount}
          packedFgCount={packedFgCount}
          containerCount={containerCount}
          packedSerials={packedSerials}
          scanStatus={scanStatus}
          onScanOk={handleSimulateValidScan}
          onChangePart={handleChangePart}
          onLogout={handleLogout}
          onOpenDowntime={handleOpenDowntime}
        />
      )}

      {screen === "downtime" && (
        <DowntimeScreen
          hmiCellCode={hmiCellCode}
          activeDowntime={activeDowntime}
          onStartDowntime={handleStartDowntime}
          onResume={handleResumeFromDowntime}
        />
      )}
    </main>
  );
}

function LoginScreen({
  stationId,
  employeeId,
  crewSize,
  onEmployeeIdChange,
  onCrewSizeChange,
  onLogin,
  onLogout,
  onExit,
}: {
  stationId: string;
  employeeId: string;
  crewSize: string;
  onEmployeeIdChange: (value: string) => void;
  onCrewSizeChange: (value: string) => void;
  onLogin: () => void;
  onLogout: () => void;
  onExit: () => void;
}) {
  return (
    <section style={loginCardStyle}>
      <div style={loginHeaderStyle}>
        <div style={loginTitleStyle}>OPERATOR LOGIN</div>
        <div style={loginSubTitleStyle}>Station authentication required</div>
      </div>

      <div style={loginPanelStyle}>
        <div style={loginGridStyle}>
          <label style={loginLabelStyle}>STATION ID</label>
          <input value={stationId} readOnly style={inputStyle} />

          <label style={loginLabelStyle}>EMPLOYEE ID</label>
          <input
            value={employeeId}
            onChange={(e) => onEmployeeIdChange(e.target.value)}
            style={inputStyle}
            placeholder="Enter employee number"
          />

          <label style={loginLabelStyle}>CREW SIZE</label>
          <select
            value={crewSize}
            onChange={(e) => onCrewSizeChange(e.target.value)}
            style={inputStyle}
          >
            {Array.from({ length: 15 }, (_, i) => String(i + 1)).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div style={loginButtonsRowStyle}>
          <button style={greenLoginButtonStyle} onClick={onLogin}>
            LOG IN
          </button>
          <button style={redLoginButtonStyle} onClick={onLogout}>
            LOG OUT
          </button>
          <button style={grayLoginButtonStyle} onClick={onExit}>
            EXIT
          </button>
        </div>
      </div>
    </section>
  );
}

function PartMenuScreen({
  stationId,
  employeeId,
  crewSize,
  parts,
  showLineupList,
  highlightedPart,
  highlightedLineupId,
  isLoadingLineup,
  onDisplayPart,
  onHighlightPart,
  onSelectPart,
  onExit,
}: {
  stationId: string;
  employeeId: string;
  crewSize: string;
  parts: DisplayPart[];
  showLineupList: boolean;
  highlightedPart: DisplayPart | null;
  highlightedLineupId: string;
  isLoadingLineup: boolean;
  onDisplayPart: () => void;
  onHighlightPart: (lineupId: string) => void;
  onSelectPart: () => void;
  onExit: () => void;
}) {
  return (
    <section style={menuPageWrapStyle}>
      <div style={menuTopMetaStyle}>
        <span>STATION: {stationId}</span>
        <span>EMPLOYEE ID: {employeeId || "-"}</span>
        <span>CREW SIZE: {crewSize || "-"}</span>
      </div>

      <div style={whiteMenuBoxStyle}>
        <div style={whiteMenuTitleStyle}>PART MENU</div>

        <div style={largeWhitePanelStyle}>
          {showLineupList ? (
            <div style={lineupSectionStyle}>
              <div style={lineupHeaderRowStyle}>
                <div style={lineupSectionTitleStyle}>DISPLAY PART</div>
                <div style={lineupHintStyle}>
                  Highlight one scheduled item, then press SELECT PART.
                </div>
              </div>

              {isLoadingLineup ? (
                <div style={emptyPanelMessageStyle}>Loading scheduler line-up...</div>
              ) : (
                <div style={lineupContentWrapStyle}>
                  <div style={lineupListStyle}>
                    {parts.map((part) => {
                      const isHighlighted = part.lineupId === highlightedLineupId;

                      return (
                        <button
                          key={part.lineupId}
                          onClick={() => onHighlightPart(part.lineupId)}
                          style={{
                            ...lineupItemStyle,
                            background: isHighlighted ? "#1d4ed8" : "#f8fafc",
                            color: isHighlighted ? "#ffffff" : "#111827",
                            border: isHighlighted
                              ? "3px solid #16a34a"
                              : "2px solid #cbd5e1",
                          }}
                        >
                          <div style={lineupTopRowStyle}>
                            <span style={lineupMainCodeStyle}>{part.externalPartNumber}</span>
                            <span style={lineupSeqStyle}>SEQ {part.sequence || "-"}</span>
                          </div>

                          <div style={lineupDescriptionStyle}>{part.description}</div>

                          <div style={lineupMetaGridStyle}>
                            <LineMeta label="ORDER QTY" value={part.orderQty || "-"} />
                            <LineMeta label="PACK QTY" value={part.packQty || "-"} />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div style={selectedPreviewBoxStyle}>
                    <div style={selectedPreviewTitleStyle}>PART DETAILS</div>
                    <PreviewRow
                      label="External Part #"
                      value={highlightedPart?.externalPartNumber ?? ""}
                    />
                    <PreviewRow label="Description" value={highlightedPart?.description ?? ""} />
                    <PreviewRow
                      label="Customer Part #"
                      value={highlightedPart?.customerPartNumber ?? ""}
                    />
                    <PreviewRow label="AR #" value={highlightedPart?.arNumber ?? ""} />
                    <PreviewRow label="Position" value={highlightedPart?.position ?? ""} />
                    <PreviewRow label="Colour" value={highlightedPart?.colour ?? ""} />
                    <PreviewRow label="Order Qty" value={highlightedPart?.orderQty ?? ""} />
                    <PreviewRow label="Pack Qty" value={highlightedPart?.packQty ?? ""} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={emptyPanelMessageStyle}>
              Press <strong>DISPLAY PART</strong> to load scheduler line-up inside this panel.
            </div>
          )}
        </div>

        <div style={bottomButtonsWrapStyle}>
          <button style={displayButtonStyle} onClick={onDisplayPart}>
            DISPLAY PART
          </button>
          <button style={selectButtonStyle} onClick={onSelectPart}>
            SELECT PART
          </button>
          <button style={exitButtonStyle} onClick={onExit}>
            EXIT
          </button>
        </div>
      </div>
    </section>
  );
}

function HmiScreen({
  hmiCellCode,
  hmiVersion,
  stationId,
  employeeId,
  crewSize,
  part,
  machineMessage,
  goodCount,
  suspectCount,
  packedFgCount,
  containerCount,
  packedSerials,
  scanStatus,
  onScanOk,
  onChangePart,
  onLogout,
  onOpenDowntime,
}: {
  hmiCellCode: string;
  hmiVersion: string;
  stationId: string;
  employeeId: string;
  crewSize: string;
  part: DisplayPart;
  machineMessage: string;
  goodCount: number;
  suspectCount: number;
  packedFgCount: number;
  containerCount: number;
  packedSerials: string[];
  scanStatus: "idle" | "success" | "error";
  onScanOk: () => void;
  onChangePart: () => void;
  onLogout: () => void;
  onOpenDowntime: () => void;
}) {
  const scanIndicatorColor =
    scanStatus === "success" ? "#22c55e" : scanStatus === "error" ? "#ef4444" : "#f3f4f6";

  return (
    <section
      style={{
        width: "100%",
        maxWidth: 1100,
        background: "#4a4f5f",
        color: "#ffffff",
        border: "2px solid #707786",
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        padding: 12,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 8,
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: 1,
              lineHeight: 1,
              marginBottom: 8,
            }}
          >
            {hmiCellCode}
          </div>
          <div style={{ fontSize: 12, color: "#e5e7eb", fontWeight: 700 }}>
            {hmiVersion}
          </div>
        </div>

        <div style={iconBarStyle}>
          <TopActionIcon kind="supervisor" label="SUPERVSR" />
          <TopActionIcon kind="material" label="MATERIAL" />
          <TopActionIcon kind="quality" label="QUALITY" />
          <TopActionIcon kind="maint" label="MAINT" />
          <TopActionIcon kind="workinst" label="WORK INST" />
          <TopActionIcon kind="reports" label="REPORTS" />
        </div>
      </div>

      <div style={topInfoWrap}>
        <div style={{ marginBottom: 4, fontSize: 12, color: "#d1d5db" }}>
          EXTERNAL PART INFORMATION
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "220px 1fr 130px",
            gap: 10,
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <div style={yellowTextSmall}>{part.externalPartNumber}</div>
          <div style={yellowTextLarge}>{part.description}</div>
          <div style={{ textAlign: "right", color: "#d1d5db", fontSize: 13 }}>
            Fixture ID: {part.fixtureId}
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid #7f8796",
            marginTop: 4,
            paddingTop: 4,
          }}
        >
          <div style={{ marginBottom: 4, fontSize: 12, color: "#d1d5db" }}>
            GENERAL INFORMATION
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 1fr 0.8fr 0.8fr 240px",
              gap: 12,
              alignItems: "start",
            }}
          >
            <MiniInfo label="CUST PART #" value={part.customerPartNumber} />
            <MiniInfo label="AR #" value={part.arNumber} />
            <MiniInfo label="POSITION" value={part.position} />
            <MiniInfo label="COLOUR" value={part.colour} />

            <div>
              <button style={changePackBtn}>CHANGE PACK QTY</button>

              <div
                style={{
                  marginTop: 6,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <MiniInfo label="STD PACK" value={part.packQty || ""} accent="#f87171" />
                <MiniInfo label="ORDER QTY" value={part.orderQty || ""} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "280px 1fr 280px",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            alignContent: "start",
          }}
        >
          <button style={greenBtn}>PRINT PARTIAL</button>
          <button style={greenBtn}>SHIFT CHANGE</button>
          <button style={yellowBtn} onClick={onOpenDowntime}>
            DOWN TIME
          </button>
          <button style={yellowBtn}>SUSPECT / DEFECT</button>
          <button style={blueBtn}>OPTIONS</button>
          <button style={redBtn} onClick={onChangePart}>
            CHANGE PART
          </button>

          <button style={scanTestBtn} onClick={onScanOk}>
            SCAN OK
          </button>
        </div>

        <div style={panelBox}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 0,
              marginBottom: 0,
            }}
          >
            <CounterHeader title="CONTAINER" />
            <CounterHeader title="PRODUCTION" />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              alignItems: "start",
            }}
          >
            <div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 0,
                }}
              >
                <div style={counterLabel}>PACKED</div>
                <div style={counterLabel}>CONT #</div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 0,
                  marginBottom: 0,
                }}
              >
                <div style={counterValue}>{packedFgCount}</div>
                <div style={counterValue}>{containerCount}</div>
              </div>

              <div style={serialListBox}>
                {packedSerials.map((serial) => (
                  <div key={serial} style={{ textAlign: "left" }}>
                    {serial}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div
                style={{
                  width: 66,
                  height: 48,
                  background: scanIndicatorColor,
                  border: "2px solid #9ca3af",
                  marginBottom: 14,
                }}
              />

              <div
                style={{
                  color: "#e5e7eb",
                  fontSize: 16,
                  fontWeight: 700,
                  textAlign: "center",
                  marginBottom: 8,
                }}
              >
                PASS / FAIL
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  border: "2px solid #9ca3af",
                  padding: "10px 14px",
                  color: "#111827",
                }}
              >
                <MetricRow label="SCHEDULED" value={part.orderQty || ""} color="#111827" />
                <MetricRow label="PACKED (FG)" value={String(packedFgCount)} color="#111827" />
                <MetricRow label="GOOD" value={String(goodCount)} color="#16a34a" />
                <MetricRow label="SUSPECT" value={String(suspectCount)} color="#991b1b" />
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            border: "1px solid #7f8796",
            background: "#505566",
            padding: 10,
            color: "#d1d5db",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <div>STATION: {stationId}</div>
          <div>EMPLOYEE ID: {employeeId}</div>
          <div>CREW SIZE: {crewSize}</div>
          <div style={{ marginTop: 10 }}>
            <button style={primaryActionStyle} onClick={onLogout}>
              LOG OUT
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 10,
          border: "1px solid #8992a3",
          background: "#d1d5db",
          color: "#111827",
          fontSize: 14,
          padding: "6px 12px",
          fontWeight: 700,
          textAlign: "left" as const,
        }}
      >
        {machineMessage}
      </div>

      <div
        style={{
          marginTop: 4,
          display: "grid",
          gridTemplateColumns: "repeat(8, 1fr)",
          gap: 4,
          fontSize: 10,
          color: "#d1d5db",
        }}
      >
        <FooterTag text="Season Number" />
        <FooterTag text="Shift" />
        <FooterTag text="Crew Size" />
        <FooterTag text="Employee ID" />
        <FooterTag text="Job Number" />
        <FooterTag text="Label Data" />
        <FooterTag text="Go to Send" />
        <FooterTag text="PLC Data" />
      </div>
    </section>
  );
}

function DowntimeScreen({
  hmiCellCode,
  activeDowntime,
  onStartDowntime,
  onResume,
}: {
  hmiCellCode: string;
  activeDowntime: DowntimeRecord | null;
  onStartDowntime: (category: string, reason: string, notes: string) => void;
  onResume: () => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState("MAINTENANCE");
  const [selectedReason, setSelectedReason] = useState("");
  const [notes, setNotes] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const categoryOptions: Record<string, string[]> = {
    MAINTENANCE: [
      "COLOR / FAIL GOOD PART",
      "VALIDATION NOT PASSING",
      "ROBOT ISSUE",
      "SENSOR ISSUE",
      "VISION SYSTEM ISSUE",
      "WELDER ISSUE",
    ],
    DOWNTIME: ["BREAK / LUNCH", "TRAINING", "MEETING", "SAFETY ISSUE"],
    PROCESS: [
      "RUNNING SLOW",
      "WAITING COMPONENTS",
      "WAITING PARTS",
      "WAITING FOR QUALITY",
      "PART CHANGEOVER",
      "PART QUALITY ISSUE",
      "LABEL SYS PROBLEMS",
    ],
  };

  useEffect(() => {
    if (!activeDowntime?.startedAt || activeDowntime.endedAt) return;

    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - activeDowntime.startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeDowntime]);

  const startDowntime = () => {
    if (!selectedReason) return;
    onStartDowntime(selectedCategory, selectedReason, notes);
  };

  const displayTime = formatElapsedTime(elapsedSeconds);

  return (
    <section style={downtimeWrapStyle}>
      <div style={downtimeHeaderStyle}>
        <div style={downtimeTitleStyle}>DOWNTIME</div>
        <div style={downtimeTimerStyle}>{displayTime}</div>
      </div>

      <div style={downtimeBodyStyle}>
        <div style={downtimeColumnsStyle}>
          {Object.entries(categoryOptions).map(([category, reasons]) => (
            <div key={category} style={downtimeColumnStyle}>
              <div style={downtimeColumnHeaderStyle}>{category}</div>
              {reasons.map((reason) => {
                const isSelected = selectedCategory === category && selectedReason === reason;

                return (
                  <button
                    key={reason}
                    onClick={() => {
                      setSelectedCategory(category);
                      setSelectedReason(reason);
                    }}
                    style={{
                      ...downtimeReasonButtonStyle,
                      background: isSelected ? "#2563eb" : "#ffffff",
                      color: isSelected ? "#ffffff" : "#111827",
                    }}
                  >
                    {reason}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div style={downtimeNotesWrapStyle}>
          <div style={downtimeNotesTitleStyle}>EXPLANATION / DETAILS</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={downtimeTextareaStyle}
          />
        </div>

        <div style={downtimeFooterActionsStyle}>
          {!activeDowntime?.startedAt || activeDowntime.endedAt ? (
            <button style={downtimeBlueButtonStyle} onClick={startDowntime}>
              START
            </button>
          ) : (
            <button style={downtimeBlueButtonStyle}>OPTIONS</button>
          )}

          <button style={downtimeGreenButtonStyle} onClick={onResume}>
            RESUME
          </button>
        </div>

        <div style={downtimeMetaStyle}>{hmiCellCode}</div>
      </div>
    </section>
  );
}

function LineMeta({ label, value }: { label: string; value: string }) {
  return (
    <div style={lineMetaWrapStyle}>
      <span style={lineMetaLabelStyle}>{label}</span>
      <span style={lineMetaValueStyle}>{value}</span>
    </div>
  );
}

function TopActionIcon({
  kind,
  label,
}: {
  kind: "supervisor" | "material" | "quality" | "maint" | "workinst" | "reports";
  label: string;
}) {
  return (
    <div style={iconCardStyle}>
      <div style={iconTitleStyle}>{label}</div>
      <div style={iconBodyStyle}>
        {kind === "supervisor" && (
          <>
            <div style={personStickStyle} />
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 999,
                border: "3px solid #8b5cf6",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#f8fafc",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: "#8b5cf6",
                  position: "absolute",
                  top: 4,
                }}
              />
              <div
                style={{
                  width: 12,
                  height: 7,
                  borderRadius: "8px 8px 4px 4px",
                  background: "#c4b5fd",
                  position: "absolute",
                  bottom: 4,
                }}
              />
            </div>
          </>
        )}

        {kind === "material" && (
          <>
            <div
              style={{
                width: 28,
                height: 18,
                background: "#111827",
                borderRadius: 2,
                position: "relative",
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  background: "#111827",
                  position: "absolute",
                  bottom: -8,
                  left: 2,
                }}
              />
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  background: "#111827",
                  position: "absolute",
                  bottom: -8,
                  right: 2,
                }}
              />
              <div
                style={{
                  width: 8,
                  height: 16,
                  background: "#111827",
                  position: "absolute",
                  left: 4,
                  top: -10,
                }}
              />
            </div>
            <div style={{ display: "grid", gap: 2 }}>
              <div style={brownBoxStyle} />
              <div style={brownBoxStyle} />
            </div>
          </>
        )}

        {kind === "quality" && (
          <>
            <div style={{ width: 18, height: 18, position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "#ef4444",
                  transform: "rotate(45deg)",
                  borderRadius: 2,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 7,
                  left: -2,
                  width: 22,
                  height: 4,
                  background: "#ffffff",
                  transform: "rotate(45deg)",
                }}
              />
            </div>
            <div
              style={{
                width: 28,
                height: 20,
                border: "2px solid #9ca3af",
                background: "#ffffff",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 5,
                  top: 5,
                  width: 15,
                  height: 8,
                  borderLeft: "5px solid #16a34a",
                  borderBottom: "5px solid #16a34a",
                  transform: "rotate(-45deg)",
                }}
              />
            </div>
          </>
        )}

        {kind === "maint" && (
          <>
            <div style={personStickStyle} />
            <div style={{ width: 18, height: 26, position: "relative" }}>
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  background: "#4338ca",
                  margin: "0 auto 2px",
                }}
              />
              <div
                style={{
                  width: 6,
                  height: 10,
                  background: "#6366f1",
                  margin: "0 auto",
                }}
              />
            </div>
          </>
        )}

        {kind === "workinst" && (
          <>
            <div
              style={{
                width: 22,
                height: 28,
                background: "#f8fafc",
                border: "2px solid #94a3b8",
                position: "relative",
              }}
            >
              <div style={miniLineStyle} />
              <div style={{ ...miniLineStyle, top: 10 }} />
              <div style={{ ...miniLineStyle, top: 16 }} />
            </div>
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: "14px solid transparent",
                borderRight: "14px solid transparent",
                borderBottom: "24px solid #fde047",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: -1,
                  top: 8,
                  color: "#111827",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                !
              </div>
            </div>
          </>
        )}

        {kind === "reports" && (
          <div
            style={{
              width: 40,
              height: 28,
              position: "relative",
              borderBottom: "3px solid #111827",
              borderLeft: "3px solid #111827",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 4,
                top: 18,
                width: 8,
                height: 3,
                background: "#166534",
                transform: "rotate(-55deg)",
                transformOrigin: "left center",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 11,
                top: 14,
                width: 10,
                height: 3,
                background: "#166534",
                transform: "rotate(18deg)",
                transformOrigin: "left center",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 20,
                top: 17,
                width: 9,
                height: 3,
                background: "#166534",
                transform: "rotate(-35deg)",
                transformOrigin: "left center",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 28,
                top: 12,
                width: 7,
                height: 3,
                background: "#166534",
                transform: "rotate(60deg)",
                transformOrigin: "left center",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ color: "#4b5563", fontSize: 12, marginBottom: 3, fontWeight: 700 }}>
        {label}
      </div>
      <div
        style={{
          background: "#f8fafc",
          color: "#111827",
          minHeight: 42,
          display: "flex",
          alignItems: "center",
          padding: "0 10px",
          fontWeight: 700,
          border: "1px solid #cbd5e1",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MiniInfo({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div>
      <div
        style={{
          color: accent || "#d1d5db",
          fontSize: 11,
          marginBottom: 2,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: "#f8d34b",
          fontSize: 24,
          fontWeight: 700,
          lineHeight: 1.05,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function CounterHeader({ title }: { title: string }) {
  return (
    <div
      style={{
        color: "#d1d5db",
        fontSize: 13,
        fontWeight: 700,
        marginBottom: 4,
      }}
    >
      {title}
    </div>
  );
}

function MetricRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "center",
        gap: 10,
        marginBottom: 6,
      }}
    >
      <div style={{ fontSize: 15, color: "#4b5563", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 42, fontWeight: 700, color, lineHeight: 1, minWidth: 36 }}>
        {value}
      </div>
    </div>
  );
}

function FooterTag({ text }: { text: string }) {
  return (
    <div
      style={{
        borderTop: "1px solid #7f8796",
        paddingTop: 2,
      }}
    >
      {text}
    </div>
  );
}

function formatElapsedTime(totalSeconds: number) {
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

const loginCardStyle = {
  width: "100%",
  maxWidth: 620,
  background: "#474d5d",
  border: "2px solid #707786",
  padding: 0,
  boxSizing: "border-box" as const,
  color: "#ffffff",
  overflow: "hidden",
  boxShadow: "0 16px 36px rgba(0,0,0,0.35)",
};

const loginHeaderStyle = {
  background: "#3f4553",
  padding: "18px 22px",
  borderBottom: "1px solid #687180",
};

const loginTitleStyle = {
  textAlign: "center" as const,
  fontSize: 30,
  fontWeight: 700,
  marginBottom: 6,
  letterSpacing: 0.5,
};

const loginSubTitleStyle = {
  textAlign: "center" as const,
  fontSize: 13,
  color: "#d1d5db",
};

const loginPanelStyle = {
  padding: 24,
};

const loginGridStyle = {
  display: "grid",
  gridTemplateColumns: "170px 1fr",
  gap: 16,
  alignItems: "center",
};

const loginLabelStyle = {
  fontSize: 16,
  fontWeight: 700,
  color: "#e5e7eb",
};

const inputStyle = {
  height: 52,
  border: "1px solid #9ca3af",
  background: "#f8fafc",
  padding: "0 12px",
  fontSize: 18,
  outline: "none",
  boxSizing: "border-box" as const,
};

const loginButtonsRowStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 12,
  marginTop: 24,
};

const greenLoginButtonStyle = {
  height: 58,
  border: "none",
  background: "#16a34a",
  color: "#ffffff",
  fontWeight: 700,
  fontSize: 18,
  cursor: "pointer",
};

const redLoginButtonStyle = {
  height: 58,
  border: "none",
  background: "#b91c1c",
  color: "#ffffff",
  fontWeight: 700,
  fontSize: 18,
  cursor: "pointer",
};

const grayLoginButtonStyle = {
  height: 58,
  border: "none",
  background: "#6b7280",
  color: "#ffffff",
  fontWeight: 700,
  fontSize: 18,
  cursor: "pointer",
};

const menuPageWrapStyle = {
  width: "100%",
  maxWidth: 1120,
};

const menuTopMetaStyle = {
  display: "flex",
  gap: 18,
  flexWrap: "wrap" as const,
  fontSize: 14,
  color: "#d1d5db",
  marginBottom: 12,
};

const whiteMenuBoxStyle = {
  background: "#ffffff",
  color: "#111827",
  border: "2px solid #d1d5db",
  padding: 18,
  boxSizing: "border-box" as const,
  minHeight: 680,
};

const whiteMenuTitleStyle = {
  fontSize: 28,
  fontWeight: 700,
  marginBottom: 16,
};

const largeWhitePanelStyle = {
  border: "2px solid #d1d5db",
  background: "#ffffff",
  minHeight: 540,
  padding: 16,
  boxSizing: "border-box" as const,
};

const emptyPanelMessageStyle = {
  minHeight: 500,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#6b7280",
  fontSize: 20,
  textAlign: "center" as const,
  padding: 24,
};

const bottomButtonsWrapStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 12,
  marginTop: 18,
};

const displayButtonStyle = {
  height: 64,
  border: "none",
  background: "#16a34a",
  color: "#ffffff",
  fontWeight: 700,
  fontSize: 18,
  cursor: "pointer",
};

const selectButtonStyle = {
  height: 64,
  border: "none",
  background: "#1d4ed8",
  color: "#ffffff",
  fontWeight: 700,
  fontSize: 18,
  cursor: "pointer",
};

const exitButtonStyle = {
  height: 64,
  border: "none",
  background: "#b91c1c",
  color: "#ffffff",
  fontWeight: 700,
  fontSize: 18,
  cursor: "pointer",
};

const lineupSectionStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 16,
};

const lineupHeaderRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap" as const,
};

const lineupSectionTitleStyle = {
  fontSize: 22,
  fontWeight: 700,
};

const lineupHintStyle = {
  fontSize: 14,
  color: "#4b5563",
};

const lineupContentWrapStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 360px",
  gap: 16,
};

const lineupListStyle = {
  display: "grid",
  gap: 12,
  maxHeight: 430,
  overflowY: "auto" as const,
  paddingRight: 4,
};

const lineupItemStyle = {
  textAlign: "left" as const,
  padding: 16,
  cursor: "pointer",
  minHeight: 106,
};

const lineupTopRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const lineupMainCodeStyle = {
  fontWeight: 700,
  fontSize: 18,
};

const lineupSeqStyle = {
  fontSize: 13,
  fontWeight: 700,
  opacity: 0.9,
};

const lineupDescriptionStyle = {
  fontSize: 15,
  marginTop: 6,
  marginBottom: 10,
  lineHeight: 1.35,
};

const lineupMetaGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
};

const lineMetaWrapStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
};

const lineMetaLabelStyle = {
  fontSize: 12,
  fontWeight: 700,
  opacity: 0.85,
};

const lineMetaValueStyle = {
  fontSize: 14,
  fontWeight: 700,
};

const selectedPreviewBoxStyle = {
  border: "2px solid #cbd5e1",
  background: "#f3f4f6",
  padding: 14,
};

const selectedPreviewTitleStyle = {
  fontSize: 18,
  fontWeight: 700,
  marginBottom: 12,
};

const primaryActionStyle = {
  minWidth: 180,
  height: 48,
  border: "none",
  background: "#16a34a",
  color: "#ffffff",
  fontWeight: 700,
  fontSize: 16,
  cursor: "pointer",
  padding: "0 18px",
};

const iconBarStyle = {
  display: "flex",
  gap: 6,
  alignItems: "flex-start",
  flexWrap: "wrap" as const,
};

const iconCardStyle = {
  width: 72,
  height: 48,
  background: "#f8fafc",
  border: "1px solid #cbd5e1",
  display: "flex",
  flexDirection: "column" as const,
  overflow: "hidden",
};

const iconTitleStyle = {
  color: "#dc2626",
  fontSize: 10,
  fontWeight: 700,
  textAlign: "center" as const,
  paddingTop: 2,
  lineHeight: 1,
};

const iconBodyStyle = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 5,
  padding: "2px 4px 4px",
  boxSizing: "border-box" as const,
};

const personStickStyle = {
  width: 14,
  height: 24,
  position: "relative" as const,
  background:
    "linear-gradient(to bottom, #111827 0 6px, transparent 6px 100%), linear-gradient(to right, transparent 5px, #111827 5px 9px, transparent 9px), linear-gradient(135deg, transparent 0 44%, #111827 44% 56%, transparent 56%), linear-gradient(225deg, transparent 0 44%, #111827 44% 56%, transparent 56%)",
  borderRadius: 1,
};

const brownBoxStyle = {
  width: 12,
  height: 10,
  background: "#a16207",
  border: "1px solid #78350f",
};

const miniLineStyle = {
  position: "absolute" as const,
  left: 4,
  right: 4,
  top: 4,
  height: 2,
  background: "#94a3b8",
};

const topInfoWrap = {
  border: "1px solid #7f8796",
  padding: 10,
  background: "#505566",
  boxSizing: "border-box" as const,
};

const yellowTextSmall = {
  color: "#f8d34b",
  fontSize: 22,
  fontWeight: 700,
};

const yellowTextLarge = {
  color: "#f8d34b",
  fontSize: 25,
  fontWeight: 700,
};

const changePackBtn = {
  width: "100%",
  height: 40,
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  color: "#4b5563",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
};

const panelBox = {
  border: "1px solid #7f8796",
  background: "#505566",
  padding: 8,
  boxSizing: "border-box" as const,
};

const actionBase = {
  minHeight: 88,
  border: "none",
  fontSize: 22,
  fontWeight: 700,
  cursor: "pointer",
  color: "#ffffff",
  lineHeight: 1.1,
};

const greenBtn = {
  ...actionBase,
  background: "#2ea84a",
};

const yellowBtn = {
  ...actionBase,
  background: "#e5c44a",
  color: "#111827",
};

const blueBtn = {
  ...actionBase,
  background: "#1d4ed8",
};

const redBtn = {
  ...actionBase,
  background: "#8b1e2d",
};

const scanTestBtn = {
  ...actionBase,
  background: "#0f766e",
  gridColumn: "1 / span 2",
  minHeight: 60,
  fontSize: 18,
};

const counterLabel = {
  background: "#505566",
  color: "#e5e7eb",
  fontSize: 12,
  fontWeight: 700,
  padding: "4px 6px",
  border: "1px solid #8d95a4",
  textAlign: "center" as const,
};

const counterValue = {
  background: "#f8fafc",
  color: "#111827",
  fontSize: 34,
  fontWeight: 700,
  height: 60,
  border: "1px solid #9ca3af",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const serialListBox = {
  background: "#f8fafc",
  border: "1px solid #9ca3af",
  color: "#111827",
  minHeight: 210,
  padding: "8px 10px",
  fontFamily: "Consolas, monospace",
  fontSize: 16,
  lineHeight: 1.45,
  boxSizing: "border-box" as const,
  overflowY: "auto" as const,
  textAlign: "left" as const,
};

const downtimeWrapStyle = {
  width: "100%",
  maxWidth: 980,
  background: "#d1d5db",
  border: "2px solid #9ca3af",
  boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
};

const downtimeHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "#e7dd2f",
  padding: "14px 18px",
};

const downtimeTitleStyle = {
  fontSize: 26,
  fontWeight: 700,
  color: "#111827",
};

const downtimeTimerStyle = {
  fontSize: 34,
  fontWeight: 700,
  color: "#111827",
};

const downtimeBodyStyle = {
  padding: 16,
  background: "#d9dde4",
};

const downtimeColumnsStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 12,
};

const downtimeColumnStyle = {
  background: "#f8fafc",
  border: "1px solid #94a3b8",
  minHeight: 300,
  padding: 10,
};

const downtimeColumnHeaderStyle = {
  fontSize: 16,
  fontWeight: 700,
  marginBottom: 10,
  color: "#374151",
};

const downtimeReasonButtonStyle = {
  width: "100%",
  textAlign: "left" as const,
  border: "1px solid #cbd5e1",
  padding: "8px 10px",
  fontSize: 13,
  marginBottom: 6,
  cursor: "pointer",
};

const downtimeNotesWrapStyle = {
  marginTop: 14,
};

const downtimeNotesTitleStyle = {
  fontSize: 14,
  fontWeight: 700,
  color: "#374151",
  marginBottom: 6,
};

const downtimeTextareaStyle = {
  width: "100%",
  minHeight: 90,
  resize: "vertical" as const,
  padding: 10,
  border: "1px solid #94a3b8",
  boxSizing: "border-box" as const,
  fontSize: 14,
};

const downtimeFooterActionsStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  marginTop: 14,
};

const downtimeBlueButtonStyle = {
  minWidth: 160,
  height: 54,
  border: "none",
  background: "#1d4ed8",
  color: "#ffffff",
  fontWeight: 700,
  fontSize: 18,
  cursor: "pointer",
};

const downtimeGreenButtonStyle = {
  minWidth: 160,
  height: 54,
  border: "none",
  background: "#22c55e",
  color: "#ffffff",
  fontWeight: 700,
  fontSize: 18,
  cursor: "pointer",
};

const downtimeMetaStyle = {
  marginTop: 12,
  fontSize: 13,
  color: "#4b5563",
  fontWeight: 700,
};

export default App;