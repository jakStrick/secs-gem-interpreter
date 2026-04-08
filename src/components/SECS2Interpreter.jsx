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
      if (formatCode === 0x00) {
        const items = [];
        for (let i = 0; i < length; i++) items.push(this.parseItem(depth + 1));
        return { type: "List", length, items, depth };
      }
      const data = this.readBytes(length);
      if (formatCode === 0x08)
        return {
          type: "Binary",
          value: Array.from(data)
            .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
            .join(" "),
          depth,
        };
      if (formatCode === 0x10)
        return { type: "Boolean", value: data.map((b) => b !== 0), depth };
      if (formatCode === 0x14 || formatCode === 0x40)
        return { type: "ASCII", value: String.fromCharCode(...data), depth };
      if (formatCode === 0x18)
        return { type: "JIS-8", value: String.fromCharCode(...data), depth };
      if (formatCode === 0x20) {
        const values = Array.from(data).map((b) => (b > 127 ? b - 256 : b));
        return { type: "I1", value: values, depth };
      }
      if (formatCode === 0x24 || formatCode === 0x28) {
        const values = [];
        for (let i = 0; i < data.length; i += 2) {
          let val = (data[i] << 8) | data[i + 1];
          if (val > 32767) val -= 65536;
          values.push(val);
        }
        return { type: "I2", value: values, depth };
      }
      if (formatCode === 0x30 || formatCode === 0xa4) {
        const values = [];
        for (let i = 0; i < data.length; i += 4) {
          let val =
            (data[i] << 24) |
            (data[i + 1] << 16) |
            (data[i + 2] << 8) |
            data[i + 3];
          values.push(val | 0);
        }
        return { type: "I4", value: values, depth };
      }
      if (formatCode === 0x60) {
        const values = [];
        for (let i = 0; i < data.length; i += 8) {
          const hex = Array.from(data.slice(i, i + 8))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
          values.push(hex);
        }
        return { type: "I8", value: values, depth };
      }
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
      if (formatCode === 0xa0 || formatCode === 0x28)
        return { type: "U1", value: Array.from(data), depth };
      if (formatCode === 0xa8) {
        const values = [];
        for (let i = 0; i < data.length; i += 2) {
          values.push((data[i] << 8) | data[i + 1]);
        }
        return { type: "U2", value: values, depth };
      }
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
      if (formatCode === 0xa0 && length === 8) {
        const hex = Array.from(data)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        return { type: "U8", value: [hex], depth };
      }
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
    const spaces = " ".repeat(indent);
    if (item.type === "List") {
      let r = `${spaces}<List[${item.length}]>\n`;
      item.items.forEach((s, i) => {
        r += `${spaces} [${i}] ${formatOutput(s, indent + 1)}`;
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
        "╔════════════════════════════════════════════════╗\n║ DECODED SECS-II MESSAGE DATA ║\n╚════════════════════════════════════════════════╝\n\n" +
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

// ==================== ARCH TYPE STYLE ====================
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

// ==================== ARCH NODE — oscillation-free ====================
const ArchNode = ({ node }) => {
  const [hovered, setHovered] = useState(false);
  const c = archTypeStyle(node.type);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: c.bg,
        border: `1.5px solid ${c.border}`,
        borderRadius: 8,
        padding: "8px 12px",
        width: 220,
        cursor: "default",
        position: "relative",
        zIndex: hovered ? 10 : 1,
        boxShadow: hovered ? `0 0 10px ${c.border}44` : "none",
        transition: "box-shadow 0.15s",
      }}
    >
      <div
        style={{
          color: c.label,
          fontSize: 11,
          fontFamily: "monospace",
          fontWeight: 700,
          whiteSpace: "nowrap",
          lineHeight: 1.4,
          textAlign: "left",
        }}
      >
        {node.label}
      </div>
      {hovered && (
        <pre
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            background: "#1e293b",
            border: `1.5px solid ${c.border}`,
            borderRadius: 8,
            padding: "8px 12px",
            paddingTop: 32,
            color: "#cbd5e1",
            fontSize: 10,
            margin: 0,
            lineHeight: 1.6,
            fontFamily: "monospace",
            whiteSpace: "pre",
            textAlign: "left",
            zIndex: 20,
            boxShadow: `0 4px 20px #00000066`,
            pointerEvents: "none",
            minWidth: "max-content",
          }}
        >
          {node.note}
        </pre>
      )}
    </div>
  );
};

