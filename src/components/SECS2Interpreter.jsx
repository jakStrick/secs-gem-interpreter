import React, { useState } from "react";
import secsMessages from "/secsMessages.json";
import messages from "/messages.json";
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

	// Persistent state for Parser tab
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

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
			<div className="max-w-7xl mx-auto">
				{/* Header */}
				<div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-lg p-6 shadow-2xl">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-3xl font-bold text-white flex items-center gap-3">
								<FileText className="w-8 h-8" />
								SECS/GEM Log Parser
							</h1>
							<p className="text-blue-100 mt-2">
								Complete toolkit for SECS-II message interpretation and
								log file analysis
							</p>
						</div>
						<img
							src="/logo.svg"
							alt="SECS/GEM Icon"
							className="w-20 h-20 md:w-40 md:h-40 mr-10"
						/>
					</div>
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
						<ParserTab
							parserState={parserState}
							setParserState={setParserState}
						/>
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

	const MESSAGES = secsMessages;

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
const ParserTab = ({ parserState, setParserState }) => {
	const abortControllerRef = React.useRef(null);

	const MESSAGE_INFO = messages.MESSAGE_INFO;

	// Destructure state for easier access
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

	// Helper functions to update state
	const setLogContent = (value) =>
		setParserState((prev) => ({ ...prev, logContent: value }));
	const setParsedMessages = (value) =>
		setParserState((prev) => ({ ...prev, parsedMessages: value }));
	const setFilterStream = (value) =>
		setParserState((prev) => ({ ...prev, filterStream: value }));
	const setSearchTerm = (value) =>
		setParserState((prev) => ({ ...prev, searchTerm: value }));
	const setIsProcessing = (value) =>
		setParserState((prev) => ({ ...prev, isProcessing: value }));
	const setProgress = (value) =>
		setParserState((prev) => ({ ...prev, progress: value }));
	const setFileSize = (value) =>
		setParserState((prev) => ({ ...prev, fileSize: value }));
	const setDisplayLimit = (value) =>
		setParserState((prev) => ({ ...prev, displayLimit: value }));

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
									setParserState({
										logContent: "",
										parsedMessages: [],
										filterStream: "all",
										searchTerm: "",
										isProcessing: false,
										progress: 0,
										fileSize: 0,
										displayLimit: 100,
									});
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
							<option value="">Select A Stream</option>
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
							placeholder="Search stream messages..."
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
