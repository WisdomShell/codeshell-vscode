// @ts-ignore 
/* eslint-disable */

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
  const vscode = acquireVsCodeApi();

  const showdownConverter = new showdown.Converter({
    omitExtraWLInCodeBlocks: true,
    simplifiedAutoLink: true,
    excludeTrailingPunctuationFromURLs: true,
    literalMidWordUnderscores: true,
    simpleLineBreaks: true
  });

  // Handle messages sent from the extension to the webview
  window.addEventListener("message", (event) => {
    const message = event.data;
    switch (message.type) {
      case "addQuestionAnswerDiv": {
        addQuestionAnswerDiv(message.value);
        break;
      }
      case "addStreamResponse": {
        addStreamResponse(message.value);
        break;
      }
      case "responseStreamDone": {
        responseStreamDone(message.value);
        break;
      }
      case "historySessionDone": {
        historySessionDone(message.value);
        break;
      }
      case "historyQuestionAnswerDone": {
        historyQuestionAnswerDone(message.value);
        break;
      }
    }
  });

  function addQuestionAnswerDiv(eventData) {
    let chatContainer = document.getElementById("chatContainerQuestionListId");

    div = document.createElement("div")
    div.innerHTML = eventData.divContent
    chatContainer.appendChild(div);

    let questionDiv = document.getElementById(`questionDiv${eventData.contentIndex}`);
    html = showdownConverter.makeHtml(eventData.question);
    questionDiv.innerHTML = html;
    hljs.highlightAll();

    chatContainer.scrollTop = chatContainer.scrollHeight;
    questionEditBtn(eventData.contentIndex, eventData.question);
    showChat_hideHistory();
  }

  function addStreamResponse(eventData) {
    const contentIndex = eventData.contentIndex;
    const responseText = fixCodeBlocks(eventData.responseText);

    const html = showdownConverter.makeHtml(responseText);
    const outputDiv = document.getElementById(`outputDiv${contentIndex}`);
    outputDiv.innerHTML = null;
    outputDiv.innerHTML = html;
    addCodeBlockButtons(contentIndex);
    hljs.highlightAll();

    const chatContainer = document.getElementById("chatContainerQuestionListId");
    // 如果存在下一条问答，滚动条位置不变。
    const testNextDiv = document.getElementById(`qa_section_div_${contentIndex + 1}`);
    if (!testNextDiv) {
      // 如果不存在下一条问答，滚动条位置滚动到底部。
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    document.getElementById("btn-stop-streaming").style.display = "block";
  }

  function responseStreamDone(eventData) {
    const contentIndex = eventData.contentIndex;
    const responseText = eventData.responseText;

    // const aiMsgId = eventData.aiMsgId;
    // span = document.createElement("span");
    // span.innerText = `ai message id =  ${aiMsgId}`;
    // const outputDiv = document.getElementById(`outputDiv${contentIndex}`);
    // outputDiv.append(span);

    answerCopyBtn(contentIndex, responseText);
    answerRefreshBtn(contentIndex);
    codeBlockButtonEvent(contentIndex);
    handleFeedbackBtns(eventData);

    hljs.highlightAll();
    document.getElementById("btn-stop-streaming").style.display = "none";
  }

  function handleFeedbackBtns(eventData) {
    const contentIndex = eventData.contentIndex;
    if (eventData.aiMsgId && eventData.aiMsgId !== "0") {
      const feedbackDiv = document.getElementById(`feedbackDiv${contentIndex}`);
      feedbackDiv.style.display = "flex";

      const feedbackGoodBtn = document.getElementById(`feedbackGoodBtn${contentIndex}`);
      const feedbackCheckBtn = document.getElementById(`feedbackCheckBtn${contentIndex}`);
      const feedbackBadBtn = document.getElementById(`feedbackBadBtn${contentIndex}`);

      if (feedbackGoodBtn.clickHandler) {
        feedbackGoodBtn.removeEventListener("click", feedbackGoodBtn.clickHandler)
      }
      feedbackGoodBtn.clickHandler = (e) => {
        vscode.postMessage({ type: "answerFeedbackGood", value: eventData.aiMsgId });
        feedbackGoodBtn.style.display = "none";
        feedbackCheckBtn.style.display = "flex";
        setTimeout(() => {
          feedbackGoodBtn.style.display = "flex";
          feedbackCheckBtn.style.display = "none";
        }, 500);
      }
      feedbackGoodBtn.addEventListener("click", feedbackGoodBtn.clickHandler);

      if (feedbackBadBtn.clickHandler) {
        feedbackBadBtn.removeEventListener("click", feedbackBadBtn.clickHandler)
      }
      feedbackBadBtn.clickHandler = (e) => {
        vscode.postMessage({ type: "answerFeedbackBad", value: eventData.aiMsgId });
        feedbackBadBtn.style.display = "none";
        feedbackCheckBtn.style.display = "flex";
        setTimeout(() => {
          feedbackBadBtn.style.display = "flex";
          feedbackCheckBtn.style.display = "none";
        }, 500);
      }
      feedbackBadBtn.addEventListener("click", feedbackBadBtn.clickHandler);
    }
  }

  function addCodeBlockButtons(outputIndex) {
    const outputDiv = document.getElementById(`outputDiv${outputIndex}`);
    const preBlocks = outputDiv.querySelectorAll("pre");
    for (let i = 0; i < preBlocks.length; i++) {
      const preBlock = preBlocks[i];
      const blockIndex = `${outputIndex}_${i}`;
      preBlock.id = `output_pre_${blockIndex}`

      div = document.createElement("div")
      div.classList.add("p0", "operations")
      div.innerHTML = `<div class="copy-btn copy-btn-icon inner-btns" style="float: right;"> 
      <div class="copy-btn copybtn-icn focus-on-tab inner-btns" style="float: right;" id="codeCopyBtn_${blockIndex}">
        <svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
          <path d="M720 192h-544A80.096 80.096 0 0 0 96 272v608C96 924.128 131.904 960 176 960h544c44.128 0 80-35.872 80-80v-608C800 227.904 764.128 192 720 192z m16 688c0 8.8-7.2 16-16 16h-544a16 16 0 0 1-16-16v-608a16 16 0 0 1 16-16h544a16 16 0 0 1 16 16v608z" p-id="5754" fill="#ffffff"></path><path d="M848 64h-544a32 32 0 0 0 0 64h544a16 16 0 0 1 16 16v608a32 32 0 1 0 64 0v-608C928 99.904 892.128 64 848 64z" p-id="5755" fill="#ffffff"></path><path d="M608 360H288a32 32 0 0 0 0 64h320a32 32 0 1 0 0-64zM608 520H288a32 32 0 1 0 0 64h320a32 32 0 1 0 0-64zM480 678.656H288a32 32 0 1 0 0 64h192a32 32 0 1 0 0-64z" p-id="5756" fill="#ffffff"></path><
        /svg>
      </div>
      <div class="copy-btn copybtn-icn-tick" style="float: right; display: none;" id="codeCopyCheck_${blockIndex}">
        <svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
          <path d="M369.792 704.32L930.304 128 1024 223.616 369.984 896l-20.288-20.864-0.128 0.128L0 516.8 96.128 423.68l273.664 280.64z" fill="#1296db" p-id="4526"></path>
        </svg>
      </div>
      <div class="copy-btn copybtn-icn focus-on-tab inner-btns" style="float: right;" id="codeInsertBtn_${blockIndex}">
        <svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
          <path d="M320.984615 240.246154L275.692308 202.830769c-13.784615-9.846154-29.538462-7.876923-41.353846 3.938462L5.907692 494.276923c-7.876923 9.846154-7.876923 25.6 0 37.415385L236.307692 817.230769c9.846154 11.815385 27.569231 15.753846 41.353846 3.938462l45.292308-37.415385c13.784615-9.846154 15.753846-29.538462 3.938462-41.353846L141.784615 512l187.076923-230.4c7.876923-11.815385 5.907692-29.538462-7.876923-41.353846z m697.107693 254.030769L787.692308 208.738462c-9.846154-11.815385-27.569231-15.753846-41.353846-3.938462l-45.292308 37.415385c-13.784615 9.846154-15.753846 29.538462-3.938462 41.353846l187.076923 230.4-187.076923 230.4c-9.846154 11.815385-7.876923 31.507692 3.938462 41.353846l45.292308 37.415385c13.784615 9.846154 29.538462 7.876923 41.353846-3.938462L1018.092308 531.692308c7.876923-13.784615 7.876923-27.569231 0-37.415385zM622.276923 212.676923l-59.076923-13.784615c-15.753846-3.938462-33.476923 5.907692-37.415385 21.661538l-145.723077 559.261539c-3.938462 15.753846 5.907692 31.507692 21.661539 35.446153l59.076923 13.784616c15.753846 3.938462 33.476923-5.907692 37.415385-21.661539l145.723077-559.261538c3.938462-17.723077-5.907692-31.507692-21.661539-35.446154z" fill="#FFFFFF" p-id="3495"></path>
        </svg>
      </div>
      </div>`
      preBlock.prepend(div);
    }
  }

  function codeBlockButtonEvent(outputIndex) {
    const outputDiv = document.getElementById(`outputDiv${outputIndex}`);
    const preBlocks = outputDiv.querySelectorAll("pre");
    for (let i = 0; i < preBlocks.length; i++) {
      let preBlock = preBlocks[i];
      let blockIndex = `${outputIndex}_${i}`;

      let codeCopyBtn = document.getElementById(`codeCopyBtn_${blockIndex}`);
      codeCopyBtn.addEventListener("click", (e) => {
        navigator.clipboard.writeText(preBlock.innerText);
        let copyCheck = document.getElementById(`codeCopyCheck_${blockIndex}`);
        copyCheck.style.display = "flex";
        codeCopyBtn.style.display = "none";
        setTimeout(() => {
          copyCheck.style.display = "none";
          codeCopyBtn.style.display = "flex";
        }, 2000);
      });

      let insertBtn = document.getElementById(`codeInsertBtn_${blockIndex}`);
      insertBtn.addEventListener("click", (e) => {
        navigator.clipboard.writeText(preBlock.innerText);
        vscode.postMessage({ type: "codeBlockInsert", value: preBlock.innerText });
        let copyCheck = document.getElementById(`codeCopyCheck_${blockIndex}`);
        copyCheck.style.display = "flex";
        insertBtn.style.display = "none";
        setTimeout(() => {
          copyCheck.style.display = "none";
          insertBtn.style.display = "flex";
        }, 2000);
      });
    }
  }

  function historySessionDone(eventData) {
    let div = document.getElementById("history_session_div");
    div.innerHTML = eventData;

    let sessionDivs = document.querySelectorAll("div.session");
    for (let sessionDiv of sessionDivs) {
      let itemDiv = sessionDiv.querySelector("div.session-item");
      itemDiv.addEventListener("click", e => {
        vscode.postMessage({ type: "sessionItemClicked", value: sessionDiv.id });
      });
      let deleteDiv = sessionDiv.querySelector("div.session-options");
      deleteDiv.addEventListener("click", e => {
        vscode.postMessage({ type: "sessionItemDelete", value: sessionDiv.id });
      });
    }
  }

  function historyQuestionAnswerDone(eventData) {
    showChat_hideHistory();

    div = document.createElement("div")
    div.innerHTML = eventData.divContent;
    let chatContainer = document.getElementById("chatContainerQuestionListId");
    chatContainer.innerHTML = null;
    chatContainer.appendChild(div);

    for (let i = 0; i < eventData.chatList.length; i++) {
      let question = eventData.chatList[i].humanMessage.content;
      let answer = eventData.chatList[i].aiMessage.content;
      qHtml = showdownConverter.makeHtml(question);
      document.getElementById(`questionDiv${i}`).innerHTML = qHtml;
      aHtml = showdownConverter.makeHtml(answer);
      document.getElementById(`outputDiv${i}`).innerHTML = aHtml;

      questionEditBtn(i, question);
      answerCopyBtn(i, answer);
      answerRefreshBtn(i);
      addCodeBlockButtons(i);
      codeBlockButtonEvent(i);
    }
    hljs.highlightAll();

    const textarea = document.getElementById("questioninput");
    textarea.value = "";
    textarea.style.height = `35px`;
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  function questionEditBtn(index, question) {
    let editBtn = document.getElementById(`editBtn${index}`);
    if (editBtn.clickHandler) {
      editBtn.removeEventListener("click", editBtn.clickHandler)
    }
    editBtn.clickHandler = (e) => {
      const textarea = document.getElementById("questioninput");
      textarea.value = question;
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
    editBtn.addEventListener("click", editBtn.clickHandler);
  }

  function answerCopyBtn(index, answer) {
    let copyBtn = document.getElementById(`copyBtn${index}`);
    if (copyBtn.clickHandler) {
      copyBtn.removeEventListener("click", copyBtn.clickHandler);
    }
    copyBtn.clickHandler = (e) => {
      navigator.clipboard.writeText(answer);
      let copyCheck = document.getElementById(`copyCheck${index}`);
      copyCheck.style.display = "block";
      copyBtn.style.display = "none";
      setTimeout(() => {
        copyCheck.style.display = "none";
        copyBtn.style.display = "block";
      }, 2000)
    }
    copyBtn.addEventListener("click", copyBtn.clickHandler);
  }

  function answerRefreshBtn(index) {
    let refreshBtn = document.getElementById(`refreshBtn${index}`);
    refreshBtn.style.display = "block";
    if (refreshBtn.clickHandler) {
      refreshBtn.removeEventListener("click", refreshBtn.clickHandler);
    }
    refreshBtn.clickHandler = (e) => {
      refreshBtn.style.display = "none";
      // loading 图标
      document.getElementById(`outputDiv${index}`).innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="18" cy="12" r="0" fill="currentColor"><animate attributeName="r" begin=".67" calcMode="spline" dur="1.5s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/></circle><circle cx="12" cy="12" r="0" fill="currentColor"><animate attributeName="r" begin=".33" calcMode="spline" dur="1.5s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/></circle><circle cx="6" cy="12" r="0" fill="currentColor"><animate attributeName="r" begin="0" calcMode="spline" dur="1.5s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/></circle></svg>`;
      vscode.postMessage({ type: "regenerateThisAnswer", value: index });
    }
    refreshBtn.addEventListener("click", refreshBtn.clickHandler);
  }

  function showChat_hideHistory() {
    let chatDiv = document.getElementById("main-div-aichat");
    chatDiv.style.display = "block";

    let hisDiv = document.getElementById("aichat_history_div");
    hisDiv.style.display = "none";
  }

  function hideChat_showHistory() {
    let chatDiv = document.getElementById("main-div-aichat");
    chatDiv.style.display = "none";

    let hisDiv = document.getElementById("aichat_history_div");
    hisDiv.style.display = "block";
  }

  // 文本框输入事件
  document.getElementById("questioninput").addEventListener("keydown", event => {
    const textarea = event.target;
    console.debug("event.key =", event.key, ", event.keyCode = ", event.keyCode);
    console.debug(navigator.userAgent);
    let isMac = /macintosh|mac os x/i.test(navigator.userAgent);  
    let isWin = /windows|win32|win64/i.test(navigator.userAgent); 
    let isLinux = /linux/i.test(navigator.userAgent);
    console.debug(`isMac=${isMac}, isWin=${isWin}, isLinux=${isLinux}`);

    if (event.shiftKey && event.key === "Enter") {
      textarea.style.height = `${textarea.scrollHeight + 5}px`;
    } else if ((isWin && event.key === "Enter") || (isMac && event.keyCode === 13)) {
      event.preventDefault();
      if (textarea.value && textarea.value.trim().length > 0) {
        vscode.postMessage({ type: "startQuestion", value: textarea.value.trim() });
        textarea.value = "";
        textarea.style.height = `35px`;
      }
    }
  });

  // 当清空输入框内容时，恢复输入框的高度
  document.getElementById("questioninput").addEventListener("keyup", event => {
    const textarea = event.target;
    if (textarea.value && textarea.value.trim().length === 0) {
      textarea.style.height = `35px`;
    }
  });

  // 发送按钮事件
  document.getElementById("send-button-img").addEventListener("click", event => {
    const textarea = document.getElementById("questioninput");
    if (textarea.value && textarea.value.trim().length > 0) {
      vscode.postMessage({ type: "startQuestion", value: textarea.value.trim() });
      textarea.value = "";
      textarea.style.height = `35px`;
    }
  });

  // 开启新会话
  document.getElementById("add_session_btn").addEventListener("click", event => {
    vscode.postMessage({ type: "startNewSession" });
    let element = document.getElementById("chatContainerQuestionListId");
    element.innerHTML = null;
  });

  // 历史按钮点击事件
  document.getElementById("historyButton").addEventListener("click", event => {
    vscode.postMessage({ type: "showSessionHistory" });
    hideChat_showHistory();
  });

  // 历史页面——返回按钮点击事件
  document.getElementById("historyBackButton").addEventListener("click", event => {
    showChat_hideHistory();
  });

  // 停止生成按钮
  document.getElementById("btn-stop-streaming").addEventListener("click", event => {
    vscode.postMessage({ type: "stopGenerationStream" });
  });

  // 页面禁用右键菜单
  document.addEventListener("contextmenu", event => {
    event.preventDefault();
  });


  function fixCodeBlocks(textContent) {
    const REGEX_CODEBLOCK = new RegExp("\`\`\`", "g");
    const matches = textContent.match(REGEX_CODEBLOCK);

    const count = matches ? matches.length : 0;
    if (count % 2 === 0) {
      return textContent;
    } else {
      return textContent.concat("\n\`\`\`");
    }
  }


})();
