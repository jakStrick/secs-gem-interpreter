import React, { useState } from "react";
import secsMessages from "/secsMessages.json";
import messages from "/messages.json";
import alarms from "../alarms.json";
import learnedPatterns from "/patterns.json";
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
  Brain,
  Trash2,
  Plus,
  Eye,
  List,
} from "lucide-react";

// Extract SECS data from log line - handles both raw hex and SECS notation
const extractSecsDataFromLine = (rawLine) => {
  if (!rawLine) return null;

  // First, try to find SECS notation format: <L[3] <B[1] 06> <U4 210355> <A[35] text> >
  // Look for pattern after "Transaction: XXXXX"
  const secsNotationMatch = rawLine.match(
    /Transaction:\s*\d+\s+(<[LABUFIS]\[?\d*\]?.*>)\s*(\||\{|$)/,
  );
  if (secsNotationMatch) {
    const notation = secsNotationMatch[1].trim();
    return {
      type: "secs-notation",
      data: notation,
      parsed: parseSecsNotation(notation),
    };
  }

  // Fallback: try to find raw hex patterns
  const hexPatterns = [
    /\b([0-9A-Fa-f]{2}\s+){3,}[0-9A-Fa-f]{2}\b/g,
    /\b[0-9A-Fa-f]{8,}\b/g,
  ];

  for (const pattern of hexPatterns) {
    const matches = rawLine.match(pattern);
    if (matches && matches.length > 0) {
      let hexData = matches[0].replace(/\s+/g, " ").trim();
      return { type: "raw-hex", data: hexData, parsed: null };
    }
  }

  return null;
};

// Parse SECS notation like <L[3] <B[1] 06> <U4 210355> <A[35] text> > into structured format
const parseSecsNotation = (notation) => {
  const result = [];
  let depth = 0;
  let pos = 0;

  const parseItem = () => {
    // Skip whitespace and tabs
    while (pos < notation.length && /[\s\t]/.test(notation[pos])) pos++;

    if (pos >= notation.length || notation[pos] !== "<") return null;
    pos++; // skip '<'

    // Get type character(s)
    let typeChar = "";
    while (pos < notation.length && /[A-Za-z]/.test(notation[pos])) {
      typeChar += notation[pos++];
    }

    // Get length in brackets if present
    let length = null;
    if (notation[pos] === "[") {
      pos++; // skip '['
      let lenStr = "";
      while (pos < notation.length && notation[pos] !== "]") {
        lenStr += notation[pos++];
      }
      pos++; // skip ']'
      length = parseInt(lenStr, 10);
    }

    // Skip whitespace
    while (pos < notation.length && /[\s\t]/.test(notation[pos])) pos++;

    // Determine type and parse value
    const type = typeChar.toUpperCase();

    if (type === "L") {
      // List - parse nested items
      const items = [];
      while (pos < notation.length) {
        while (pos < notation.length && /[\s\t]/.test(notation[pos])) pos++;
        if (notation[pos] === ">") {
          pos++; // skip closing '>'
          break;
        }
        if (notation[pos] === "<") {
          const item = parseItem();
          if (item) items.push(item);
        } else {
          pos++;
        }
      }
      return { type: "List", length: length || items.length, items };
    } else {
      // Value type - extract until closing '>'
      let value = "";
      let nestedDepth = 0;
      while (pos < notation.length) {
        if (notation[pos] === "<") nestedDepth++;
        if (notation[pos] === ">") {
          if (nestedDepth === 0) {
            pos++; // skip closing '>'
            break;
          }
          nestedDepth--;
        }
        value += notation[pos++];
      }
      value = value.trim();

      // Parse value based on type
      let parsedValue = value;
      let typeName = type;

      switch (type) {
        case "A":
          typeName = "ASCII";
          parsedValue = value;
          break;
        case "B":
          typeName = "Binary";
          parsedValue = value;
          break;
        case "U1":
          typeName = "U1";
          parsedValue = parseInt(value, 10);
          break;
        case "U2":
          typeName = "U2";
          parsedValue = parseInt(value, 10);
          break;
        case "U4":
          typeName = "U4";
          parsedValue = parseInt(value, 10);
          break;
        case "U8":
          typeName = "U8";
          parsedValue = value;
          break;
        case "I1":
          typeName = "I1";
          parsedValue = parseInt(value, 10);
          break;
        case "I2":
          typeName = "I2";
          parsedValue = parseInt(value, 10);
          break;
        case "I4":
          typeName = "I4";
          parsedValue = parseInt(value, 10);
          break;
        case "I8":
          typeName = "I8";
          parsedValue = value;
          break;
        case "F4":
          typeName = "F4";
          parsedValue = parseFloat(value);
          break;
        case "F8":
          typeName = "F8";
          parsedValue = parseFloat(value);
          break;
        case "BOOLEAN":
          typeName = "Boolean";
          parsedValue = value.toLowerCase() === "true" || value === "1";
          break;
        default:
          typeName = type || "Unknown";
      }

      return { type: typeName, length, value: parsedValue };
    }
  };

  try {
    return parseItem();
  } catch (e) {
    return null;
  }
};

// Format parsed SECS notation for display
const formatParsedNotation = (item, indent = 0) => {
  if (!item) return "";
  const spaces = "  ".repeat(indent);

  if (item.type === "List") {
    let result = `${spaces}<List[${item.length}]>\n`;
    if (item.items) {
      item.items.forEach((subItem, idx) => {
        result += `${spaces}  [${idx}] ${formatParsedNotation(subItem, indent + 1)}`;
      });
    }
    return result;
  }

  if (item.type === "ASCII") {
    return `<ASCII> "${item.value}"\n`;
  }

  if (item.type === "Binary") {
    return `<Binary> ${item.value}\n`;
  }

  if (item.type === "Boolean") {
    return `<Boolean> ${item.value ? "T" : "F"}\n`;
  }

  return `<${item.type}> ${item.value}\n`;
};

// ==================== MAIN APP ====================
const SECS2InterpreterApp = () => {
  const [activeTab, setActiveTab] = useState("parser");
  const [parserState, setParserState] = useState({
    logContent: "",
    parsedMessages: [],
    filterStream: "",
    searchTerm: "",
    isProcessing: false,
    progress: 0,
    fileSize: 0,
    displayLimit: 100,
  });
  const [trainingState, setTrainingState] = useState({
    rawLogData: "",
    detectedPatterns: [],
    learnedPatterns: [],
    analysisComplete: false,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-lg p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <FileText className="w-8 h-8" />
                SECS/GEM Log Parser
              </h1>
              <p className="text-blue-100 mt-2">
                Complete toolkit for SECS-II message interpretation and log file
                analysis
              </p>
            </div>
            <img
              src="/logo.svg"
              alt="SECS/GEM Icon"
              className="w-20 h-20 md:w-40 md:h-40 mr-10"
            />
          </div>
        </div>

        <div className="bg-slate-800 border-x border-slate-700 flex gap-2 p-2">
          <button
            onClick={() => setActiveTab("parser")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === "parser" ? "bg-blue-600 text-white shadow-lg" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
          >
            <Search className="w-5 h-5" />
            Log Parser
          </button>
          <button
            onClick={() => setActiveTab("interpreter")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === "interpreter" ? "bg-blue-600 text-white shadow-lg" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
          >
            <FileText className="w-5 h-5" />
            Message Interpreter
          </button>
          <button
            onClick={() => setActiveTab("training")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === "training" ? "bg-purple-600 text-white shadow-lg" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
          >
            <Brain className="w-5 h-5" />
            Training
          </button>
          <button
            onClick={() => setActiveTab("fullarch")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === "fullarch" ? "bg-cyan-600 text-white shadow-lg" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
          >
            <List className="w-5 h-5" />
            Full Architecture
          </button>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-b-lg shadow-2xl border-x border-b border-slate-700">
          {activeTab === "parser" ? (
            <ParserTab
              parserState={parserState}
              setParserState={setParserState}
            />
          ) : activeTab === "interpreter" ? (
            <InterpreterTab parsedLogMessages={parserState.parsedMessages} />
          ) : activeTab === "fullarch" ? (
            <FullArchitectureTab />
          ) : (
            <TrainingTab
              trainingState={trainingState}
              setTrainingState={setTrainingState}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== TRAINING TAB ====================
const TrainingTab = ({ trainingState, setTrainingState }) => {
  const { rawLogData, detectedPatterns, learnedPatterns, analysisComplete } =
    trainingState;
  const setRawLogData = (v) =>
    setTrainingState((p) => ({ ...p, rawLogData: v }));
  const setDetectedPatterns = (v) =>
    setTrainingState((p) => ({ ...p, detectedPatterns: v }));
  const setLearnedPatterns = (v) =>
    setTrainingState((p) => ({ ...p, learnedPatterns: v }));
  const setAnalysisComplete = (v) =>
    setTrainingState((p) => ({ ...p, analysisComplete: v }));

  const analyzeLogData = () => {
    if (!rawLogData.trim()) return;
    const lines = rawLogData.split("\n");
    const hexPatterns = [
      {
        regex: /\b([0-9A-Fa-f]{2}\s+){3,}[0-9A-Fa-f]{2}\b/g,
        name: "Space-Separated Hex",
        type: "hex-spaced",
      },
      {
        regex: /\b[0-9A-Fa-f]{8,}\b/g,
        name: "Continuous Hex String",
        type: "hex-continuous",
      },
      {
        regex: /(0x[0-9A-Fa-f]{2}\s*)+/g,
        name: "0x-Prefixed Hex",
        type: "hex-0x",
      },
      {
        regex: /\b([0-9A-Fa-f]{2}:){2,}[0-9A-Fa-f]{2}\b/g,
        name: "Colon-Separated Hex",
        type: "hex-colon",
      },
    ];
    const messagePatterns = [
      { regex: /S\d+F\d+/g, name: "SECS Message ID", type: "secs-msg-id" },
      {
        regex: /Transaction:\s*(\d+)/g,
        name: "Transaction ID",
        type: "transaction",
      },
    ];
    const linePatterns = [
      {
        regex: /^(\d{1,2}:\d{2}:\d{2}\.\d{3})/,
        name: "Timestamp (HH:MM:SS.mmm)",
        type: "timestamp",
      },
      { regex: /<-|->/, name: "Direction Indicator", type: "direction" },
    ];
    const patternSummary = {};
    lines.forEach((line) => {
      if (!line.trim()) return;
      [...hexPatterns, ...messagePatterns, ...linePatterns].forEach(
        (pattern) => {
          const matches = line.match(pattern.regex);
          if (matches) {
            if (!patternSummary[pattern.type]) {
              patternSummary[pattern.type] = {
                name: pattern.name,
                type: pattern.type,
                count: 0,
                examples: [],
              };
            }
            patternSummary[pattern.type].count++;
            if (patternSummary[pattern.type].examples.length < 3) {
              patternSummary[pattern.type].examples.push(
                ...matches.slice(0, 2),
              );
            }
          }
        },
      );
    });
    setDetectedPatterns(
      Object.values(patternSummary).map((p) => ({ ...p, enabled: true })),
    );
    setAnalysisComplete(true);
  };

  const addToLearnedPatterns = () => {
    const newPattern = {
      id: `pattern_${Date.now()}`,
      name: `Log Format ${learnedPatterns.length + 1}`,
      trainedAt: new Date().toISOString(),
      elements: detectedPatterns.filter((p) => p.enabled),
      sampleLines: rawLogData.split("\n").slice(0, 10),
    };
    setLearnedPatterns([...learnedPatterns, newPattern]);
  };

  const togglePattern = (idx) => {
    const updated = [...detectedPatterns];
    updated[idx].enabled = !updated[idx].enabled;
    setDetectedPatterns(updated);
  };

  const exportPatterns = () => {
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      patterns: learnedPatterns,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "patterns.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importPatterns = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.patterns && Array.isArray(data.patterns)) {
          const existingIds = new Set(learnedPatterns.map((p) => p.id));
          setLearnedPatterns([
            ...learnedPatterns,
            ...data.patterns.filter((p) => !existingIds.has(p.id)),
          ]);
        }
      } catch (err) {
        alert("Error parsing patterns file: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setRawLogData(e.target.result);
      setAnalysisComplete(false);
      setDetectedPatterns([]);
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Brain className="w-6 h-6 text-purple-400 flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-xl font-bold text-purple-200">
              Pattern Training
            </h2>
            <p className="text-purple-100 text-sm mt-1">
              Dump raw log data here to auto-detect hex patterns and message
              formats.
            </p>
          </div>
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex gap-2 items-center">
            <label className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg cursor-pointer transition-all">
              <Upload className="w-5 h-5" />
              Upload Log File
              <input
                type="file"
                accept=".log,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            {rawLogData && (
              <button
                onClick={() => {
                  setRawLogData("");
                  setDetectedPatterns([]);
                  setAnalysisComplete(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                <Trash2 className="w-5 h-5" />
                Clear
              </button>
            )}
          </div>
          <textarea
            value={rawLogData}
            onChange={(e) => {
              setRawLogData(e.target.value);
              setAnalysisComplete(false);
              setDetectedPatterns([]);
            }}
            placeholder="Paste raw log content here..."
            className="w-full h-64 bg-slate-900 text-slate-100 p-4 rounded-lg border border-slate-600 focus:border-purple-500 font-mono text-xs"
          />
          <button
            onClick={analyzeLogData}
            disabled={!rawLogData.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold py-3 rounded-lg disabled:cursor-not-allowed"
          >
            🔍 Analyze Log Data
          </button>
          {analysisComplete && detectedPatterns.length > 0 && (
            <div className="bg-slate-900/70 rounded-lg p-4 border border-purple-500">
              <h3 className="text-lg font-bold text-purple-300 mb-3 flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Detected Patterns ({detectedPatterns.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {detectedPatterns.map((pattern, idx) => (
                  <div
                    key={idx}
                    onClick={() => togglePattern(idx)}
                    className={`p-3 rounded-lg border cursor-pointer ${pattern.enabled ? "bg-purple-900/30 border-purple-500" : "bg-slate-800/50 border-slate-600 opacity-50"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={pattern.enabled}
                          onChange={() => togglePattern(idx)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-slate-200">
                          {pattern.name}
                        </span>
                      </div>
                      <span className="text-xs bg-slate-700 px-2 py-1 rounded">
                        {pattern.count}x
                      </span>
                    </div>
                    {pattern.examples?.[0] && (
                      <div className="mt-2 text-xs font-mono text-slate-400 truncate">
                        Ex: {pattern.examples[0]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addToLearnedPatterns}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
              >
                <Plus className="w-5 h-5" />
                Add to Learned
              </button>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div className="flex gap-2">
            <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer">
              <Upload className="w-5 h-5" />
              Import
              <input
                type="file"
                accept=".json"
                onChange={importPatterns}
                className="hidden"
              />
            </label>
            <button
              onClick={exportPatterns}
              disabled={learnedPatterns.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded-lg disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              Export patterns.json
            </button>
          </div>
          <div className="bg-slate-900/70 rounded-lg p-4 border border-green-500 min-h-[300px]">
            <h3 className="text-lg font-bold text-green-300 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Learned Patterns ({learnedPatterns.length})
            </h3>
            {learnedPatterns.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No patterns learned yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {learnedPatterns.map((p, idx) => (
                  <div
                    key={p.id}
                    className="bg-slate-800/70 rounded-lg p-3 border border-slate-600 flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium text-slate-200">{p.name}</div>
                      <div className="text-xs text-slate-400">
                        {p.elements.length} patterns •{" "}
                        {new Date(p.trainedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setLearnedPatterns(
                          learnedPatterns.filter((_, i) => i !== idx),
                        )
                      }
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== INTERPRETER TAB ====================
const InterpreterTab = ({ parsedLogMessages = [] }) => {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [selectedLogMsg, setSelectedLogMsg] = useState(null);
  const [logFilterStream, setLogFilterStream] = useState("all");
  const [extractedHexInfo, setExtractedHexInfo] = useState(null);
  const MESSAGES = secsMessages;

  class SECS2Parser {
    constructor(data) {
      this.data = typeof data === "string" ? this.hexToBytes(data) : data;
      this.pos = 0;
    }
    hexToBytes(hex) {
      hex = hex.replace(/\s+/g, "");
      const bytes = [];
      for (let i = 0; i < hex.length; i += 2)
        bytes.push(parseInt(hex.substr(i, 2), 16));
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
      for (let i = 0; i < lengthBytes; i++)
        length = (length << 8) | this.readByte();

      // List (format 0o00 = 0x00)
      if (formatCode === 0x00) {
        const items = [];
        for (let i = 0; i < length; i++) items.push(this.parseItem(depth + 1));
        return { type: "List", length, items, depth };
      }

      const data = this.readBytes(length);

      // Binary (format 0o10 = 0x08)
      if (formatCode === 0x08)
        return {
          type: "Binary",
          value: Array.from(data)
            .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
            .join(" "),
          depth,
        };

      // Boolean (format 0o20 = 0x10)
      if (formatCode === 0x10)
        return { type: "Boolean", value: data.map((b) => b !== 0), depth };

      // ASCII (format 0o24 = 0x14 or 0x40/0x41)
      if (formatCode === 0x14 || formatCode === 0x40)
        return { type: "ASCII", value: String.fromCharCode(...data), depth };

      // JIS-8 (format 0o30 = 0x18)
      if (formatCode === 0x18)
        return { type: "JIS-8", value: String.fromCharCode(...data), depth };

      // I8 - 8-byte signed integer (format 0o30 = 0x18) - handled above as JIS-8, actual I8 is 0x00 with different context

      // I1 - 1-byte signed integer (format 0x20)
      if (formatCode === 0x20) {
        const values = Array.from(data).map((b) => (b > 127 ? b - 256 : b));
        return { type: "I1", value: values, depth };
      }

      // I2 - 2-byte signed integer (format 0x24 or 0x28)
      if (formatCode === 0x24 || formatCode === 0x28) {
        const values = [];
        for (let i = 0; i < data.length; i += 2) {
          let val = (data[i] << 8) | data[i + 1];
          if (val > 32767) val -= 65536;
          values.push(val);
        }
        return { type: "I2", value: values, depth };
      }

      // I4 - 4-byte signed integer (format 0x30 or 0xA4)
      if (formatCode === 0x30 || formatCode === 0xa4) {
        const values = [];
        for (let i = 0; i < data.length; i += 4) {
          let val =
            (data[i] << 24) |
            (data[i + 1] << 16) |
            (data[i + 2] << 8) |
            data[i + 3];
          values.push(val | 0); // signed 32-bit
        }
        return { type: "I4", value: values, depth };
      }

      // I8 - 8-byte signed integer (format 0x00 or 0x60)
      if (formatCode === 0x60) {
        const values = [];
        for (let i = 0; i < data.length; i += 8) {
          // JavaScript doesn't handle 64-bit well, show as hex
          const hex = Array.from(data.slice(i, i + 8))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
          values.push(hex);
        }
        return { type: "I8", value: values, depth };
      }

      // F4 - 4-byte float (format 0x80 or 0x90)
      if (formatCode === 0x80 || formatCode === 0x90) {
        const values = [];
        const buf = new ArrayBuffer(4);
        const view = new DataView(buf);
        for (let i = 0; i < data.length; i += 4) {
          view.setUint8(0, data[i]);
          view.setUint8(1, data[i + 1]);
          view.setUint8(2, data[i + 2]);
          view.setUint8(3, data[i + 3]);
          values.push(view.getFloat32(0, false));
        }
        return { type: "F4", value: values, depth };
      }

      // F8 - 8-byte float (format 0x80 with length or 0x88)
      if (formatCode === 0x88) {
        const values = [];
        const buf = new ArrayBuffer(8);
        const view = new DataView(buf);
        for (let i = 0; i < data.length; i += 8) {
          for (let j = 0; j < 8; j++) view.setUint8(j, data[i + j]);
          values.push(view.getFloat64(0, false));
        }
        return { type: "F8", value: values, depth };
      }

      // U1 - 1-byte unsigned integer (format 0xA0 or 0o51 = 0x29)
      if (formatCode === 0xa0 || formatCode === 0x28)
        return { type: "U1", value: Array.from(data), depth };

      // U2 - 2-byte unsigned integer (format 0xA8)
      if (formatCode === 0xa8) {
        const values = [];
        for (let i = 0; i < data.length; i += 2) {
          values.push((data[i] << 8) | data[i + 1]);
        }
        return { type: "U2", value: values, depth };
      }

      // U4 - 4-byte unsigned integer (format 0xB0)
      if (formatCode === 0xb0) {
        const values = [];
        for (let i = 0; i < data.length; i += 4) {
          values.push(
            ((data[i] << 24) |
              (data[i + 1] << 16) |
              (data[i + 2] << 8) |
              data[i + 3]) >>>
              0,
          );
        }
        return { type: "U4", value: values, depth };
      }

      // U8 - 8-byte unsigned integer (format 0xA0 with length 8)
      if (formatCode === 0xa0 && length === 8) {
        const hex = Array.from(data)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        return { type: "U8", value: [hex], depth };
      }

      // Fallback for unknown formats - show format code for debugging
      return {
        type: `Unknown(0x${formatCode.toString(16).toUpperCase()})`,
        value: Array.from(data),
        depth,
      };
    }
    parse() {
      return this.parseItem();
    }
  }

  const formatOutput = (item, indent = 0) => {
    const spaces = "  ".repeat(indent);
    if (item.type === "List") {
      let r = `${spaces}<List[${item.length}]>\n`;
      item.items.forEach((s, i) => {
        r += `${spaces}  [${i}] ${formatOutput(s, indent + 1)}`;
      });
      return r;
    }
    if (item.type === "ASCII") return `<ASCII> "${item.value}"\n`;
    if (item.type === "Boolean")
      return `<Boolean> [${item.value.map((v) => (v ? "T" : "F")).join(", ")}]\n`;
    if (item.type === "Binary") return `<Binary> ${item.value}\n`;
    if (Array.isArray(item.value))
      return item.value.length === 1
        ? `<${item.type}> ${item.value[0]}\n`
        : `<${item.type}>[${item.value.length}] [${item.value.join(", ")}]\n`;
    return `<${item.type}> ${item.value}\n`;
  };

  const handleDecode = () => {
    try {
      setError("");
      const parser = new SECS2Parser(input);
      const result = parser.parse();
      setOutput(
        "╔════════════════════════════════════════════════╗\n║         DECODED SECS-II MESSAGE DATA           ║\n╚════════════════════════════════════════════════╝\n\n" +
          formatOutput(result),
      );
    } catch (e) {
      setError(e.message);
      setOutput("");
    }
  };

  const loadMessage = (key) => {
    setInput(MESSAGES[key].hex);
    setSelectedMsg(key);
    setSelectedLogMsg(null);
    setExtractedHexInfo(null);
    setOutput("");
    setError("");
  };

  const loadLogMessage = (msg, idx) => {
    setSelectedLogMsg(idx);
    setSelectedMsg(null);
    const hexInfo = extractHexFromLine(msg.rawLine, learnedPatterns);
    if (hexInfo) {
      setInput(hexInfo.hex);
      setExtractedHexInfo(hexInfo);
      setError("");
    } else {
      setInput("");
      setExtractedHexInfo(null);
      setError("Could not extract hex. Train patterns in Training tab.");
    }
    setOutput("");
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
    const s = key.match(/^S\d+/)?.[0];
    if (s && streams[s]) streams[s].msgs.push({ key, ...msg });
  });
  const filteredLogMessages = parsedLogMessages.filter(
    (m) =>
      logFilterStream === "all" || m.messageType.startsWith(logFilterStream),
  );

  return (
    <div className="grid lg:grid-cols-4 gap-6 p-6">
      <div className="lg:col-span-1 space-y-4 max-h-[700px] overflow-y-auto pr-2">
        {parsedLogMessages.length > 0 && (
          <div className="bg-slate-900/70 rounded-lg p-4 border border-green-500">
            <h2 className="text-lg font-bold text-green-300 mb-3 flex items-center gap-2">
              <List className="w-5 h-5" />
              Loaded Log ({parsedLogMessages.length})
            </h2>
            <select
              value={logFilterStream}
              onChange={(e) => setLogFilterStream(e.target.value)}
              className="w-full mb-3 bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-600 text-xs"
            >
              <option value="all">All Streams</option>
              <option value="S1">S1</option>
              <option value="S2">S2</option>
              <option value="S5">S5</option>
              <option value="S6">S6</option>
              <option value="S7">S7</option>
            </select>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {filteredLogMessages.slice(0, 50).map((msg, idx) => (
                <button
                  key={idx}
                  onClick={() => loadLogMessage(msg, idx)}
                  className={`w-full text-left px-2 py-2 rounded text-xs ${selectedLogMsg === idx ? "bg-green-600 text-white" : "bg-slate-800/50 text-slate-300 hover:bg-slate-700"}`}
                >
                  <div className="flex items-center gap-2">
                    <span>{msg.direction === "received" ? "⬇️" : "⬆️"}</span>
                    <span className="font-mono font-bold">
                      {msg.messageType}
                    </span>
                  </div>
                  <div className="text-xs opacity-60 mt-1">
                    {msg.timestamp} • Txn:{msg.transaction}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        {parsedLogMessages.length === 0 && (
          <div className="bg-slate-900/70 rounded-lg p-4 border border-yellow-500/50">
            <div className="text-yellow-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              No Log Loaded
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Load a log file in the Log Parser tab first.
            </p>
          </div>
        )}
        <div className="bg-slate-900/70 rounded-lg p-4 border border-blue-500">
          <h2 className="text-lg font-bold text-blue-300 mb-3 flex items-center gap-2">
            <Book className="w-5 h-5" />
            Message Library
          </h2>
          {Object.entries(streams).map(([sk, sv]) => (
            <div key={sk} className="mb-4">
              <div className="bg-blue-900/30 px-2 py-1 rounded text-xs font-bold text-blue-300 mb-2">
                {sk}: {sv.name}
              </div>
              <div className="space-y-1">
                {sv.msgs.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => loadMessage(m.key)}
                    className={`w-full text-left px-2 py-2 rounded text-xs ${selectedMsg === m.key ? "bg-blue-600 text-white" : "bg-slate-800/50 text-slate-300 hover:bg-slate-700"}`}
                  >
                    <div className="font-mono font-bold">{m.key}</div>
                    <div className="text-xs opacity-80 truncate">{m.name}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="lg:col-span-3 space-y-4">
        {selectedLogMsg !== null && parsedLogMessages[selectedLogMsg] && (
          <div className="bg-gradient-to-r from-green-900/40 to-blue-900/40 border border-green-500 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold text-green-200">
                {parsedLogMessages[selectedLogMsg].messageType}
              </h3>
              <span
                className={`text-sm px-2 py-0.5 rounded ${parsedLogMessages[selectedLogMsg].direction === "received" ? "bg-green-600" : "bg-blue-600"} text-white`}
              >
                {parsedLogMessages[selectedLogMsg].direction === "received"
                  ? "⬇️ Received"
                  : "⬆️ Sent"}
              </span>
            </div>
            <div className="bg-slate-900/70 rounded p-3 border border-slate-700 mb-2">
              <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-all">
                {parsedLogMessages[selectedLogMsg].rawLine}
              </pre>
            </div>
            {extractedHexInfo && (
              <div className="text-xs text-green-400">
                ✓ Hex extracted via: {extractedHexInfo.type}
              </div>
            )}
          </div>
        )}
        {selectedMsg && MESSAGES[selectedMsg] && (
          <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-6 h-6 text-blue-400" />
              <h3 className="text-xl font-bold text-blue-200">{selectedMsg}</h3>
              <span className="text-sm text-blue-300">
                {MESSAGES[selectedMsg].name}
              </span>
            </div>
            <p className="text-blue-100 text-sm mb-3">
              {MESSAGES[selectedMsg].desc}
            </p>
            <div className="bg-slate-900/70 rounded p-3 border border-slate-700">
              <pre className="text-xs text-green-300 font-mono whitespace-pre-wrap">
                {MESSAGES[selectedMsg].struct}
              </pre>
            </div>
          </div>
        )}
        <div>
          <label className="block text-slate-300 font-medium mb-2 text-sm">
            SECS-II Hex Data Input
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Select a message or paste hex data..."
            className="w-full h-32 bg-slate-900 text-slate-100 p-4 rounded-lg border border-slate-600 focus:border-blue-500 font-mono text-sm"
          />
        </div>
        <button
          onClick={handleDecode}
          disabled={!input.trim()}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold py-3 rounded-lg disabled:cursor-not-allowed"
        >
          🔍 Decode SECS-II Message
        </button>
        {output && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-slate-300 font-medium text-sm">
                Decoded Output
              </label>
              <button
                onClick={() => navigator.clipboard.writeText(output)}
                className="flex items-center gap-1 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
            </div>
            <div className="bg-slate-900 text-green-400 p-4 rounded-lg border border-slate-600 font-mono text-sm whitespace-pre min-h-[200px]">
              {output}
            </div>
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-900/30 border border-red-600 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-red-300 font-medium">Error</p>
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          </div>
        )}
        {output && !error && (
          <div className="p-4 bg-green-900/30 border border-green-600 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-green-300 text-sm">✓ Decoded successfully!</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== PARSER TAB ====================
const ParserTab = ({ parserState, setParserState }) => {
  const abortControllerRef = React.useRef(null);
  const MESSAGE_INFO = messages.MESSAGE_INFO;
  const {
    logContent,
    parsedMessages,
    filterStream,
    searchTerm,
    isProcessing,
    progress,
    fileSize,
    displayLimit,
  } = parserState;
  const setLogContent = (v) => setParserState((p) => ({ ...p, logContent: v }));
  const setParsedMessages = (v) =>
    setParserState((p) => ({ ...p, parsedMessages: v }));
  const setFilterStream = (v) =>
    setParserState((p) => ({ ...p, filterStream: v }));
  const setSearchTerm = (v) => setParserState((p) => ({ ...p, searchTerm: v }));
  const setIsProcessing = (v) =>
    setParserState((p) => ({ ...p, isProcessing: v }));
  const setProgress = (v) => setParserState((p) => ({ ...p, progress: v }));
  const setFileSize = (v) => setParserState((p) => ({ ...p, fileSize: v }));
  const setDisplayLimit = (v) =>
    setParserState((p) => ({ ...p, displayLimit: v }));

  const parseLogFile = (content) => {
    const lines = content.split("\n");
    const msgs = [];
    lines.forEach((line, index) => {
      const receivedLinkMatch = line.match(
        /<- Link \([^)]+\): (\d+) - Message Received: DataMessage - S(\d+)F(\d+)/,
      );
      if (receivedLinkMatch) {
        msgs.push({
          timestamp: line.match(/^(\d{1,2}:\d{2}:\d{2}\.\d{3})/)?.[1] || "",
          direction: "received",
          messageType: `S${receivedLinkMatch[2]}F${receivedLinkMatch[3]}`,
          transaction: receivedLinkMatch[1],
          rawLine: line,
          lineNumber: index + 1,
        });
      }
      const sentLinkMatch = line.match(
        /-> Link \([^)]+\): (\d+) - Message Enqueued: DataMessage - S(\d+)F(\d+)/,
      );
      if (sentLinkMatch) {
        msgs.push({
          timestamp: line.match(/^(\d{1,2}:\d{2}:\d{2}\.\d{3})/)?.[1] || "",
          direction: "sent",
          messageType: `S${sentLinkMatch[2]}F${sentLinkMatch[3]}`,
          transaction: sentLinkMatch[1],
          rawLine: line,
          lineNumber: index + 1,
        });
      }
      const receivedSecsMatch = line.match(
        /<- Received SECS message: (S\d+F\d+) - Transaction: (\d+)/,
      );
      if (receivedSecsMatch) {
        msgs.push({
          timestamp: line.match(/^(\d{1,2}:\d{2}:\d{2}\.\d{3})/)?.[1] || "",
          direction: "received",
          messageType: receivedSecsMatch[1],
          transaction: receivedSecsMatch[2],
          rawLine: line,
          lineNumber: index + 1,
        });
      }
      const sentSecsMatch = line.match(
        /-> Send SECS message: (S\d+F\d+) - Transaction: (\d+)/,
      );
      if (sentSecsMatch) {
        let alarmId = null;
        if (sentSecsMatch[1] === "S5F1") {
          const m = line.match(/<U4 (\d+)>/);
          if (m) alarmId = m[1];
        }
        msgs.push({
          timestamp: line.match(/^(\d{1,2}:\d{2}:\d{2}\.\d{3})/)?.[1] || "",
          direction: "sent",
          messageType: sentSecsMatch[1],
          transaction: sentSecsMatch[2],
          alarmId,
          rawLine: line,
          lineNumber: index + 1,
        });
      }
    });
    return msgs;
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
      const CHUNK_SIZE = 1024 * 1024;
      const msgs = [];
      let processedBytes = 0;
      let leftover = "";
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      for (let i = 0; i < totalChunks; i++) {
        if (abortControllerRef.current?.signal.aborted) break;
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const text = await file.slice(start, end).text();
        const lines = (leftover + text).split("\n");
        leftover = lines.pop() || "";
        lines.forEach((line, lineIdx) => {
          const receivedLinkMatch = line.match(
            /<- Link \([^)]+\): (\d+) - Message Received: DataMessage - S(\d+)F(\d+)/,
          );
          if (receivedLinkMatch) {
            msgs.push({
              timestamp: line.match(/^(\d{1,2}:\d{2}:\d{2}\.\d{3})/)?.[1] || "",
              direction: "received",
              messageType: `S${receivedLinkMatch[2]}F${receivedLinkMatch[3]}`,
              transaction: receivedLinkMatch[1],
              rawLine: line,
              lineNumber: Math.floor(start / 100) + lineIdx + 1,
            });
          }
          const sentLinkMatch = line.match(
            /-> Link \([^)]+\): (\d+) - Message Enqueued: DataMessage - S(\d+)F(\d+)/,
          );
          if (sentLinkMatch) {
            msgs.push({
              timestamp: line.match(/^(\d{1,2}:\d{2}:\d{2}\.\d{3})/)?.[1] || "",
              direction: "sent",
              messageType: `S${sentLinkMatch[2]}F${sentLinkMatch[3]}`,
              transaction: sentLinkMatch[1],
              rawLine: line,
              lineNumber: Math.floor(start / 100) + lineIdx + 1,
            });
          }
          const receivedSecsMatch = line.match(
            /<- Received SECS message: (S\d+F\d+) - Transaction: (\d+)/,
          );
          if (receivedSecsMatch) {
            msgs.push({
              timestamp: line.match(/^(\d{1,2}:\d{2}:\d{2}\.\d{3})/)?.[1] || "",
              direction: "received",
              messageType: receivedSecsMatch[1],
              transaction: receivedSecsMatch[2],
              rawLine: line,
              lineNumber: Math.floor(start / 100) + lineIdx + 1,
            });
          }
          const sentSecsMatch = line.match(
            /-> Send SECS message: (S\d+F\d+) - Transaction: (\d+)/,
          );
          if (sentSecsMatch) {
            let alarmId = null;
            if (sentSecsMatch[1] === "S5F1") {
              const m = line.match(/<U4 (\d+)>/);
              if (m) alarmId = m[1];
            }
            msgs.push({
              timestamp: line.match(/^(\d{1,2}:\d{2}:\d{2}\.\d{3})/)?.[1] || "",
              direction: "sent",
              messageType: sentSecsMatch[1],
              transaction: sentSecsMatch[2],
              alarmId,
              rawLine: line,
              lineNumber: Math.floor(start / 100) + lineIdx + 1,
            });
          }
        });
        processedBytes += end - start;
        setProgress((processedBytes / file.size) * 100);
        if (i % 10 === 0 || i === totalChunks - 1) setParsedMessages([...msgs]);
      }
      setParsedMessages(msgs);
      setProgress(100);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextInput = (e) => {
    const c = e.target.value;
    setLogContent(c);
    setParsedMessages(c.trim() ? parseLogFile(c) : []);
  };
  const filteredMessages = parsedMessages.filter(
    (m) =>
      (filterStream === "" ||
        filterStream === "all" ||
        m.messageType.startsWith(filterStream)) &&
      (!searchTerm ||
        m.messageType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.transaction?.includes(searchTerm) ||
        m.rawLine?.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const exportToCSV = () => {
    const escapeCSV = (f) => {
      if (f == null) return "";
      const s = String(f);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const rows = filteredMessages.map((m) => {
      const a = m.alarmId ? alarms[m.alarmId] : null;
      return [
        m.timestamp,
        m.direction,
        m.messageType,
        m.transaction || "",
        m.alarmId || "",
        a?.description || "",
        a?.alarmCode || "",
        m.lineNumber,
        m.rawLine || "",
      ].map(escapeCSV);
    });
    const csv = [
      [
        "Timestamp",
        "Direction",
        "Message Type",
        "Transaction",
        "Alarm ID",
        "Alarm Description",
        "Alarm Severity",
        "Line Number",
        "Raw Log Line",
      ],
      ...rows,
    ]
      .map((r) => r.join(","))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "secs-messages.csv";
    a.click();
  };

  const exportToHTML = () => {
    const esc = (s) =>
      s == null
        ? ""
        : String(s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    const rows = filteredMessages
      .map((m, i) => {
        const a = m.alarmId ? alarms[m.alarmId] : null;
        return `<tr style="background:${i % 2 === 0 ? "#e2e8f0" : "#dbeafe"}"><td style="padding:8px;border-left:4px solid ${m.direction === "received" ? "#22c55e" : "#3b82f6"}">${esc(m.timestamp)}</td><td>${esc(m.direction)}</td><td><b>${esc(m.messageType)}</b></td><td>${esc(m.transaction)}</td><td>${esc(m.alarmId)}</td><td>${esc(a?.description)}</td><td>${esc(a?.alarmCode)}</td><td>${m.lineNumber}</td><td style="font-family:monospace;font-size:11px">${esc(m.rawLine)}</td></tr>`;
      })
      .join("");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>SECS Export</title><style>body{font-family:Arial;margin:20px}table{border-collapse:collapse;width:100%}th{background:#1e293b;color:#fff;padding:12px 8px;text-align:left}td{border-bottom:1px solid #cbd5e1}tr:hover{background:#fef3c7!important}</style></head><body><h1>SECS/GEM Messages</h1><p>Total: ${filteredMessages.length}</p><table><thead><tr><th>Timestamp</th><th>Direction</th><th>Message</th><th>Txn</th><th>Alarm ID</th><th>Description</th><th>Severity</th><th>Line</th><th>Raw</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    a.download = "secs-messages.html";
    a.click();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-4">
        <div className="flex gap-4 items-center flex-wrap">
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer">
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
              onClick={() => {
                abortControllerRef.current?.abort();
                setIsProcessing(false);
                setProgress(0);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              <AlertCircle className="w-5 h-5" />
              Cancel
            </button>
          )}
          {parsedMessages.length > 0 && !isProcessing && (
            <>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
              >
                <Download className="w-5 h-5" />
                CSV
              </button>
              <button
                onClick={exportToHTML}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                <Download className="w-5 h-5" />
                HTML
              </button>
              <button
                onClick={() =>
                  setParserState({
                    logContent: "",
                    parsedMessages: [],
                    filterStream: "all",
                    searchTerm: "",
                    isProcessing: false,
                    progress: 0,
                    fileSize: 0,
                    displayLimit: 100,
                  })
                }
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                <AlertCircle className="w-5 h-5" />
                Clear
              </button>
            </>
          )}
          <div className="flex-1" />
          <div className="text-slate-300 text-sm">
            {fileSize > 0 &&
              `File: ${(fileSize / 1024 / 1024).toFixed(2)} MB • `}
            {parsedMessages.length > 0 && `${parsedMessages.length} messages`}
          </div>
        </div>
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-300">
              <span>Processing...</span>
              <span>{progress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-4">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        <textarea
          value={logContent}
          onChange={handleTextInput}
          placeholder="Or paste log content here..."
          className="w-full h-32 bg-slate-900 text-slate-100 p-4 rounded-lg border border-slate-600 font-mono text-xs"
          disabled={isProcessing}
        />
      </div>
      {parsedMessages.length > 0 && (
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={filterStream}
              onChange={(e) => setFilterStream(e.target.value)}
              className="bg-slate-900 text-slate-300 px-3 py-2 rounded-lg border border-slate-600 text-sm"
            >
              <option value="">Select Stream</option>
              <option value="all">All</option>
              <option value="S1">S1</option>
              <option value="S2">S2</option>
              <option value="S3">S3</option>
              <option value="S4">S4</option>
              <option value="S5">S5</option>
              <option value="S6">S6</option>
              <option value="S7">S7</option>
              <option value="S9">S9</option>
              <option value="S10">S10</option>
              <option value="S14">S14</option>
              <option value="S15">S15</option>
              <option value="S16">S16</option>
              <option value="S17">S17</option>
            </select>
          </div>
          <div className="flex-1 flex items-center gap-2">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-slate-900 text-slate-300 px-3 py-2 rounded-lg border border-slate-600 text-sm"
            />
          </div>
        </div>
      )}
      {filteredMessages.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Messages ({filteredMessages.length})
          </h2>
          <div className="space-y-0 max-h-[500px] overflow-y-auto">
            {filteredMessages.slice(0, displayLimit).map((msg, idx) => {
              const msgInfo = MESSAGE_INFO[msg.messageType] || {};
              const alarm = msg.alarmId ? alarms[msg.alarmId] : null;
              return (
                <div
                  key={idx}
                  className={`${idx % 2 === 0 ? "bg-slate-800/40" : "bg-blue-900/20"} ${msg.direction === "received" ? "border-green-500" : "border-blue-500"} border-l-4 p-3`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl">
                      {msg.direction === "received" ? "⬇️" : "⬆️"}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono font-bold ${msg.direction === "received" ? "text-green-300" : "text-blue-300"}`}
                        >
                          {msg.messageType}
                        </span>
                        <span className="text-xs text-slate-400">
                          {msgInfo.name}
                        </span>
                        {alarm && (
                          <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded border border-red-500/50">
                            🚨 {msg.alarmId}
                          </span>
                        )}
                      </div>
                      {alarm && (
                        <div className="text-xs mt-2 bg-red-900/20 border border-red-500/30 rounded p-2">
                          <div className="text-red-300">
                            {alarm.description}
                          </div>
                          <div className="text-slate-400">
                            Subsystem: {alarm.subsystem} • Severity:{" "}
                            {alarm.alarmCode}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {msg.timestamp}
                    </div>
                    <div className="text-xs font-mono bg-slate-800 px-2 py-1 rounded">
                      Txn:{msg.transaction}
                    </div>
                  </div>
                  {msg.rawLine && (
                    <div className="text-xs font-mono text-slate-300 bg-slate-900 p-2 rounded overflow-x-auto whitespace-nowrap">
                      {msg.rawLine}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {filteredMessages.length > displayLimit && (
            <button
              onClick={() => setDisplayLimit(displayLimit + 100)}
              className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg"
            >
              Show More ({filteredMessages.length - displayLimit} remaining)
            </button>
          )}
        </div>
      )}
      {parsedMessages.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Upload className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Upload a log file or paste content to begin</p>
        </div>
      )}
    </div>
  );
};

// ==================== FULL ARCHITECTURE TAB ====================

const archLayers = [
  {
    id: "host",
    label: "HOST / MES LAYER",
    borderColor: "#38bdf8",
    description: "ISO 9000 High-Volume Manufacturing Facility (HSMS TCP/IP)",
    nodes: [
      {
        id: "host_mes",
        label: "MES / Host System",
        type: "external",
        note: "External — Sends/Receives SECS-II messages over TCP/IP. No interface defined here — this is the remote system.",
      },
      {
        id: "host_hsms",
        label: "HSMS Protocol Stack",
        type: "proto",
        note: "TCP/IP · Port 5000 · Active or Passive mode · E37 compliant",
      },
    ],
  },
  {
    id: "transport",
    label: "TRANSPORT / COMMUNICATION LAYER",
    borderColor: "#2dd4bf",
    description: "SEMI E37 HSMS — Connection Management, Session, Framing",
    nodes: [
      {
        id: "IHsmsConnection",
        label: "«interface»\nIHsmsConnection",
        type: "interface",
        note: "Task ConnectAsync(string ip, int port, CancellationToken ct)\nTask DisconnectAsync(CancellationToken ct)\nbool IsConnected { get; }\nTask SendAsync(HsmsMessage msg, CancellationToken ct)\nevent EventHandler<HsmsMessage> MessageReceived\nevent EventHandler<ConnectionStateChangedArgs> ConnectionStateChanged",
      },
      {
        id: "HsmsConnection",
        label: "HsmsConnection",
        type: "class",
        note: "Implements IHsmsConnection · TcpClient + NetworkStream · Active/Passive mode · T3/T5/T6/T7 timers · ReceiveLoopAsync()",
      },
      {
        id: "HsmsSessionManager",
        label: "HsmsSessionManager",
        type: "class",
        note: "Select/Deselect/Separate procedures · Heartbeat (Linktest) · Auto-reconnect policy · Depends on IHsmsConnection",
      },
      {
        id: "HsmsMessageFramer",
        label: "HsmsMessageFramer",
        type: "class",
        note: "Encode/Decode 10-byte HSMS header · 4-byte length prefix · SType / PType fields · SystemBytes generation",
      },
      {
        id: "IConnectionObserver",
        label: "«interface»\nIConnectionObserver",
        type: "interface",
        note: "void OnConnected()\nvoid OnDisconnected()\nvoid OnMessageReceived(HsmsMessage msg)\n— Observer contract subscribed by GemKernel and MessageRouter",
      },
    ],
  },
  {
    id: "secsii",
    label: "SECS-II ENCODE / DECODE LAYER",
    borderColor: "#4ade80",
    description: "SEMI E5 — Message Encoding, Item Trees, Data Types",
    nodes: [
      {
        id: "ISecsMessage",
        label: "«interface»\nISecsMessage",
        type: "interface",
        note: "byte Stream { get; }\nbyte Function { get; }\nbool ReplyBit { get; }\nuint SystemBytes { get; }\nISecsItem Root { get; }\nbyte[] Encode()",
      },
      {
        id: "SecsMessage",
        label: "SecsMessage",
        type: "class",
        note: "Implements ISecsMessage · S/F fields · Block structure · Static factory: SecsMessage.Create(stream, func, root)",
      },
      {
        id: "ISecsItem",
        label: "«interface»\nISecsItem",
        type: "interface",
        note: "SecsItemType ItemType { get; }\nobject Value { get; }\nList<ISecsItem> Children { get; }\nbyte[] Encode()\nstatic ISecsItem Decode(byte[] data)",
      },
      {
        id: "SecsItemFactory",
        label: "SecsItemFactory",
        type: "factory",
        note: "Factory Pattern\nISecsItem Create(SecsItemType type, object value)\nISecsItem CreateList(IEnumerable<ISecsItem> items)\n— Creates L, A, U1/2/4/8, I1/2/4/8, F4/F8, B, BOOLEAN, JIS8",
      },
      {
        id: "SecsEncoder",
        label: "SecsEncoder",
        type: "class",
        note: "byte[] Encode(ISecsMessage msg)\n— Serializes ISecsItem tree to big-endian byte[] per E5 spec",
      },
      {
        id: "SecsDecoder",
        label: "SecsDecoder",
        type: "class",
        note: "ISecsMessage Decode(byte[] data)\n— Deserializes raw bytes back to ISecsMessage + ISecsItem tree",
      },
      {
        id: "MessageRouter",
        label: "MessageRouter",
        type: "class",
        note: "Observer Pattern\nvoid Register(byte stream, byte func, IMessageHandler handler)\nvoid Route(ISecsMessage msg)\n— Dispatches incoming SxFy to registered handlers",
      },
    ],
  },
  {
    id: "gem",
    label: "GEM CORE LAYER (E30)",
    borderColor: "#c084fc",
    description:
      "SEMI E30 — State Machines, Variables, Events, Alarms, Remote Commands",
    nodes: [
      {
        id: "IGemKernel",
        label: "«interface»\nIGemKernel",
        type: "interface",
        note: "void Start()\nvoid Stop()\nvoid ProcessIncomingMessage(ISecsMessage msg)\nGemState GetCommunicationState()\nGemState GetControlState()\nTask SendAsync(ISecsMessage msg)",
      },
      {
        id: "GemKernel",
        label: "GemKernel",
        type: "class",
        note: "Facade Pattern — Implements IGemKernel · Orchestrates all subsystems · Single public entry point for machine software",
      },
      {
        id: "ICommunicationStateMachine",
        label: "«interface»\nICommunicationStateMachine",
        type: "interface",
        note: "string CurrentStateName { get; }\nvoid Connect()\nvoid Disconnect()\nvoid OnSelectReq()\nvoid OnSeparateReq()\nevent EventHandler<string> StateChanged",
      },
      {
        id: "CommunicationStateMachine",
        label: "CommunicationStateMachine",
        type: "state",
        note: "Implements ICommunicationStateMachine · State Pattern · E30 §8.3 · States: DisabledState → NotCommunicatingState → CommunicatingState",
      },
      {
        id: "IControlStateMachine",
        label: "«interface»\nIControlStateMachine",
        type: "interface",
        note: "string CurrentStateName { get; }\nvoid GoLocal()\nvoid GoRemote()\nvoid GoOffline()\nvoid GoOnline()\nevent EventHandler<string> StateChanged",
      },
      {
        id: "ControlStateMachine",
        label: "ControlStateMachine",
        type: "state",
        note: "Implements IControlStateMachine · State Pattern · E30 §8.4 · States: EquipmentOffline → AttemptOnline → Local/Remote",
      },
      {
        id: "ISpoolingManager",
        label: "«interface»\nISpoolingManager",
        type: "interface",
        note: "void Spool(ISecsMessage msg)\nIEnumerable<ISecsMessage> Unspool()\nvoid Purge()\nint SpoolCount { get; }\nbool IsSpoolingActive { get; }",
      },
      {
        id: "SpoolingManager",
        label: "SpoolingManager",
        type: "class",
        note: "Implements ISpoolingManager · E30 §9 · Buffers outbound messages during comm loss · Replays on reconnect",
      },
    ],
  },
  {
    id: "gem300",
    label: "GEM300 LAYER (E40 · E87 · E90 · E94 · E116)",
    borderColor: "#fb923c",
    description:
      "300mm Extensions — Process Jobs, Carrier, Substrate, Control Jobs, EPT",
    nodes: [
      {
        id: "IProcessJobManager",
        label: "«interface»\nIProcessJobManager",
        type: "interface",
        note: "AckCode CreateJob(PRJobSpec spec)\nAckCode StartJob(string jobId)\nAckCode PauseJob(string jobId)\nAckCode ResumeJob(string jobId)\nAckCode AbortJob(string jobId, AbortType type)\nPRJobState GetJobState(string jobId)",
      },
      {
        id: "ProcessJobManager",
        label: "ProcessJobManager",
        type: "class",
        note: "Implements IProcessJobManager · E40 · State machine per job · S16F11 PRJobCreate · S16F19 Dequeue · S16F25 Abort",
      },
      {
        id: "ICarrierManager",
        label: "«interface»\nICarrierManager",
        type: "interface",
        note: "AckCode LoadCarrier(CarrierSpec spec)\nAckCode UnloadCarrier(string carrierId)\nAckCode BindCarrier(string carrierId, string portId)\nAckCode CancelBind(string portId)\nCarrierState GetCarrierState(string carrierId)",
      },
      {
        id: "CarrierManager",
        label: "CarrierManager",
        type: "class",
        note: "Implements ICarrierManager · E87 · CAS state machine · S3F17 CarrierAction · FOUP/FOSB tracking per load port",
      },
      {
        id: "ISubstrateManager",
        label: "«interface»\nISubstrateManager",
        type: "interface",
        note: "void TrackSubstrate(SubstrateSpec spec)\nvoid UpdateLocation(string substrateId, string locationId)\nSubstrateState GetState(string substrateId)\nIEnumerable<SubstrateRecord> GetAll()",
      },
      {
        id: "SubstrateManager",
        label: "SubstrateManager",
        type: "class",
        note: "Implements ISubstrateManager · E90 · Tracks substrate through Source/Process/Destination states · S14F1 GetAttr",
      },
      {
        id: "IControlJobManager",
        label: "«interface»\nIControlJobManager",
        type: "interface",
        note: "AckCode CreateControlJob(ControlJobSpec spec)\nAckCode StartControlJob(string cjId)\nAckCode AbortControlJob(string cjId)\nAckCode PauseControlJob(string cjId)\nControlJobState GetState(string cjId)",
      },
      {
        id: "ControlJobManager",
        label: "ControlJobManager",
        type: "class",
        note: "Implements IControlJobManager · E94 · Links ProcessJob to Carrier · S17F1 CreateControlJob · Queued/Executing/Complete",
      },
      {
        id: "IEptManager",
        label: "«interface»\nIEptManager",
        type: "interface",
        note: "void UpdateEPTState(EptState state)\nEptMetrics GetMetrics()\nvoid RecordStateEntry(EptState state, DateTime timestamp)\nTimeSpan GetTimeInState(EptState state)",
      },
      {
        id: "EptManager",
        label: "EptManager",
        type: "class",
        note: "Implements IEptManager · E116 · Tracks BUSY/IDLE/BLOCKED/ENGINEERING states · Reports availability metrics",
      },
    ],
  },
  {
    id: "ecvreports",
    label:
      "DATA COLLECTION LAYER — ECVs · SVs · DVs · Reports · Collection Events",
    borderColor: "#4ade80",
    description:
      "E30 §7 — Variables, Report Definitions, Collection Events, CEID→RPTID→VID Linkage",
    nodes: [
      {
        id: "IVariableRepository",
        label: "«interface»\nIVariableRepository",
        type: "interface",
        note: "SecsItem GetSV(uint vid)\nSecsItem GetDV(uint vid)\nSecsItem GetECV(uint vid)\nvoid SetECV(uint vid, SecsItem value)\nList<VariableDefinition> GetNamelist(VariableType type)",
      },
      {
        id: "VariableRepository",
        label: "VariableRepository",
        type: "class",
        note: "Implements IVariableRepository · Repository Pattern · Stores ECVs (S2F13/15), SVs (S6F1), DVs (S6F19) keyed by VID",
      },
      {
        id: "IReportManager",
        label: "«interface»\nIReportManager",
        type: "interface",
        note: "AckCode DefineReport(uint rptId, uint[] vids)\nAckCode DeleteReport(uint rptId)\nAckCode LinkReport(uint ceid, uint[] rptIds)\nAckCode UnlinkReport(uint ceid, uint[] rptIds)\nReportDefinition GetReport(uint rptId)",
      },
      {
        id: "ReportManager",
        label: "ReportManager",
        type: "class",
        note: "Implements IReportManager · S2F33 Define · S2F35 Link CEID→RPTID · S2F37 Enable/Disable CE · Persists to ConfigRepository",
      },
      {
        id: "ICollectionEventManager",
        label: "«interface»\nICollectionEventManager",
        type: "interface",
        note: "void RegisterCE(CollectionEventDefinition ce)\nvoid FireEvent(uint ceid)\nAckCode EnableCE(uint[] ceids)\nAckCode DisableCE(uint[] ceids)\nList<ReportDefinition> GetLinkedReports(uint ceid)\nbool IsEnabled(uint ceid)",
      },
      {
        id: "CollectionEventManager",
        label: "CollectionEventManager",
        type: "class",
        note: "Implements ICollectionEventManager · Observer Pattern · Fires S6F11 on event trigger · Fetches VID values and builds report payload",
      },
      {
        id: "ReportDefinition",
        label: "ReportDefinition",
        type: "model",
        note: "Data Model\nuint RPTID\nuint[] VIDs\nstring Name\n— Immutable after definition · Serializable to config",
      },
      {
        id: "CollectionEventDefinition",
        label: "CollectionEventDefinition",
        type: "model",
        note: "Data Model\nuint CEID\nstring Name\nList<uint> LinkedRPTIDs\nbool Enabled\n— One CE maps to many RPTIDs",
      },
    ],
  },
  {
    id: "alarms",
    label: "ALARM & REMOTE COMMAND LAYER",
    borderColor: "#c084fc",
    description: "E30 — Alarm Management, Remote Commands, Process Programs",
    nodes: [
      {
        id: "IAlarmManager",
        label: "«interface»\nIAlarmManager",
        type: "interface",
        note: "void SetAlarm(uint alid, string text)\nvoid ClearAlarm(uint alid)\nAckCode EnableAlarm(uint alid)\nAckCode DisableAlarm(uint alid)\nIEnumerable<AlarmRecord> GetAlarms()\nbool IsEnabled(uint alid)",
      },
      {
        id: "AlarmManager",
        label: "AlarmManager",
        type: "class",
        note: "Implements IAlarmManager · ALID registry · Sends S5F1 on alarm set · S5F3 enable/disable · Integrates with CollectionEventManager for ALID CEs",
      },
      {
        id: "IRemoteCommandManager",
        label: "«interface»\nIRemoteCommandManager",
        type: "interface",
        note: "void RegisterCommand(string rcmd, Func<CpList, AckCode> handler)\nAckCode ExecuteCommand(string rcmd, CpList params)\nIEnumerable<string> GetRegisteredCommands()",
      },
      {
        id: "RemoteCommandManager",
        label: "RemoteCommandManager",
        type: "class",
        note: "Implements IRemoteCommandManager · Command Pattern · S2F41 dispatch · CPNAME/CPVAL param handling · Delegates to IEquipmentAdapter",
      },
      {
        id: "IProcessProgramManager",
        label: "«interface»\nIProcessProgramManager",
        type: "interface",
        note: "AckCode UploadPP(string ppid, byte[] body)\nAckCode DownloadPP(string ppid, out byte[] body)\nAckCode DeletePP(string ppid)\nbool ValidatePP(byte[] body)\nIEnumerable<string> ListPPs()",
      },
      {
        id: "ProcessProgramManager",
        label: "ProcessProgramManager",
        type: "class",
        note: "Implements IProcessProgramManager · S7F1/3/5 PP transfer · S7F17 delete · S7F19 list · Multi-block transfer support",
      },
    ],
  },
  {
    id: "equipment",
    label: "EQUIPMENT INTERFACE LAYER",
    borderColor: "#2dd4bf",
    description:
      "Bridge to physical tool — PLC, Sensors, Actuators, Recipe Engine",
    nodes: [
      {
        id: "IEquipmentAdapter",
        label: "«interface»\nIEquipmentAdapter",
        type: "interface",
        note: "Task<EquipmentStatus> GetStatusAsync()\nTask ExecuteCommandAsync(string command, object[] args)\nTask<SecsItem> ReadVariableAsync(uint vid)\nvoid Subscribe(uint vid, Action<SecsItem> onChange)\nvoid Unsubscribe(uint vid)",
      },
      {
        id: "TwincatEquipmentAdapter",
        label: "TwincatEquipmentAdapter",
        type: "class",
        note: "Implements IEquipmentAdapter · Adapter Pattern · Bridges TwinCAT3/EtherCAT ADS API to IEquipmentAdapter contract · AdsClient notifications → EquipmentEventBus",
      },
      {
        id: "IRecipeEngine",
        label: "«interface»\nIRecipeEngine",
        type: "interface",
        note: "AckCode LoadRecipe(string recipeId)\nvoid StartRecipe()\nvoid AbortRecipe()\nint GetCurrentStep()\nRecipeState GetState()\nevent EventHandler<int> StepChanged",
      },
      {
        id: "RecipeEngine",
        label: "RecipeEngine",
        type: "class",
        note: "Implements IRecipeEngine · Executes process recipe steps · Fires StepChanged → EquipmentEventBus.Publish(CEID) on each transition",
      },
      {
        id: "IEquipmentEventBus",
        label: "«interface»\nIEquipmentEventBus",
        type: "interface",
        note: "void Publish(EquipmentEvent evt)\nvoid Subscribe(uint ceid, Action<EquipmentEvent> handler)\nvoid Unsubscribe(uint ceid, Action<EquipmentEvent> handler)",
      },
      {
        id: "EquipmentEventBus",
        label: "EquipmentEventBus",
        type: "class",
        note: "Implements IEquipmentEventBus · Mediator Pattern · Decouples hardware events from GEM consumers · Thread-safe dispatch via Channel<T>",
      },
    ],
  },
  {
    id: "infra",
    label: "INFRASTRUCTURE / CROSS-CUTTING LAYER",
    borderColor: "#475569",
    description:
      "Logging · DI Container · Configuration · Persistence · Error Handling",
    nodes: [
      {
        id: "IMessageLogger",
        label: "«interface»\nIMessageLogger",
        type: "interface",
        note: "void LogSend(ISecsMessage msg)\nvoid LogReceive(ISecsMessage msg)\nvoid LogEvent(uint ceid, string name)\nvoid LogAlarm(uint alid, string text, bool set)\nvoid LogStateChange(string machine, string state)",
      },
      {
        id: "SecsGemLogger",
        label: "SecsGemLogger",
        type: "class",
        note: "Implements IMessageLogger · Structured logging · Rotating file + real-time stream · Compatible with secsgemlogparser.com format",
      },
      {
        id: "IConfigRepository",
        label: "«interface»\nIConfigRepository",
        type: "interface",
        note: "string GetSetting(string key)\nvoid SetSetting(string key, string value)\nT GetSection<T>(string key)\nvoid Save()\nvoid Load()",
      },
      {
        id: "ConfigRepository",
        label: "ConfigRepository",
        type: "class",
        note: "Implements IConfigRepository · JSON/DB-backed · Stores HSMS params, VID/CEID/RPTID maps, alarm definitions, ECV defaults",
      },
      {
        id: "DiContainer",
        label: "DI Container\n(Microsoft.Extensions.DI)",
        type: "infra",
        note: "Wires all interfaces to concrete implementations · Singleton lifetimes for all GEM objects · Scoped for per-job contexts",
      },
      {
        id: "ErrorHandler",
        label: "ErrorHandler / RetryPolicy",
        type: "infra",
        note: "Polly-based retry with exponential backoff · Circuit breaker on HSMS send failures · Dead-letter queue for undeliverable messages",
      },
    ],
  },
];

const archDesignPatterns = [
  {
    pattern: "State",
    used: "ICommunicationStateMachine / CommunicationStateMachine — Disabled → NotCommunicating → Communicating\nIControlStateMachine / ControlStateMachine — EquipmentOffline → Local → Remote\nIProcessJobManager / ProcessJobManager — Queued → Setting Up → Processing → Complete\nICarrierManager / CarrierManager — CAS state machine per E87",
  },
  {
    pattern: "Observer / Event Bus",
    used: "IConnectionObserver — subscribed by GemKernel to IHsmsConnection events\nICollectionEventManager — subscribes to IEquipmentEventBus, fires S6F11\nIEquipmentEventBus — all hardware events publish here, GEM layer subscribes\nMessageRouter — all incoming SxFy messages route via registered handlers",
  },
  {
    pattern: "Factory",
    used: "SecsItemFactory — creates all SECS-II data item types (L, A, U4, I4, F8, B, BOOLEAN) by SecsItemType enum",
  },
  {
    pattern: "Repository",
    used: "IVariableRepository / VariableRepository — ECVs, SVs, DVs keyed by VID\nIConfigRepository / ConfigRepository — all persistent GEM configuration",
  },
  {
    pattern: "Facade",
    used: "IGemKernel / GemKernel — single public entry point for machine software; hides all subsystem wiring",
  },
  {
    pattern: "Adapter",
    used: "IEquipmentAdapter / TwincatEquipmentAdapter — translates TwinCAT3 ADS API to the IEquipmentAdapter contract without GEM knowing about Beckhoff",
  },
  {
    pattern: "Command",
    used: "IRemoteCommandManager / RemoteCommandManager — encapsulates S2F41 RCMD + CPNAME/CPVAL params as executable command objects with registered handlers",
  },
  {
    pattern: "Mediator",
    used: "IEquipmentEventBus / EquipmentEventBus — decouples RecipeEngine and TwincatEquipmentAdapter from CollectionEventManager; no direct references between them",
  },
  {
    pattern: "Template Method",
    used: "Abstract SecsMessageHandler base class — defines Handle() skeleton; subclasses (S1F13Handler, S2F41Handler, S16F11Handler, etc.) override ProcessMessage() to fill in SxFy-specific logic",
  },
  {
    pattern: "Strategy",
    used: "Reconnect/retry strategies injected into HsmsSessionManager\nEncoding strategies per SECS-II item type in SecsItemFactory",
  },
];

const archAppendixMessages = [
  {
    stream: 1,
    msgs: [
      "S1F1/2 – Are You There / On Line Data",
      "S1F3/4 – Selected Equipment Status Request/Data",
      "S1F5/6 – Formatted Status Request/Data",
      "S1F7/8 – Fixed Form Request/Data",
      "S1F11/12 – Status Variable Namelist Request/Data",
      "S1F13/14 – Establish Communications Request/Ack",
      "S1F15/16 – Request Offline/Ack",
      "S1F17/18 – Request Online/Ack",
    ],
  },
  {
    stream: 2,
    msgs: [
      "S2F13/14 – Equipment Constant Request/Data",
      "S2F15/16 – New Equipment Constant Send/Ack",
      "S2F17/18 – Date and Time Request/Data",
      "S2F21/22 – Remote Command Send/Ack (legacy)",
      "S2F29/30 – Equipment Constant Namelist Request/Data",
      "S2F31/32 – Date and Time Set/Ack",
      "S2F33/34 – Define Report/Ack",
      "S2F35/36 – Link Collection Event Report/Ack",
      "S2F37/38 – Enable/Disable Collection Event/Ack",
      "S2F41/42 – Host Command Send/Ack",
      "S2F43/44 – Reset Spooling/Ack",
      "S2F45/46 – Define Variable Limit Attributes/Ack",
      "S2F47/48 – Variable Limit Attribute Request/Data",
    ],
  },
  {
    stream: 3,
    msgs: [
      "S3F17/18 – Carrier Action Request/Ack (E87)",
      "S3F23/24 – Cancel Carrier Action/Ack (E87)",
      "S3F25/26 – Carrier Tag Read/Data (E87)",
    ],
  },
  {
    stream: 5,
    msgs: [
      "S5F1/2 – Alarm Report Send/Ack",
      "S5F3/4 – Enable/Disable Alarm/Ack",
      "S5F5/6 – List Alarms Request/Data",
      "S5F7/8 – List Enabled Alarms Request/Data",
    ],
  },
  {
    stream: 6,
    msgs: [
      "S6F1/2 – Trace Data Send/Ack",
      "S6F5/6 – Multi-block Data Send/Ack",
      "S6F11/12 – Event Report Send/Ack",
      "S6F15/16 – Event Report Request/Data",
      "S6F17/18 – Annotated Event Report Request/Data",
      "S6F19/20 – Individual Report Request/Data",
      "S6F21/22 – Annotated Individual Report Request/Data",
      "S6F23/24 – Request Spooled Data/Ack",
    ],
  },
  {
    stream: 7,
    msgs: [
      "S7F1/2 – Process Program Load Inquire/Grant",
      "S7F3/4 – Process Program Send/Ack",
      "S7F5/6 – Process Program Request/Data",
      "S7F17/18 – Delete Process Program/Ack",
      "S7F19/20 – Process Program List Request/Data",
      "S7F23/24 – Formatted PP Send/Ack",
      "S7F25/26 – Formatted PP Request/Data",
    ],
  },
  {
    stream: 9,
    msgs: [
      "S9F1 – Unrecognized Device ID",
      "S9F3 – Unrecognized Stream",
      "S9F5 – Unrecognized Function",
      "S9F7 – Illegal Data",
      "S9F9 – Transaction Timer Timeout (T3)",
      "S9F11 – Data Too Long",
      "S9F13 – Conversation Timeout (T5)",
    ],
  },
  {
    stream: 10,
    msgs: [
      "S10F1/2 – Terminal Request/Ack",
      "S10F3/4 – Terminal Display Single/Ack",
      "S10F5/6 – Terminal Display Multi-Block/Ack",
    ],
  },
  {
    stream: 12,
    msgs: [
      "S12F1/2 – Map Setup Send/Ack",
      "S12F3/4 – Map Setup Acknowledge/Data",
      "S12F5/6 – Map Transmit Inquire/Grant",
      "S12F7/8 – Map Send/Ack",
      "S12F9/10 – Map Request/Data",
      "S12F11/12 – Map Data Type 1/Ack",
      "S12F13/14 – Map Data Type 2/Ack",
      "S12F15/16 – Map Data Type 3/Ack",
      "S12F17/18 – Map Data Acknowledge/Data",
      "S12F19/20 – Map Error Report/Ack",
    ],
  },
  {
    stream: 13,
    msgs: [
      "S13F11/12 – Create Process Job/Ack (E40 alt stream)",
      "S13F13/14 – Abort Process Job/Ack",
    ],
  },
  {
    stream: 14,
    msgs: [
      "S14F1/2 – GetAttr Request/Data (E87/E90/E94 attribute queries)",
      "S14F3/4 – SetAttr Request/Ack (E87/E90/E94 attribute updates)",
    ],
  },
  {
    stream: 16,
    msgs: [
      "S16F1/2 – Process Job Inquire/Grant",
      "S16F11/12 – PRJobCreate/Ack (E40)",
      "S16F13/14 – PRJobMultiCreate/Ack",
      "S16F15/16 – PRJobDequeue/Ack",
      "S16F17/18 – PRJobCancel/Ack",
      "S16F19/20 – PRJobPause/Ack",
      "S16F21/22 – PRJobResume/Ack",
      "S16F23/24 – PRJobStop/Ack",
      "S16F25/26 – PRJobAbort/Ack",
      "S16F27/28 – PRSetMtrlOrder/Ack",
    ],
  },
  {
    stream: 17,
    msgs: [
      "S17F1/2 – CreateControlJob/Ack (E94)",
      "S17F3/4 – DeleteControlJob/Ack (E94)",
      "S17F5/6 – StartControlJob/Ack (E94)",
      "S17F7/8 – StopControlJob/Ack (E94)",
      "S17F9/10 – AbortControlJob/Ack (E94)",
      "S17F11/12 – PauseControlJob/Ack (E94)",
      "S17F13/14 – ResumeControlJob/Ack (E94)",
    ],
  },
];

const archSemiDocs = [
  {
    order: 1,
    doc: "SEMI E5",
    title: "SECS-II Message Content",
    layer: "Layer 2",
    layerColor: "#4ade80",
    why: "Read this first — defines every data item type (L, A, B, U1/2/4/8, I1/2/4/8, F4/F8, BOOLEAN), item header format, block structure, and multi-block rules. You cannot encode or decode a single message without this.",
    implements: [
      "SecsEncoder",
      "SecsDecoder",
      "ISecsItem",
      "SecsItemFactory",
      "ISecsMessage",
    ],
  },
  {
    order: 2,
    doc: "SEMI E37",
    title: "HSMS — High Speed Message Services",
    layer: "Layer 1",
    layerColor: "#2dd4bf",
    why: "Short document. Defines TCP/IP framing, 10-byte header structure, SType values (Select/Deselect/Separate/Linktest), T3/T5/T6/T7 timers, Active vs Passive mode, session establishment. Without this you cannot build the transport layer.",
    implements: [
      "IHsmsConnection",
      "HsmsConnection",
      "HsmsSessionManager",
      "HsmsMessageFramer",
    ],
  },
  {
    order: 3,
    doc: "SEMI E4",
    title: "SECS-I — Serial Interface",
    layer: "Layer 1 (ref)",
    layerColor: "#f87171",
    why: "Skim only. E30 was originally written against E4 (RS-232 serial). You will hit confusing E30 footnotes and behavioral references without knowing this exists. You won't implement it but you need to recognize its references.",
    implements: ["Historical reference only"],
  },
  {
    order: 4,
    doc: "SEMI E30",
    title: "GEM — Generic Equipment Model",
    layer: "Layer 3",
    layerColor: "#c084fc",
    why: "Your thickest read and most important document. Defines: Communication State Machine, Control State Machine, spooling, SVs/DVs/ECVs, Collection Events, Report definition and linking (S2F33/35/37), Alarms (S5), Remote Commands (S2F41), Process Programs (S7), and all core SxFy behavioral rules.",
    implements: [
      "IGemKernel",
      "ICommunicationStateMachine",
      "IControlStateMachine",
      "ISpoolingManager",
      "IVariableRepository",
      "IReportManager",
      "ICollectionEventManager",
      "IAlarmManager",
      "IRemoteCommandManager",
      "IProcessProgramManager",
    ],
  },
  {
    order: 5,
    doc: "SEMI E40",
    title: "Processing Management — Process Jobs",
    layer: "Layer 4 (GEM300)",
    layerColor: "#fb923c",
    why: "Defines Process Job creation, state machine (Queued → Setting Up → Processing → Process Complete → Stopped), abort types, S16Fxx message set, and PRJobSpec structure. Required for any automated wafer processing flow.",
    implements: ["IProcessJobManager", "ProcessJobManager"],
  },
  {
    order: 6,
    doc: "SEMI E87",
    title: "CMS — Carrier Management System",
    layer: "Layer 4 (GEM300)",
    layerColor: "#fb923c",
    why: "Defines carrier (FOUP/FOSB) loading, unloading, binding, and the Carrier Acquisition State (CAS) machine per load port. S3F17 carrier actions. Essential for any 300mm front-end automation.",
    implements: ["ICarrierManager", "CarrierManager"],
  },
  {
    order: 7,
    doc: "SEMI E90",
    title: "Substrate Tracking",
    layer: "Layer 4 (GEM300)",
    layerColor: "#fb923c",
    why: "Defines how individual substrates (wafers) are tracked through Source, Process, and Destination states across the equipment. S14F1/F3 GetAttr/SetAttr. Required to report per-wafer disposition to the host.",
    implements: ["ISubstrateManager", "SubstrateManager"],
  },
  {
    order: 8,
    doc: "SEMI E94",
    title: "CJM — Control Job Management",
    layer: "Layer 4 (GEM300)",
    layerColor: "#fb923c",
    why: "Defines Control Jobs which link Process Jobs to Carriers and orchestrate multi-job flows. S17Fxx message set. Acts as the top-level job container that the host uses to drive the full process sequence.",
    implements: ["IControlJobManager", "ControlJobManager"],
  },
  {
    order: 9,
    doc: "SEMI E116",
    title: "EPT — Equipment Performance Tracking",
    layer: "Layer 4 (GEM300)",
    layerColor: "#fb923c",
    why: "Defines equipment state tracking for availability metrics: BUSY, IDLE, BLOCKED, ENGINEERING, SCHEDULED_DOWN, UNSCHEDULED_DOWN. Required for OEE reporting in ISO 9000 high-volume manufacturing environments.",
    implements: ["IEptManager", "EptManager"],
  },
  {
    order: 10,
    doc: "SEMI E84",
    title: "EFEM Load Port Interface",
    layer: "Layer 4 (GEM300 / HW)",
    layerColor: "#fb923c",
    why: "Defines the parallel handshake signals (CS_0, CS_1, VALID, TR_REQ, BUSY, COMPT, etc.) between the EFEM/AGV and the load port hardware. Not implemented in software GEM layer directly, but your CarrierManager must align its state transitions with E84 hardware signals.",
    implements: ["TwincatEquipmentAdapter (hardware bridge)"],
  },
  {
    order: 11,
    doc: "SEMI E39",
    title: "OSS — Object Services Standard",
    layer: "Layer 3/4 (ref)",
    layerColor: "#c084fc",
    why: "Defines the attribute-based object model used by E87, E90, and E94 — the GetAttr (S14F1) / SetAttr (S14F3) pattern. Read this before implementing any S14 message handling or you won't understand why E87/E90/E94 use that message pattern.",
    implements: [
      "S14F1/F3 handlers in CarrierManager, SubstrateManager, ControlJobManager",
    ],
  },
  {
    order: 12,
    doc: "SEMI E42",
    title: "SEMI Equipment Communications Standard — Recipe Management",
    layer: "Layer 3",
    layerColor: "#c084fc",
    why: "Extends E30 Process Program management with formatted recipes, parameter validation, and recipe versioning. Read after E30 §7 (Process Programs). Required if your tool supports structured recipe download/upload beyond raw byte transfer.",
    implements: ["IProcessProgramManager", "IRecipeEngine"],
  },
  {
    order: 13,
    doc: "SEMI E148",
    title: "Time Synchronization",
    layer: "Layer 3 (ref)",
    layerColor: "#c084fc",
    why: "Defines how equipment clocks are synchronized with the host via S2F17/S2F31. Short document. Important for ISO 9000 traceability — timestamp alignment across tools and MES is an audit requirement.",
    implements: ["GemKernel (S2F17/S2F31 handlers)"],
  },
  {
    order: 14,
    doc: "SEMI E058",
    title: "OEE — Overall Equipment Effectiveness",
    layer: "Cross-cutting",
    layerColor: "#94a3b8",
    why: "Defines the OEE calculation framework that E116 EPT state data feeds into. Not directly implemented in software but governs how your EptManager state definitions must be structured to produce valid OEE metrics for ISO 9000 reporting.",
    implements: ["EptManager (state taxonomy alignment)"],
  },
];

const archMessageFlow = [
  {
    dir: "→",
    msg: "S1F13 (Establish Comm Req)",
    desc: "Tool → Host on TCP connect",
  },
  {
    dir: "←",
    msg: "S1F14 (Establish Comm Ack)",
    desc: "Host confirms — CommunicationStateMachine → COMMUNICATING",
  },
  {
    dir: "←",
    msg: "S2F33 (Define Report)",
    desc: "Host defines RPTID + VID list",
  },
  {
    dir: "←",
    msg: "S2F35 (Link CE to Report)",
    desc: "Host links CEID → RPTID",
  },
  {
    dir: "←",
    msg: "S2F37 (Enable/Disable CE)",
    desc: "Host enables collection events",
  },
  {
    dir: "→",
    msg: "S6F11 (Collection Event)",
    desc: "Tool fires CEID with linked report data",
  },
  {
    dir: "←",
    msg: "S2F41 (Remote Command)",
    desc: "Host sends RCMD + params to tool",
  },
  { dir: "→", msg: "S2F42 (RC Ack)", desc: "Tool acknowledges command" },
  {
    dir: "→",
    msg: "S5F1 (Alarm Report)",
    desc: "Tool fires alarm with ALID + text",
  },
  {
    dir: "←",
    msg: "S5F3 (Enable/Disable Alarm)",
    desc: "Host controls alarm reporting",
  },
  {
    dir: "←",
    msg: "S16F11 (PRJobCreate)",
    desc: "Host creates process job (E40)",
  },
  {
    dir: "→",
    msg: "S16F12 (PRJobCreate Ack)",
    desc: "Tool acknowledges job create",
  },
  {
    dir: "←",
    msg: "S3F17 (CarrierAction)",
    desc: "Host issues carrier command (E87)",
  },
  {
    dir: "→",
    msg: "S3F18 (CarrierAction Ack)",
    desc: "Tool acknowledges carrier action",
  },
];

const archTypeStyle = (type) => {
  if (type === "interface")
    return { bg: "#0f2035", border: "#38bdf8", label: "#93c5fd" };
  if (type === "class")
    return { bg: "#0f1f0f", border: "#4ade80", label: "#86efac" };
  if (type === "factory")
    return { bg: "#1a0f1a", border: "#c084fc", label: "#d8b4fe" };
  if (type === "state")
    return { bg: "#1f100a", border: "#fb923c", label: "#fdba74" };
  if (type === "model")
    return { bg: "#1a1500", border: "#fbbf24", label: "#fde68a" };
  if (type === "infra")
    return { bg: "#111", border: "#64748b", label: "#94a3b8" };
  if (type === "external")
    return { bg: "#0f0f25", border: "#818cf8", label: "#a5b4fc" };
  if (type === "proto")
    return { bg: "#1f0a0a", border: "#f87171", label: "#fca5a5" };
  return { bg: "#0f172a", border: "#475569", label: "#94a3b8" };
};

const ArchNode = ({ node }) => {
  const [hovered, setHovered] = useState(false);
  const c = archTypeStyle(node.type);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#1e293b" : c.bg,
        border: `1.5px solid ${c.border}`,
        borderRadius: 8,
        padding: "8px 12px",
        minWidth: 210,
        maxWidth: 270,
        cursor: "default",
        transition: "all 0.15s",
        boxShadow: hovered ? `0 0 10px ${c.border}44` : "none",
        textAlign: "left",
      }}
    >
      <div
        style={{
          color: c.label,
          fontSize: 11,
          fontFamily: "monospace",
          fontWeight: 700,
          whiteSpace: "pre-line",
          lineHeight: 1.4,
          textAlign: "left",
        }}
      >
        {node.label}
      </div>
      {hovered && (
        <pre
          style={{
            color: "#cbd5e1",
            fontSize: 10,
            margin: "6px 0 0",
            lineHeight: 1.6,
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            borderTop: `1px solid ${c.border}44`,
            paddingTop: 6,
            textAlign: "left",
          }}
        >
          {node.note}
        </pre>
      )}
    </div>
  );
};

const FullArchitectureTab = () => {
  const [tab, setTab] = useState("arch");
  const [expandedStream, setExpandedStream] = useState(null);

  return (
    <div
      style={{
        background: "#070d1a",
        minHeight: "100vh",
        color: "#f1f5f9",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          background: "#0b1a35",
          borderBottom: "2px solid #1e3a6e",
          padding: "14px 24px",
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: "#93c5fd",
            letterSpacing: 1,
          }}
        >
          SECS/GEM300 FULL ARCHITECTURE
        </div>
        <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
          SEMI E5 · E30 · E37 · E40 · E84 · E87 · E90 · E94 · E116 — ISO 9000
          High-Volume Manufacturing
        </div>
      </div>

      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #1e293b",
          background: "#0a1120",
        }}
      >
        {[
          ["arch", "Architecture"],
          ["flow", "Message Flow"],
          ["patterns", "Design Patterns"],
          ["appendix", "Appendix: Messages"],
          ["semidocs", "SEMI Documents"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              padding: "9px 20px",
              background: tab === id ? "#0f2035" : "transparent",
              color: tab === id ? "#93c5fd" : "#475569",
              border: "none",
              borderBottom:
                tab === id ? "2px solid #38bdf8" : "2px solid transparent",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: tab === id ? 700 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "arch" && (
        <div style={{ padding: "18px 24px" }}>
          <div
            style={{
              borderBottom: "1px solid #1e293b",
              paddingBottom: 10,
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 10, color: "#475569", marginBottom: 8 }}>
              Hover any node to reveal interface contract / methods /
              responsibilities. Layers run top-down: Host → Transport → SECS-II
              → GEM Core → GEM300 → Data Collection → Alarms → Equipment →
              Infrastructure.
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {[
                ["interface", "Interface"],
                ["class", "Concrete Class"],
                ["factory", "Factory"],
                ["state", "State Machine"],
                ["model", "Data Model"],
                ["infra", "Infrastructure"],
                ["external", "External"],
                ["proto", "Protocol"],
              ].map(([t, l]) => {
                const c = archTypeStyle(t);
                return (
                  <div
                    key={t}
                    style={{ display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <div
                      style={{
                        width: 11,
                        height: 11,
                        background: c.bg,
                        border: `1.5px solid ${c.border}`,
                        borderRadius: 3,
                      }}
                    />
                    <span style={{ fontSize: 10, color: "#64748b" }}>{l}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {archLayers.map((layer, li) => (
              <div
                key={layer.id}
                style={{
                  border: `1.5px solid ${layer.borderColor}`,
                  borderRadius: 10,
                  background: "#0a0f1a",
                  padding: "12px 16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 10,
                    marginBottom: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      color: layer.borderColor,
                      letterSpacing: 1.5,
                      fontFamily: "monospace",
                    }}
                  >
                    LAYER {li}
                  </span>
                  <span
                    style={{ fontSize: 12, fontWeight: 700, color: "#f1f5f9" }}
                  >
                    {layer.label}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#475569",
                    marginBottom: 10,
                    fontStyle: "italic",
                  }}
                >
                  {layer.description}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {layer.nodes.map((n) => (
                    <ArchNode key={n.id} node={n} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              color: "#38bdf8",
              fontSize: 10,
              marginTop: 14,
              padding: "8px",
              background: "#0b1a35",
              borderRadius: 8,
              border: "1px solid #1e3a6e",
            }}
          >
            ↕ All layers communicate via interface contracts only · DI container
            wires concrete implementations at runtime · No layer holds a direct
            reference more than one level away
          </div>
        </div>
      )}

      {tab === "flow" && (
        <div style={{ padding: "24px" }}>
          <div style={{ fontSize: 12, color: "#475569", marginBottom: 20 }}>
            Bidirectional message flows for ISO 9000 high-volume manufacturing.
            → = Tool to Host, ← = Host to Tool.
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 40px 1fr",
              maxWidth: 760,
              margin: "0 auto",
            }}
          >
            <div
              style={{
                textAlign: "center",
                padding: "8px",
                background: "#0f2035",
                borderRadius: "8px 0 0 0",
                color: "#93c5fd",
                fontWeight: 700,
                fontSize: 11,
                border: "1px solid #38bdf8",
              }}
            >
              TOOL (Equipment)
            </div>
            <div style={{ background: "#070d1a" }} />
            <div
              style={{
                textAlign: "center",
                padding: "8px",
                background: "#0f1f0f",
                borderRadius: "0 8px 0 0",
                color: "#86efac",
                fontWeight: 700,
                fontSize: 11,
                border: "1px solid #4ade80",
              }}
            >
              HOST (MES/Fab)
            </div>
            {archMessageFlow.map((m, i) => (
              <div key={i} style={{ display: "contents" }}>
                <div
                  style={{
                    background: "#0a0f1a",
                    border: "1px solid #0f1525",
                    padding: "6px 10px",
                    fontSize: 10,
                    color: m.dir === "→" ? "#93c5fd" : "#334155",
                    fontFamily: "monospace",
                    textAlign: "right",
                  }}
                >
                  {m.dir === "→" ? m.msg : ""}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#070d1a",
                    border: "1px solid #0f1525",
                    color: m.dir === "→" ? "#38bdf8" : "#4ade80",
                    fontSize: 14,
                  }}
                >
                  {m.dir}
                </div>
                <div
                  style={{
                    background: "#0a0f1a",
                    border: "1px solid #0f1525",
                    padding: "6px 10px",
                    fontSize: 10,
                    color: m.dir === "←" ? "#86efac" : "#334155",
                    fontFamily: "monospace",
                  }}
                >
                  {m.dir === "←" ? m.msg : ""}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 32, maxWidth: 760, margin: "32px auto 0" }}>
            <div
              style={{
                fontWeight: 700,
                color: "#fbbf24",
                fontSize: 13,
                marginBottom: 12,
              }}
            >
              REPORT CREATION & CE ENABLE SEQUENCE (S2F33 → S2F35 → S2F37 →
              S6F11)
            </div>
            {[
              [
                "1",
                "Host sends S2F33",
                "DefineReport — RPTID + list of VIDs → ReportManager.DefineReport()",
              ],
              [
                "2",
                "ReportManager stores",
                "RPTID → VID[] persisted via IVariableRepository + IConfigRepository",
              ],
              [
                "3",
                "Host sends S2F35",
                "LinkReport — CEID → RPTID → CollectionEventManager.LinkReport()",
              ],
              [
                "4",
                "CE definition updated",
                "CollectionEventDefinition.LinkedRPTIDs updated for that CEID",
              ],
              [
                "5",
                "Host sends S2F37",
                "EnableCollectionEvent — specific CEIDs enabled",
              ],
              ["6", "CE enabled", "CollectionEventDefinition.Enabled = true"],
              [
                "7",
                "Tool fires event",
                "RecipeEngine.StepChanged → EquipmentEventBus.Publish(EquipmentEvent{CEID})",
              ],
              [
                "8",
                "CollectionEventManager",
                "Checks IsEnabled(CEID) · Fetches all linked RPTIDs · Reads VID values from IVariableRepository",
              ],
              [
                "9",
                "Sends S6F11",
                "Event Report Send — CEID + RPTID list with variable data → HsmsConnection.SendAsync()",
              ],
              [
                "10",
                "Host sends S6F12",
                "Ack — confirms receipt · transaction complete",
              ],
            ].map(([n, title, desc]) => (
              <div
                key={n}
                style={{
                  display: "grid",
                  gridTemplateColumns: "24px 200px 1fr",
                  gap: "0 12px",
                  alignItems: "start",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    background: "#0f2035",
                    color: "#38bdf8",
                    borderRadius: "50%",
                    width: 20,
                    height: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    fontWeight: 700,
                  }}
                >
                  {n}
                </div>
                <div
                  style={{
                    color: "#fbbf24",
                    fontSize: 10,
                    fontFamily: "monospace",
                    fontWeight: 600,
                  }}
                >
                  {title}
                </div>
                <div style={{ color: "#64748b", fontSize: 10 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "patterns" && (
        <div style={{ padding: "24px" }}>
          <div style={{ fontSize: 12, color: "#475569", marginBottom: 18 }}>
            All design patterns applied, with concrete class mappings. Every
            interface listed here has a corresponding node in the Architecture
            tab.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {archDesignPatterns.map((p) => (
              <div
                key={p.pattern}
                style={{
                  background: "#0a0f1a",
                  border: "1px solid #1e293b",
                  borderRadius: 8,
                  padding: "10px 14px",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    color: "#c084fc",
                    fontWeight: 700,
                    fontSize: 11,
                    fontFamily: "monospace",
                    marginBottom: 4,
                  }}
                >
                  {p.pattern}
                </div>
                <pre
                  style={{
                    color: "#64748b",
                    fontSize: 10,
                    margin: 0,
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                    fontFamily: "monospace",
                  }}
                >
                  {p.used}
                </pre>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 24,
              fontWeight: 700,
              color: "#fbbf24",
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            KEY INTERFACE METHOD SIGNATURES
          </div>
          {[
            [
              "IGemKernel",
              "void Start()\nvoid Stop()\nvoid ProcessIncomingMessage(ISecsMessage msg)\nGemState GetCommunicationState()\nGemState GetControlState()\nTask SendAsync(ISecsMessage msg)",
            ],
            [
              "IHsmsConnection",
              "Task ConnectAsync(string ip, int port, CancellationToken ct)\nTask DisconnectAsync(CancellationToken ct)\nbool IsConnected { get; }\nTask SendAsync(HsmsMessage msg, CancellationToken ct)\nevent EventHandler<HsmsMessage> MessageReceived\nevent EventHandler<ConnectionStateChangedArgs> ConnectionStateChanged",
            ],
            [
              "ICommunicationStateMachine",
              "string CurrentStateName { get; }\nvoid Connect()\nvoid Disconnect()\nvoid OnSelectReq()\nvoid OnSeparateReq()\nevent EventHandler<string> StateChanged",
            ],
            [
              "IControlStateMachine",
              "string CurrentStateName { get; }\nvoid GoLocal()\nvoid GoRemote()\nvoid GoOffline()\nvoid GoOnline()\nevent EventHandler<string> StateChanged",
            ],
            [
              "IReportManager",
              "AckCode DefineReport(uint rptId, uint[] vids)\nAckCode DeleteReport(uint rptId)\nAckCode LinkReport(uint ceid, uint[] rptIds)\nAckCode UnlinkReport(uint ceid, uint[] rptIds)\nReportDefinition GetReport(uint rptId)",
            ],
            [
              "ICollectionEventManager",
              "void RegisterCE(CollectionEventDefinition ce)\nvoid FireEvent(uint ceid)\nAckCode EnableCE(uint[] ceids)\nAckCode DisableCE(uint[] ceids)\nList<ReportDefinition> GetLinkedReports(uint ceid)\nbool IsEnabled(uint ceid)",
            ],
            [
              "IVariableRepository",
              "SecsItem GetSV(uint vid)\nSecsItem GetDV(uint vid)\nSecsItem GetECV(uint vid)\nvoid SetECV(uint vid, SecsItem value)\nList<VariableDefinition> GetNamelist(VariableType type)",
            ],
            [
              "IProcessJobManager",
              "AckCode CreateJob(PRJobSpec spec)\nAckCode StartJob(string jobId)\nAckCode PauseJob(string jobId)\nAckCode ResumeJob(string jobId)\nAckCode AbortJob(string jobId, AbortType type)\nPRJobState GetJobState(string jobId)",
            ],
            [
              "IEquipmentAdapter",
              "Task<EquipmentStatus> GetStatusAsync()\nTask ExecuteCommandAsync(string command, object[] args)\nTask<SecsItem> ReadVariableAsync(uint vid)\nvoid Subscribe(uint vid, Action<SecsItem> onChange)\nvoid Unsubscribe(uint vid)",
            ],
            [
              "IEquipmentEventBus",
              "void Publish(EquipmentEvent evt)\nvoid Subscribe(uint ceid, Action<EquipmentEvent> handler)\nvoid Unsubscribe(uint ceid, Action<EquipmentEvent> handler)",
            ],
          ].map(([name, sigs]) => (
            <div
              key={name}
              style={{
                marginBottom: 10,
                background: "#070d1a",
                border: "1px solid #0f2035",
                borderRadius: 8,
                padding: "10px 14px",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  color: "#38bdf8",
                  fontWeight: 700,
                  fontSize: 11,
                  marginBottom: 5,
                  fontFamily: "monospace",
                }}
              >
                {name}
              </div>
              <pre
                style={{
                  color: "#86efac",
                  fontSize: 10,
                  margin: 0,
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                }}
              >
                {sigs}
              </pre>
            </div>
          ))}
        </div>
      )}

      {tab === "semidocs" && (
        <div style={{ padding: "24px" }}>
          <div
            style={{
              borderBottom: "1px solid #1e293b",
              paddingBottom: 10,
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 10, color: "#475569", marginBottom: 8 }}>
              Reading order to implement the full stack correctly. Color matches
              the architecture layer each document applies to.
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                ["#4ade80", "Layer 2 — SECS-II"],
                ["#2dd4bf", "Layer 1 — Transport"],
                ["#f87171", "Layer 1 (ref)"],
                ["#c084fc", "Layer 3 — GEM Core"],
                ["#fb923c", "Layer 4 — GEM300"],
                ["#94a3b8", "Cross-cutting"],
              ].map(([color, label]) => (
                <div
                  key={label}
                  style={{ display: "flex", alignItems: "center", gap: 5 }}
                >
                  <div
                    style={{
                      width: 11,
                      height: 11,
                      background: color + "22",
                      border: `1.5px solid ${color}`,
                      borderRadius: 3,
                    }}
                  />
                  <span style={{ fontSize: 10, color: "#64748b" }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {archSemiDocs.map((d) => (
              <div
                key={d.order}
                style={{
                  background: "#0a0f1a",
                  border: `1px solid ${d.layerColor}33`,
                  borderLeft: `3px solid ${d.layerColor}`,
                  borderRadius: 8,
                  padding: "12px 16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 10,
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      background: "#0f2035",
                      color: "#38bdf8",
                      borderRadius: 5,
                      padding: "1px 8px",
                      fontSize: 10,
                      fontFamily: "monospace",
                      fontWeight: 700,
                      minWidth: 20,
                      textAlign: "center",
                    }}
                  >
                    {d.order}
                  </div>
                  <div
                    style={{
                      color: d.layerColor,
                      fontWeight: 700,
                      fontSize: 12,
                      fontFamily: "monospace",
                    }}
                  >
                    {d.doc}
                  </div>
                  <div style={{ color: "#f1f5f9", fontSize: 12 }}>
                    {d.title}
                  </div>
                  <div
                    style={{
                      marginLeft: "auto",
                      color: "#475569",
                      fontSize: 10,
                      fontStyle: "italic",
                    }}
                  >
                    {d.layer}
                  </div>
                </div>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 11,
                    lineHeight: 1.6,
                    marginBottom: 6,
                  }}
                >
                  {d.why}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {d.implements.map((impl, i) => (
                    <span
                      key={i}
                      style={{
                        background: "#0f2035",
                        color: "#93c5fd",
                        fontSize: 9,
                        fontFamily: "monospace",
                        padding: "2px 7px",
                        borderRadius: 4,
                        border: "1px solid #1e3a6e",
                      }}
                    >
                      {impl}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "appendix" && (
        <div style={{ padding: "24px" }}>
          <div style={{ fontSize: 12, color: "#475569", marginBottom: 18 }}>
            Complete SECS-II message catalog. Click a stream to expand.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {archAppendixMessages.map((s) => (
              <div
                key={s.stream}
                style={{
                  background: "#0a0f1a",
                  border: "1px solid #1e293b",
                  borderRadius: 8,
                  textAlign: "left",
                }}
              >
                <div
                  onClick={() =>
                    setExpandedStream(
                      expandedStream === s.stream ? null : s.stream,
                    )
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "9px 14px",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <div
                    style={{
                      background: "#0f2035",
                      color: "#38bdf8",
                      borderRadius: 5,
                      padding: "2px 10px",
                      fontSize: 11,
                      fontFamily: "monospace",
                      fontWeight: 700,
                    }}
                  >
                    S{s.stream}
                  </div>
                  <div style={{ color: "#475569", fontSize: 10 }}>
                    {s.msgs.length} messages
                  </div>
                  <div
                    style={{
                      marginLeft: "auto",
                      color: "#38bdf8",
                      fontSize: 12,
                    }}
                  >
                    {expandedStream === s.stream ? "▲" : "▼"}
                  </div>
                </div>
                {expandedStream === s.stream && (
                  <div style={{ padding: "0 14px 10px" }}>
                    {s.msgs.map((m, i) => (
                      <div
                        key={i}
                        style={{
                          color: "#94a3b8",
                          fontSize: 10,
                          fontFamily: "monospace",
                          padding: "4px 0",
                          borderTop: "1px solid #1e293b",
                          textAlign: "left",
                        }}
                      >
                        {m}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SECS2InterpreterApp;