// ==================== ARCH LAYERS DATA ====================
const archLayers = [
  {
    id: "plc",
    label: "PLC / HARDWARE LAYER (TwinCAT · EtherCAT · IEC 61131-3)",
    borderColor: "#f87171",
    description:
      "Physics & Safety — Motion, Valves, Interlocks, Sensors. Never speaks SEMI. Never knows jobs.",
    nodes: [
      {
        id: "PlcCommand",
        label: "PlcCommand\n(IEC 61131-3 STRUCT)",
        type: "model",
        note: "BOOL StartCycle\nBOOL Abort\nINT TargetRPM\nDINT SpinTime_ms\n— Written by C# via ADS · PLC reads each scan cycle",
      },
      {
        id: "PlcStatus",
        label: "PlcStatus\n(IEC 61131-3 STRUCT)",
        type: "model",
        note: "BOOL Ready\nBOOL Busy\nBOOL Completed\nINT FaultCode\n— Written by PLC · C# reads via ADS notification",
      },
      {
        id: "PlcSM",
        label: "PLC State Machine\n(TwinCAT FB)",
        type: "state",
        note: "POWERUP → INIT → READY → BUSY → ALARM\n— Owns: chuck vacuum, spin motor, DI valves, lid, interlocks\n— Never knows: jobs, recipes, wafers, SEMI",
      },
      {
        id: "EtherCAT",
        label: "EtherCAT Bus",
        type: "proto",
        note: "Physical fieldbus · deterministic · 1–10ms cycle\nIO → Motors → Valves → Sensors → Drives\n— Real-time layer below TwinCAT runtime",
      },
    ],
  },
  {
    id: "ads",
    label: "ADS BRIDGE LAYER (Beckhoff ADS over EtherCAT)",
    borderColor: "#fb923c",
    description:
      "The only sanctioned crossing point between PLC physics and C# intent — structured data only, no business logic",
    nodes: [
      {
        id: "IAdsTransport",
        label: "«interface»\nIAdsTransport",
        type: "interface",
        note: "Task WriteCommandAsync(PlcCommand cmd)\nTask<PlcStatus> ReadStatusAsync()\nvoid Subscribe(string varName, Action<object> onChange)\nvoid Unsubscribe(string varName)\nbool IsConnected { get; }",
      },
      {
        id: "AdsTransport",
        label: "AdsTransport",
        type: "class",
        note: "public async Task WriteCommandAsync(PlcCommand cmd)\npublic async Task<PlcStatus> ReadStatusAsync()\npublic void Subscribe(string varName, Action<object> onChange)\nprivate void OnAdsNotification(AdsNotificationEventArgs e)\nprivate readonly AdsClient _adsClient\nprivate readonly Dictionary<string, Action<object>> _subscriptions",
      },
      {
        id: "IPlcVariableMap",
        label: "«interface»\nIPlcVariableMap",
        type: "interface",
        note: "string GetCommandPath()\nstring GetStatusPath()\nstring GetFaultCodePath()\n— Maps C# field names to TwinCAT ADS variable paths",
      },
      {
        id: "PlcVariableMap",
        label: "PlcVariableMap",
        type: "class",
        note: "Maps PlcCommand.StartCycle → 'GVL.Command.StartCycle'\nMaps PlcStatus.FaultCode  → 'GVL.Status.FaultCode'\nprivate readonly IConfigRepository _config",
      },
      {
        id: "IPlcHandshake",
        label: "«interface»\nIPlcHandshake",
        type: "interface",
        note: "Task IssueCommandAsync(PlcCommand cmd)\nTask<bool> WaitForBusyAsync(CancellationToken ct)\nTask<bool> WaitForCompleteAsync(CancellationToken ct)\nvoid Reset()",
      },
      {
        id: "PlcHandshake",
        label: "PlcHandshake",
        type: "class",
        note: "public async Task IssueCommandAsync(PlcCommand cmd)\npublic async Task<bool> WaitForBusyAsync(CancellationToken ct)\npublic async Task<bool> WaitForCompleteAsync(CancellationToken ct)\npublic void Reset()\nprivate readonly IAdsTransport _transport\nprivate readonly IMessageLogger _logger",
      },
    ],
  },
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
        note: "External — Sends/Receives SECS-II messages over TCP/IP.\nNo interface defined here — this is the remote system.",
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
        note: "public async Task ConnectAsync(string ip, int port, CancellationToken ct)\npublic async Task DisconnectAsync(CancellationToken ct)\npublic bool IsConnected { get; }\npublic async Task SendAsync(HsmsMessage msg, CancellationToken ct)\nprivate async Task ReceiveLoopAsync(CancellationToken ct)\nprivate readonly TcpClient _client\nprivate NetworkStream _stream",
      },
      {
        id: "HsmsSessionMgr",
        label: "HsmsSessionManager",
        type: "class",
        note: "public async Task SelectAsync()\npublic async Task DeSelectAsync()\npublic async Task SeparateAsync()\npublic async Task SendLinktestAsync()\nprivate void StartHeartbeat()\nprivate async Task ReconnectAsync()\nprivate readonly IHsmsConnection _connection",
      },
      {
        id: "HsmsMessageFramer",
        label: "HsmsMessageFramer",
        type: "class",
        note: "public byte[] Encode(HsmsMessage msg)\npublic HsmsMessage Decode(byte[] data)\npublic static uint GenerateSystemBytes()\nprivate static byte[] BuildHeader(HsmsMessage msg)\nprivate static void ValidateLength(byte[] data)",
      },
      {
        id: "IConnectionObs",
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
        note: "Implements ISecsMessage · S/F fields · Block structure\npublic static SecsMessage Create(byte stream, byte func, ISecsItem root)\nprivate void ValidateStreamFunction()",
      },
      {
        id: "ISecsItem",
        label: "«interface»\nISecsItem",
        type: "interface",
        note: "SecsItemType ItemType { get; }\nobject Value { get; }\nList<ISecsItem> Children { get; }\nbyte[] Encode()\npublic static ISecsItem Decode(byte[] data)",
      },
      {
        id: "SecsItemFactory",
        label: "SecsItemFactory",
        type: "factory",
        note: "public ISecsItem Create(SecsItemType type, object value)\npublic ISecsItem CreateList(IEnumerable<ISecsItem> items)\npublic ISecsItem CreateAscii(string value)\npublic ISecsItem CreateU4(uint value)\npublic ISecsItem CreateBool(bool value)\nprivate static ISecsItem BuildItem(SecsItemType type, object value)",
      },
      {
        id: "SecsEncoder",
        label: "SecsEncoder",
        type: "class",
        note: "public byte[] Encode(ISecsMessage msg)\nprivate static byte[] EncodeItem(ISecsItem item)\nprivate static byte[] EncodeHeader(ISecsMessage msg)\nprivate static byte[] EncodeLength(int length)",
      },
      {
        id: "SecsDecoder",
        label: "SecsDecoder",
        type: "class",
        note: "public ISecsMessage Decode(byte[] data)\nprivate static ISecsItem DecodeItem(byte[] data, ref int offset)\nprivate static SecsItemType ParseFormatCode(byte b)\nprivate static int ParseLength(byte[] data, ref int offset)",
      },
      {
        id: "MessageRouter",
        label: "MessageRouter",
        type: "class",
        note: "public void Register(byte stream, byte func, IMessageHandler handler)\npublic void Unregister(byte stream, byte func)\npublic void Route(ISecsMessage msg)\nprivate readonly Dictionary<(byte,byte), IMessageHandler> _handlers\nprivate readonly IMessageLogger _logger",
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
        note: "Facade Pattern · Implements IGemKernel\npublic async Task SendAsync(ISecsMessage msg)\nprivate void WireSubsystems()\nprivate void OnConnectionStateChanged(object s, ConnectionStateChangedArgs e)\nprivate readonly IHsmsConnection _connection\nprivate readonly ICommunicationStateMachine _commSm\nprivate readonly IControlStateMachine _ctrlSm",
      },
      {
        id: "ICommSM",
        label: "«interface»\nICommunicationStateMachine",
        type: "interface",
        note: "string CurrentStateName { get; }\nvoid Connect()\nvoid Disconnect()\nvoid OnSelectReq()\nvoid OnSeparateReq()\nevent EventHandler<string> StateChanged",
      },
      {
        id: "CommSM",
        label: "CommunicationStateMachine",
        type: "state",
        note: "State Pattern · E30 §8.3\nDisabled → NotCommunicating → Communicating\ninternal void TransitionTo(CommunicationState state)\nprivate CommunicationState _currentState",
      },
      {
        id: "ICtrlSM",
        label: "«interface»\nIControlStateMachine",
        type: "interface",
        note: "string CurrentStateName { get; }\nvoid GoLocal()\nvoid GoRemote()\nvoid GoOffline()\nvoid GoOnline()\nevent EventHandler<string> StateChanged",
      },
      {
        id: "CtrlSM",
        label: "ControlStateMachine",
        type: "state",
        note: "State Pattern · E30 §8.4\nEquipmentOffline → AttemptOnline → Local/Remote\ninternal void TransitionTo(ControlState state)\nprivate ControlState _currentState",
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
        note: "Implements ISpoolingManager · E30 §9\nprivate readonly Queue<ISecsMessage> _spoolQueue\nprivate readonly object _lock",
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
        id: "IProcessJobMgr",
        label: "«interface»\nIProcessJobManager",
        type: "interface",
        note: "AckCode CreateJob(PRJobSpec spec)\nAckCode StartJob(string jobId)\nAckCode PauseJob(string jobId)\nAckCode ResumeJob(string jobId)\nAckCode AbortJob(string jobId, AbortType type)\nPRJobState GetJobState(string jobId)",
      },
      {
        id: "ProcessJobMgr",
        label: "ProcessJobManager",
        type: "class",
        note: "Implements IProcessJobManager · E40\nprivate void OnS16F11(ISecsMessage msg)\nprivate void TransitionJobState(string jobId, PRJobState next)\nprivate readonly Dictionary<string, PRJobRecord> _jobs",
      },
      {
        id: "ICarrierMgr",
        label: "«interface»\nICarrierManager",
        type: "interface",
        note: "AckCode LoadCarrier(CarrierSpec spec)\nAckCode UnloadCarrier(string carrierId)\nAckCode BindCarrier(string carrierId, string portId)\nAckCode CancelBind(string portId)\nCarrierState GetCarrierState(string carrierId)",
      },
      {
        id: "CarrierMgr",
        label: "CarrierManager",
        type: "class",
        note: "Implements ICarrierManager · E87\nprivate void OnS3F17(ISecsMessage msg)\nprivate void TransitionCasState(string carrierId, CarrierState next)\nprivate readonly Dictionary<string, CarrierRecord> _carriers",
      },
      {
        id: "ISubstrateMgr",
        label: "«interface»\nISubstrateManager",
        type: "interface",
        note: "void TrackSubstrate(SubstrateSpec spec)\nvoid UpdateLocation(string substrateId, string locationId)\nSubstrateState GetState(string substrateId)\nIEnumerable<SubstrateRecord> GetAll()",
      },
      {
        id: "SubstrateMgr",
        label: "SubstrateManager",
        type: "class",
        note: "Implements ISubstrateManager · E90\nprivate void OnS14F3(ISecsMessage msg)\nprivate readonly Dictionary<string, SubstrateRecord> _substrates",
      },
      {
        id: "IControlJobMgr",
        label: "«interface»\nIControlJobManager",
        type: "interface",
        note: "AckCode CreateControlJob(ControlJobSpec spec)\nAckCode StartControlJob(string cjId)\nAckCode AbortControlJob(string cjId)\nAckCode PauseControlJob(string cjId)\nControlJobState GetState(string cjId)",
      },
      {
        id: "ControlJobMgr",
        label: "ControlJobManager",
        type: "class",
        note: "Implements IControlJobManager · E94\nprivate void OnS17F1(ISecsMessage msg)\nprivate void LinkToProcessJob(string cjId, string jobId)\nprivate readonly Dictionary<string, ControlJobRecord> _controlJobs",
      },
      {
        id: "IEptMgr",
        label: "«interface»\nIEptManager",
        type: "interface",
        note: "void UpdateEPTState(EptState state)\nEptMetrics GetMetrics()\nvoid RecordStateEntry(EptState state, DateTime timestamp)\nTimeSpan GetTimeInState(EptState state)",
      },
      {
        id: "EptMgr",
        label: "EptManager",
        type: "class",
        note: "Implements IEptManager · E116\nprivate void FireEptCollectionEvent(EptState state)\nprivate readonly Dictionary<EptState, TimeSpan> _stateAccumulator\nprivate EptState _currentState",
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
        id: "IVariableRepo",
        label: "«interface»\nIVariableRepository",
        type: "interface",
        note: "SecsItem GetSV(uint vid)\nSecsItem GetDV(uint vid)\nSecsItem GetECV(uint vid)\nvoid SetECV(uint vid, SecsItem value)\nList<VariableDefinition> GetNamelist(VariableType type)",
      },
      {
        id: "VariableRepo",
        label: "VariableRepository",
        type: "class",
        note: "Repository Pattern · Stores ECVs/SVs/DVs keyed by VID\nprivate void LoadFromConfig()\nprivate readonly Dictionary<uint, SecsItem> _svs\nprivate readonly Dictionary<uint, SecsItem> _dvs\nprivate Dictionary<uint, SecsItem> _ecvs",
      },
      {
        id: "IReportMgr",
        label: "«interface»\nIReportManager",
        type: "interface",
        note: "AckCode DefineReport(uint rptId, uint[] vids)\nAckCode DeleteReport(uint rptId)\nAckCode LinkReport(uint ceid, uint[] rptIds)\nAckCode UnlinkReport(uint ceid, uint[] rptIds)\nReportDefinition GetReport(uint rptId)",
      },
      {
        id: "ReportMgr",
        label: "ReportManager",
        type: "class",
        note: "S2F33 Define · S2F35 Link CEID→RPTID · S2F37 Enable/Disable CE\nprivate void PersistReports()\nprivate readonly Dictionary<uint, ReportDefinition> _reports",
      },
      {
        id: "ICEMgr",
        label: "«interface»\nICollectionEventManager",
        type: "interface",
        note: "void RegisterCE(CollectionEventDefinition ce)\nvoid FireEvent(uint ceid)\nAckCode EnableCE(uint[] ceids)\nAckCode DisableCE(uint[] ceids)\nList<ReportDefinition> GetLinkedReports(uint ceid)\nbool IsEnabled(uint ceid)",
      },
      {
        id: "CEMgr",
        label: "CollectionEventManager",
        type: "class",
        note: "Observer Pattern · Fires S6F11 on event trigger\nprivate ISecsMessage BuildS6F11(uint ceid)\nprivate readonly Dictionary<uint, CollectionEventDefinition> _events",
      },
      {
        id: "ReportDef",
        label: "ReportDefinition",
        type: "model",
        note: "public uint RPTID { get; init; }\npublic uint[] VIDs { get; init; }\npublic string Name { get; init; }",
      },
      {
        id: "CEDef",
        label: "CollectionEventDefinition",
        type: "model",
        note: "public uint CEID { get; init; }\npublic string Name { get; init; }\npublic List<uint> LinkedRPTIDs { get; set; }\npublic bool Enabled { get; set; }",
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
        id: "IAlarmMgr",
        label: "«interface»\nIAlarmManager",
        type: "interface",
        note: "void SetAlarm(uint alid, string text)\nvoid ClearAlarm(uint alid)\nAckCode EnableAlarm(uint alid)\nAckCode DisableAlarm(uint alid)\nIEnumerable<AlarmRecord> GetAlarms()\nbool IsEnabled(uint alid)",
      },
      {
        id: "AlarmMgr",
        label: "AlarmManager",
        type: "class",
        note: "ALID registry · S5F1 on alarm set · S5F3 enable/disable\nprivate async Task SendS5F1(uint alid, bool set, string text)\nprivate readonly Dictionary<uint, AlarmRecord> _alarms",
      },
      {
        id: "IRCMgr",
        label: "«interface»\nIRemoteCommandManager",
        type: "interface",
        note: "void RegisterCommand(string rcmd, Func<CpList, AckCode> handler)\nAckCode ExecuteCommand(string rcmd, CpList parameters)\nIEnumerable<string> GetRegisteredCommands()",
      },
      {
        id: "RCMgr",
        label: "RemoteCommandManager",
        type: "class",
        note: "Command Pattern · S2F41 dispatch · CPNAME/CPVAL\nprivate void OnS2F41(ISecsMessage msg)\nprivate async Task SendS2F42(AckCode code)\nprivate readonly Dictionary<string, Func<CpList,AckCode>> _commands",
      },
      {
        id: "IPPMgr",
        label: "«interface»\nIProcessProgramManager",
        type: "interface",
        note: "AckCode UploadPP(string ppid, byte[] body)\nAckCode DownloadPP(string ppid, out byte[] body)\nAckCode DeletePP(string ppid)\nbool ValidatePP(byte[] body)\nIEnumerable<string> ListPPs()",
      },
      {
        id: "PPMgr",
        label: "ProcessProgramManager",
        type: "class",
        note: "S7F1/3/5 PP transfer · S7F17 delete · S7F19 list\npublic virtual bool ValidatePP(byte[] body)\nprivate void OnS7F3(ISecsMessage msg)\nprivate async Task HandleMultiBlockTransfer(ISecsMessage msg)\nprivate readonly Dictionary<string, byte[]> _programs",
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
        id: "TwincatAdapter",
        label: "TwincatEquipmentAdapter",
        type: "class",
        note: "Adapter Pattern · Bridges IPlcHandshake + IAdsTransport → IEquipmentAdapter\npublic async Task<EquipmentStatus> GetStatusAsync()\npublic async Task ExecuteCommandAsync(string command, object[] args)\npublic async Task<SecsItem> ReadVariableAsync(uint vid)\nprivate void OnAdsNotification(AdsNotificationEventArgs e) → EquipmentEventBus.Publish()\nprivate static SecsItem MapAdsValueToSecsItem(object adsValue)\nprivate readonly IAdsTransport _transport\nprivate readonly IPlcHandshake _handshake\nprivate readonly IEquipmentEventBus _bus",
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
        note: "Executes process recipe steps · Fires StepChanged → EquipmentEventBus\nprivate void AdvanceStep()\nprivate void OnStepComplete(int step)\nprivate RecipeDefinition _activeRecipe\nprivate int _currentStep",
      },
      {
        id: "IEventBus",
        label: "«interface»\nIEquipmentEventBus",
        type: "interface",
        note: "void Publish(EquipmentEvent evt)\nvoid Subscribe(uint ceid, Action<EquipmentEvent> handler)\nvoid Unsubscribe(uint ceid, Action<EquipmentEvent> handler)",
      },
      {
        id: "EventBus",
        label: "EquipmentEventBus",
        type: "class",
        note: "Mediator Pattern · Thread-safe dispatch via Channel<T>\nprivate async Task DispatchToSubscribers(EquipmentEvent evt)\nprivate readonly Channel<EquipmentEvent> _channel\nprivate readonly Dictionary<uint, List<Action<EquipmentEvent>>> _subscribers",
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
        note: "Structured logging · Rotating file + real-time stream\nprivate void WriteEntry(string direction, ISecsMessage msg)\nprivate void RotateLogFile()\nprivate readonly StreamWriter _writer",
      },
      {
        id: "IConfigRepo",
        label: "«interface»\nIConfigRepository",
        type: "interface",
        note: "string GetSetting(string key)\nvoid SetSetting(string key, string value)\nT GetSection<T>(string key)\nvoid Save()\nvoid Load()",
      },
      {
        id: "ConfigRepo",
        label: "ConfigRepository",
        type: "class",
        note: "JSON/DB-backed · Stores HSMS params, VID/CEID/RPTID maps\nprivate void ValidateSchema()\nprivate readonly Dictionary<string, object> _config\nprivate readonly string _filePath",
      },
      {
        id: "DiContainer",
        label: "DI Container\n(Microsoft.Extensions.DI)",
        type: "infra",
        note: "Wires all interfaces to concrete implementations\nSingleton lifetimes for all GEM objects\nScoped for per-job contexts",
      },
      {
        id: "ErrorHandler",
        label: "ErrorHandler / RetryPolicy",
        type: "infra",
        note: "Polly-based retry with exponential backoff\nCircuit breaker on HSMS send failures\nDead-letter queue for undeliverable messages",
      },
    ],
  },
];

