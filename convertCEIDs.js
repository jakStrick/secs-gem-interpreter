import fs from "fs";

// Read the CSV file
const csvContent = fs.readFileSync("CEIDdocu.csv", "utf-8");
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
const ceids = {};

for (let i = 1; i < lines.length; i++) {
	const line = lines[i].trim();
	if (!line) continue;

	// Split by semicolon
	const parts = line.split(";");
	if (parts.length < 4) continue;

	const originalSubsystem = parts[0];
	const subsystem = getGenericSubsystem(originalSubsystem);
	const name = parts[1];
	const ceid = parts[2];
	const description = parts[3];
	const availableVids = parts[4] || "";

	// Store by original CEID
	ceids[ceid] = {
		subsystem,
		name,
		ceid,
		description,
		availableVids,
	};
}

// Write to JSON
fs.writeFileSync("src/ceids.json", JSON.stringify(ceids, null, 2));
console.log(`Converted ${Object.keys(ceids).length} CEIDs to JSON`);
console.log(`Generated ${subsystemMap.size} unique generic subsystem names`);
