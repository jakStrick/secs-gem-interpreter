import fs from "fs";

// Read the CSV file
const csvContent = fs.readFileSync("alarmiddocu.csv", "utf-8");
const lines = csvContent.split("\n");

// Track unique subsystems for consistent mapping
const subsystemMap = new Map();
let toolCounter = 1;
let moduleCounter = 1;
let bayCounter = 1;

const getGenericSubsystem = (originalSubsystem) => {
	if (subsystemMap.has(originalSubsystem)) {
		return subsystemMap.get(originalSubsystem);
	}

	// Generate generic name
	const genericName = `ToolModel_${String(toolCounter).padStart(
		3,
		"0"
	)}.Module_${String(moduleCounter).padStart(3, "0")}.Bay_${String(
		bayCounter
	).padStart(3, "0")}`;
	subsystemMap.set(originalSubsystem, genericName);

	// Increment counters in a pattern
	bayCounter++;
	if (bayCounter > 5) {
		bayCounter = 1;
		moduleCounter++;
	}
	if (moduleCounter > 10) {
		moduleCounter = 1;
		toolCounter++;
	}

	return genericName;
};

// Skip header and parse
const alarms = {};
const alidMapping = new Map(); // Track original ALID to new ALID mapping
let newAlidCounter = 1000;

for (let i = 1; i < lines.length; i++) {
	const line = lines[i].trim();
	if (!line) continue;

	// Split by semicolon
	const parts = line.split(";");
	if (parts.length < 6) continue;

	const originalSubsystem = parts[0];
	const subsystem = getGenericSubsystem(originalSubsystem);
	const description = parts[1];
	const originalAlid = parts[2];
	const setEventCEID = parts[3];
	const clearEventCEID = parts[4];
	const alarmCode = parts[5];

	// Generate new ALID
	const newAlid = String(newAlidCounter);
	alidMapping.set(originalAlid, newAlid);
	newAlidCounter++;

	// Store by new ALID
	alarms[newAlid] = {
		subsystem,
		description,
		alid: newAlid,
		setEventCEID,
		clearEventCEID,
		alarmCode,
	};
}

// Write to JSON
fs.writeFileSync("src/alarms.json", JSON.stringify(alarms, null, 2));
console.log(`Converted ${Object.keys(alarms).length} alarms to JSON`);
console.log(`Generated ${subsystemMap.size} unique generic subsystem names`);
