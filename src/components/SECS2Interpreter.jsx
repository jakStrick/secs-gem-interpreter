import React, { useState } from "react";
import {
	AlertCircle,
	CheckCircle,
	Copy,
	FileText,
	Book,
	Zap,
	ArrowRight,
	Upload,
	Search,
	Download,
	Filter,
	Clock,
	MessageSquare,
} from "lucide-react";

const SECS2InterpreterApp = () => {
	const [activeTab, setActiveTab] = useState("interpreter");

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
			<div className="max-w-7xl mx-auto">
				{/* Header */}
				<div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-lg p-6 shadow-2xl">
					<h1 className="text-3xl font-bold text-white flex items-center gap-3">
						<FileText className="w-8 h-8" />
						SECS/GEM Analysis Suite
					</h1>
					<p className="text-blue-100 mt-2">
						Complete toolkit for SECS-II message interpretation and log
						analysis
					</p>
				</div>

				{/* Tab Navigation */}
				<div className="bg-slate-800 border-x border-slate-700 flex gap-2 p-2">
					<button
						onClick={() => setActiveTab("interpreter")}
						className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
							activeTab === "interpreter"
								? "bg-blue-600 text-white shadow-lg"
								: "bg-slate-700 text-slate-300 hover:bg-slate-600"
						}`}>
						<FileText className="w-5 h-5" />
						Message Interpreter
					</button>
					<button
						onClick={() => setActiveTab("parser")}
						className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
							activeTab === "parser"
								? "bg-blue-600 text-white shadow-lg"
								: "bg-slate-700 text-slate-300 hover:bg-slate-600"
						}`}>
						<Search className="w-5 h-5" />
						Log Parser
					</button>
				</div>

				{/* Tab Content */}
				<div className="bg-slate-800/50 backdrop-blur-sm rounded-b-lg shadow-2xl border-x border-b border-slate-700">
					{activeTab === "interpreter" ? (
						<InterpreterTab />
					) : (
						<ParserTab />
					)}
				</div>
			</div>
		</div>
	);
};

