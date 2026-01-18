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

// Hex extraction utility using learned patterns from patterns.json
const extractHexFromLine = (rawLine, patterns) => {
  if (!rawLine) return null;
  const patternList = patterns?.patterns || [];

  for (const pattern of patternList) {
    for (const element of pattern.elements || []) {
      if (!element.enabled) continue;
      let regex;
      switch (element.type) {
        case "hex-spaced":
          regex = /\b([0-9A-Fa-f]{2}\s+){3,}[0-9A-Fa-f]{2}\b/g;
          break;
        case "hex-continuous":
          regex = /\b[0-9A-Fa-f]{8,}\b/g;
          break;
        case "hex-0x":
          regex = /(0x[0-9A-Fa-f]{2}\s*)+/g;
          break;
        case "hex-colon":
          regex = /\b([0-9A-Fa-f]{2}:){2,}[0-9A-Fa-f]{2}\b/g;
          break;
        default:
          continue;
      }
      const matches = rawLine.match(regex);
      if (matches && matches.length > 0) {
        let hexData = matches.join(" ");
        hexData = hexData
          .replace(/0x/gi, "")
          .replace(/:/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        return { hex: hexData, type: element.type, raw: matches[0] };
      }
    }
  }

  // Fallback: generic hex detection
  const genericHex = rawLine.match(/\b([0-9A-Fa-f]{2}\s*){4,}\b/g);
  if (genericHex) {
    return {
      hex: genericHex[0].replace(/\s+/g, " ").trim(),
      type: "generic",
      raw: genericHex[0],
    };
  }
  return null;
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
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-b-lg shadow-2xl border-x border-b border-slate-700">
          {activeTab === "parser" ? (
            <ParserTab
              parserState={parserState}
              setParserState={setParserState}
            />
          ) : activeTab === "interpreter" ? (
            <InterpreterTab parsedLogMessages={parserState.parsedMessages} />
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

export default SECS2InterpreterApp;