// ==================== DESIGN PATTERNS ====================
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
    used: "IEquipmentAdapter / TwincatEquipmentAdapter — translates IPlcHandshake + IAdsTransport to IEquipmentAdapter contract without GEM knowing about Beckhoff",
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
    used: "Abstract SecsMessageHandler base class — defines Handle() skeleton; subclasses override ProcessMessage() to fill in SxFy-specific logic",
  },
  {
    pattern: "Strategy",
    used: "Reconnect/retry strategies injected into HsmsSessionManager\nEncoding strategies per SECS-II item type in SecsItemFactory",
  },
];

// ==================== APPENDIX MESSAGES ====================
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

// ==================== SEMI DOCS ====================
const archSemiDocs = [
  {
    order: 1,
    doc: "SEMI E5",
    title: "SECS-II Message Content",
    layer: "Layer 2",
    layerColor: "#4ade80",
    why: "Read first — defines every data item type (L, A, B, U1/2/4/8, I1/2/4/8, F4/F8, BOOLEAN), item header format, block structure, and multi-block rules. You cannot encode or decode a single message without this.",
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
    why: "Defines TCP/IP framing, 10-byte header structure, SType values (Select/Deselect/Separate/Linktest), T3/T5/T6/T7 timers, Active vs Passive mode, session establishment.",
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
    why: "Skim only. E30 was originally written against E4 (RS-232 serial). You will hit confusing E30 footnotes and behavioral references without knowing this exists. You won't implement it.",
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
    why: "Defines Process Job creation, state machine (Queued → Setting Up → Processing → Process Complete → Stopped), abort types, S16Fxx message set, and PRJobSpec structure.",
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
    why: "Defines how individual substrates (wafers) are tracked through Source, Process, and Destination states. S14F1/F3 GetAttr/SetAttr. Required to report per-wafer disposition to the host.",
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
    why: "Defines the parallel handshake signals (CS_0, CS_1, VALID, TR_REQ, BUSY, COMPT) between the EFEM/AGV and the load port hardware. CarrierManager state transitions must align with E84 hardware signals.",
    implements: ["TwincatEquipmentAdapter (hardware bridge)"],
  },
  {
    order: 11,
    doc: "SEMI E39",
    title: "OSS — Object Services Standard",
    layer: "Layer 3/4 (ref)",
    layerColor: "#c084fc",
    why: "Defines the attribute-based object model used by E87, E90, and E94 — the GetAttr (S14F1) / SetAttr (S14F3) pattern. Read this before implementing any S14 message handling.",
    implements: [
      "S14F1/F3 handlers in CarrierManager, SubstrateManager, ControlJobManager",
    ],
  },
  {
    order: 12,
    doc: "SEMI E42",
    title: "Recipe Management",
    layer: "Layer 3",
    layerColor: "#c084fc",
    why: "Extends E30 Process Program management with formatted recipes, parameter validation, and recipe versioning. Required if your tool supports structured recipe download/upload beyond raw byte transfer.",
    implements: ["IProcessProgramManager", "IRecipeEngine"],
  },
  {
    order: 13,
    doc: "SEMI E148",
    title: "Time Synchronization",
    layer: "Layer 3 (ref)",
    layerColor: "#c084fc",
    why: "Defines how equipment clocks are synchronized with the host via S2F17/S2F31. Important for ISO 9000 traceability — timestamp alignment across tools and MES is an audit requirement.",
    implements: ["GemKernel (S2F17/S2F31 handlers)"],
  },
  {
    order: 14,
    doc: "SEMI E058",
    title: "OEE — Overall Equipment Effectiveness",
    layer: "Cross-cutting",
    layerColor: "#94a3b8",
    why: "Defines the OEE calculation framework that E116 EPT state data feeds into. Governs how EptManager state definitions must be structured to produce valid OEE metrics for ISO 9000 reporting.",
    implements: ["EptManager (state taxonomy alignment)"],
  },
];

// ==================== MESSAGE FLOW ====================
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

// ==================== LAYER LABEL ====================
const layerLabel = (id) => {
  if (id === "plc") return "LAYER PLC";
  if (id === "ads") return "LAYER ADS";
  const idx = archLayers.findIndex((l) => l.id === id);
  return `LAYER ${idx - 2}`;
};

