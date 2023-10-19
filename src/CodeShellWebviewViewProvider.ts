import * as vscode from "vscode";
import * as prompt from "./CreatePrompt";
import { ChatItem, HumanMessage, AIMessage, SessionItem, SessionStore } from "./ChatMemory";
import { postEventStream, stopEventStream } from "./RequestEventStream";

export class CodeShellWebviewViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewId = "codeshell.chatView";
	private _view?: vscode.WebviewView;
	private _extensionUri: vscode.Uri;

	private sessionStore: SessionStore;
	private sessionItem: SessionItem = new SessionItem();

	constructor(private readonly _extensionContext: vscode.ExtensionContext) {
		this._extensionUri = _extensionContext.extensionUri;
		this.sessionStore = new SessionStore(_extensionContext);
	}

	public resolveWebviewView(webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken) {

		this._view = webviewView;
		// set options for the webview, allow scripts
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				this._extensionUri
			]
		};

		// set the HTML for the webview
		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		// add an event listener for messages received by the webview
		webviewView.webview.onDidReceiveMessage(data => {
			switch (data.type) {
				case "codeBlockInsert": {
					let code = data.value;
					//code = code.replace(/([^\\])(\$)([^{0-9])/g, "$1\\$$$3");
					const snippet = new vscode.SnippetString();
					snippet.appendText(code);
					// insert the code as a snippet into the active text editor
					vscode.window.activeTextEditor?.insertSnippet(snippet);
					break;
				}
				case "startQuestion": {
					this.startQuestion(data.value);
					break;
				}
				case "startNewSession": {
					this.sessionStore.update(this.sessionItem);
					this.sessionItem = new SessionItem();
					break;
				}
				case "showSessionHistory": {
					this.showSessionHistory();
					break;
				}
				case "sessionItemClicked": {
					this.sessionItemClicked(data.value);
					break;
				}
				case "sessionItemDelete": {
					this.sessionItemDelete(data.value);
					break;
				}
				case "regenerateThisAnswer": {
					this.generateAnswer(data.value);
					break;
				}
				case "stopGenerationStream": {
					this.stopGenerationStream();
					break;
				}
			}
		});
	}

	public async executeCommand(command: string) {
		// Get the selected text of the active editor
		const selection = vscode.window.activeTextEditor?.selection;
		const selectedText = vscode.window.activeTextEditor?.document.getText(selection);
		if (!selectedText) {
			vscode.window.showErrorMessage("请选中一段代码！");
			return;
		}
		const languageId = vscode.window.activeTextEditor?.document.languageId;
		if (!languageId) {
			vscode.window.showErrorMessage("无法确定语言类型！");
			return;
		}

		let humanPrompt = "";
		switch (command) {
			case "codeshell.explain_this_code": {
				humanPrompt = prompt.createPromptCodeExplain(languageId, selectedText);
				break;
			}
			case "codeshell.improve_this_code": {
				humanPrompt = prompt.createPromptCodeImprove(languageId, selectedText);
				break;
			}
			case "codeshell.clean_this_code": {
				humanPrompt = prompt.createPromptCodeClean(languageId, selectedText);
				break;
			}
			case "codeshell.generate_comment": {
				humanPrompt = prompt.createPromptGenerateComment(languageId, selectedText);
				break;
			}
			case "codeshell.generate_unit_test": {
				humanPrompt = prompt.createPromptGenerateUnitTest(languageId, selectedText);
				break;
			}
			case "codeshell.check_performance": {
				humanPrompt = prompt.createPromptCheckPerformance(languageId, selectedText);
				break;
			}
			case "codeshell.check_security": {
				humanPrompt = prompt.createPromptCheckSecurity(languageId, selectedText);
				break;
			}
		}

		// focus gpt activity from activity bar
		if (!this._view) {
			await vscode.commands.executeCommand("codeshell.chatView.focus");
		} else {
			this._view?.show?.(true);
		}
		this.startQuestion(humanPrompt);
	}

	private startQuestion(question: string) {
		const contentIndex = this.sessionItem.chatList.length;
		const divContent = this._makeQuestionAnswerDiv(contentIndex);
		const eventData = {
			"divContent": divContent,
			"contentIndex": contentIndex,
			"question": question
		};
		this._view?.webview.postMessage({ type: "addQuestionAnswerDiv", value: eventData });

		const humanMessage = new HumanMessage(question);
		const aiMessage = new AIMessage("");
		const chatItem = new ChatItem(humanMessage, aiMessage);
		this.sessionItem.addChatItem(chatItem);
		this.generateAnswer(contentIndex);
	}

	private generateAnswer(index: number) {
		const chatItem = this.sessionItem.chatList[index];
		chatItem.aiMessage.content = "";
		this.sessionStore.update(this.sessionItem);
		const historyPrompt = this.sessionItem.getSlicePrompt(0, index);
		const respData = {
			"contentIndex": index,
			"responseText": chatItem.aiMessage.content,
			"aiMsgId": chatItem.aiMsgId,
		};
		console.log("historyPrompt:", historyPrompt);
		postEventStream(historyPrompt, (data) => {
			const jsonData = JSON.parse(data);
			if (jsonData.content) {
				chatItem.aiMessage.append(jsonData.content);
			}
			if (jsonData.id && jsonData.id !== "0") {
				console.log(`AI message id = ${jsonData.id}`);
				chatItem.aiMsgId = jsonData.id;
			}
			respData.responseText = chatItem.aiMessage.content;
			respData.aiMsgId = chatItem.aiMsgId;
			this._view?.webview.postMessage({ type: "addStreamResponse", value: respData });
		}, () => {
			console.log("generateAnswer.requstsDone:", chatItem.aiMessage.content);
			this.sessionStore.update(this.sessionItem);
			this._view?.webview.postMessage({ type: "responseStreamDone", value: respData });
			vscode.window.showInformationMessage("回答输出完毕!");
		}, (_err) => {
			this.sessionStore.update(this.sessionItem);
			this._view?.webview.postMessage({ type: "responseStreamDone", value: respData });
		});
	}

	private stopGenerationStream() {
		stopEventStream();
	}

	private sessionItemClicked(itemId: string) {
		const sessionItem = this.sessionStore.getSessionItemById(itemId);
		this.sessionItem = sessionItem;
		this._makeQuestionAnswerDivFromSessionItem(sessionItem);
	}

	private sessionItemDelete(itemId: string) {
		const sessionItem = this.sessionStore.getSessionItemById(itemId);
		this.sessionStore.delete(sessionItem);
		this.showSessionHistory();
	}

	private showSessionHistory() {
		var html = this._makeHistoryDiv();
		this._view?.webview.postMessage({ type: "historySessionDone", value: html });
	}

	private _makeHistoryDiv() {
		let history = this.sessionStore.getSessionHistory();

		let html = "";
		for (const item of history) {
			html += this._makeHistoryItemDiv(item);
		}
		return html;
	}

	private _makeHistoryItemDiv(sessionItem: SessionItem) {
		const sessionTime = sessionItem.time.toLocaleString();

		return `
			<div class="session" id="${sessionItem.id}">
				<div class="session-item">
					<p class="session-title"> ${sessionItem.title} </p>
					<p class="session-date-time"> ${sessionTime} </p>
				</div>
				<div class="session-options inner-btns ant-dropdown-trigger">
					<svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2648" width="20" height="20">
						<path d="M789.333333 343.466667c-12.8 0-21.333333 8.533333-21.333333 21.333333v490.666667c0 23.466667-19.2 42.666667-42.666667 42.666666H298.666667c-23.466667 0-42.666667-19.2-42.666667-42.666666V362.666667c0-12.8-8.533333-21.333333-21.333333-21.333334s-21.333333 8.533333-21.333334 21.333334v490.666666c0 46.933333 38.4 85.333333 85.333334 85.333334h426.666666c46.933333 0 85.333333-38.4 85.333334-85.333334V362.666667c0-10.666667-10.666667-19.2-21.333334-19.2zM915.2 234.666667H746.666667V170.666667c0-46.933333-38.4-85.333333-85.333334-85.333334H362.666667c-46.933333 0-85.333333 38.4-85.333334 85.333334v64H106.666667c-12.8 0-21.333333 8.533333-21.333334 21.333333s8.533333 21.333333 21.333334 21.333333h808.533333c12.8 0 21.333333-8.533333 21.333333-21.333333s-8.533333-21.333333-21.333333-21.333333zM320 170.666667c0-23.466667 19.2-42.666667 42.666667-42.666667h298.666666c23.466667 0 42.666667 19.2 42.666667 42.666667v64H320V170.666667z" fill="#ffffff" p-id="2649"></path><path d="M640 704V364.8c0-12.8-8.533333-21.333333-21.333333-21.333333s-21.333333 8.533333-21.333334 21.333333V704c0 12.8 8.533333 21.333333 21.333334 21.333333s21.333333-10.666667 21.333333-21.333333zM426.666667 704V362.666667c0-12.8-8.533333-21.333333-21.333334-21.333334s-21.333333 8.533333-21.333333 21.333334v341.333333c0 12.8 8.533333 21.333333 21.333333 21.333333s21.333333-10.666667 21.333334-21.333333z" fill="#ffffff" p-id="2650"></path>
					</svg>
				</div>
			</div>
		`;
	}

	private _makeQuestionAnswerDivFromSessionItem(sessionItem: SessionItem) {
		let html = "";
		for (let i = 0; i < sessionItem.chatList.length; i++) {
			html += this._makeQuestionAnswerDiv(i);
		}
		const eventData = {
			"divContent": html,
			"chatList": sessionItem.chatList
		};
		this._view?.webview.postMessage({ type: "historyQuestionAnswerDone", value: eventData });
	}

	private _makeQuestionAnswerDiv(contentIndex: number) {
		return `
		<div id="qa_section_div_${contentIndex}"
			class="qa-section-div-main focus-on-tab" style="border-bottom: 0.5px solid #626668; padding: 5px 5px">
			<div class="question-container col-12">
				<div class="row mr-0">
					<div class="col-4 pr-0"><div class="question-title">问题 :</div></div>
					<div class="col-8 p-0" style="align-items: center; display: flex; justify-content: flex-end;">
						<div class="edit-btn focus-on-tab inner-btns" style="float: right;" id="editBtn${contentIndex}">
							<svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
								<path d="M816.277333 165.056a128 128 0 0 1 0 181.013333L309.653333 852.693333a21.333333 21.333333 0 0 1-15.082666 6.229334H165.056a42.666667 42.666667 0 0 1-42.666667-42.666667v-129.493333a21.333333 21.333333 0 0 1 6.229334-15.104L635.306667 165.056a128 128 0 0 1 180.992 0z m-45.226666 45.226667a64 64 0 0 0-87.786667-2.56l-2.752 2.56L188.885333 701.930667a8.533333 8.533333 0 0 0-2.496 6.037333v78.464c0 4.714667 3.818667 8.533333 8.533334 8.533333h78.421333a8.533333 8.533333 0 0 0 6.037333-2.517333l491.648-491.605333a64 64 0 0 0 2.581334-87.786667l-2.56-2.730667z" fill="#ffffff" p-id="6891"></path><path d="M590.016 210.304l181.013333 181.013333-45.248 45.248-181.013333-181.013333z" fill="#ffffff" p-id="6892"></path><path d="M490.666667 795.733333m8.533333 0l345.6 0q8.533333 0 8.533333 8.533334l0 46.933333q0 8.533333-8.533333 8.533333l-345.6 0q-8.533333 0-8.533333-8.533333l0-46.933333q0-8.533333 8.533333-8.533334Z" fill="#ffffff" p-id="6893"></path><path d="M661.333333 667.733333m8.533334 0l174.933333 0q8.533333 0 8.533333 8.533334l0 46.933333q0 8.533333-8.533333 8.533333l-174.933333 0q-8.533333 0-8.533334-8.533333l0-46.933333q0-8.533333 8.533334-8.533334Z" fill="#ffffff" p-id="6894"></path>
							</svg>
						</div>
					</div>
				</div>
				<div id="questionDiv${contentIndex}" class="questionDiv d-block row col-12 m-0"></div>
			</div>
			<div class="row mr-0">
				<div class="col-4 pr-0">
					<div class="answer-title">回答 :</div>
				</div>
				<div class="col-8 p-0" style="align-items: center; display: flex; justify-content: flex-end;">
					<div class="copy-btn copy-btn-icon focus-on-tab inner-btns" style="float: right;" id="refreshBtn${contentIndex}">
						<svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
							<path d="M866.133333 85.333333c4.693333 0 8.533333 3.84 8.533334 8.533334v194.133333a32 32 0 0 1-28.928 31.850667L842.666667 320h-194.133334a8.533333 8.533333 0 0 1-8.533333-8.533333v-46.933334c0-4.693333 3.84-8.533333 8.533333-8.533333h120.341334A361.536 361.536 0 0 0 512 149.333333C311.701333 149.333333 149.333333 311.701333 149.333333 512s162.368 362.666667 362.666667 362.666667c185.813333 0 339.008-139.776 360.170667-319.914667 0.384-3.328 0.810667-7.829333 1.28-13.546667a8.533333 8.533333 0 0 1 8.512-7.850666h47.061333a8.533333 8.533333 0 0 1 8.533333 9.109333c-0.426667 5.696-0.789333 10.218667-1.130666 13.589333C914.346667 770.986667 732.778667 938.666667 512 938.666667 276.352 938.666667 85.333333 747.648 85.333333 512S276.352 85.333333 512 85.333333c116.288 0 221.717333 46.506667 298.666667 121.984V93.866667c0-4.693333 3.84-8.533333 8.533333-8.533334h46.933333z" fill="#ffffff" p-id="2282"></path>
						</svg>
					</div>
					<div class="copy-btn copybtn-icn focus-on-tab inner-btns" style="float: right;" id="copyBtn${contentIndex}">
						<svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
							<path d="M720 192h-544A80.096 80.096 0 0 0 96 272v608C96 924.128 131.904 960 176 960h544c44.128 0 80-35.872 80-80v-608C800 227.904 764.128 192 720 192z m16 688c0 8.8-7.2 16-16 16h-544a16 16 0 0 1-16-16v-608a16 16 0 0 1 16-16h544a16 16 0 0 1 16 16v608z" p-id="5754" fill="#ffffff"></path><path d="M848 64h-544a32 32 0 0 0 0 64h544a16 16 0 0 1 16 16v608a32 32 0 1 0 64 0v-608C928 99.904 892.128 64 848 64z" p-id="5755" fill="#ffffff"></path><path d="M608 360H288a32 32 0 0 0 0 64h320a32 32 0 1 0 0-64zM608 520H288a32 32 0 1 0 0 64h320a32 32 0 1 0 0-64zM480 678.656H288a32 32 0 1 0 0 64h192a32 32 0 1 0 0-64z" p-id="5756" fill="#ffffff"></path><
						/svg>
					</div>
					<div class="copy-btn copybtn-icn-tick" style="float: right; display: none" id="copyCheck${contentIndex}">
						<svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
							<path d="M369.792 704.32L930.304 128 1024 223.616 369.984 896l-20.288-20.864-0.128 0.128L0 516.8 96.128 423.68l273.664 280.64z" fill="#1296db" p-id="4526"></path>
						</svg>
					</div>
				</div>
			</div>
			<div class="answer-container">
				<div class="answerDiv" id="outputDiv${contentIndex}"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="18" cy="12" r="0" fill="currentColor"><animate attributeName="r" begin=".67" calcMode="spline" dur="1.5s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/></circle><circle cx="12" cy="12" r="0" fill="currentColor"><animate attributeName="r" begin=".33" calcMode="spline" dur="1.5s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/></circle><circle cx="6" cy="12" r="0" fill="currentColor"><animate attributeName="r" begin="0" calcMode="spline" dur="1.5s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/></circle></svg></div>
			</div>
			<div class="row mr-0">
				<div class="col-12 p-0" style="align-items: center; display: none; justify-content: flex-end;" id="feedbackDiv${contentIndex}">
					<div class="answer-title">这个回答怎么样？</div>
					<div class="copy-btn copybtn-icn focus-on-tab inner-btns" style="float: right;" id="feedbackGoodBtn${contentIndex}">
						<svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
							<path d="M925.696 585.788235c4.999529 12.227765 7.951059 28.069647 7.951059 48.609883 0 31.683765-14.456471 58.488471-37.406118 74.270117 8.312471 14.095059 12.288 30.177882 12.288 46.260706 0 33.852235-18.853647 62.704941-47.284706 77.583059 4.818824 11.324235 7.649882 25.298824 7.770353 42.465882 0.120471 27.045647-7.770353 48.790588-23.552 64.632471-16.624941 16.685176-40.176941 25.178353-69.933176 25.178353H436.705882c-45.417412 0-76.679529-24.335059-99.568941-42.164706-13.191529-10.24-25.660235-19.998118-34.334117-19.998118H176.188235a30.117647 30.117647 0 0 1 0-60.235294h126.614589c29.334588 0 51.621647 17.347765 71.318588 32.64753 19.456 15.119059 37.827765 29.455059 62.58447 29.455058h338.82353c12.769882 0 22.467765-2.590118 27.226353-7.408941 4.096-4.096 6.144-11.444706 6.083764-21.805176-0.180706-26.322824-5.541647-31.984941-61.861647-31.984941h-6.384941a30.117647 30.117647 0 0 1 0-60.235294h75.776c18.492235 0 31.924706-11.866353 31.924706-28.190118 0-27.105882-27.045647-31.141647-43.188706-31.141647h-45.17647a30.117647 30.117647 0 0 1 0-60.235294h86.558117c19.937882 0 26.985412-15.058824 26.985412-29.153883 0-29.635765 0-29.635765-26.443294-30.418823-3.072-0.060235-6.264471-0.301176-9.396706-0.421647H772.818824a30.117647 30.117647 0 0 1 0-60.235294h59.151058c0.421647 0 0.783059-0.240941 1.204706-0.240942h38.008471c17.769412 0 32.286118-13.673412 32.286117-30.418823s-14.456471-30.418824-32.286117-30.418824H602.955294a30.057412 30.057412 0 0 1-29.575529-35.719529l31.322353-164.683294c3.734588-16.444235 14.336-63.066353 1.987764-83.727059a24.696471 24.696471 0 0 0-20.48-11.083294c-11.806118 0-23.913412 9.456941-34.093176 26.503529L356.894118 528.745412a30.117647 30.117647 0 0 1-25.6 14.275764H176.549647a30.117647 30.117647 0 0 1 0-60.235294h137.999059l186.006588-300.574117c28.672-48.188235 65.957647-55.476706 85.534118-55.476706h0.060235c29.214118 0 57.524706 15.902118 72.161882 40.417882 21.925647 36.683294 14.336 87.04 5.240471 126.85553l-24.274824 127.939764h231.845648c51.019294 0 92.521412 40.658824 92.521411 90.654118 0.060235 29.997176-14.938353 56.681412-37.948235 73.185882z" p-id="4585" fill="#ffffff"></path>
						</svg>
					</div>
					<div class="copy-btn copybtn-icn-tick" style="float: right; display: none" id="feedbackCheckBtn${contentIndex}">
						<svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
							<path d="M369.792 704.32L930.304 128 1024 223.616 369.984 896l-20.288-20.864-0.128 0.128L0 516.8 96.128 423.68l273.664 280.64z" fill="#1296db" p-id="4526"></path>
						</svg>
					</div>
					<div class="copy-btn copybtn-icn focus-on-tab inner-btns" style="float: right;" id="feedbackBadBtn${contentIndex}">
						<svg t="1695020265894" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5724" width="20" height="20">
							<path d="M877.507765 572.295529a30.117647 30.117647 0 0 1-30.117647 30.117647h-137.999059l-186.006588 300.574118c-28.732235 48.188235-65.957647 55.476706-85.534118 55.476706h-0.060235a85.534118 85.534118 0 0 1-72.222118-40.417882c-21.925647-36.743529-14.336-87.100235-5.240471-126.85553l24.274824-127.939764H152.756706c-51.019294 0-92.461176-40.658824-92.461177-90.654118 0-33.008941 18.070588-61.982118 45.056-77.824a73.788235 73.788235 0 0 1-15.058823-43.91153c0-31.683765 14.456471-58.488471 37.406118-74.270117a91.376941 91.376941 0 0 1-12.288-46.320941c0-34.635294 19.757176-63.969882 49.212235-78.607059a91.136 91.136 0 0 1-9.758118-41.562353C154.864941 153.961412 189.861647 120.470588 248.410353 120.470588h338.823529c45.417412 0 76.739765 24.335059 99.568942 42.164706 13.191529 10.24 25.660235 19.998118 34.273882 19.998118h126.674823a30.117647 30.117647 0 0 1 0 60.235294h-126.674823c-29.334588 0-51.621647-17.347765-71.318588-32.64753-19.395765-15.239529-37.767529-29.515294-62.524236-29.515294H248.410353c-28.129882 0-33.310118 9.938824-33.310118 29.394824 0 9.517176 0 31.744 61.861647 31.744h6.324706a30.117647 30.117647 0 0 1 0 60.235294H207.510588c-18.492235 0-31.864471 11.866353-31.86447 28.190118 0 27.105882 27.045647 31.141647 43.188706 31.141647h45.17647a30.117647 30.117647 0 0 1 0 60.235294H177.513412c-19.877647 0-26.985412 15.058824-26.985412 29.153882 0 10.119529 22.046118 27.527529 42.465882 30.900706h58.187294a30.117647 30.117647 0 0 1 0 60.235294h-59.211294c-0.421647 0-0.783059 0.240941-1.204706 0.240941h-38.00847c-17.769412 0-32.225882 13.673412-32.225882 30.418824s14.456471 30.418824 32.225882 30.418823h268.227765a30.057412 30.057412 0 0 1 29.575529 35.71953l-31.322353 164.683294c-3.734588 16.444235-14.336 63.006118-1.987765 83.727059a24.816941 24.816941 0 0 0 20.48 11.083294c11.806118 0 23.913412-9.456941 34.093177-26.50353l195.102117-315.271529a30.117647 30.117647 0 0 1 25.6-14.275765h154.744471a30.117647 30.117647 0 0 1 30.238118 30.117647z" p-id="5725" fill="#ffffff"></path>
						</svg>
					</div>
				</div>
			</div>
		</div>
		`;
	}

	private _getHtmlForWebview(webview: vscode.Webview) {

		const mainScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "main.js"));
		const hightlightUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "scripts", "highlight.min.js"));
		const showdownUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "scripts", "showdown.min.js"));
		const tailwindUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "scripts", "tailwind.min.js"));

		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "styles"));

		const historySessionItems = this._makeHistoryDiv();


		return `<!DOCTYPE html>
		<html lang="en">
		
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<script src="${tailwindUri}"></script>
			<script src="${showdownUri}"></script>
			<script src="${hightlightUri}"></script>
		
			<link href="${styleUri}/styles.771a66d94c0526be.css" rel="stylesheet" type="text/css" />
			<link href="${styleUri}/styles.c48.css" rel="stylesheet" type="text/css" />
			<link href="${styleUri}/styles.c100.css" rel="stylesheet" type="text/css" />
			<link href="${styleUri}/styles.c101.css" rel="stylesheet" type="text/css" />
			<link href="${styleUri}/styles.c110.css" rel="stylesheet" type="text/css" />
			<link href="${styleUri}/styles.c111.css" rel="stylesheet" type="text/css" />
			<link href="${styleUri}/styles.c116.css" rel="stylesheet" type="text/css" />
			<link href="${styleUri}/styles.c117.css" rel="stylesheet" type="text/css" />
		
		
			<style type="text/css">
				.hljs-ln {
					border-collapse: collapse
				}
		
				.hljs-ln td {
					padding: 0
				}
		
				.hljs-ln-n:before {
					content: attr(data-line-number)
				}
			</style>
		
			<style type="text/css">
				.content {
					background-color: #2f3133
				}
			</style>
		
		</head>
		
		<body>
		
			<app-root _nghost-uim-c118 ng-version="13.1.3">
				<app-loggedin-header>
					<div _ngcontent-uim-c116 role="banner" class="toolbar bc-header-fixed">
						<div _ngcontent-uim-c116 id="navigation" class="d-flex position-relative feed-sect">
							<a _ngcontent-uim-c116 id="feedTab" routerlinkactive="active" routerlink="chat" tabindex="-1"
								class="feed active" href="#/chat">
								<svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
									<path d="M937.067069 482.335377 556.719504 106.839307c-1.89107-2.251274-6.123464-6.173606-11.997242-10.048867-9.889231-6.522554-21.093411-10.486842-33.388435-10.486842-13.137205 0-24.610514 3.984754-34.245965 10.590196-5.826705 3.997034-9.844206 8.076956-12.117992 11.117199L85.643566 482.381425c-14.653745 14.434757-14.653745 37.890982 0 52.358485 14.538111 14.380522 33.883715 8.316409 50.366108-7.919367L161.532977 501.587859l350.847693-339.869664 374.329501 368.073007c20.077268 13.223163 37.773302 17.377786 50.358945 4.946662C951.720813 520.273431 951.720813 496.801856 937.067069 482.335377z" fill="#ffffff" p-id="5382"></path><path d="M793.007045 462.046285c-17.391089 0-31.567973 13.938454-31.634488 31.236422l0 0.085958 0 0.089028 0 350.143659c0 17.416671-14.371312 31.602765-32.119535 31.602765l-84.129072 0 0-192.166671c0-49.818639-40.803311-90.111321-91.14486-90.111321l-85.268012 0c-50.326199 0-91.143836 40.300868-91.143836 90.111321l0 192.166671L293.437146 875.204116c-17.750269 0-32.119535-14.186094-32.119535-31.602765L261.317611 493.391177c-0.033769-17.355273-14.21884-31.343869-31.611975-31.343869-17.418718 0-31.589462 13.96506-31.658024 31.302937l0 354.429265c0 49.844222 40.808428 90.133833 91.14486 90.133833l141.253094 0 10.389628 0 0-10.391674 0-240.262062c0-17.410532 14.365172-31.580253 32.119535-31.580253l76.801177 0c17.756409 0 32.119535 14.169721 32.119535 31.580253l0 240.262062 0 10.391674 10.391674 0 141.253094 0c50.321082 0 91.14486-40.297798 91.14486-90.133833L824.665069 493.322615C824.527946 475.958132 810.380738 462.046285 793.007045 462.046285z" fill="#ffffff" p-id="5383"></path>
								</svg>
								<span _ngcontent-uim-c116 class="ml-2 hd-low-res"> 首页 </span>
							</a>
						</div>
						<div _ngcontent-uim-c116 class="spacer"></div>
						<div _ngcontent-uim-c116 id="navigation" class="d-flex options-container">
							<a _ngcontent-uim-c116 tabindex="0" aria-label="Setting" routerlinkactive="active"
								id="settings-option" class="links focus-on-tab" style="display: none">
								<svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
									<path d="M448.487619 97.52381l130.096762 0.170666c40.399238 0.073143 73.142857 32.792381 73.191619 73.216l0.048762 21.211429a345.283048 345.283048 0 0 1 71.143619 39.960381l17.408-10.044953a73.313524 73.313524 0 0 1 99.961905 26.819048l65.219047 112.566857a73.313524 73.313524 0 0 1-22.893714 97.816381l-3.974095 2.438095-17.481143 10.093715a341.479619 341.479619 0 0 1-1.292191 83.968l12.361143 7.168a73.313524 73.313524 0 0 1 28.867048 96.329142l-2.023619 3.803429-61.098667 105.813333a73.313524 73.313524 0 0 1-96.329143 28.867048l-3.803428-2.048-16.896-9.752381a341.918476 341.918476 0 0 1-68.291048 38.083048l0.024381 29.062095a73.313524 73.313524 0 0 1-68.754286 73.264762l-4.632381 0.146285-130.121142-0.170666a73.313524 73.313524 0 0 1-73.191619-73.216l-0.048762-35.035429a346.599619 346.599619 0 0 1-57.368381-34.035809l-31.158857 17.944381a73.313524 73.313524 0 0 1-99.986286-26.819048l-65.219048-112.566857a73.313524 73.313524 0 0 1 22.918095-97.816381l3.949715-2.438095 31.719619-18.285715c-2.438095-23.161905-2.56-46.665143-0.219429-70.119619l-35.206095-20.333714a73.313524 73.313524 0 0 1-28.891429-96.329143l2.048-3.803428 61.098667-105.813334a73.313524 73.313524 0 0 1 96.329143-28.867047l3.803429 2.048 30.72 17.724952a341.284571 341.284571 0 0 1 64.609523-39.716571l-0.048762-27.89181a73.313524 73.313524 0 0 1 68.754286-73.264762L448.487619 97.52381z m-0.097524 73.313523l0.073143 74.48381-42.130286 19.846095c-18.041905 8.46019-35.05981 18.919619-50.761142 31.158857l-38.936381 30.403048-71.655619-41.398857-1.852953-1.024-61.074286 105.813333 76.239239 44.007619-4.729905 47.104a268.434286 268.434286 0 0 0 0.170666 55.100952l5.022477 47.445334-73.069715 42.081524 65.194667 112.566857 72.557714-41.740191 38.473143 28.184381a272.579048 272.579048 0 0 0 45.226667 26.819048l42.057143 19.772952 0.146285 81.529905 130.072381 0.170667-0.073143-78.019048 45.202286-18.822095a268.629333 268.629333 0 0 0 53.638095-29.915429l38.448762-27.648 57.904762 33.426286 61.049905-105.813333-55.100952-31.890286 6.826666-48.88381a268.190476 268.190476 0 0 0 1.024-65.950476l-5.12-47.494095 58.928762-34.011429-65.219047-112.566857L718.262857 319.390476l-38.497524-28.086857a272.62781 272.62781 0 0 0-56.051809-31.50019l-45.104762-18.724572-0.121905-70.070857-130.096762-0.170667z m145.895619 210.407619a146.773333 146.773333 0 0 1 53.686857 200.362667 146.407619 146.407619 0 0 1-200.167619 53.638095 146.773333 146.773333 0 0 1-53.662476-200.362666 146.407619 146.407619 0 0 1 200.167619-53.638096z m-136.655238 90.258286a73.48419 73.48419 0 0 0 26.86781 100.278857 73.118476 73.118476 0 0 0 99.961904-26.770285c19.529143-33.865143 9.020952-76.824381-23.186285-98.03581l-3.657143-2.267429-3.803429-2.048a73.118476 73.118476 0 0 0-96.182857 28.842667z" p-id="6623" fill="#ffffff"></path>
								</svg>
							</a>
						</div>
					</div>
				</app-loggedin-header>
				<div role="main" style="overflow: hidden !important;"
					class="main-app-content-section-tzs content d-block">
					<router-outlet></router-outlet>
					<app-ai-chat-container>
						<router-outlet _ngcontent-uim-c112></router-outlet>
						<app-aichat>
							<div appkeyboardshortcuteventdirective>
								<div class="ai-parent-div">
									<div id="aichat_history_div" style="display: none">
										<div class="history-btn-section row">
											<div class="col-6 d-flex justify-content-start">
												<div tabindex="0" id="historyBackButton" class="history-btn focus-on-tab">
													<svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
														<path d="M156.608 487.8592c1.156267-1.137067 2.648533-1.6224 3.918933-2.558933l306.666667-301.569067c13.195733-12.970667 34.586667-12.970667 47.781333 0 13.194667 12.978133 13.194667 34.013867 0 46.987733L263.3024 478.210133l579.2032 0c18.978133 0 34.362667 15.128533 34.362667 33.789867 0 18.6624-15.384533 33.793067-34.362667 33.793067L263.3024 545.793067l251.671467 247.486933c13.194667 12.971733 13.194667 34.010667 0 46.984533-13.194667 12.974933-34.586667 12.974933-47.781333 0l-306.666667-301.5616c-1.269333-0.939733-2.762667-1.421867-3.918933-2.562133-6.334933-6.2304-9.240533-14.340267-9.477333-22.5024C147.367467 502.200533 150.273067 494.090667 156.608 487.8592L156.608 487.8592zM156.608 487.8592" fill="#ffffff" p-id="2370"></path>
													</svg>
													<span class="ml-2 history-buttons">返回</span>
												</div>
											</div>
										</div>
										<div class="history-panel">
											<div tabindex="0" infinite-scroll="" class="historyListConainer focus-on-tab" id="history_session_div">
												${historySessionItems}
											</div>
										</div>
									</div>
									<div id="main-div-aichat" class="main-ai-chat-div">
										<div class="history-btn-section row">
											<div class="col-6 d-flex justify-content-start">
												<div tabindex="0" aria-label="history" id="historyButton" class="history-btn focus-on-tab">
													<svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
														<path d="M511.73808594 93.19941406c-140.67070313 0-264.92695313 69.1453125-341.01035156 175.08955078v-70.47597656c0-21.66767578-17.61679688-39.22998047-39.346875-39.22998047s-39.346875 17.56318359-39.346875 39.22998047v156.91992188c0 21.66240234 17.61679688 39.22998047 39.346875 39.22998047h170.50341796c21.73007813 0 39.346875-17.56669922 39.346875-39.22998047 0-21.66767578-17.61679688-39.22998047-39.346875-39.22998047h-68.4421875c61.73085937-86.98798828 163.28496094-143.84267578 278.296875-143.84267578 188.32851562 0 341.00507812 152.22128906 341.00507813 339.99345703 0 187.76865234-152.6765625 339.99345703-341.00507813 339.99345703-158.73574219 0-291.74589844-108.29179688-329.75771484-254.70439453l-0.68291016 0.21269531c-5.3015625-15.41162109-19.54248047-26.65986328-36.8024414-26.65986328-21.73007813 0-39.346875 17.56318359-39.346875 39.22558594 0 3.86630859 1.16367187 7.36875 2.20605469 10.89316406l-0.40957032 0.12919922c0.25839844 0.95009766 0.73212891 1.8 0.99580078 2.74482422 0.28916016 0.76201172 0.48164063 1.52314453 0.81650391 2.2640625 49.92539062 175.47011719 210.98935547 304.35380859 402.98378906 304.35380859 231.79394531 0 419.69970703-187.35029297 419.69970703-418.45341797-0.00175781-231.10751953-187.90839844-418.45429688-419.70322265-418.45429687z m0 176.53183594c-21.73007813 0-39.346875 17.56318359-39.346875 39.22998047v235.37988281c0 21.66767578 17.61679688 39.22998047 39.346875 39.22998047h170.50253906c21.73007813 0 39.346875-17.56318359 39.346875-39.22558594 0-21.67119141-17.61679688-39.22998047-39.346875-39.22998047H551.08496094v-196.15429687c0-21.66767578-17.61767578-39.22998047-39.34775391-39.22998047z" fill="#ffffff"></path>
													</svg>
													<span class="ml-2 history-buttons">历史</span>
												</div>
											</div>
											<div class="col-6 d-flex justify-content-end">
												<div tabindex="0" class="focus-on-tab">
													<span class="d-flex add-session-icon">
														<div class="add-session-btn" id="add_session_btn">
															<span class="plus-icon">+</span>
														</div>
													</span>
												</div>
											</div>
										</div>
										<div id="chatContainerQuestionListId" tabindex="0"
											class="no-shift-needed-tzs chat-container tzs-list-questions questions-asked-2"
											infinite-scroll style="height: calc(98vh - 180px) !important">
											
	
										</div>
										<div class="footerContent">
											<div class="tzs-stop-streaming-button-section ng-star-inserted">
												<button id="btn-stop-streaming" class="btn-black-streaming" style="display: none;">
													<span style="float: left; margin-top: 2px;">
														<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
															<path d="M3.66683 7.66732H10.3335V6.33398H3.66683V7.66732ZM7.00016 13.6673C6.07794 13.6673 5.21127 13.4923 4.40016 13.1423C3.58905 12.7923 2.8835 12.3173 2.2835 11.7173C1.6835 11.1173 1.2085 10.4118 0.858496 9.60065C0.508496 8.78954 0.333496 7.92287 0.333496 7.00065C0.333496 6.07843 0.508496 5.21176 0.858496 4.40065C1.2085 3.58954 1.6835 2.88398 2.2835 2.28398C2.8835 1.68398 3.58905 1.20898 4.40016 0.858984C5.21127 0.508984 6.07794 0.333984 7.00016 0.333984C7.92238 0.333984 8.78905 0.508984 9.60016 0.858984C10.4113 1.20898 11.1168 1.68398 11.7168 2.28398C12.3168 2.88398 12.7918 3.58954 13.1418 4.40065C13.4918 5.21176 13.6668 6.07843 13.6668 7.00065C13.6668 7.92287 13.4918 8.78954 13.1418 9.60065C12.7918 10.4118 12.3168 11.1173 11.7168 11.7173C11.1168 12.3173 10.4113 12.7923 9.60016 13.1423C8.78905 13.4923 7.92238 13.6673 7.00016 13.6673ZM7.00016 12.334C8.48905 12.334 9.75016 11.8173 10.7835 10.784C11.8168 9.75065 12.3335 8.48954 12.3335 7.00065C12.3335 5.51176 11.8168 4.25065 10.7835 3.21732C9.75016 2.18398 8.48905 1.66732 7.00016 1.66732C5.51127 1.66732 4.25016 2.18398 3.21683 3.21732C2.1835 4.25065 1.66683 5.51176 1.66683 7.00065C1.66683 8.48954 2.1835 9.75065 3.21683 10.784C4.25016 11.8173 5.51127 12.334 7.00016 12.334Z" fill="#C4C9CC"></path>
														</svg>
													</span>
													<span> 停止生成 </span>
												</button>
											</div>
											<div class="tzs-common-textarea-section">
												<div class="fake-input textarea-container pb-2"
													style="background: #2F3133;">
													<textarea nz-input aria-label="ai-input-box"
														required apptextareaautoresize id="questioninput" autofocus
														class="form-control chat-input ant-input ng-touched ng-dirty ng-invalid"
														placeholder="在这里提问, Enter发送" style="height: 35px; overflow: hidden;"></textarea>
													<div id="reply-buttons2" class="reply-buttons2"
														style="overflow: hidden;">
														<div class="row">
															<div class="col-3 text-left d-flex"></div>
															<div class="col-9 text-right">
																<span class="shift-enter-text"><span style="font-weight: 600;">Shift + Enter</span> 换行 </span>
																<a class="send send-disabled">
																	<svg class="send-icon" id="send-button-img" style="margin: 2px 0; cursor:pointer" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
																		<path d="M1008.00076 6.285714q18.857143 13.714286 15.428571 36.571429l-146.285714 877.714286q-2.857143 16.571429-18.285714 25.714286-8 4.571429-17.714286 4.571429-6.285714 0-13.714286-2.857143l-258.857143-105.714286-138.285714 168.571429q-10.285714 13.142857-28 13.142857-7.428571 0-12.571429-2.285714-10.857143-4-17.428571-13.428571t-6.571429-20.857143l0-199.428571 493.714286-605.142857-610.857143 528.571429-225.714286-92.571429q-21.142857-8-22.857143-31.428571-1.142857-22.857143 18.285714-33.714286l950.857143-548.571429q8.571429-5.142857 18.285714-5.142857 11.428571 0 20.571429 6.285714z" p-id="7866" fill="#ffffff"></path>
																	</svg>
																</a>
															</div>
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</app-aichat>
					</app-ai-chat-container>
				</div>
			</app-root>
		
		
			<script src="${mainScriptUri}"></script>
		
		
		</body>
		
		</html>`;
	}
}