// ==================== INTERPRETER TAB ====================
const InterpreterTab = () => {
	const [input, setInput] = useState("");
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");
	const [selectedMsg, setSelectedMsg] = useState(null);

	const MESSAGES = {
		// S1 - Equipment Status
		S1F1: {
			name: "Are You There Request",
			dir: "H→E",
			reply: "S1F2",
			desc: "Host requests equipment identification",
			hex: "01 00",
			struct: "<Empty>",
		},
		S1F2: {
			name: "Online Data",
			dir: "E→H",
			reply: "None",
			desc: "Equipment responds with model and software version",
			hex: "01 02 41 0A 45 51 55 49 50 2D 31 32 33 34 41 05 56 31 2E 30 30",
			struct: "<List[2]>\n  MDLN: <ASCII>\n  SOFTREV: <ASCII>",
		},
		S1F3: {
			name: "Selected Equipment Status Request",
			dir: "H→E",
			reply: "S1F4",
			desc: "Request specific status variable values",
			hex: "01 02 A5 02 00 01 A5 02 00 02",
			struct: "<List[n]> SVID...",
		},
		S1F4: {
			name: "Selected Equipment Status Data",
			dir: "E→H",
			reply: "None",
			desc: "Status values response",
			hex: "01 02 65 04 00 00 00 64 41 06 49 44 4C 49 4E 47",
			struct: "<List[n]> SV...",
		},
		S1F5: {
			name: "Formatted Status Request",
			dir: "H→E",
			reply: "S1F6",
			desc: "Request formatted status",
			hex: "41 04 46 4D 54 31",
			struct: "SFCD: <ASCII>",
		},
		S1F6: {
			name: "Formatted Status Data",
			dir: "E→H",
			reply: "None",
			desc: "Formatted status data",
			hex: "01 02 41 04 46 4D 54 31 41 10 53 74 61 74 75 73 20 44 61 74 61",
			struct: "<List[2]> SFCD, Data",
		},
		S1F11: {
			name: "Status Variable Namelist Request",
			dir: "H→E",
			reply: "S1F12",
			desc: "Request status variable names",
			hex: "01 02 A5 02 00 01 A5 02 00 02",
			struct: "<List[n]> SVID...",
		},
		S1F12: {
			name: "Status Variable Namelist Reply",
			dir: "E→H",
			reply: "None",
			desc: "Status variable name list",
			hex: "01 02 01 03 A5 02 00 01 41 0B 54 45 4D 50 45 52 41 54 55 52 45 41 01 43 01 03 A5 02 00 02 41 08 50 52 45 53 53 55 52 45 41 03 50 53 49",
			struct: "<List[n]>\n  <List[3]> SVID, SVNAME, UNITS",
		},
		S1F13: {
			name: "Establish Communications Request",
			dir: "H→E",
			reply: "S1F14",
			desc: "Initialize communications at startup",
			hex: "01 00",
			struct: "<Empty>",
		},
		S1F14: {
			name: "Establish Communications Acknowledge",
			dir: "E→H",
			reply: "None",
			desc: "Acknowledge communication establishment",
			hex: "01 02 21 01 00 01 02 41 0A 45 51 55 49 50 2D 31 32 33 34 41 05 56 31 2E 30 30",
			struct: "<List[2]>\n  COMMACK: <Binary>\n  MDLN: <List[2]>",
		},
		S1F15: {
			name: "Request Offline",
			dir: "H→E",
			reply: "S1F16",
			desc: "Request equipment go offline",
			hex: "01 00",
			struct: "<Empty>",
		},
		S1F16: {
			name: "Offline Acknowledge",
			dir: "E→H",
			reply: "None",
			desc: "Acknowledge offline request",
			hex: "21 01 00",
			struct: "OFLACK: <Binary>",
		},
		S1F17: {
			name: "Request Online",
			dir: "H→E",
			reply: "S1F18",
			desc: "Request equipment go online",
			hex: "01 00",
			struct: "<Empty>",
		},
		S1F18: {
			name: "Online Acknowledge",
			dir: "E→H",
			reply: "None",
			desc: "Acknowledge online request",
			hex: "21 01 00",
			struct: "ONLACK: <Binary>",
		},
		S1F19: {
			name: "Get Attribute Request",
			dir: "H→E",
			reply: "S1F20",
			desc: "Request equipment attributes",
			hex: "01 00",
			struct: "<Empty>",
		},
		S1F20: {
			name: "Get Attribute Data",
			dir: "E→H",
			reply: "None",
			desc: "Equipment attribute data",
			hex: "01 02 41 08 41 54 54 52 5F 4E 4D 41 41 0A 41 54 54 52 5F 56 41 4C 55 45",
			struct: "<List[n]> Attributes",
		},
		S1F21: {
			name: "Data Variable Namelist Request",
			dir: "H→E",
			reply: "S1F22",
			desc: "Request data variable names",
			hex: "01 02 A5 02 00 01 A5 02 00 02",
			struct: "<List[n]> VID...",
		},
		S1F22: {
			name: "Data Variable Namelist Reply",
			dir: "E→H",
			reply: "None",
			desc: "Data variable name list",
			hex: "01 02 01 03 A5 02 00 01 41 05 54 45 4D 50 31 41 01 43 01 03 A5 02 00 02 41 05 50 52 45 53 31 41 03 50 53 49",
			struct: "<List[n]> Variable Info",
		},
		S1F23: {
			name: "Collection Event Namelist Request",
			dir: "H→E",
			reply: "S1F24",
			desc: "Request collection event names",
			hex: "01 02 A5 02 00 01 A5 02 00 02",
			struct: "<List[n]> CEID...",
		},
		S1F24: {
			name: "Collection Event Namelist Reply",
			dir: "E→H",
			reply: "None",
			desc: "Collection event names",
			hex: "01 02 01 02 A5 02 00 01 41 0A 45 76 65 6E 74 5F 4E 61 6D 65 01 02 A5 02 00 02 41 0C 45 76 65 6E 74 5F 4E 61 6D 65 32",
			struct: "<List[n]> Event Info",
		},

		// S2 - Equipment Control & Data
		S2F13: {
			name: "Equipment Constant Request",
			dir: "H→E",
			reply: "S2F14",
			desc: "Request equipment constant values",
			hex: "01 02 A5 02 00 01 A5 02 00 02",
			struct: "<List[n]> ECID...",
		},
		S2F14: {
			name: "Equipment Constant Data",
			dir: "E→H",
			reply: "None",
			desc: "Equipment constant values",
			hex: "01 02 65 04 00 00 01 2C 65 04 00 00 00 0A",
			struct: "<List[n]> ECV...",
		},
		S2F15: {
			name: "New Equipment Constant Send",
			dir: "H→E",
			reply: "S2F16",
			desc: "Set new equipment constant values",
			hex: "01 01 01 02 A5 02 00 01 65 04 00 00 01 2C",
			struct: "<List[n]> <List[2]> ECID, ECV",
		},
		S2F16: {
			name: "New Equipment Constant Acknowledge",
			dir: "E→H",
			reply: "None",
			desc: "Acknowledge constant change",
			hex: "21 01 00",
			struct: "EAC: <Binary>",
		},
		S2F17: {
			name: "Date and Time Request",
			dir: "H→E",
			reply: "S2F18",
			desc: "Request current equipment date/time",
			hex: "01 00",
			struct: "<Empty>",
		},
		S2F18: {
			name: "Date and Time Data",
			dir: "E→H",
			reply: "None",
			desc: "Equipment current date/time",
			hex: "41 0E 32 30 32 35 30 31 31 35 31 34 33 30 30 30",
			struct: "TIME: <ASCII>",
		},
		S2F23: {
			name: "Trace Initialize Send",
			dir: "H→E",
			reply: "S2F24",
			desc: "Initialize trace data collection",
			hex: "01 04 A5 02 00 01 41 06 54 52 41 43 45 31 A5 01 01 01 02 A5 02 00 01 A5 02 00 02",
			struct: "<List[4]> Trace Setup",
		},
		S2F24: {
			name: "Trace Initialize Acknowledge",
			dir: "E→H",
			reply: "None",
			desc: "Acknowledge trace initialization",
			hex: "21 01 00",
			struct: "TIAACK: <Binary>",
		},
		S2F25: {
			name: "Loopback Diagnostic Request",
			dir: "H→E",
			reply: "S2F26",
			desc: "Test communication loopback",
			hex: "41 10 54 65 73 74 20 4D 65 73 73 61 67 65",
			struct: "DATA: <Binary/ASCII>",
		},
		S2F26: {
			name: "Loopback Diagnostic Data",
			dir: "E→H",
			reply: "None",
			desc: "Loopback response",
			hex: "41 10 54 65 73 74 20 4D 65 73 73 61 67 65",
			struct: "DATA: <Binary/ASCII>",
		},
		S2F27: {
			name: "Initiate Processing Request",
			dir: "H→E",
			reply: "S2F28",
			desc: "Request to initiate processing",
			hex: "01 00",
			struct: "<Empty>",
		},
		S2F28: {
			name: "Initiate Processing Acknowledge",
			dir: "E→H",
			reply: "None",
			desc: "Acknowledge processing initiation",
			hex: "21 01 00",
			struct: "IPRACK: <Binary>",
		},
		S2F29: {
			name: "Equipment Constant Namelist Request",
			dir: "H→E",
			reply: "S2F30",
			desc: "Request equipment constant names",
			hex: "01 02 A5 02 00 01 A5 02 00 02",
			struct: "<List[n]> ECID...",
		},
		S2F30: {
			name: "Equipment Constant Namelist",
			dir: "E→H",
			reply: "None",
			desc: "Equipment constant name list",
			hex: "01 02 01 06 A5 02 00 01 41 08 43 4F 4E 53 54 5F 4E 4D 41 41 0A 43 4F 4E 53 54 5F 56 41 4C 55 45 65 04 00 00 00 01 65 04 00 00 00 64 41 04 55 4E 49 54 01 06 A5 02 00 02 41 09 43 4F 4E 53 54 32 5F 4E 4D 41 41 0B 43 4F 4E 53 54 32 5F 56 41 4C 55 45 65 04 00 00 00 0A 65 04 00 00 01 00 41 02 6D 6D",
			struct: "<List[n]> EC Info",
		},
		S2F31: {
			name: "Date and Time Set Request",
			dir: "H→E",
			reply: "S2F32",
			desc: "Set equipment date and time",
			hex: "41 0E 32 30 32 35 30 31 31 35 31 34 33 30 30 30",
			struct: "TIME: <ASCII>",
		},
		S2F32: {
			name: "Date and Time Set Acknowledge",
			dir: "E→H",
			reply: "None",
			desc: "Acknowledge time set",
			hex: "21 01 00",
			struct: "TIACK: <Binary>",
		},
		S2F33: {
			name: "Define Report",
			dir: "H→E",
			reply: "S2F34",
			desc: "Define which variables in reports",
			hex: "01 02 A5 02 00 01 01 01 01 02 A5 02 00 64 01 02 A5 02 00 01 A5 02 00 02",
			struct: "<List[2]> DATAID, Reports",
		},
		S2F34: {
			name: "Define Report Acknowledge",
			dir: "E→H",
			reply: "None",
			desc: "Acknowledge report definition",
			hex: "21 01 00",
			struct: "DRACK: <Binary>",
		},
		S2F35: {
			name: "Link Event Report",
			dir: "H→E",
			reply: "S2F36",
			desc: "Link collection events to reports",
			hex: "01 02 A5 02 00 01 01 01 01 02 A5 04 00 00 03 E8 01 01 A5 02 00 64",
			struct: "<List[2]> DATAID, Links",
		},
		S2F36: {
			name: "Link Event Report Acknowledge",
			dir: "E→H",
			reply: "None",
			desc: "Acknowledge event/report link",
			hex: "21 01 00",
			struct: "LRACK: <Binary>",
		},
		S2F37: {
			name: "Enable/Disable Event Report",
			dir: "H→E",
			reply: "S2F38",
			desc: "Enable/disable event reports",
			hex: "01 02 25 01 01 01 01 A5 04 00 00 03 E8",
			struct: "<List[2]> CEED, CEID",
		},
		S2F38: {
			name: "Enable/Disable Event Report Acknowledge",
			dir: "E→H",
			reply: "None",
			desc: "Acknowledge enable/disable",
			hex: "21 01 00",
			struct: "ERACK: <Binary>",
		},
		S2F39: {
			name: "Multi-Block Inquire",
			dir: "H→E",
			reply: "S2F40",
			desc: "Inquire about multi-block grant",
			hex: "01 02 A5 04 00 00 10 00 A5 01 10",
			struct: "<List[2]> LENGTH, Grant",
		},
		S2F40: {
			name: "Multi-Block Grant",
			dir: "E→H",
			reply: "None",
			desc: "Grant multi-block transfer",
			hex: "21 01 00",
			struct: "GRANT: <Binary>",
		},
		S2F41: {
			name: "Host Command Send",
			dir: "H→E",
			reply: "S2F42",
			desc: "Send remote command to equipment",
			hex: "01 02 41 05 53 54 41 52 54 01 01 A5 02 00 01",
			struct: "<List[2]> RCMD, PARAMS",
		},
		S2F42: {
			name: "Host Command Acknowledge",
			dir: "E→H",
			reply: "None",
			desc: "Acknowledge command",
			hex: "01 02 21 01 00 01 00",
			struct: "<List[2]> HCACK, PARAMS",
		},
		S2F43: {
			name: "Reset Spooling Streams and Functions",
			dir: "H→E",
			reply: "S2F44",
			desc: "Reset spooling configuration",
			hex: "01 02 A5 01 01 A5 01 01",
			struct: "<List[2]> STRID, FCNID",
		},
		S2F44: {
			name: "Reset Spooling Acknowledge",
			dir: "E→H",
			reply: "None",
			desc: "Acknowledge spooling reset",
			hex: "21 01 00",
			struct: "RSPACK: <Binary>",
		},
		S2F45: {
			name: "Define Variable Limit Attributes",
			dir: "H→E",
			reply: "S2F46",
			desc: "Define variable limit attributes",
			hex: "01 03 A5 02 00 01 65 04 00 00 00 64 65 04 00 00 01 2C",
			struct: "<List[3]> VID, LimitLow, LimitHigh",
		},
		S2F46: {
			name: "Variable Limit Attribute Acknowledge",
			dir: "E→H",
			reply: "None",
			desc: "Acknowledge limit definition",
			hex: "21 01 00",
			struct: "VLAACK: <Binary>",
		},
		S2F47: {
			name: "Variable Limit Attribute Request",
			dir: "H→E",
			reply: "S2F48",
			desc: "Request variable limit attributes",
			hex: "01 02 A5 02 00 01 A5 02 00 02",
			struct: "<List[n]> VID...",
		},
		S2F48: {
			name: "Variable Limit Attribute Send",
			dir: "E→H",
			reply: "None",
			desc: "Send variable limit attributes",
			hex: "01 02 01 03 A5 02 00 01 65 04 00 00 00 64 65 04 00 00 01 2C 01 03 A5 02 00 02 65 04 00 00 00 0A 65 04 00 00 00 14",
			struct: "<List[n]> Limit Attributes",
		},
		S2F49: {
			name: "Enhanced Remote Command",
			dir: "H→E",
			reply: "S2F50",
			desc: "Enhanced command with object spec",
			hex: "01 04 41 06 50 52 4F 43 45 53 53 41 01 41 05 53 54 41 52 54 01 01 A5 02 00 01",
			struct: "<List[4]> DATAID, OBJSPEC, RCMD, PARAMS",
		},
		S2F50: {
			name: "Enhanced Remote Command Acknowledge",
			dir: "E→H",
			reply: "None",
			desc: "Enhanced command ack",
			hex: "01 02 21 01 00 01 00",
			struct: "<List[2]> HCACK, Result",
		},

		// S3 - Material Status
		S3F1: {
			name: "Material Status Request",
			dir: "H→E",
			reply: "S3F2",
			desc: "Request material status",
			hex: "A5 04 00 00 00 01",
			struct: "MID: <U4>",
		},
		S3F2: {
			name: "Material Status Data",
			dir: "E→H",
			reply: "None",
			desc: "Material status response",
			hex: "01 02 A5 04 00 00 00 01 41 08 49 4E 50 52 4F 43 45 53 53",
			struct: "<List[2]> MID, STATUS",
		},
		S3F15: {
			name: "Material Status Data Send",
			dir: "E→H",
			reply: "S3F16",
			desc: "Unsolicited material status",
			hex: "01 02 A5 04 00 00 00 01 41 08 43 4F 4D 50 4C 45 54 45",
			struct: "<List[2]> MID, STATUS",
		},
		S3F16: {
			name: "Material Status Acknowledge",
			dir: "H→E",
			reply: "None",
			desc: "Ack material status",
			hex: "21 01 00",
			struct: "ACKC3: <Binary>",
		},
		S3F17: {
			name: "Carrier Action Request",
			dir: "H→E",
			reply: "S3F18",
			desc: "Request carrier action",
			hex: "01 02 41 08 43 41 52 52 49 45 52 31 41 04 4C 4F 41 44",
			struct: "<List[2]> CARRIER_ID, ACTION",
		},
		S3F18: {
			name: "Carrier Action Acknowledge",
			dir: "E→H",
			reply: "None",
			desc: "Ack carrier action",
			hex: "21 01 00",
			struct: "CAACK: <Binary>",
		},

		// S4 - Material Control
		S4F1: {
			name: "Material Transfer Request",
			dir: "H→E",
			reply: "S4F2",
			desc: "Request material transfer",
			hex: "01 03 A5 04 00 00 00 01 41 08 50 4F 52 54 5F 49 4E 41 41 09 50 4F 52 54 5F 4F 55 54 41",
			struct: "<List[3]> MID, PORT_IN, PORT_OUT",
		},
		S4F2: {
			name: "Material Transfer Acknowledge",
			dir: "E→H",
			reply: "None",
			desc: "Ack transfer request",
			hex: "21 01 00",
			struct: "TACK: <Binary>",
		},
		S4F19: {
			name: "Material Received",
			dir: "E→H",
			reply: "S4F20",
			desc: "Material received notification",
			hex: "01 02 A5 04 00 00 00 01 41 08 50 4F 52 54 5F 49 4E 41",
			struct: "<List[2]> MID, PORT_ID",
		},
		S4F20: {
			name: "Material Received Acknowledge",
			dir: "H→E",
			reply: "None",
			desc: "Ack material received",
			hex: "21 01 00",
			struct: "ACKC4: <Binary>",
		},

		// S5 - Exception/Alarm Handling
		S5F1: {
			name: "Alarm Report Send",
			dir: "E→H",
			reply: "S5F2",
			desc: "Equipment reports alarm condition",
			hex: "01 03 21 01 80 A5 04 00 00 00 0A 41 0F 54 45 4D 50 20 54 4F 4F 20 48 49 47 48",
			struct: "<List[3]> ALCD, ALID, ALTX",
		},
		S5F2: {
			name: "Alarm Report Acknowledge",
			dir: "H→E",
			reply: "None",
			desc: "Host acknowledges alarm",
			hex: "21 01 00",
			struct: "ACKC5: <Binary>",
		},
		S5F3: {
			name: "Enable/Disable Alarm Send",
			dir: "H→E",
			reply: "S5F4",
			desc: "Enable/disable specific alarms",
			hex: "01 02 25 01 01 01 01 A5 04 00 00 00 0A",
			struct: "<List[2]> ALED, ALID",
		},
		S5F4: {
			name: "Enable/Disable Alarm Acknowledge",
			dir: "E→H",
			reply: "None",
			desc: "Ack alarm enable/disable",
			hex: "21 01 00",
			struct: "ACKC5: <Binary>",
		},
		S5F5: {
			name: "List Alarms Request",
			dir: "H→E",
			reply: "S5F6",
			desc: "Request list of enabled alarms",
			hex: "01 00",
			struct: "<Empty>",
		},
		S5F6: {
			name: "List Alarms Data",
			dir: "E→H",
			reply: "None",
			desc: "List of enabled alarm IDs",
			hex: "01 02 A5 04 00 00 00 0A A5 04 00 00 00 14",
			struct: "<List[n]> ALID...",
		},
		S5F7: {
			name: "List Enabled Alarm Request",
			dir: "H→E",
			reply: "S5F8",
			desc: "Request enabled alarm list",
			hex: "01 00",
			struct: "<Empty>",
		},
		S5F8: {
			name: "List Enabled Alarm Data",
			dir: "E→H",
			reply: "None",
			desc: "Enabled alarm list",
			hex: "01 02 A5 04 00 00 00 0A A5 04 00 00 00 14",
			struct: "<List[n]> Enabled ALID",
		},
		S5F9: {
			name: "Exception Post Request",
			dir: "H→E",
			reply: "S5F10",
			desc: "Post exception to equipment",
			hex: "01 04 41 08 45 58 43 5F 54 59 50 45 41 10 45 78 63 65 70 74 69 6F 6E 20 54 65 78 74 A5 01 01 41 08 52 45 43 4F 56 45 52 59",
			struct: "<List[4]> Exception Info",
		},
		S5F10: {
			name: "Exception Post Acknowledge",
			dir: "E→H",
			reply: "None",
			desc: "Ack exception post",
			hex: "21 01 00",
			struct: "ACKC5: <Binary>",
		},
		S5F13: {
			name: "Exception Clear Request",
			dir: "H→E",
			reply: "S5F14",
			desc: "Request exception clear",
			hex: "A5 04 00 00 00 01",
			struct: "EXID: <U4>",
		},
		S5F14: {
			name: "Exception Clear Acknowledge",
			dir: "E→H",
			reply: "None",
			desc: "Ack exception clear",
			hex: "21 01 00",
			struct: "ACKC5: <Binary>",
		},

		// S6 - Data Collection
		S6F11: {
			name: "Event Report Send",
			dir: "E→H",
			reply: "S6F12",
			desc: "Equipment sends collection event report",
			hex: "01 03 A5 02 00 01 A5 04 00 00 03 E8 01 01 01 02 A5 02 00 64 01 01 65 04 00 00 00 64",
			struct: "<List[3]> DATAID, CEID, Reports",
		},
		S6F12: {
			name: "Event Report Acknowledge",
			dir: "H→E",
			reply: "None",
			desc: "Host acknowledges event report",
			hex: "21 01 00",
			struct: "ACKC6: <Binary>",
		},
		S6F15: {
			name: "Event Report Request",
			dir: "H→E",
			reply: "S6F16",
			desc: "Request event report by CEID",
			hex: "A5 04 00 00 03 E8",
			struct: "CEID: <U4>",
		},
		S6F16: {
			name: "Event Report Data",
			dir: "E→H",
			reply: "None",
			desc: "Event report data response",
			hex: "01 03 A5 02 00 01 A5 04 00 00 03 E8 01 01 01 02 A5 02 00 64 01 01 65 04 00 00 00 64",
			struct: "<List[3]> DATAID, CEID, Reports",
		},
		S6F19: {
			name: "Individual Report Request",
			dir: "H→E",
			reply: "S6F20",
			desc: "Request individual report by RPTID",
			hex: "A5 02 00 64",
			struct: "RPTID: <U1>",
		},
		S6F20: {
			name: "Individual Report Data",
			dir: "E→H",
			reply: "None",
			desc: "Individual report data",
			hex: "01 01 65 04 00 00 00 64",
			struct: "<List[1]> V values",
		},
		S6F23: {
			name: "Request Spooled Data",
			dir: "H→E",
			reply: "S6F24",
			desc: "Request spooled data",
			hex: "A5 04 00 00 00 01",
			struct: "RSSD: <U4>",
		},
		S6F24: {
			name: "Spooled Data",
			dir: "E→H",
			reply: "None",
			desc: "Spooled data send",
			hex: "01 02 A5 04 00 00 00 01 01 05 21 01 00 A5 02 00 01 A5 04 00 00 03 E8 01 00 01 00",
			struct: "<List[2]> RSSD, Data",
		},
		S6F25: {
			name: "Trace Data Collection",
			dir: "E→H",
			reply: "S6F26",
			desc: "Send trace data",
			hex: "01 04 A5 02 00 01 A5 01 01 41 0E 32 30 32 35 30 31 31 35 31 34 33 30 30 30 01 02 65 04 00 00 00 64 65 04 00 00 00 C8",
			struct: "<List[4]> Trace Info",
		},
		S6F26: {
			name: "Trace Data Acknowledge",
			dir: "H→E",
			reply: "None",
			desc: "Ack trace data",
			hex: "21 01 00",
			struct: "ACKC6: <Binary>",
		},

		// S7 - Process Program Management
		S7F1: {
			name: "Process Program Load Inquire",
			dir: "H→E",
			reply: "S7F2",
			desc: "Inquire if equipment can receive program",
			hex: "01 02 41 08 50 52 4F 47 5F 30 30 31 65 04 00 00 10 00",
			struct: "<List[2]> PPID, LENGTH",
		},
		S7F2: {
			name: "Process Program Load Grant",
			dir: "E→H",
			reply: "None",
			desc: "Grant/deny program load",
			hex: "21 01 00",
			struct: "PPGNT: <Binary>",
		},
		S7F3: {
			name: "Process Program Send",
			dir: "H→E",
			reply: "S7F4",
			desc: "Send process program to equipment",
			hex: "01 02 41 08 50 52 4F 47 5F 30 30 31 41 20 53 54 45 50 31 3A 54 45 4D 50 3D 32 35 30 0A 53 54 45 50 32 3A 54 49 4D 45 3D 31 38 30",
			struct: "<List[2]> PPID, PPBODY",
		},
		S7F4: {
			name: "Process Program Acknowledge",
			dir: "E→H",
			reply: "None",
			desc: "Ack program receipt",
			hex: "21 01 00",
			struct: "ACKC7: <Binary>",
		},
		S7F5: {
			name: "Process Program Request",
			dir: "H→E",
			reply: "S7F6",
			desc: "Request process program from equipment",
			hex: "41 08 50 52 4F 47 5F 30 30 31",
			struct: "PPID: <ASCII>",
		},
		S7F6: {
			name: "Process Program Data",
			dir: "E→H",
			reply: "None",
			desc: "Process program data",
			hex: "01 02 41 08 50 52 4F 47 5F 30 30 31 41 20 53 54 45 50 31 3A 54 45 4D 50 3D 32 35 30 0A 53 54 45 50 32 3A 54 49 4D 45 3D 31 38 30",
			struct: "<List[2]> PPID, PPBODY",
		},
		S7F17: {
			name: "Delete Process Program Send",
			dir: "H→E",
			reply: "S7F18",
			desc: "Delete process program(s)",
			hex: "01 01 41 08 50 52 4F 47 5F 30 30 31",
			struct: "<List[n]> PPID...",
		},
		S7F18: {
			name: "Delete Process Program Acknowledge",
			dir: "E→H",
			reply: "None",
			desc: "Ack delete",
			hex: "21 01 00",
			struct: "ACKC7: <Binary>",
		},
		S7F19: {
			name: "Current EPPD Request",
			dir: "H→E",
			reply: "S7F20",
			desc: "Request current process program ID",
			hex: "01 00",
			struct: "<Empty>",
		},
		S7F20: {
			name: "Current EPPD Data",
			dir: "E→H",
			reply: "None",
			desc: "Current process program ID",
			hex: "41 08 50 52 4F 47 5F 30 30 31",
			struct: "PPID: <ASCII>",
		},
		S7F23: {
			name: "Formatted Process Program Send",
			dir: "H→E",
			reply: "S7F24",
			desc: "Send formatted program",
			hex: "01 03 41 08 50 52 4F 47 5F 30 30 31 41 06 46 4F 52 4D 41 54 41 20 50 72 6F 67 72 61 6D 20 44 61 74 61",
			struct: "<List[3]> PPID, FORMAT, Data",
		},
		S7F24: {
			name: "Formatted Process Program Acknowledge",
			dir: "E→H",
			reply: "None",
			desc: "Ack formatted program",
			hex: "21 01 00",
			struct: "ACKC7: <Binary>",
		},
		S7F25: {
			name: "Formatted Process Program Request",
			dir: "H→E",
			reply: "S7F26",
			desc: "Request formatted program",
			hex: "41 08 50 52 4F 47 5F 30 30 31",
			struct: "PPID: <ASCII>",
		},
		S7F26: {
			name: "Formatted Process Program Data",
			dir: "E→H",
			reply: "None",
			desc: "Formatted program data",
			hex: "01 03 41 08 50 52 4F 47 5F 30 30 31 41 06 46 4F 52 4D 41 54 41 20 50 72 6F 67 72 61 6D 20 44 61 74 61",
			struct: "<List[3]> PPID, FORMAT, Data",
		},

		// S9 - System Errors
		S9F1: {
			name: "Unrecognized Device ID",
			dir: "E→H",
			reply: "None",
			desc: "Equipment does not recognize device ID",
			hex: "21 01 00",
			struct: "MHEAD: <Binary>",
		},
		S9F3: {
			name: "Unrecognized Stream Type",
			dir: "E→H",
			reply: "None",
			desc: "Stream type not recognized",
			hex: "21 01 00",
			struct: "MHEAD: <Binary>",
		},
		S9F5: {
			name: "Unrecognized Function Type",
			dir: "E→H",
			reply: "None",
			desc: "Function type not recognized",
			hex: "21 01 00",
			struct: "MHEAD: <Binary>",
		},
		S9F7: {
			name: "Illegal Data",
			dir: "E→H",
			reply: "None",
			desc: "Data format or content is illegal",
			hex: "21 01 00",
			struct: "MHEAD: <Binary>",
		},
		S9F9: {
			name: "Transaction Timer Timeout",
			dir: "E→H",
			reply: "None",
			desc: "Transaction timer expired",
			hex: "21 01 00",
			struct: "MHEAD: <Binary>",
		},
		S9F11: {
			name: "Data Too Long",
			dir: "E→H",
			reply: "None",
			desc: "Message data length exceeds maximum",
			hex: "21 01 00",
			struct: "MHEAD: <Binary>",
		},
		S9F13: {
			name: "Conversation Timeout",
			dir: "E→H",
			reply: "None",
			desc: "Conversation timeout occurred",
			hex: "21 01 00",
			struct: "MHEAD: <Binary>",
		},

		// S10 - Terminal Services
		S10F1: {
			name: "Terminal Request",
			dir: "E→H",
			reply: "S10F2",
			desc: "Equipment requests terminal display",
			hex: "01 02 21 01 01 41 10 45 6E 74 65 72 20 4C 6F 74 20 4E 75 6D 62 65 72",
			struct: "<List[2]> TID, TEXT",
		},
		S10F2: {
			name: "Terminal Acknowledge",
			dir: "H→E",
			reply: "None",
			desc: "Host acknowledges terminal request",
			hex: "21 01 00",
			struct: "ACKC10: <Binary>",
		},
		S10F3: {
			name: "Terminal Display Single",
			dir: "H→E",
			reply: "S10F4",
			desc: "Display single line on terminal",
			hex: "01 02 21 01 01 41 0C 50 72 6F 63 65 73 73 20 44 6F 6E 65",
			struct: "<List[2]> TID, TEXT",
		},
		S10F4: {
			name: "Terminal Display Acknowledge",
			dir: "E→H",
			reply: "None",
			desc: "Ack display",
			hex: "21 01 00",
			struct: "ACKC10: <Binary>",
		},
		S10F5: {
			name: "Terminal Display Multi-Block",
			dir: "H→E",
			reply: "S10F6",
			desc: "Display multiple blocks on terminal",
			hex: "01 03 21 01 01 A5 01 05 01 05 41 06 4C 69 6E 65 20 31 41 06 4C 69 6E 65 20 32 41 06 4C 69 6E 65 20 33 41 06 4C 69 6E 65 20 34 41 06 4C 69 6E 65 20 35",
			struct: "<List[3]> TID, Length, Text Lines",
		},
		S10F6: {
			name: "Terminal Display Multi-Block Acknowledge",
			dir: "E→H",
			reply: "None",
			desc: "Ack multi-block display",
			hex: "21 01 00",
			struct: "ACKC10: <Binary>",
		},

		// S14 - Object Services (GEM300)
		S14F1: {
			name: "GetAttr Request",
			dir: "H→E",
			reply: "S14F2",
			desc: "Request object attributes (GEM300)",
			hex: "01 02 41 05 43 6C 61 73 73 01 01 A5 04 00 00 00 01",
			struct: "<List[2]> OBJSPEC, OBJID",
		},
		S14F2: {
			name: "GetAttr Data",
			dir: "E→H",
			reply: "None",
			desc: "Object attribute data",
			hex: "01 01 01 02 A5 04 00 00 00 01 41 08 4D 61 63 68 69 6E 65 31",
			struct: "<List[n]> Attribute data",
		},
		S14F3: {
			name: "SetAttr Request",
			dir: "H→E",
			reply: "S14F4",
			desc: "Set object attributes",
			hex: "01 03 41 05 43 6C 61 73 73 A5 04 00 00 00 01 41 08 4E 65 77 56 61 6C 75 65",
			struct: "<List[3]> OBJSPEC, OBJID, ATTRDATA",
		},
		S14F4: {
			name: "SetAttr Data",
			dir: "E→H",
			reply: "None",
			desc: "Ack attribute set",
			hex: "01 01 21 01 00",
			struct: "<List[1]> Status",
		},
		S14F5: {
			name: "ListAttr Request",
			dir: "H→E",
			reply: "S14F6",
			desc: "List object attributes",
			hex: "01 02 41 05 43 6C 61 73 73 A5 04 00 00 00 01",
			struct: "<List[2]> OBJSPEC, OBJID",
		},
		S14F6: {
			name: "ListAttr Data",
			dir: "E→H",
			reply: "None",
			desc: "List of attributes",
			hex: "01 03 41 06 41 54 54 52 5F 31 41 06 41 54 54 52 5F 32 41 06 41 54 54 52 5F 33",
			struct: "<List[n]> Attribute names",
		},
		S14F7: {
			name: "CreateObject Request",
			dir: "H→E",
			reply: "S14F8",
			desc: "Create new object",
			hex: "01 03 41 05 43 6C 61 73 73 A5 04 00 00 00 01 41 08 4E 65 77 4F 62 6A 65 63 74",
			struct: "<List[3]> OBJTYPE, OBJID, Attributes",
		},
		S14F8: {
			name: "CreateObject Acknowledge",
			dir: "E→H",
			reply: "None",
			desc: "Ack object creation",
			hex: "21 01 00",
			struct: "OBJACK: <Binary>",
		},
		S14F9: {
			name: "DeleteObject Request",
			dir: "H→E",
			reply: "S14F10",
			desc: "Delete object",
			hex: "01 02 41 05 43 6C 61 73 73 A5 04 00 00 00 01",
			struct: "<List[2]> OBJSPEC, OBJID",
		},
		S14F10: {
			name: "DeleteObject Acknowledge",
			dir: "E→H",
			reply: "None",
			desc: "Ack object deletion",
			hex: "21 01 00",
			struct: "OBJACK: <Binary>",
		},

		// S15 - Recipe Management
		S15F3: {
			name: "Recipe Name Space Request",
			dir: "H→E",
			reply: "S15F4",
			desc: "Request recipe name space",
			hex: "01 00",
			struct: "<Empty>",
		},
		S15F4: {
			name: "Recipe Name Space Data",
			dir: "E→H",
			reply: "None",
			desc: "Recipe name space list",
			hex: "01 03 41 08 52 45 43 49 50 45 5F 31 41 08 52 45 43 49 50 45 5F 32 41 08 52 45 43 49 50 45 5F 33",
			struct: "<List[n]> Recipe names",
		},
		S15F5: {
			name: "Recipe Upload Request",
			dir: "H→E",
			reply: "S15F6",
			desc: "Request recipe upload",
			hex: "41 08 52 45 43 49 50 45 5F 31",
			struct: "RCPNAME: <ASCII>",
		},
		S15F6: {
			name: "Recipe Upload Data",
			dir: "E→H",
			reply: "None",
			desc: "Recipe data upload",
			hex: "01 02 41 08 52 45 43 49 50 45 5F 31 41 20 52 65 63 69 70 65 20 44 61 74 61 20 43 6F 6E 74 65 6E 74",
			struct: "<List[2]> RCPNAME, RCPBODY",
		},
		S15F13: {
			name: "Recipe Download Request",
			dir: "H→E",
			reply: "S15F14",
			desc: "Download recipe to equipment",
			hex: "01 02 41 08 52 45 43 49 50 45 5F 31 41 20 52 65 63 69 70 65 20 44 61 74 61 20 43 6F 6E 74 65 6E 74",
			struct: "<List[2]> RCPNAME, RCPBODY",
		},
		S15F14: {
			name: "Recipe Download Acknowledge",
			dir: "E→H",
			reply: "None",
			desc: "Ack recipe download",
			hex: "21 01 00",
			struct: "RCPACK: <Binary>",
		},

		// S16 - Processing Management
		S16F1: {
			name: "Material ID Read Request",
			dir: "E→H",
			reply: "S16F2",
			desc: "Request material ID read",
			hex: "A5 04 00 00 00 01",
			struct: "MID: <U4>",
		},
		S16F2: {
			name: "Material ID Read Acknowledge",
			dir: "H→E",
			reply: "None",
			desc: "Ack material ID read",
			hex: "21 01 00",
			struct: "ACKC16: <Binary>",
		},
		S16F3: {
			name: "Material ID Write Request",
			dir: "H→E",
			reply: "S16F4",
			desc: "Write material ID",
			hex: "01 02 A5 04 00 00 00 01 41 10 4D 41 54 45 52 49 41 4C 5F 49 44 5F 31 32 33",
			struct: "<List[2]> MID, MATERIALID",
		},
		S16F4: {
			name: "Material ID Write Acknowledge",
			dir: "E→H",
			reply: "None",
			desc: "Ack material ID write",
			hex: "21 01 00",
			struct: "ACKC16: <Binary>",
		},
		S16F5: {
			name: "Material Verification Request",
			dir: "H→E",
			reply: "S16F6",
			desc: "Verify material data",
			hex: "01 02 A5 04 00 00 00 01 01 05 41 05 54 59 50 45 41 41 04 4C 4F 54 41 41 08 51 55 41 4E 54 49 54 59 41 05 4F 57 4E 45 52 41 06 53 54 41 54 55 53 41",
			struct: "<List[2]> MID, Material Data",
		},
		S16F6: {
			name: "Material Verification Data",
			dir: "E→H",
			reply: "None",
			desc: "Material verification result",
			hex: "21 01 00",
			struct: "VRFYACK: <Binary>",
		},
		S16F7: {
			name: "Get Substrate History Request",
			dir: "H→E",
			reply: "S16F8",
			desc: "Request substrate processing history",
			hex: "A5 04 00 00 00 01",
			struct: "MID: <U4>",
		},
		S16F8: {
			name: "Get Substrate History Data",
			dir: "E→H",
			reply: "None",
			desc: "Substrate history data",
			hex: "01 03 A5 04 00 00 00 01 41 10 48 49 53 54 4F 52 59 5F 44 41 54 41 41 14 32 30 32 35 2D 30 31 2D 31 35 20 31 34 3A 33 30 3A 30 30",
			struct: "<List[3]> MID, History",
		},
		S16F9: {
			name: "Set Substrate Location Request",
			dir: "H→E",
			reply: "S16F10",
			desc: "Set substrate location",
			hex: "01 02 A5 04 00 00 00 01 41 08 4C 4F 43 41 54 49 4F 4E",
			struct: "<List[2]> MID, LOCATION",
		},
		S16F10: {
			name: "Set Substrate Location Ack",
			dir: "E→H",
			reply: "None",
			desc: "Ack substrate location set",
			hex: "21 01 00",
			struct: "ACKC16: <Binary>",
		},
		S16F11: {
			name: "Get Material Data Request",
			dir: "H→E",
			reply: "S16F12",
			desc: "Request material data",
			hex: "A5 04 00 00 00 01",
			struct: "MID: <U4>",
		},
		S16F12: {
			name: "Get Material Data",
			dir: "E→H",
			reply: "None",
			desc: "Material data response",
			hex: "01 05 A5 04 00 00 00 01 41 05 54 59 50 45 41 41 04 4C 4F 54 41 41 08 51 55 41 4E 54 49 54 59 41 05 4F 57 4E 45 52 41 06 53 54 41 54 55 53 41",
			struct: "<List[5]> MID, Material Attributes",
		},
		S16F13: {
			name: "Get Substrate Destination Request",
			dir: "H→E",
			reply: "S16F14",
			desc: "Request substrate destination",
			hex: "A5 04 00 00 00 01",
			struct: "MID: <U4>",
		},
		S16F14: {
			name: "Get Substrate Destination Data",
			dir: "E→H",
			reply: "None",
			desc: "Substrate destination data",
			hex: "01 02 A5 04 00 00 00 01 41 0C 44 45 53 54 49 4E 41 54 49 4F 4E",
			struct: "<List[2]> MID, DEST",
		},
		S16F15: {
			name: "Material Received Notification",
			dir: "E→H",
			reply: "S16F16",
			desc: "Notify material received at location",
			hex: "01 02 A5 04 00 00 00 01 41 08 4C 4F 43 41 54 49 4F 4E",
			struct: "<List[2]> MID, LOCATION",
		},
		S16F16: {
			name: "Material Received Acknowledge",
			dir: "H→E",
			reply: "None",
			desc: "Acknowledge material received notification",
			hex: "21 01 00",
			struct: "ACKC16: <Binary>",
		},
		S16F17: {
			name: "Material Removed Notification",
			dir: "E→H",
			reply: "S16F18",
			desc: "Notify material removed from location",
			hex: "01 02 A5 04 00 00 00 01 41 08 4C 4F 43 41 54 49 4F 4E",
			struct: "<List[2]> MID, LOCATION",
		},
		S16F18: {
			name: "Material Removed Acknowledge",
			dir: "H→E",
			reply: "None",
			desc: "Acknowledge material removed notification",
			hex: "21 01 00",
			struct: "ACKC16: <Binary>",
		},
		S16F19: {
			name: "Get Processing State Request",
			dir: "H→E",
			reply: "S16F20",
			desc: "Request material processing state",
			hex: "A5 04 00 00 00 01",
			struct: "MID: <U4>",
		},
		S16F20: {
			name: "Get Processing State Data",
			dir: "E→H",
			reply: "None",
			desc: "Material processing state",
			hex: "01 02 A5 04 00 00 00 01 41 0A 50 52 4F 43 45 53 53 49 4E 47",
			struct: "<List[2]> MID, STATE",
		},

		// S17 - Clock
		S17F1: {
			name: "Clock Request",
			dir: "H→E",
			reply: "S17F2",
			desc: "Request equipment clock time",
			hex: "01 00",
			struct: "<Empty>",
		},
		S17F2: {
			name: "Clock Data",
			dir: "E→H",
			reply: "None",
			desc: "Equipment clock time",
			hex: "41 0E 32 30 32 35 30 31 31 35 31 34 33 30 30 30",
			struct: "TIME: <ASCII>",
		},
		S17F3: {
			name: "Clock Set Request",
			dir: "H→E",
			reply: "S17F4",
			desc: "Set equipment clock",
			hex: "41 0E 32 30 32 35 30 31 31 35 31 34 33 30 30 30",
			struct: "TIME: <ASCII>",
		},
		S17F4: {
			name: "Clock Set Acknowledge",
			dir: "E→H",
			reply: "None",
			desc: "Ack clock set",
			hex: "21 01 00",
			struct: "ACKC17: <Binary>",
		},
	};

	class SECS2Parser {
		constructor(data) {
			this.data = typeof data === "string" ? this.hexToBytes(data) : data;
			this.pos = 0;
		}

		hexToBytes(hex) {
			hex = hex.replace(/\s+/g, "");
			const bytes = [];
			for (let i = 0; i < hex.length; i += 2) {
				bytes.push(parseInt(hex.substr(i, 2), 16));
			}
			return bytes;
		}

		readByte() {
			if (this.pos >= this.data.length)
				throw new Error("Unexpected end of data");
			return this.data[this.pos++];
		}

		readBytes(n) {
			const bytes = this.data.slice(this.pos, this.pos + n);
			this.pos += n;
			return bytes;
		}

		parseItem(depth = 0) {
			const formatByte = this.readByte();
			const formatCode = formatByte & 0xfc;
			const lengthBytes = formatByte & 0x03;

			let length = 0;
			for (let i = 0; i < lengthBytes; i++) {
				length = (length << 8) | this.readByte();
			}

			if (formatCode === 0o00) {
				const items = [];
				for (let i = 0; i < length; i++) {
					items.push(this.parseItem(depth + 1));
				}
				return { type: "List", length, items, depth };
			}

			const data = this.readBytes(length);

			if (formatCode === 0o24) {
				return {
					type: "ASCII",
					value: String.fromCharCode(...data),
					depth,
				};
			} else if (formatCode === 0o20) {
				return { type: "Boolean", value: data.map((b) => b !== 0), depth };
			} else if (formatCode === 0o51) {
				return { type: "U1", value: Array.from(data), depth };
			} else if (formatCode === 0o61) {
				const values = [];
				for (let i = 0; i < data.length; i += 4) {
					const val =
						(data[i] << 24) |
						(data[i + 1] << 16) |
						(data[i + 2] << 8) |
						data[i + 3];
					values.push(val >>> 0);
				}
				return { type: "U4", value: values, depth };
			} else if (formatCode === 0o10) {
				return {
					type: "Binary",
					value: Array.from(data)
						.map((b) => b.toString(16).padStart(2, "0").toUpperCase())
						.join(" "),
					depth,
				};
			}

			return { type: "Unknown", value: Array.from(data), depth };
		}

		parse() {
			return this.parseItem();
		}
	}

	const formatOutput = (item, indent = 0) => {
		const spaces = "  ".repeat(indent);

		if (item.type === "List") {
			let result = `${spaces}<List[${item.length}]>\n`;
			item.items.forEach((subItem, idx) => {
				result += `${spaces}  [${idx}] ${formatOutput(
					subItem,
					indent + 1
				)}`;
			});
			return result;
		}

		if (item.type === "ASCII") {
			return `<ASCII> "${item.value}"\n`;
		}

		if (item.type === "Boolean") {
			return `<Boolean> [${item.value
				.map((v) => (v ? "T" : "F"))
				.join(", ")}]\n`;
		}

		if (item.type === "Binary") {
			return `<Binary> ${item.value}\n`;
		}

		if (Array.isArray(item.value)) {
			if (item.value.length === 1) {
				return `<${item.type}> ${item.value[0]}\n`;
			}
			return `<${item.type}>[${item.value.length}] [${item.value.join(
				", "
			)}]\n`;
		}

		return `<${item.type}> ${item.value}\n`;
	};

	const handleDecode = () => {
		try {
			setError("");
			const parser = new SECS2Parser(input);
			const result = parser.parse();
			const formatted = formatOutput(result);

			let fullOutput =
				"╔════════════════════════════════════════════════╗\n";
			fullOutput += "║         DECODED SECS-II MESSAGE DATA           ║\n";
			fullOutput += "╚════════════════════════════════════════════════╝\n\n";
			fullOutput += formatted;

			setOutput(fullOutput);
		} catch (e) {
			setError(e.message);
			setOutput("");
		}
	};

	const loadMessage = (key) => {
		const msg = MESSAGES[key];
		setInput(msg.hex);
		setSelectedMsg(key);
		setOutput("");
		setError("");
	};

	const copyToClipboard = () => {
		navigator.clipboard.writeText(output);
	};

	const streams = {
		S1: { name: "Equipment Status", msgs: [] },
		S2: { name: "Equipment Control", msgs: [] },
		S3: { name: "Material Status", msgs: [] },
		S4: { name: "Material Control", msgs: [] },
		S5: { name: "Exception/Alarm", msgs: [] },
		S6: { name: "Data Collection", msgs: [] },
		S7: { name: "Process Program", msgs: [] },
		S9: { name: "System Errors", msgs: [] },
		S10: { name: "Terminal Services", msgs: [] },
		S14: { name: "Object Services", msgs: [] },
		S15: { name: "Recipe Management", msgs: [] },
		S16: { name: "Processing Mgmt", msgs: [] },
		S17: { name: "Clock", msgs: [] },
	};

	Object.entries(MESSAGES).forEach(([key, msg]) => {
		const stream = key.match(/^S\d+/)[0];
		if (streams[stream]) {
			streams[stream].msgs.push({ key, ...msg });
		}
	});

	return (
		<div className="grid lg:grid-cols-4 gap-6 p-6">
			{/* Sidebar: Message Library */}
			<div className="lg:col-span-1 space-y-4 max-h-[700px] overflow-y-auto pr-2">
				<div className="bg-slate-900/70 rounded-lg p-4 border border-blue-500">
					<h2 className="text-lg font-bold text-blue-300 mb-3 flex items-center gap-2">
						<Book className="w-5 h-5" />
						Message Library
					</h2>

					{Object.entries(streams).map(([streamKey, stream]) => (
						<div key={streamKey} className="mb-4">
							<div className="bg-blue-900/30 px-2 py-1 rounded text-xs font-bold text-blue-300 mb-2">
								{streamKey}: {stream.name}
							</div>
							<div className="space-y-1">
								{stream.msgs.map((msg) => (
									<button
										key={msg.key}
										onClick={() => loadMessage(msg.key)}
										className={`w-full text-left px-2 py-2 rounded text-xs transition-all ${
											selectedMsg === msg.key
												? "bg-blue-600 text-white shadow-lg"
												: "bg-slate-800/50 text-slate-300 hover:bg-slate-700"
										}`}>
										<div className="font-mono font-bold">
											{msg.key}
										</div>
										<div className="text-xs opacity-80 truncate">
											{msg.name}
										</div>
										<div className="text-xs opacity-60 flex items-center gap-1 mt-1">
											<span>{msg.dir}</span>
											<ArrowRight className="w-3 h-3" />
											<span>{msg.reply}</span>
										</div>
									</button>
								))}
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Main Area */}
			<div className="lg:col-span-3 space-y-4">
				{/* Message Info */}
				{selectedMsg && MESSAGES[selectedMsg] && (
					<div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500 rounded-lg p-4">
						<div className="flex items-start gap-3">
							<Zap className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
							<div className="flex-1">
								<div className="flex items-center gap-3 mb-2">
									<h3 className="text-xl font-bold text-blue-200">
										{selectedMsg}
									</h3>
									<span className="text-sm text-blue-300">
										{MESSAGES[selectedMsg].name}
									</span>
								</div>
								<p className="text-blue-100 text-sm mb-3">
									{MESSAGES[selectedMsg].desc}
								</p>
								<div className="bg-slate-900/70 rounded p-3 border border-slate-700">
									<div className="text-xs text-slate-400 mb-1">
										Expected Structure:
									</div>
									<pre className="text-xs text-green-300 font-mono whitespace-pre-wrap">
										{MESSAGES[selectedMsg].struct}
									</pre>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Input */}
				<div>
					<label className="block text-slate-300 font-medium mb-2 text-sm">
						SECS-II Hex Data Input
					</label>
					<textarea
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder="Select a message from the library or paste hex data here..."
						className="w-full h-32 bg-slate-900 text-slate-100 p-4 rounded-lg border border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 font-mono text-sm"
					/>
				</div>

				{/* Decode Button */}
				<button
					onClick={handleDecode}
					disabled={!input.trim()}
					className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg disabled:cursor-not-allowed">
					🔍 Decode SECS-II Message
				</button>

				{/* Output */}
				{output && (
					<div>
						<div className="flex justify-between items-center mb-2">
							<label className="block text-slate-300 font-medium text-sm">
								Decoded Output
							</label>
							<button
								onClick={copyToClipboard}
								className="flex items-center gap-1 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded transition-all">
								<Copy className="w-4 h-4" />
								Copy
							</button>
						</div>
						<div className="bg-slate-900 text-green-400 p-4 rounded-lg border border-slate-600 overflow-auto font-mono text-sm whitespace-pre min-h-[200px]">
							{output}
						</div>
					</div>
				)}

				{/* Error */}
				{error && (
					<div className="p-4 bg-red-900/30 border border-red-600 rounded-lg flex items-start gap-3">
						<AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
						<div>
							<p className="text-red-300 font-medium">Decoding Error</p>
							<p className="text-red-200 text-sm">{error}</p>
						</div>
					</div>
				)}

				{/* Success */}
				{output && !error && (
					<div className="p-4 bg-green-900/30 border border-green-600 rounded-lg flex items-center gap-3">
						<CheckCircle className="w-5 h-5 text-green-400" />
						<p className="text-green-300 text-sm">
							✓ Message successfully decoded!{" "}
							{selectedMsg && `Recognized as ${selectedMsg}`}
						</p>
					</div>
				)}
			</div>
		</div>
	);
};

// ==================== PARSER TAB ====================
const ParserTab = () => {
	const [logContent, setLogContent] = useState("");
	const [parsedMessages, setParsedMessages] = useState([]);
	const [filterStream, setFilterStream] = useState("all");
	const [searchTerm, setSearchTerm] = useState("");
	const [isProcessing, setIsProcessing] = useState(false);
	const [progress, setProgress] = useState(0);
	const [fileSize, setFileSize] = useState(0);
	const [displayLimit, setDisplayLimit] = useState(100);
	const abortControllerRef = React.useRef(null);

	const MESSAGE_INFO = {
		S1F1: {
			name: "Are You There Request",
			dir: "H→E",
			desc: "Host checking if equipment is online",
		},
		S1F2: {
			name: "Online Data",
			dir: "E→H",
			desc: "Equipment responds with model and version",
		},
		S1F3: {
			name: "Status Request",
			dir: "H→E",
			desc: "Request status variables",
		},
		S1F4: { name: "Status Data", dir: "E→H", desc: "Status variable values" },
		S1F13: {
			name: "Establish Comms Request",
			dir: "H→E",
			desc: "Initialize communications",
		},
		S1F14: {
			name: "Establish Comms Ack",
			dir: "E→H",
			desc: "Acknowledge comms establishment",
		},
		S2F13: {
			name: "Equipment Constant Request",
			dir: "H→E",
			desc: "Request constants",
		},
		S2F14: {
			name: "Equipment Constant Data",
			dir: "E→H",
			desc: "Constant values",
		},
		S2F17: {
			name: "Date/Time Request",
			dir: "H→E",
			desc: "Request current time",
		},
		S2F18: {
			name: "Date/Time Data",
			dir: "E→H",
			desc: "Current date and time",
		},
		S2F31: { name: "Date/Time Set", dir: "H→E", desc: "Set equipment time" },
		S2F32: {
			name: "Date/Time Set Ack",
			dir: "E→H",
			desc: "Acknowledge time set",
		},
		S2F33: {
			name: "Define Report",
			dir: "H→E",
			desc: "Define report structure",
		},
		S2F34: {
			name: "Define Report Ack",
			dir: "E→H",
			desc: "Acknowledge report definition",
		},
		S2F35: {
			name: "Link Event Report",
			dir: "H→E",
			desc: "Link events to reports",
		},
		S2F36: {
			name: "Link Event Report Ack",
			dir: "E→H",
			desc: "Acknowledge event link",
		},
		S2F37: {
			name: "Enable/Disable Events",
			dir: "H→E",
			desc: "Enable or disable events",
		},
		S2F38: {
			name: "Enable/Disable Events Ack",
			dir: "E→H",
			desc: "Acknowledge event enable/disable",
		},
		S2F41: {
			name: "Host Command",
			dir: "H→E",
			desc: "Host sending command to equipment",
		},
		S2F42: {
			name: "Command Ack",
			dir: "E→H",
			desc: "Equipment acknowledges command",
		},
		S5F1: {
			name: "Alarm Report",
			dir: "E→H",
			desc: "Equipment reports alarm",
		},
		S5F2: { name: "Alarm Ack", dir: "H→E", desc: "Host acknowledges alarm" },
		S6F11: {
			name: "Event Report",
			dir: "E→H",
			desc: "Equipment sending event data",
		},
		S6F12: {
			name: "Event Report Ack",
			dir: "H→E",
			desc: "Host acknowledges event",
		},
		S7F1: {
			name: "Program Load Inquire",
			dir: "H→E",
			desc: "Check if can load program",
		},
		S7F2: {
			name: "Program Load Grant",
			dir: "E→H",
			desc: "Grant/deny program load",
		},
		S7F3: { name: "Program Send", dir: "H→E", desc: "Send process program" },
		S7F4: {
			name: "Program Ack",
			dir: "E→H",
			desc: "Acknowledge program receipt",
		},
		S9F1: {
			name: "Unrecognized Device ID",
			dir: "E→H",
			desc: "Device ID not recognized",
		},
		S9F3: {
			name: "Unrecognized Stream",
			dir: "E→H",
			desc: "Stream type not recognized",
		},
		S9F5: {
			name: "Unrecognized Function",
			dir: "E→H",
			desc: "Function type not recognized",
		},
		S9F7: {
			name: "Illegal Data",
			dir: "E→H",
			desc: "Data format/content illegal",
		},
		S10F1: {
			name: "Terminal Request",
			dir: "E→H",
			desc: "Request terminal display",
		},
		S10F2: {
			name: "Terminal Ack",
			dir: "H→E",
			desc: "Acknowledge terminal request",
		},
		S16F1: {
			name: "Material ID Read Request",
			dir: "E→H",
			desc: "Request material ID read",
		},
		S16F2: {
			name: "Material ID Read Ack",
			dir: "H→E",
			desc: "Acknowledge material ID read",
		},
		S16F15: {
			name: "Material Received Notification",
			dir: "E→H",
			desc: "Notify material received at location",
		},
		S16F16: {
			name: "Material Received Ack",
			dir: "H→E",
			desc: "Acknowledge material received",
		},
	};

	const parseLogFile = (content) => {
		const lines = content.split("\n");
		const messages = [];

		lines.forEach((line, index) => {
			const receivedMatch = line.match(
				/<- Received SECS message: (S\d+F\d+) - Transaction: (\d+)/
			);
			if (receivedMatch) {
				const timestamp =
					line.match(/^(\d{2}:\d{2}:\d{2}\.\d{3})/)?.[1] || "";
				messages.push({
					timestamp,
					direction: "received",
					messageType: receivedMatch[1],
					transaction: receivedMatch[2],
					rawLine: line,
					lineNumber: index + 1,
				});
			}

			const sentMatch = line.match(
				/-> Send SECS message: (S\d+F\d+) - Transaction: (\d+) (.+)/
			);
			if (sentMatch) {
				const timestamp =
					line.match(/^(\d{2}:\d{2}:\d{2}\.\d{3})/)?.[1] || "";
				const dataStr = sentMatch[3];
				messages.push({
					timestamp,
					direction: "sent",
					messageType: sentMatch[1],
					transaction: sentMatch[2],
					data: dataStr,
					rawLine: line,
					lineNumber: index + 1,
				});
			}
		});

		return messages;
	};

	const handleFileUpload = async (event) => {
		const file = event.target.files[0];
		if (!file) return;

		setFileSize(file.size);
		setIsProcessing(true);
		setProgress(0);
		setParsedMessages([]);

		abortControllerRef.current = new AbortController();

		try {
			const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
			const messages = [];
			let processedBytes = 0;
			let leftover = "";

			const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

			for (let i = 0; i < totalChunks; i++) {
				if (abortControllerRef.current?.signal.aborted) {
					break;
				}

				const start = i * CHUNK_SIZE;
				const end = Math.min(start + CHUNK_SIZE, file.size);
				const chunk = file.slice(start, end);

				const text = await chunk.text();
				const lines = (leftover + text).split("\n");

				// Keep last incomplete line for next chunk
				leftover = lines.pop() || "";

				// Process complete lines
				lines.forEach((line, lineIdx) => {
					const receivedMatch = line.match(
						/<- Received SECS message: (S\d+F\d+) - Transaction: (\d+)/
					);
					if (receivedMatch) {
						const timestamp =
							line.match(/^(\d{2}:\d{2}:\d{2}\.\d{3})/)?.[1] || "";
						messages.push({
							timestamp,
							direction: "received",
							messageType: receivedMatch[1],
							transaction: receivedMatch[2],
							rawLine: line,
							lineNumber: Math.floor(start / 100) + lineIdx + 1, // Approximate line number
						});
					}

					const sentMatch = line.match(
						/-> Send SECS message: (S\d+F\d+) - Transaction: (\d+) (.+)/
					);
					if (sentMatch) {
						const timestamp =
							line.match(/^(\d{2}:\d{2}:\d{2}\.\d{3})/)?.[1] || "";
						messages.push({
							timestamp,
							direction: "sent",
							messageType: sentMatch[1],
							transaction: sentMatch[2],
							data: sentMatch[3],
							rawLine: line,
							lineNumber: Math.floor(start / 100) + lineIdx + 1,
						});
					}
				});

				processedBytes += chunk.size;
				setProgress((processedBytes / file.size) * 100);

				// Update UI every 10 chunks to avoid too many re-renders
				if (i % 10 === 0 || i === totalChunks - 1) {
					setParsedMessages([...messages]);
				}
			}

			// Process any remaining leftover
			if (leftover) {
				const receivedMatch = leftover.match(
					/<- Received SECS message: (S\d+F\d+) - Transaction: (\d+)/
				);
				if (receivedMatch) {
					const timestamp =
						leftover.match(/^(\d{2}:\d{2}:\d{2}\.\d{3})/)?.[1] || "";
					messages.push({
						timestamp,
						direction: "received",
						messageType: receivedMatch[1],
						transaction: receivedMatch[2],
						rawLine: leftover,
						lineNumber: totalChunks + 1,
					});
				}
			}

			setParsedMessages(messages);
			setProgress(100);
		} catch (error) {
			console.error("Error processing file:", error);
			alert("Error processing file: " + error.message);
		} finally {
			setIsProcessing(false);
		}
	};

	const cancelProcessing = () => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			setIsProcessing(false);
			setProgress(0);
		}
	};

	const handleTextInput = (e) => {
		const content = e.target.value;
		setLogContent(content);
		if (content.trim()) {
			const parsed = parseLogFile(content);
			setParsedMessages(parsed);
		} else {
			setParsedMessages([]);
		}
	};

	const filteredMessages = parsedMessages.filter((msg) => {
		const matchesFilter =
			filterStream === "all" || msg.messageType.startsWith(filterStream);
		const matchesSearch =
			!searchTerm ||
			msg.messageType.toLowerCase().includes(searchTerm.toLowerCase()) ||
			msg.transaction?.includes(searchTerm) ||
			msg.data?.toLowerCase().includes(searchTerm.toLowerCase());
		return matchesFilter && matchesSearch;
	});

	const exportToCSV = () => {
		const headers = [
			"Timestamp",
			"Direction",
			"Message Type",
			"Transaction",
			"Data",
			"Line Number",
		];
		const rows = filteredMessages.map((msg) => [
			msg.timestamp,
			msg.direction,
			msg.messageType,
			msg.transaction || "",
			msg.data || "",
			msg.lineNumber,
		]);

		const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
		const blob = new Blob([csv], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "secs-messages.csv";
		a.click();
	};

	const getConversationPairs = () => {
		const pairs = [];
		const transactions = {};

		filteredMessages.forEach((msg) => {
			if (msg.transaction) {
				if (!transactions[msg.transaction]) {
					transactions[msg.transaction] = [];
				}
				transactions[msg.transaction].push(msg);
			}
		});

		Object.entries(transactions).forEach(([trans, msgs]) => {
			if (msgs.length === 2) {
				const request = msgs.find((m) => m.direction === "received");
				const response = msgs.find((m) => m.direction === "sent");
				if (request && response) {
					pairs.push({ transaction: trans, request, response });
				}
			}
		});

		return pairs;
	};

	const conversationPairs = getConversationPairs();

	const getMessageIcon = (direction) => {
		return direction === "received" ? "⬇️" : "⬆️";
	};

	const getMessageColor = (direction) => {
		return direction === "received"
			? "border-l-4 border-green-500 bg-green-900/20"
			: "border-l-4 border-blue-500 bg-blue-900/20";
	};

	return (
		<div className="p-6 space-y-6">
			{/* Upload Section */}
			<div className="space-y-4">
				<div className="flex gap-4 items-center flex-wrap">
					<label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-all">
						<Upload className="w-5 h-5" />
						{isProcessing ? "Processing..." : "Upload Log File"}
						<input
							type="file"
							accept=".log,.txt"
							onChange={handleFileUpload}
							className="hidden"
							disabled={isProcessing}
						/>
					</label>

					{isProcessing && (
						<button
							onClick={cancelProcessing}
							className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all">
							<AlertCircle className="w-5 h-5" />
							Cancel
						</button>
					)}

					{parsedMessages.length > 0 && !isProcessing && (
						<>
							<button
								onClick={exportToCSV}
								className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all">
								<Download className="w-5 h-5" />
								Export CSV
							</button>
							<button
								onClick={() => {
									setLogContent("");
									setParsedMessages([]);
									setFilterStream("all");
									setSearchTerm("");
									setProgress(0);
									setFileSize(0);
									setDisplayLimit(100);
								}}
								className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all">
								<AlertCircle className="w-5 h-5" />
								Clear
							</button>
						</>
					)}

					<div className="flex-1"></div>

					<div className="text-slate-300 text-sm">
						{fileSize > 0 && (
							<span className="mr-4">
								File: {(fileSize / 1024 / 1024).toFixed(2)} MB
							</span>
						)}
						{parsedMessages.length > 0 &&
							`Found ${parsedMessages.length} SECS messages`}
					</div>
				</div>

				{/* Progress Bar */}
				{isProcessing && (
					<div className="space-y-2">
						<div className="flex justify-between text-sm text-slate-300">
							<span>Processing file...</span>
							<span>{progress.toFixed(1)}%</span>
						</div>
						<div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
							<div
								className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-300 flex items-center justify-center text-xs text-white font-bold"
								style={{ width: `${progress}%` }}>
								{progress > 10 && `${progress.toFixed(0)}%`}
							</div>
						</div>
						<p className="text-xs text-slate-400">
							Large files may take a minute. The browser will remain
							responsive.
						</p>
					</div>
				)}

				<div>
					<label className="block text-slate-300 font-medium mb-2 text-sm">
						Or Paste Log Content (for smaller files)
					</label>
					<textarea
						value={logContent}
						onChange={handleTextInput}
						placeholder="Paste log content here for files under 10MB..."
						className="w-full h-32 bg-slate-900 text-slate-100 p-4 rounded-lg border border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 font-mono text-xs"
						disabled={isProcessing}
					/>
				</div>
			</div>

			{/* Filters */}
			{parsedMessages.length > 0 && (
				<div className="flex gap-4">
					<div className="flex items-center gap-2">
						<Filter className="w-5 h-5 text-slate-400" />
						<select
							value={filterStream}
							onChange={(e) => setFilterStream(e.target.value)}
							className="bg-slate-900 text-slate-300 px-3 py-2 rounded-lg border border-slate-600 text-sm">
							<option value="all">All Streams</option>
							<option value="S1">S1 - Equipment Status</option>
							<option value="S2">S2 - Equipment Control</option>
							<option value="S3">S3 - Material Status</option>
							<option value="S4">S4 - Material Control</option>
							<option value="S5">S5 - Alarms</option>
							<option value="S6">S6 - Events</option>
							<option value="S7">S7 - Process Programs</option>
							<option value="S9">S9 - System Errors</option>
							<option value="S10">S10 - Terminal</option>
							<option value="S14">S14 - Objects</option>
							<option value="S15">S15 - Recipes</option>
							<option value="S16">S16 - Processing</option>
							<option value="S17">S17 - Clock</option>
						</select>
					</div>

					<div className="flex-1 flex items-center gap-2">
						<Search className="w-5 h-5 text-slate-400" />
						<input
							type="text"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							placeholder="Search messages..."
							className="flex-1 bg-slate-900 text-slate-300 px-3 py-2 rounded-lg border border-slate-600 text-sm"
						/>
					</div>
				</div>
			)}

			{/* Conversation Pairs View */}
			{conversationPairs.length > 0 && (
				<div className="space-y-4">
					<h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
						<MessageSquare className="w-6 h-6" />
						Message Conversations ({conversationPairs.length})
					</h2>

					<div className="space-y-3 max-h-[500px] overflow-y-auto">
						{conversationPairs.slice(0, displayLimit).map((pair, idx) => {
							const reqInfo =
								MESSAGE_INFO[pair.request.messageType] || {};
							const resInfo =
								MESSAGE_INFO[pair.response.messageType] || {};

							return (
								<div
									key={idx}
									className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
									<div className="flex items-center gap-2 mb-3 text-sm text-slate-400">
										<Clock className="w-4 h-4" />
										<span>{pair.request.timestamp}</span>
										<span className="mx-2">→</span>
										<span>{pair.response.timestamp}</span>
										<span className="ml-auto font-mono text-xs bg-slate-800 px-2 py-1 rounded">
											Transaction: {pair.transaction}
										</span>
									</div>

									<div className="grid md:grid-cols-2 gap-4">
										<div className="bg-green-900/20 border-l-4 border-green-500 rounded p-3">
											<div className="flex items-center gap-2 mb-2">
												<span className="text-2xl">⬇️</span>
												<div>
													<div className="font-mono font-bold text-green-300">
														{pair.request.messageType}
													</div>
													<div className="text-xs text-green-200">
														{reqInfo.name}
													</div>
												</div>
											</div>
											<div className="text-xs text-slate-400 mt-2">
												{reqInfo.desc}
											</div>
										</div>

										<div className="bg-blue-900/20 border-l-4 border-blue-500 rounded p-3">
											<div className="flex items-center gap-2 mb-2">
												<span className="text-2xl">⬆️</span>
												<div>
													<div className="font-mono font-bold text-blue-300">
														{pair.response.messageType}
													</div>
													<div className="text-xs text-blue-200">
														{resInfo.name}
													</div>
												</div>
											</div>
											{pair.response.data && (
												<div className="text-xs text-slate-300 font-mono mt-2 bg-slate-900 p-2 rounded overflow-x-auto max-w-full">
													<div className="whitespace-nowrap">
														{pair.response.data}
													</div>
												</div>
											)}
											<div className="text-xs text-slate-400 mt-2">
												{resInfo.desc}
											</div>
										</div>
									</div>
								</div>
							);
						})}
					</div>

					{conversationPairs.length > displayLimit && (
						<button
							onClick={() => setDisplayLimit((prev) => prev + 100)}
							className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-all">
							Show More ({conversationPairs.length - displayLimit}{" "}
							remaining)
						</button>
					)}
				</div>
			)}

			{/* Empty State */}
			{parsedMessages.length === 0 && (
				<div className="text-center py-12 text-slate-400">
					<Upload className="w-16 h-16 mx-auto mb-4 opacity-50" />
					<p className="text-lg">
						Upload a log file or paste log content to begin
					</p>
					<p className="text-sm mt-2">
						The parser will automatically extract all SECS/GEM messages
					</p>
				</div>
			)}
		</div>
	);
};

export default SECS2InterpreterApp;