// ==================== FULL ARCHITECTURE TAB ====================
const FullArchitectureTab = () => {
  const [tab, setTab] = useState("arch");
  const [expandedStream, setExpandedStream] = useState(null);

  const legendTypes = [
    ["interface", "Interface"],
    ["class", "Concrete Class"],
    ["factory", "Factory"],
    ["state", "State Machine"],
    ["model", "Data Model"],
    ["infra", "Infrastructure"],
    ["external", "External"],
    ["proto", "Protocol"],
  ];
  const semiLegend = [
    ["#4ade80", "Layer 2 — SECS-II"],
    ["#2dd4bf", "Layer 1 — Transport"],
    ["#f87171", "Layer 1 (ref)"],
    ["#c084fc", "Layer 3 — GEM Core"],
    ["#fb923c", "Layer 4 — GEM300"],
    ["#94a3b8", "Cross-cutting"],
  ];

  const tabs = [
    ["arch", "Architecture"],
    ["flow", "Message Flow"],
    ["patterns", "Design Patterns"],
    ["appendix", "Appendix: Messages"],
    ["semidocs", "SEMI Documents"],
    ["printable", "Printable Version"],
  ];

  return (
    <div
      style={{
        background: "#070d1a",
        minHeight: "100vh",
        color: "#f1f5f9",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Sticky header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
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

      {/* Sticky tab bar */}
      <div
        style={{
          position: "sticky",
          top: 57,
          zIndex: 100,
          display: "flex",
          borderBottom: "1px solid #1e293b",
          background: "#0a1120",
        }}
      >
        {tabs.map(([id, label]) => (
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

      {/* ARCHITECTURE TAB */}
      {tab === "arch" && (
        <div style={{ padding: "18px 24px" }}>
          {/* Sticky legend */}
          <div
            style={{
              position: "sticky",
              top: 100,
              zIndex: 90,
              background: "#070d1a",
              borderBottom: "1px solid #1e293b",
              paddingBottom: 10,
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 10, color: "#475569", marginBottom: 8 }}>
              Hover any node to reveal interface contract / methods /
              responsibilities. Layers run top-down: PLC → ADS → Host →
              Transport → SECS-II → GEM Core → GEM300 → Data Collection → Alarms
              → Equipment → Infrastructure.
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {legendTypes.map(([t, l]) => {
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
            {archLayers.map((layer) => (
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
                    {layerLabel(layer.id)}
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

      {/* MESSAGE FLOW TAB */}
      {tab === "flow" && (
        <div style={{ padding: "24px" }}>
          <div style={{ fontSize: 12, color: "#475569", marginBottom: 20 }}>
            Bidirectional message flows. → = Tool to Host, ← = Host to Tool.
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

      {/* PATTERNS TAB */}
      {tab === "patterns" && (
        <div style={{ padding: "24px", textAlign: "left" }}>
          <div style={{ fontSize: 12, color: "#475569", marginBottom: 18 }}>
            All design patterns applied, with concrete class mappings.
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

      {/* APPENDIX TAB */}
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

      {/* PRINTABLE TAB */}
      {tab === "printable" && (
        <iframe
          srcDoc={`<!DOCTYPE html>
<html>
<head>
<style>
  @media print { .no-print{display:none;} body{margin:0;} .page-break{page-break-before:always;} .avoid-break{page-break-inside:avoid;} }
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#1a1a2e;background:#fff;padding:24px;max-width:1100px;margin:0 auto;}
  .print-btn{position:fixed;top:16px;right:16px;background:#1e3a6e;color:#fff;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;z-index:999;}
  .print-btn:hover{background:#2a52a0;}
  .cover{text-align:center;padding:40px 0 32px;border-bottom:3px solid #1e3a6e;margin-bottom:32px;}
  .cover h1{font-size:26px;color:#0f2035;letter-spacing:1px;margin-bottom:6px;}
  .cover .subtitle{font-size:12px;color:#64748b;margin-bottom:4px;}
  .cover .date{font-size:11px;color:#94a3b8;}
  .section-title{font-size:15px;font-weight:700;color:#0f2035;border-bottom:2px solid #1e3a6e;padding-bottom:6px;margin:28px 0 14px;letter-spacing:0.5px;}
  .legend{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:18px;padding:10px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;}
  .legend-item{display:flex;align-items:center;gap:5px;font-size:10px;color:#475569;}
  .legend-swatch{width:12px;height:12px;border-radius:3px;border:1.5px solid;}
  .layer{border-radius:8px;border:1.5px solid;padding:12px 14px;margin-bottom:14px;}
  .layer-header{margin-bottom:10px;}
  .layer-num{font-size:9px;font-weight:800;letter-spacing:1.5px;}
  .layer-name{font-size:13px;font-weight:700;color:#0f172a;}
  .layer-desc{font-size:10px;color:#64748b;font-style:italic;margin-top:2px;}
  .nodes{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-start;}
  .node-card{border:1.5px solid;border-radius:6px;padding:8px 10px;flex:0 0 auto;}
  .node-label{font-size:10px;font-family:monospace;font-weight:700;white-space:pre-line;line-height:1.4;margin-bottom:5px;}
  .node-note{font-size:9px;font-family:monospace;color:#334155;line-height:1.6;border-top:1px solid #e2e8f0;padding-top:5px;white-space:pre;}
  .am-pub{color:#16a34a;} .am-priv{color:#dc2626;} .am-prot{color:#d97706;} .am-int{color:#7c3aed;}
  .flow-table{width:100%;border-collapse:collapse;margin-bottom:24px;}
  .flow-table th{background:#0f2035;color:#fff;padding:7px 10px;font-size:10px;text-align:left;}
  .flow-table td{padding:6px 10px;font-size:10px;border-bottom:1px solid #e2e8f0;font-family:monospace;}
  .flow-table tr:nth-child(even) td{background:#f8fafc;}
  .dir-out{color:#1e40af;font-weight:700;} .dir-in{color:#166534;font-weight:700;}
  .seq-step{display:grid;grid-template-columns:26px 180px 1fr;gap:0 10px;align-items:start;margin-bottom:8px;}
  .seq-num{background:#0f2035;color:#fff;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;}
  .seq-title{font-size:10px;font-family:monospace;font-weight:700;color:#1e40af;}
  .seq-desc{font-size:10px;color:#475569;}
  .pattern-row{display:grid;grid-template-columns:150px 1fr;gap:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:9px 12px;margin-bottom:8px;}
  .pattern-name{font-size:10px;font-family:monospace;font-weight:700;color:#7c3aed;}
  .pattern-used{font-size:10px;color:#475569;line-height:1.6;white-space:pre-wrap;}
  .iface-block{margin-bottom:10px;background:#f8fafc;border:1px solid #bfdbfe;border-left:3px solid #1e40af;border-radius:6px;padding:9px 12px;}
  .iface-name{font-size:10px;font-family:monospace;font-weight:700;color:#1e40af;margin-bottom:5px;}
  .iface-sigs{font-size:9px;font-family:monospace;color:#166534;line-height:1.7;white-space:pre-wrap;}
  .semi-doc{border-radius:6px;border:1px solid;border-left:3px solid;padding:10px 14px;margin-bottom:10px;}
  .semi-doc-header{display:flex;align-items:baseline;gap:8px;margin-bottom:4px;}
  .semi-why{font-size:10px;color:#475569;line-height:1.6;margin-bottom:6px;}
  .semi-tags{display:flex;flex-wrap:wrap;gap:4px;}
  .semi-tag{background:#eff6ff;color:#1e40af;font-size:8px;font-family:monospace;padding:2px 6px;border-radius:3px;border:1px solid #bfdbfe;}
  .stream-block{margin-bottom:12px;}
  .stream-header{background:#0f2035;color:#93c5fd;font-family:monospace;font-weight:700;font-size:11px;padding:5px 10px;border-radius:5px 5px 0 0;}
  .stream-msgs{border:1px solid #e2e8f0;border-top:none;border-radius:0 0 5px 5px;}
  .stream-msg{font-size:10px;font-family:monospace;color:#334155;padding:4px 10px;border-bottom:1px solid #f1f5f9;}
  .stream-msg:last-child{border-bottom:none;}
  .stream-msg:nth-child(even){background:#f8fafc;}
  h2.sub{font-size:12px;font-weight:700;color:#0f2035;margin:18px 0 10px;border-left:3px solid #1e40af;padding-left:8px;}
  .am-legend{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:14px;padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;font-size:10px;font-family:monospace;}
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">🖨 Print / Save PDF</button>
<div class="cover avoid-break">
  <h1>SECS/GEM300 FULL ARCHITECTURE</h1>
  <div class="subtitle">SEMI E5 · E30 · E37 · E40 · E84 · E87 · E90 · E94 · E116</div>
  <div class="subtitle">ISO 9000 High-Volume Manufacturing — Complete Implementation Reference</div>
  <div class="date">Generated: <script>document.write(new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}))</script></div>
</div>
<div class="avoid-break">
  <div class="section-title">TABLE OF CONTENTS</div>
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:4px 0;font-size:11px;width:30px;">1.</td><td style="padding:4px 0;font-size:11px;">Architecture — Layer Overview</td></tr>
    <tr><td style="padding:4px 0;font-size:11px;">2.</td><td style="padding:4px 0;font-size:11px;">Message Flow & CE/Report Sequence</td></tr>
    <tr><td style="padding:4px 0;font-size:11px;">3.</td><td style="padding:4px 0;font-size:11px;">Design Patterns & Interface Contracts</td></tr>
    <tr><td style="padding:4px 0;font-size:11px;">4.</td><td style="padding:4px 0;font-size:11px;">SEMI Documents — Reading Order</td></tr>
    <tr><td style="padding:4px 0;font-size:11px;">5.</td><td style="padding:4px 0;font-size:11px;">Appendix — Complete SECS-II Message Catalog</td></tr>
  </table>
</div>
<div class="page-break">
  <div class="section-title">1. ARCHITECTURE — LAYER OVERVIEW</div>
  <div class="legend">
    <div class="legend-item"><div class="legend-swatch" style="background:#e8f4fd;border-color:#1e40af;"></div>Interface</div>
    <div class="legend-item"><div class="legend-swatch" style="background:#f0fdf4;border-color:#16a34a;"></div>Concrete Class</div>
    <div class="legend-item"><div class="legend-swatch" style="background:#faf5ff;border-color:#7c3aed;"></div>Factory</div>
    <div class="legend-item"><div class="legend-swatch" style="background:#fff7ed;border-color:#ea580c;"></div>State Machine</div>
    <div class="legend-item"><div class="legend-swatch" style="background:#fefce8;border-color:#ca8a04;"></div>Data Model</div>
    <div class="legend-item"><div class="legend-swatch" style="background:#f8fafc;border-color:#64748b;"></div>Infrastructure</div>
    <div class="legend-item"><div class="legend-swatch" style="background:#eef2ff;border-color:#4f46e5;"></div>External</div>
    <div class="legend-item"><div class="legend-swatch" style="background:#fef2f2;border-color:#dc2626;"></div>Protocol</div>
  </div>
  <div class="am-legend">
    <span><span class="am-pub">public</span> — accessible from any layer</span>
    <span><span class="am-priv">private</span> — internal to class only</span>
    <span><span class="am-prot">protected</span> — accessible by class + subclasses</span>
    <span><span class="am-int">internal</span> — accessible within assembly only</span>
  </div>
  <div id="arch-layers"></div>
  <script>
  function am(modifier, text) {
    var tokens = modifier.split(' ');
    var access = tokens[0];
    var rest = tokens.slice(1).join(' ');
    var cls = access === 'public' ? 'am-pub' : access === 'private' ? 'am-priv' : access === 'protected' ? 'am-prot' : 'am-int';
    var restHtml = rest ? ' <span style="color:#94a3b8">' + rest + '</span>' : '';
    return '<span class="' + cls + '">' + access + '</span>' + restHtml + ' ' + text;
  }
  var layers = [
    { num:'PLC', label:'PLC / HARDWARE LAYER (TwinCAT · EtherCAT · IEC 61131-3)', border:'#f87171', bg:'#fff5f5',
      desc:'Physics & Safety — Motion, Valves, Interlocks, Sensors. Never speaks SEMI. Never knows jobs.',
      nodes:[
        { label:'PlcCommand\\n(IEC 61131-3 STRUCT)', type:'model', note:'BOOL StartCycle\\nBOOL Abort\\nINT TargetRPM\\nDINT SpinTime_ms\\n— Written by C# via ADS · PLC reads each scan cycle' },
        { label:'PlcStatus\\n(IEC 61131-3 STRUCT)', type:'model', note:'BOOL Ready\\nBOOL Busy\\nBOOL Completed\\nINT FaultCode\\n— Written by PLC · C# reads via ADS notification' },
        { label:'PLC State Machine\\n(TwinCAT FB)', type:'state', note:'POWERUP → INIT → READY → BUSY → ALARM\\n— Owns: chuck vacuum, spin motor, DI valves, lid, interlocks\\n— Never knows: jobs, recipes, wafers, SEMI' },
        { label:'EtherCAT Bus', type:'proto', note:'Physical fieldbus · deterministic · 1–10ms cycle\\nIO → Motors → Valves → Sensors → Drives' },
      ]
    },
    { num:'ADS', label:'ADS BRIDGE LAYER (Beckhoff ADS over EtherCAT)', border:'#ea580c', bg:'#fff7ed',
      desc:'The only sanctioned crossing point between PLC physics and C# intent — structured data only, no business logic',
      nodes:[
        { label:'«interface»\\nIAdsTransport', type:'interface', note:[am('public','Task WriteCommandAsync(PlcCommand cmd)'),am('public','Task<PlcStatus> ReadStatusAsync()'),am('public','void Subscribe(string varName, Action<object> onChange)'),am('public','void Unsubscribe(string varName)'),am('public','bool IsConnected { get; }')].join('\\n')},
        { label:'AdsTransport', type:'class', note:[am('public async','Task WriteCommandAsync(PlcCommand cmd)'),am('public async','Task<PlcStatus> ReadStatusAsync()'),am('public','void Subscribe(string varName, Action<object> onChange)'),am('private','void OnAdsNotification(AdsNotificationEventArgs e)'),am('private readonly','AdsClient _adsClient'),am('private readonly','Dictionary<string, Action<object>> _subscriptions')].join('\\n')},
        { label:'«interface»\\nIPlcVariableMap', type:'interface', note:[am('public','string GetCommandPath()'),am('public','string GetStatusPath()'),am('public','string GetFaultCodePath()')].join('\\n')},
        { label:'PlcVariableMap', type:'class', note:[am('public','string GetCommandPath()'),am('public','string GetStatusPath()'),am('public','string GetFaultCodePath()'),am('private readonly','IConfigRepository _config')].join('\\n')},
        { label:'«interface»\\nIPlcHandshake', type:'interface', note:[am('public','Task IssueCommandAsync(PlcCommand cmd)'),am('public','Task<bool> WaitForBusyAsync(CancellationToken ct)'),am('public','Task<bool> WaitForCompleteAsync(CancellationToken ct)'),am('public','void Reset()')].join('\\n')},
        { label:'PlcHandshake', type:'class', note:[am('public async','Task IssueCommandAsync(PlcCommand cmd)'),am('public async','Task<bool> WaitForBusyAsync(CancellationToken ct)'),am('public async','Task<bool> WaitForCompleteAsync(CancellationToken ct)'),am('public','void Reset()'),am('private readonly','IAdsTransport _transport'),am('private readonly','IMessageLogger _logger')].join('\\n')},
      ]
    },
    { num:0, label:'HOST / MES LAYER', border:'#1e40af', bg:'#f0f6ff',
      desc:'ISO 9000 High-Volume Manufacturing Facility (HSMS TCP/IP)',
      nodes:[
        { label:'MES / Host System', type:'external', note:'External system — no interface defined here.\\nThis is the remote host the tool communicates with.' },
        { label:'HSMS Protocol Stack', type:'proto', note:'TCP/IP · Port 5000 · Active or Passive mode · E37 compliant' },
      ]
    },
    { num:1, label:'TRANSPORT / COMMUNICATION LAYER', border:'#0891b2', bg:'#f0fdfa',
      desc:'SEMI E37 HSMS — Connection Management, Session, Framing',
      nodes:[
        { label:'«interface»\\nIHsmsConnection', type:'interface', note:[am('public','Task ConnectAsync(string ip, int port, CancellationToken ct)'),am('public','Task DisconnectAsync(CancellationToken ct)'),am('public','bool IsConnected { get; }'),am('public','Task SendAsync(HsmsMessage msg, CancellationToken ct)'),am('public','event EventHandler<HsmsMessage> MessageReceived'),am('public','event EventHandler<ConnectionStateChangedArgs> ConnectionStateChanged')].join('\\n')},
        { label:'HsmsConnection', type:'class', note:[am('public async','Task ConnectAsync(string ip, int port, CancellationToken ct)'),am('public async','Task DisconnectAsync(CancellationToken ct)'),am('public','bool IsConnected { get; }'),am('public async','Task SendAsync(HsmsMessage msg, CancellationToken ct)'),am('private async','Task ReceiveLoopAsync(CancellationToken ct)'),am('private readonly','TcpClient _client'),am('private','NetworkStream _stream')].join('\\n')},
        { label:'HsmsSessionManager', type:'class', note:[am('public async','Task SelectAsync()'),am('public async','Task DeSelectAsync()'),am('public async','Task SeparateAsync()'),am('public async','Task SendLinktestAsync()'),am('private','void StartHeartbeat()'),am('private async','Task ReconnectAsync()'),am('private readonly','IHsmsConnection _connection')].join('\\n')},
        { label:'HsmsMessageFramer', type:'class', note:[am('public','byte[] Encode(HsmsMessage msg)'),am('public','HsmsMessage Decode(byte[] data)'),am('public static','uint GenerateSystemBytes()'),am('private static','byte[] BuildHeader(HsmsMessage msg)'),am('private static','void ValidateLength(byte[] data)')].join('\\n')},
        { label:'«interface»\\nIConnectionObserver', type:'interface', note:[am('public','void OnConnected()'),am('public','void OnDisconnected()'),am('public','void OnMessageReceived(HsmsMessage msg)')].join('\\n')},
      ]
    },
    { num:2, label:'SECS-II ENCODE / DECODE LAYER', border:'#16a34a', bg:'#f0fdf4',
      desc:'SEMI E5 — Message Encoding, Item Trees, Data Types',
      nodes:[
        { label:'«interface»\\nISecsMessage', type:'interface', note:[am('public','byte Stream { get; }'),am('public','byte Function { get; }'),am('public','bool ReplyBit { get; }'),am('public','uint SystemBytes { get; }'),am('public','ISecsItem Root { get; }'),am('public','byte[] Encode()')].join('\\n')},
        { label:'SecsMessage', type:'class', note:[am('public','byte Stream { get; }'),am('public','byte Function { get; }'),am('public','bool ReplyBit { get; }'),am('public','uint SystemBytes { get; }'),am('public','ISecsItem Root { get; }'),am('public','byte[] Encode()'),am('public static','SecsMessage Create(byte stream, byte func, ISecsItem root)'),am('private','void ValidateStreamFunction()')].join('\\n')},
        { label:'«interface»\\nISecsItem', type:'interface', note:[am('public','SecsItemType ItemType { get; }'),am('public','object Value { get; }'),am('public','List<ISecsItem> Children { get; }'),am('public','byte[] Encode()'),am('public static','ISecsItem Decode(byte[] data)')].join('\\n')},
        { label:'SecsItemFactory', type:'factory', note:[am('public','ISecsItem Create(SecsItemType type, object value)'),am('public','ISecsItem CreateList(IEnumerable<ISecsItem> items)'),am('public','ISecsItem CreateAscii(string value)'),am('public','ISecsItem CreateU4(uint value)'),am('public','ISecsItem CreateBool(bool value)'),am('private static','ISecsItem BuildItem(SecsItemType type, object value)')].join('\\n')},
        { label:'SecsEncoder', type:'class', note:[am('public','byte[] Encode(ISecsMessage msg)'),am('private static','byte[] EncodeItem(ISecsItem item)'),am('private static','byte[] EncodeHeader(ISecsMessage msg)'),am('private static','byte[] EncodeLength(int length)')].join('\\n')},
        { label:'SecsDecoder', type:'class', note:[am('public','ISecsMessage Decode(byte[] data)'),am('private static','ISecsItem DecodeItem(byte[] data, ref int offset)'),am('private static','SecsItemType ParseFormatCode(byte b)'),am('private static','int ParseLength(byte[] data, ref int offset)')].join('\\n')},
        { label:'MessageRouter', type:'class', note:[am('public','void Register(byte stream, byte func, IMessageHandler handler)'),am('public','void Unregister(byte stream, byte func)'),am('public','void Route(ISecsMessage msg)'),am('private readonly','Dictionary<(byte,byte), IMessageHandler> _handlers'),am('private readonly','IMessageLogger _logger')].join('\\n')},
      ]
    },
    { num:3, label:'GEM CORE LAYER (E30)', border:'#7c3aed', bg:'#faf5ff',
      desc:'SEMI E30 — State Machines, Variables, Events, Alarms, Remote Commands',
      nodes:[
        { label:'«interface»\\nIGemKernel', type:'interface', note:[am('public','void Start()'),am('public','void Stop()'),am('public','void ProcessIncomingMessage(ISecsMessage msg)'),am('public','GemState GetCommunicationState()'),am('public','GemState GetControlState()'),am('public','Task SendAsync(ISecsMessage msg)')].join('\\n')},
        { label:'GemKernel', type:'class', note:[am('public','void Start()'),am('public','void Stop()'),am('public','void ProcessIncomingMessage(ISecsMessage msg)'),am('public','GemState GetCommunicationState()'),am('public','GemState GetControlState()'),am('public async','Task SendAsync(ISecsMessage msg)'),am('private','void WireSubsystems()'),am('private','void OnConnectionStateChanged(object s, ConnectionStateChangedArgs e)'),am('private readonly','IHsmsConnection _connection'),am('private readonly','ICommunicationStateMachine _commSm'),am('private readonly','IControlStateMachine _ctrlSm')].join('\\n')},
        { label:'«interface»\\nICommunicationStateMachine', type:'interface', note:[am('public','string CurrentStateName { get; }'),am('public','void Connect()'),am('public','void Disconnect()'),am('public','void OnSelectReq()'),am('public','void OnSeparateReq()'),am('public','event EventHandler<string> StateChanged')].join('\\n')},
        { label:'CommunicationStateMachine', type:'state', note:[am('public','string CurrentStateName { get; }'),am('public','void Connect()'),am('public','void Disconnect()'),am('public','void OnSelectReq()'),am('public','void OnSeparateReq()'),am('public','event EventHandler<string> StateChanged'),am('internal','void TransitionTo(CommunicationState state)'),am('private','CommunicationState _currentState')].join('\\n')},
        { label:'«interface»\\nIControlStateMachine', type:'interface', note:[am('public','string CurrentStateName { get; }'),am('public','void GoLocal()'),am('public','void GoRemote()'),am('public','void GoOffline()'),am('public','void GoOnline()'),am('public','event EventHandler<string> StateChanged')].join('\\n')},
        { label:'ControlStateMachine', type:'state', note:[am('public','string CurrentStateName { get; }'),am('public','void GoLocal()'),am('public','void GoRemote()'),am('public','void GoOffline()'),am('public','void GoOnline()'),am('public','event EventHandler<string> StateChanged'),am('internal','void TransitionTo(ControlState state)'),am('private','ControlState _currentState')].join('\\n')},
        { label:'«interface»\\nISpoolingManager', type:'interface', note:[am('public','void Spool(ISecsMessage msg)'),am('public','IEnumerable<ISecsMessage> Unspool()'),am('public','void Purge()'),am('public','int SpoolCount { get; }'),am('public','bool IsSpoolingActive { get; }')].join('\\n')},
        { label:'SpoolingManager', type:'class', note:[am('public','void Spool(ISecsMessage msg)'),am('public','IEnumerable<ISecsMessage> Unspool()'),am('public','void Purge()'),am('public','int SpoolCount { get; }'),am('public','bool IsSpoolingActive { get; }'),am('private readonly','Queue<ISecsMessage> _spoolQueue'),am('private readonly','object _lock')].join('\\n')},
      ]
    },
    { num:4, label:'GEM300 LAYER (E40 · E87 · E90 · E94 · E116)', border:'#ea580c', bg:'#fff7ed',
      desc:'300mm Extensions — Process Jobs, Carrier, Substrate, Control Jobs, EPT',
      nodes:[
        { label:'«interface»\\nIProcessJobManager', type:'interface', note:[am('public','AckCode CreateJob(PRJobSpec spec)'),am('public','AckCode StartJob(string jobId)'),am('public','AckCode PauseJob(string jobId)'),am('public','AckCode ResumeJob(string jobId)'),am('public','AckCode AbortJob(string jobId, AbortType type)'),am('public','PRJobState GetJobState(string jobId)')].join('\\n')},
        { label:'ProcessJobManager', type:'class', note:[am('public','AckCode CreateJob(PRJobSpec spec)'),am('public','AckCode StartJob(string jobId)'),am('public','AckCode PauseJob(string jobId)'),am('public','AckCode ResumeJob(string jobId)'),am('public','AckCode AbortJob(string jobId, AbortType type)'),am('public','PRJobState GetJobState(string jobId)'),am('private','void OnS16F11(ISecsMessage msg)'),am('private','void TransitionJobState(string jobId, PRJobState next)'),am('private readonly','Dictionary<string, PRJobRecord> _jobs')].join('\\n')},
        { label:'«interface»\\nICarrierManager', type:'interface', note:[am('public','AckCode LoadCarrier(CarrierSpec spec)'),am('public','AckCode UnloadCarrier(string carrierId)'),am('public','AckCode BindCarrier(string carrierId, string portId)'),am('public','AckCode CancelBind(string portId)'),am('public','CarrierState GetCarrierState(string carrierId)')].join('\\n')},
        { label:'CarrierManager', type:'class', note:[am('public','AckCode LoadCarrier(CarrierSpec spec)'),am('public','AckCode UnloadCarrier(string carrierId)'),am('public','AckCode BindCarrier(string carrierId, string portId)'),am('public','AckCode CancelBind(string portId)'),am('public','CarrierState GetCarrierState(string carrierId)'),am('private','void OnS3F17(ISecsMessage msg)'),am('private','void TransitionCasState(string carrierId, CarrierState next)'),am('private readonly','Dictionary<string, CarrierRecord> _carriers')].join('\\n')},
        { label:'«interface»\\nISubstrateManager', type:'interface', note:[am('public','void TrackSubstrate(SubstrateSpec spec)'),am('public','void UpdateLocation(string substrateId, string locationId)'),am('public','SubstrateState GetState(string substrateId)'),am('public','IEnumerable<SubstrateRecord> GetAll()')].join('\\n')},
        { label:'SubstrateManager', type:'class', note:[am('public','void TrackSubstrate(SubstrateSpec spec)'),am('public','void UpdateLocation(string substrateId, string locationId)'),am('public','SubstrateState GetState(string substrateId)'),am('public','IEnumerable<SubstrateRecord> GetAll()'),am('private','void OnS14F3(ISecsMessage msg)'),am('private readonly','Dictionary<string, SubstrateRecord> _substrates')].join('\\n')},
        { label:'«interface»\\nIControlJobManager', type:'interface', note:[am('public','AckCode CreateControlJob(ControlJobSpec spec)'),am('public','AckCode StartControlJob(string cjId)'),am('public','AckCode AbortControlJob(string cjId)'),am('public','AckCode PauseControlJob(string cjId)'),am('public','ControlJobState GetState(string cjId)')].join('\\n')},
        { label:'ControlJobManager', type:'class', note:[am('public','AckCode CreateControlJob(ControlJobSpec spec)'),am('public','AckCode StartControlJob(string cjId)'),am('public','AckCode AbortControlJob(string cjId)'),am('public','AckCode PauseControlJob(string cjId)'),am('public','ControlJobState GetState(string cjId)'),am('private','void OnS17F1(ISecsMessage msg)'),am('private','void LinkToProcessJob(string cjId, string jobId)'),am('private readonly','Dictionary<string, ControlJobRecord> _controlJobs')].join('\\n')},
        { label:'«interface»\\nIEptManager', type:'interface', note:[am('public','void UpdateEPTState(EptState state)'),am('public','EptMetrics GetMetrics()'),am('public','void RecordStateEntry(EptState state, DateTime timestamp)'),am('public','TimeSpan GetTimeInState(EptState state)')].join('\\n')},
        { label:'EptManager', type:'class', note:[am('public','void UpdateEPTState(EptState state)'),am('public','EptMetrics GetMetrics()'),am('public','void RecordStateEntry(EptState state, DateTime timestamp)'),am('public','TimeSpan GetTimeInState(EptState state)'),am('private','void FireEptCollectionEvent(EptState state)'),am('private readonly','Dictionary<EptState, TimeSpan> _stateAccumulator'),am('private','EptState _currentState')].join('\\n')},
      ]
    },
    { num:5, label:'DATA COLLECTION LAYER — ECVs · SVs · DVs · Reports · Collection Events', border:'#16a34a', bg:'#f0fdf4',
      desc:'E30 §7 — Variables, Report Definitions, Collection Events, CEID→RPTID→VID Linkage',
      nodes:[
        { label:'«interface»\\nIVariableRepository', type:'interface', note:[am('public','SecsItem GetSV(uint vid)'),am('public','SecsItem GetDV(uint vid)'),am('public','SecsItem GetECV(uint vid)'),am('public','void SetECV(uint vid, SecsItem value)'),am('public','List<VariableDefinition> GetNamelist(VariableType type)')].join('\\n')},
        { label:'VariableRepository', type:'class', note:[am('public','SecsItem GetSV(uint vid)'),am('public','SecsItem GetDV(uint vid)'),am('public','SecsItem GetECV(uint vid)'),am('public','void SetECV(uint vid, SecsItem value)'),am('public','List<VariableDefinition> GetNamelist(VariableType type)'),am('private','void LoadFromConfig()'),am('private readonly','Dictionary<uint, SecsItem> _svs'),am('private readonly','Dictionary<uint, SecsItem> _dvs'),am('private','Dictionary<uint, SecsItem> _ecvs')].join('\\n')},
        { label:'«interface»\\nIReportManager', type:'interface', note:[am('public','AckCode DefineReport(uint rptId, uint[] vids)'),am('public','AckCode DeleteReport(uint rptId)'),am('public','AckCode LinkReport(uint ceid, uint[] rptIds)'),am('public','AckCode UnlinkReport(uint ceid, uint[] rptIds)'),am('public','ReportDefinition GetReport(uint rptId)')].join('\\n')},
        { label:'ReportManager', type:'class', note:[am('public','AckCode DefineReport(uint rptId, uint[] vids)'),am('public','AckCode DeleteReport(uint rptId)'),am('public','AckCode LinkReport(uint ceid, uint[] rptIds)'),am('public','AckCode UnlinkReport(uint ceid, uint[] rptIds)'),am('public','ReportDefinition GetReport(uint rptId)'),am('private','void PersistReports()'),am('private readonly','Dictionary<uint, ReportDefinition> _reports')].join('\\n')},
        { label:'«interface»\\nICollectionEventManager', type:'interface', note:[am('public','void RegisterCE(CollectionEventDefinition ce)'),am('public','void FireEvent(uint ceid)'),am('public','AckCode EnableCE(uint[] ceids)'),am('public','AckCode DisableCE(uint[] ceids)'),am('public','List<ReportDefinition> GetLinkedReports(uint ceid)'),am('public','bool IsEnabled(uint ceid)')].join('\\n')},
        { label:'CollectionEventManager', type:'class', note:[am('public','void RegisterCE(CollectionEventDefinition ce)'),am('public','void FireEvent(uint ceid)'),am('public','AckCode EnableCE(uint[] ceids)'),am('public','AckCode DisableCE(uint[] ceids)'),am('public','List<ReportDefinition> GetLinkedReports(uint ceid)'),am('public','bool IsEnabled(uint ceid)'),am('private','ISecsMessage BuildS6F11(uint ceid)'),am('private readonly','Dictionary<uint, CollectionEventDefinition> _events')].join('\\n')},
        { label:'ReportDefinition', type:'model', note:[am('public','uint RPTID { get; init; }'),am('public','uint[] VIDs { get; init; }'),am('public','string Name { get; init; }')].join('\\n')},
        { label:'CollectionEventDefinition', type:'model', note:[am('public','uint CEID { get; init; }'),am('public','string Name { get; init; }'),am('public','List<uint> LinkedRPTIDs { get; set; }'),am('public','bool Enabled { get; set; }')].join('\\n')},
      ]
    },
    { num:6, label:'ALARM & REMOTE COMMAND LAYER', border:'#7c3aed', bg:'#faf5ff',
      desc:'E30 — Alarm Management, Remote Commands, Process Programs',
      nodes:[
        { label:'«interface»\\nIAlarmManager', type:'interface', note:[am('public','void SetAlarm(uint alid, string text)'),am('public','void ClearAlarm(uint alid)'),am('public','AckCode EnableAlarm(uint alid)'),am('public','AckCode DisableAlarm(uint alid)'),am('public','IEnumerable<AlarmRecord> GetAlarms()'),am('public','bool IsEnabled(uint alid)')].join('\\n')},
        { label:'AlarmManager', type:'class', note:[am('public','void SetAlarm(uint alid, string text)'),am('public','void ClearAlarm(uint alid)'),am('public','AckCode EnableAlarm(uint alid)'),am('public','AckCode DisableAlarm(uint alid)'),am('public','IEnumerable<AlarmRecord> GetAlarms()'),am('public','bool IsEnabled(uint alid)'),am('private async','Task SendS5F1(uint alid, bool set, string text)'),am('private readonly','Dictionary<uint, AlarmRecord> _alarms')].join('\\n')},
        { label:'«interface»\\nIRemoteCommandManager', type:'interface', note:[am('public','void RegisterCommand(string rcmd, Func<CpList, AckCode> handler)'),am('public','AckCode ExecuteCommand(string rcmd, CpList parameters)'),am('public','IEnumerable<string> GetRegisteredCommands()')].join('\\n')},
        { label:'RemoteCommandManager', type:'class', note:[am('public','void RegisterCommand(string rcmd, Func<CpList, AckCode> handler)'),am('public','AckCode ExecuteCommand(string rcmd, CpList parameters)'),am('public','IEnumerable<string> GetRegisteredCommands()'),am('private','void OnS2F41(ISecsMessage msg)'),am('private async','Task SendS2F42(AckCode code)'),am('private readonly','Dictionary<string, Func<CpList,AckCode>> _commands')].join('\\n')},
        { label:'«interface»\\nIProcessProgramManager', type:'interface', note:[am('public','AckCode UploadPP(string ppid, byte[] body)'),am('public','AckCode DownloadPP(string ppid, out byte[] body)'),am('public','AckCode DeletePP(string ppid)'),am('public','bool ValidatePP(byte[] body)'),am('public','IEnumerable<string> ListPPs()')].join('\\n')},
        { label:'ProcessProgramManager', type:'class', note:[am('public','AckCode UploadPP(string ppid, byte[] body)'),am('public','AckCode DownloadPP(string ppid, out byte[] body)'),am('public','AckCode DeletePP(string ppid)'),am('public virtual','bool ValidatePP(byte[] body)'),am('public','IEnumerable<string> ListPPs()'),am('private','void OnS7F3(ISecsMessage msg)'),am('private async','Task HandleMultiBlockTransfer(ISecsMessage msg)'),am('private readonly','Dictionary<string, byte[]> _programs')].join('\\n')},
      ]
    },
    { num:7, label:'EQUIPMENT INTERFACE LAYER', border:'#0891b2', bg:'#f0fdfa',
      desc:'Bridge to physical tool — PLC, Sensors, Actuators, Recipe Engine',
      nodes:[
        { label:'«interface»\\nIEquipmentAdapter', type:'interface', note:[am('public','Task<EquipmentStatus> GetStatusAsync()'),am('public','Task ExecuteCommandAsync(string command, object[] args)'),am('public','Task<SecsItem> ReadVariableAsync(uint vid)'),am('public','void Subscribe(uint vid, Action<SecsItem> onChange)'),am('public','void Unsubscribe(uint vid)')].join('\\n')},
        { label:'TwincatEquipmentAdapter', type:'class', note:[am('public async','Task<EquipmentStatus> GetStatusAsync()'),am('public async','Task ExecuteCommandAsync(string command, object[] args)'),am('public async','Task<SecsItem> ReadVariableAsync(uint vid)'),am('public','void Subscribe(uint vid, Action<SecsItem> onChange)'),am('public','void Unsubscribe(uint vid)'),am('private','void OnAdsNotification(AdsNotificationEventArgs e)'),am('private static','SecsItem MapAdsValueToSecsItem(object adsValue)'),am('private readonly','IAdsTransport _transport'),am('private readonly','IPlcHandshake _handshake'),am('private readonly','IEquipmentEventBus _bus')].join('\\n')},
        { label:'«interface»\\nIRecipeEngine', type:'interface', note:[am('public','AckCode LoadRecipe(string recipeId)'),am('public','void StartRecipe()'),am('public','void AbortRecipe()'),am('public','int GetCurrentStep()'),am('public','RecipeState GetState()'),am('public','event EventHandler<int> StepChanged')].join('\\n')},
        { label:'RecipeEngine', type:'class', note:[am('public','AckCode LoadRecipe(string recipeId)'),am('public','void StartRecipe()'),am('public','void AbortRecipe()'),am('public','int GetCurrentStep()'),am('public','RecipeState GetState()'),am('public','event EventHandler<int> StepChanged'),am('private','void AdvanceStep()'),am('private','void OnStepComplete(int step)'),am('private','RecipeDefinition _activeRecipe'),am('private','int _currentStep')].join('\\n')},
        { label:'«interface»\\nIEquipmentEventBus', type:'interface', note:[am('public','void Publish(EquipmentEvent evt)'),am('public','void Subscribe(uint ceid, Action<EquipmentEvent> handler)'),am('public','void Unsubscribe(uint ceid, Action<EquipmentEvent> handler)')].join('\\n')},
        { label:'EquipmentEventBus', type:'class', note:[am('public','void Publish(EquipmentEvent evt)'),am('public','void Subscribe(uint ceid, Action<EquipmentEvent> handler)'),am('public','void Unsubscribe(uint ceid, Action<EquipmentEvent> handler)'),am('private async','Task DispatchToSubscribers(EquipmentEvent evt)'),am('private readonly','Channel<EquipmentEvent> _channel'),am('private readonly','Dictionary<uint, List<Action<EquipmentEvent>>> _subscribers')].join('\\n')},
      ]
    },
    { num:8, label:'INFRASTRUCTURE / CROSS-CUTTING LAYER', border:'#64748b', bg:'#f8fafc',
      desc:'Logging · DI Container · Configuration · Persistence · Error Handling',
      nodes:[
        { label:'«interface»\\nIMessageLogger', type:'interface', note:[am('public','void LogSend(ISecsMessage msg)'),am('public','void LogReceive(ISecsMessage msg)'),am('public','void LogEvent(uint ceid, string name)'),am('public','void LogAlarm(uint alid, string text, bool set)'),am('public','void LogStateChange(string machine, string state)')].join('\\n')},
        { label:'SecsGemLogger', type:'class', note:[am('public','void LogSend(ISecsMessage msg)'),am('public','void LogReceive(ISecsMessage msg)'),am('public','void LogEvent(uint ceid, string name)'),am('public','void LogAlarm(uint alid, string text, bool set)'),am('public','void LogStateChange(string machine, string state)'),am('private','void WriteEntry(string direction, ISecsMessage msg)'),am('private','void RotateLogFile()'),am('private readonly','StreamWriter _writer')].join('\\n')},
        { label:'«interface»\\nIConfigRepository', type:'interface', note:[am('public','string GetSetting(string key)'),am('public','void SetSetting(string key, string value)'),am('public','T GetSection<T>(string key)'),am('public','void Save()'),am('public','void Load()')].join('\\n')},
        { label:'ConfigRepository', type:'class', note:[am('public','string GetSetting(string key)'),am('public','void SetSetting(string key, string value)'),am('public','T GetSection<T>(string key)'),am('public','void Save()'),am('public','void Load()'),am('private','void ValidateSchema()'),am('private readonly','Dictionary<string, object> _config'),am('private readonly','string _filePath')].join('\\n')},
        { label:'DI Container\\n(Microsoft.Extensions.DI)', type:'infra', note:'Wires all interfaces to concrete implementations.\\nSingleton lifetimes for all GEM objects.\\nScoped for per-job contexts.' },
        { label:'ErrorHandler / RetryPolicy', type:'infra', note:'Polly-based retry with exponential backoff.\\nCircuit breaker on HSMS send failures.\\nDead-letter queue for undeliverable messages.' },
      ]
    },
  ];
  var typeStyle = function(t) {
    if(t==='interface') return {bg:'#e8f4fd',border:'#1e40af',label:'#1e3a8a'};
    if(t==='class')     return {bg:'#f0fdf4',border:'#16a34a',label:'#14532d'};
    if(t==='factory')   return {bg:'#faf5ff',border:'#7c3aed',label:'#4c1d95'};
    if(t==='state')     return {bg:'#fff7ed',border:'#ea580c',label:'#7c2d12'};
    if(t==='model')     return {bg:'#fefce8',border:'#ca8a04',label:'#713f12'};
    if(t==='infra')     return {bg:'#f8fafc',border:'#64748b',label:'#1e293b'};
    if(t==='external')  return {bg:'#eef2ff',border:'#4f46e5',label:'#312e81'};
    if(t==='proto')     return {bg:'#fef2f2',border:'#dc2626',label:'#7f1d1d'};
    return {bg:'#f8fafc',border:'#94a3b8',label:'#334155'};
  };
  var container = document.getElementById('arch-layers');
  layers.forEach(function(layer) {
    var div = document.createElement('div');
    div.className = 'layer avoid-break';
    div.style.borderColor = layer.border;
    div.style.background = layer.bg;
    div.innerHTML =
      '<div class="layer-header">' +
        '<span class="layer-num" style="color:' + layer.border + '">LAYER ' + layer.num + ' &nbsp;</span>' +
        '<span class="layer-name">' + layer.label + '</span>' +
        '<div class="layer-desc">' + layer.desc + '</div>' +
      '</div>' +
      '<div class="nodes" id="nodes-' + layer.num + '"></div>';
    container.appendChild(div);
    var nodesDiv = div.querySelector('#nodes-' + layer.num);
    layer.nodes.forEach(function(node) {
      var s = typeStyle(node.type);
      var card = document.createElement('div');
      card.className = 'node-card avoid-break';
      card.style.borderColor = s.border;
      card.style.background = s.bg;
      card.innerHTML = '<div class="node-label" style="color:' + s.label + '">' + node.label + '</div><div class="node-note">' + node.note + '</div>';
      nodesDiv.appendChild(card);
    });
  });
  </script>
</div>
<div class="page-break">
  <div class="section-title">2. MESSAGE FLOW</div>
  <h2 class="sub">Bidirectional SECS-II Message Flow</h2>
  <table class="flow-table avoid-break">
    <thead><tr><th>Direction</th><th>Message</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td class="dir-out">Tool → Host</td><td>S1F13 — Establish Comm Req</td><td>Tool initiates on TCP connect</td></tr>
      <tr><td class="dir-in">Host → Tool</td><td>S1F14 — Establish Comm Ack</td><td>Host confirms — CommunicationStateMachine → COMMUNICATING</td></tr>
      <tr><td class="dir-in">Host → Tool</td><td>S2F33 — Define Report</td><td>Host defines RPTID + VID list</td></tr>
      <tr><td class="dir-in">Host → Tool</td><td>S2F35 — Link CE to Report</td><td>Host links CEID → RPTID</td></tr>
      <tr><td class="dir-in">Host → Tool</td><td>S2F37 — Enable/Disable CE</td><td>Host enables collection events</td></tr>
      <tr><td class="dir-out">Tool → Host</td><td>S6F11 — Collection Event</td><td>Tool fires CEID with linked report data</td></tr>
      <tr><td class="dir-in">Host → Tool</td><td>S2F41 — Remote Command</td><td>Host sends RCMD + params to tool</td></tr>
      <tr><td class="dir-out">Tool → Host</td><td>S2F42 — RC Ack</td><td>Tool acknowledges command</td></tr>
      <tr><td class="dir-out">Tool → Host</td><td>S5F1 — Alarm Report</td><td>Tool fires alarm with ALID + text</td></tr>
      <tr><td class="dir-in">Host → Tool</td><td>S5F3 — Enable/Disable Alarm</td><td>Host controls alarm reporting</td></tr>
      <tr><td class="dir-in">Host → Tool</td><td>S16F11 — PRJobCreate</td><td>Host creates process job (E40)</td></tr>
      <tr><td class="dir-out">Tool → Host</td><td>S16F12 — PRJobCreate Ack</td><td>Tool acknowledges job create</td></tr>
      <tr><td class="dir-in">Host → Tool</td><td>S3F17 — CarrierAction</td><td>Host issues carrier command (E87)</td></tr>
      <tr><td class="dir-out">Tool → Host</td><td>S3F18 — CarrierAction Ack</td><td>Tool acknowledges carrier action</td></tr>
    </tbody>
  </table>
  <h2 class="sub">Report Creation & CE Enable Sequence</h2>
  <div id="seq-steps"></div>
  <script>
  var steps=[['1','Host sends S2F33','DefineReport — RPTID + list of VIDs → ReportManager.DefineReport()'],['2','ReportManager stores','RPTID → VID[] persisted via IVariableRepository + IConfigRepository'],['3','Host sends S2F35','LinkReport — CEID → RPTID → CollectionEventManager.LinkReport()'],['4','CE definition updated','CollectionEventDefinition.LinkedRPTIDs updated for that CEID'],['5','Host sends S2F37','EnableCollectionEvent — specific CEIDs enabled'],['6','CE enabled','CollectionEventDefinition.Enabled = true'],['7','Tool fires event','RecipeEngine.StepChanged → EquipmentEventBus.Publish(EquipmentEvent{CEID})'],['8','CollectionEventManager','Checks IsEnabled(CEID) · Fetches linked RPTIDs · Reads VID values from IVariableRepository'],['9','Sends S6F11','Event Report Send — CEID + RPTID list with variable data → HsmsConnection.SendAsync()'],['10','Host sends S6F12','Ack — confirms receipt · transaction complete']];
  var sc=document.getElementById('seq-steps');
  steps.forEach(function(item){sc.innerHTML+='<div class="seq-step avoid-break"><div class="seq-num">'+item[0]+'</div><div class="seq-title">'+item[1]+'</div><div class="seq-desc">'+item[2]+'</div></div>';});
  </script>
</div>
<div class="page-break">
  <div class="section-title">3. DESIGN PATTERNS & INTERFACE CONTRACTS</div>
  <h2 class="sub">Applied Design Patterns</h2>
  <div id="patterns"></div>
  <script>
  var patterns=[['State','ICommunicationStateMachine / CommunicationStateMachine — Disabled → NotCommunicating → Communicating\nIControlStateMachine / ControlStateMachine — EquipmentOffline → Local → Remote\nIProcessJobManager / ProcessJobManager — Queued → Setting Up → Processing → Complete\nICarrierManager / CarrierManager — CAS state machine per E87'],['Observer / Event Bus','IConnectionObserver — subscribed by GemKernel to IHsmsConnection events\nICollectionEventManager — subscribes to IEquipmentEventBus, fires S6F11\nIEquipmentEventBus — all hardware events publish here, GEM layer subscribes\nMessageRouter — all incoming SxFy messages route via registered handlers'],['Factory','SecsItemFactory — creates all SECS-II data item types (L, A, U4, I4, F8, B, BOOLEAN) by SecsItemType enum'],['Repository','IVariableRepository / VariableRepository — ECVs, SVs, DVs keyed by VID\nIConfigRepository / ConfigRepository — all persistent GEM configuration'],['Facade','IGemKernel / GemKernel — single public entry point for machine software; hides all subsystem wiring'],['Adapter','IEquipmentAdapter / TwincatEquipmentAdapter — translates IPlcHandshake + IAdsTransport to IEquipmentAdapter contract'],['Command','IRemoteCommandManager / RemoteCommandManager — encapsulates S2F41 RCMD + CPNAME/CPVAL params as executable command objects'],['Mediator','IEquipmentEventBus / EquipmentEventBus — decouples RecipeEngine and TwincatEquipmentAdapter from CollectionEventManager'],['Template Method','Abstract SecsMessageHandler — defines Handle() skeleton; subclasses override ProcessMessage() for each SxFy'],['Strategy','Reconnect/retry strategies injected into HsmsSessionManager\nEncoding strategies per SECS-II item type in SecsItemFactory']];
  var pc=document.getElementById('patterns');
  patterns.forEach(function(item){pc.innerHTML+='<div class="pattern-row avoid-break"><div class="pattern-name">'+item[0]+'</div><div class="pattern-used">'+item[1]+'</div></div>';});
  </script>
  <h2 class="sub" style="margin-top:24px;">Key Interface Method Signatures</h2>
  <div id="ifaces"></div>
  <script>
  function am2(mod,text){var cls=mod==='public'?'am-pub':mod==='private'?'am-priv':mod==='protected'?'am-prot':'am-int';return'<span class="'+cls+'">'+mod+'</span> '+text;}
  var ifaces=[['IGemKernel',[am2('public','void Start()'),am2('public','void Stop()'),am2('public','void ProcessIncomingMessage(ISecsMessage msg)'),am2('public','GemState GetCommunicationState()'),am2('public','GemState GetControlState()'),am2('public','Task SendAsync(ISecsMessage msg)')]],['IHsmsConnection',[am2('public','Task ConnectAsync(string ip, int port, CancellationToken ct)'),am2('public','Task DisconnectAsync(CancellationToken ct)'),am2('public','bool IsConnected { get; }'),am2('public','Task SendAsync(HsmsMessage msg, CancellationToken ct)'),am2('public','event EventHandler<HsmsMessage> MessageReceived'),am2('public','event EventHandler<ConnectionStateChangedArgs> ConnectionStateChanged')]],['ICommunicationStateMachine',[am2('public','string CurrentStateName { get; }'),am2('public','void Connect()'),am2('public','void Disconnect()'),am2('public','void OnSelectReq()'),am2('public','void OnSeparateReq()'),am2('public','event EventHandler<string> StateChanged')]],['IControlStateMachine',[am2('public','string CurrentStateName { get; }'),am2('public','void GoLocal()'),am2('public','void GoRemote()'),am2('public','void GoOffline()'),am2('public','void GoOnline()'),am2('public','event EventHandler<string> StateChanged')]],['IReportManager',[am2('public','AckCode DefineReport(uint rptId, uint[] vids)'),am2('public','AckCode DeleteReport(uint rptId)'),am2('public','AckCode LinkReport(uint ceid, uint[] rptIds)'),am2('public','AckCode UnlinkReport(uint ceid, uint[] rptIds)'),am2('public','ReportDefinition GetReport(uint rptId)')]],['ICollectionEventManager',[am2('public','void RegisterCE(CollectionEventDefinition ce)'),am2('public','void FireEvent(uint ceid)'),am2('public','AckCode EnableCE(uint[] ceids)'),am2('public','AckCode DisableCE(uint[] ceids)'),am2('public','List<ReportDefinition> GetLinkedReports(uint ceid)'),am2('public','bool IsEnabled(uint ceid)')]],['IVariableRepository',[am2('public','SecsItem GetSV(uint vid)'),am2('public','SecsItem GetDV(uint vid)'),am2('public','SecsItem GetECV(uint vid)'),am2('public','void SetECV(uint vid, SecsItem value)'),am2('public','List<VariableDefinition> GetNamelist(VariableType type)')]],['IProcessJobManager',[am2('public','AckCode CreateJob(PRJobSpec spec)'),am2('public','AckCode StartJob(string jobId)'),am2('public','AckCode PauseJob(string jobId)'),am2('public','AckCode ResumeJob(string jobId)'),am2('public','AckCode AbortJob(string jobId, AbortType type)'),am2('public','PRJobState GetJobState(string jobId)')]],['IEquipmentAdapter',[am2('public','Task<EquipmentStatus> GetStatusAsync()'),am2('public','Task ExecuteCommandAsync(string command, object[] args)'),am2('public','Task<SecsItem> ReadVariableAsync(uint vid)'),am2('public','void Subscribe(uint vid, Action<SecsItem> onChange)'),am2('public','void Unsubscribe(uint vid)')]],['IEquipmentEventBus',[am2('public','void Publish(EquipmentEvent evt)'),am2('public','void Subscribe(uint ceid, Action<EquipmentEvent> handler)'),am2('public','void Unsubscribe(uint ceid, Action<EquipmentEvent> handler)')]],];
  var ic=document.getElementById('ifaces');
  ifaces.forEach(function(item){ic.innerHTML+='<div class="iface-block avoid-break"><div class="iface-name">'+item[0]+'</div><div class="iface-sigs">'+item[1].join('\n')+'</div></div>';});
  </script>
</div>
<div class="page-break">
  <div class="section-title">4. SEMI DOCUMENTS — READING ORDER</div>
  <div id="semi-docs"></div>
  <script>
  var semiDocs=[{order:1,doc:'SEMI E5',title:'SECS-II Message Content',layer:'Layer 2',color:'#16a34a',why:'Read first — defines every data item type (L, A, B, U1/2/4/8, I1/2/4/8, F4/F8, BOOLEAN), item header format, block structure, and multi-block rules.',tags:['SecsEncoder','SecsDecoder','ISecsItem','SecsItemFactory','ISecsMessage']},{order:2,doc:'SEMI E37',title:'HSMS — High Speed Message Services',layer:'Layer 1',color:'#0891b2',why:'Defines TCP/IP framing, 10-byte header structure, SType values, T3/T5/T6/T7 timers, Active vs Passive mode, session establishment.',tags:['IHsmsConnection','HsmsConnection','HsmsSessionManager','HsmsMessageFramer']},{order:3,doc:'SEMI E4',title:'SECS-I — Serial Interface',layer:'Layer 1 (ref)',color:'#dc2626',why:"Skim only. E30 was originally written against E4. You will hit confusing E30 footnotes without knowing this exists. You won't implement it.",tags:['Historical reference only']},{order:4,doc:'SEMI E30',title:'GEM — Generic Equipment Model',layer:'Layer 3',color:'#7c3aed',why:'Your thickest read and most important document. Defines: Communication State Machine, Control State Machine, spooling, SVs/DVs/ECVs, Collection Events, Report definition and linking (S2F33/35/37), Alarms (S5), Remote Commands (S2F41), Process Programs (S7).',tags:['IGemKernel','ICommunicationStateMachine','IControlStateMachine','ISpoolingManager','IVariableRepository','IReportManager','ICollectionEventManager','IAlarmManager','IRemoteCommandManager','IProcessProgramManager']},{order:5,doc:'SEMI E40',title:'Processing Management — Process Jobs',layer:'Layer 4 (GEM300)',color:'#ea580c',why:'Defines Process Job creation, state machine, abort types, S16Fxx message set, and PRJobSpec structure.',tags:['IProcessJobManager','ProcessJobManager']},{order:6,doc:'SEMI E87',title:'CMS — Carrier Management System',layer:'Layer 4 (GEM300)',color:'#ea580c',why:'Defines carrier (FOUP/FOSB) loading, unloading, binding, and the CAS machine per load port. S3F17 carrier actions.',tags:['ICarrierManager','CarrierManager']},{order:7,doc:'SEMI E90',title:'Substrate Tracking',layer:'Layer 4 (GEM300)',color:'#ea580c',why:'Defines how individual substrates are tracked through Source, Process, and Destination states. S14F1/F3 GetAttr/SetAttr.',tags:['ISubstrateManager','SubstrateManager']},{order:8,doc:'SEMI E94',title:'CJM — Control Job Management',layer:'Layer 4 (GEM300)',color:'#ea580c',why:'Defines Control Jobs which link Process Jobs to Carriers. S17Fxx message set. Top-level job container.',tags:['IControlJobManager','ControlJobManager']},{order:9,doc:'SEMI E116',title:'EPT — Equipment Performance Tracking',layer:'Layer 4 (GEM300)',color:'#ea580c',why:'Defines equipment state tracking for availability metrics: BUSY, IDLE, BLOCKED, ENGINEERING, SCHEDULED_DOWN, UNSCHEDULED_DOWN.',tags:['IEptManager','EptManager']},{order:10,doc:'SEMI E84',title:'EFEM Load Port Interface',layer:'Layer 4 (GEM300 / HW)',color:'#ea580c',why:'Defines parallel handshake signals between EFEM/AGV and load port hardware. CarrierManager must align with E84 hardware signals.',tags:['TwincatEquipmentAdapter (hardware bridge)']},{order:11,doc:'SEMI E39',title:'OSS — Object Services Standard',layer:'Layer 3/4 (ref)',color:'#7c3aed',why:'Defines the attribute-based object model used by E87, E90, and E94 — the GetAttr (S14F1) / SetAttr (S14F3) pattern.',tags:['S14F1/F3 handlers in CarrierManager','SubstrateManager','ControlJobManager']},{order:12,doc:'SEMI E42',title:'Recipe Management',layer:'Layer 3',color:'#7c3aed',why:'Extends E30 Process Program management with formatted recipes, parameter validation, and recipe versioning.',tags:['IProcessProgramManager','IRecipeEngine']},{order:13,doc:'SEMI E148',title:'Time Synchronization',layer:'Layer 3 (ref)',color:'#7c3aed',why:'Defines equipment clock synchronization with the host via S2F17/S2F31. Critical for ISO 9000 traceability.',tags:['GemKernel (S2F17/S2F31 handlers)']},{order:14,doc:'SEMI E058',title:'OEE — Overall Equipment Effectiveness',layer:'Cross-cutting',color:'#475569',why:'Defines OEE calculation framework that E116 EPT state data feeds into.',tags:['EptManager (state taxonomy alignment)']}];
  var sd=document.getElementById('semi-docs');
  semiDocs.forEach(function(d){var tags=d.tags.map(function(t){return'<span class="semi-tag">'+t+'</span>';}).join('');sd.innerHTML+='<div class="semi-doc avoid-break" style="border-color:'+d.color+'33;border-left-color:'+d.color+';background:#fafbfc;"><div class="semi-doc-header"><span style="background:#0f2035;color:#fff;border-radius:3px;padding:1px 7px;font-size:9px;font-family:monospace;font-weight:700;">'+d.order+'</span><span style="font-size:11px;font-weight:700;font-family:monospace;color:'+d.color+';margin-left:4px;">'+d.doc+'</span><span style="font-size:11px;margin-left:4px;">'+d.title+'</span><span style="font-size:9px;font-style:italic;color:#94a3b8;margin-left:auto;">'+d.layer+'</span></div><div class="semi-why">'+d.why+'</div><div class="semi-tags">'+tags+'</div></div>';});
  </script>
</div>
<div class="page-break">
  <div class="section-title">5. APPENDIX — COMPLETE SECS-II MESSAGE CATALOG</div>
  <div id="appendix"></div>
  <script>
  var streams=[{s:1,msgs:['S1F1/2 - Are You There / On Line Data','S1F3/4 - Selected Equipment Status Request/Data','S1F5/6 - Formatted Status Request/Data','S1F7/8 - Fixed Form Request/Data','S1F11/12 - Status Variable Namelist Request/Data','S1F13/14 - Establish Communications Request/Ack','S1F15/16 - Request Offline/Ack','S1F17/18 - Request Online/Ack']},{s:2,msgs:['S2F13/14 - Equipment Constant Request/Data','S2F15/16 - New Equipment Constant Send/Ack','S2F17/18 - Date and Time Request/Data','S2F21/22 - Remote Command Send/Ack (legacy)','S2F29/30 - Equipment Constant Namelist Request/Data','S2F31/32 - Date and Time Set/Ack','S2F33/34 - Define Report/Ack','S2F35/36 - Link Collection Event Report/Ack','S2F37/38 - Enable/Disable Collection Event/Ack','S2F41/42 - Host Command Send/Ack','S2F43/44 - Reset Spooling/Ack','S2F45/46 - Define Variable Limit Attributes/Ack','S2F47/48 - Variable Limit Attribute Request/Data']},{s:3,msgs:['S3F17/18 - Carrier Action Request/Ack (E87)','S3F23/24 - Cancel Carrier Action/Ack (E87)','S3F25/26 - Carrier Tag Read/Data (E87)']},{s:5,msgs:['S5F1/2 - Alarm Report Send/Ack','S5F3/4 - Enable/Disable Alarm/Ack','S5F5/6 - List Alarms Request/Data','S5F7/8 - List Enabled Alarms Request/Data']},{s:6,msgs:['S6F1/2 - Trace Data Send/Ack','S6F5/6 - Multi-block Data Send/Ack','S6F11/12 - Event Report Send/Ack','S6F15/16 - Event Report Request/Data','S6F17/18 - Annotated Event Report Request/Data','S6F19/20 - Individual Report Request/Data','S6F21/22 - Annotated Individual Report Request/Data','S6F23/24 - Request Spooled Data/Ack']},{s:7,msgs:['S7F1/2 - Process Program Load Inquire/Grant','S7F3/4 - Process Program Send/Ack','S7F5/6 - Process Program Request/Data','S7F17/18 - Delete Process Program/Ack','S7F19/20 - Process Program List Request/Data','S7F23/24 - Formatted PP Send/Ack','S7F25/26 - Formatted PP Request/Data']},{s:9,msgs:['S9F1 - Unrecognized Device ID','S9F3 - Unrecognized Stream','S9F5 - Unrecognized Function','S9F7 - Illegal Data','S9F9 - Transaction Timer Timeout (T3)','S9F11 - Data Too Long','S9F13 - Conversation Timeout (T5)']},{s:10,msgs:['S10F1/2 - Terminal Request/Ack','S10F3/4 - Terminal Display Single/Ack','S10F5/6 - Terminal Display Multi-Block/Ack']},{s:12,msgs:['S12F1/2 - Map Setup Send/Ack','S12F3/4 - Map Setup Acknowledge/Data','S12F5/6 - Map Transmit Inquire/Grant','S12F7/8 - Map Send/Ack','S12F9/10 - Map Request/Data','S12F11/12 - Map Data Type 1/Ack','S12F13/14 - Map Data Type 2/Ack','S12F15/16 - Map Data Type 3/Ack','S12F17/18 - Map Data Acknowledge/Data','S12F19/20 - Map Error Report/Ack']},{s:13,msgs:['S13F11/12 - Create Process Job/Ack (E40 alt stream)','S13F13/14 - Abort Process Job/Ack']},{s:14,msgs:['S14F1/2 - GetAttr Request/Data (E87/E90/E94)','S14F3/4 - SetAttr Request/Ack (E87/E90/E94)']},{s:16,msgs:['S16F1/2 - Process Job Inquire/Grant','S16F11/12 - PRJobCreate/Ack (E40)','S16F13/14 - PRJobMultiCreate/Ack','S16F15/16 - PRJobDequeue/Ack','S16F17/18 - PRJobCancel/Ack','S16F19/20 - PRJobPause/Ack','S16F21/22 - PRJobResume/Ack','S16F23/24 - PRJobStop/Ack','S16F25/26 - PRJobAbort/Ack','S16F27/28 - PRSetMtrlOrder/Ack']},{s:17,msgs:['S17F1/2 - CreateControlJob/Ack (E94)','S17F3/4 - DeleteControlJob/Ack (E94)','S17F5/6 - StartControlJob/Ack (E94)','S17F7/8 - StopControlJob/Ack (E94)','S17F9/10 - AbortControlJob/Ack (E94)','S17F11/12 - PauseControlJob/Ack (E94)','S17F13/14 - ResumeControlJob/Ack (E94)']}];
  var ac=document.getElementById('appendix');
  streams.forEach(function(item){var msgsHtml=item.msgs.map(function(m,i){return'<div class="stream-msg" style="'+(i%2===1?'background:#f8fafc':'')+'">'+m+'</div>';}).join('');ac.innerHTML+='<div class="stream-block avoid-break"><div class="stream-header">Stream '+item.s+' \u2014 '+item.msgs.length+' messages</div><div class="stream-msgs">'+msgsHtml+'</div></div>';});
  </script>
</div>
</body>
</html>`}
          style={{
            width: "100%",
            height: "calc(100vh - 160px)",
            border: "none",
            background: "#fff",
          }}
          title="Printable Version"
        />
      )}

      {/* SEMI DOCS TAB */}
      {tab === "semidocs" && (
        <div style={{ padding: "24px" }}>
          {/* Sticky legend */}
          <div
            style={{
              position: "sticky",
              top: 100,
              zIndex: 90,
              background: "#070d1a",
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
              {semiLegend.map(([color, label]) => (
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
    </div>
  );
};

export default SECS2InterpreterApp;
