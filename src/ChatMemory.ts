import { ExtensionContext } from "vscode";

export class ChatMessage {
    prefix?: string;
    content: string;

    constructor(content: string) {
        this.content = content;
    }

    toString(): string {
        return `${this.prefix}${this.content}`;
    }
}

export class HumanMessage extends ChatMessage {
    prefix = "## human:";
}

export class AIMessage extends ChatMessage {
    prefix = "## assistant:";

    append(text: string) {
        this.content += text;
        this.content = this.content.replace("|end|", "");
        this.content = this.content.replace("|<end>|", "");
        this.content = this.content.replace("<|endoftext|>", "");
    }
}

export class ChatItem {
    humanMessage: HumanMessage;
    aiMessage: AIMessage;
    aiMsgId: string = "0";
    constructor(humanMessage: HumanMessage, aiMessage: AIMessage) {
        this.humanMessage = humanMessage;
        this.aiMessage = aiMessage;
    }

    toString(): string {
        return `${this.humanMessage.toString()}|<end>|${this.aiMessage.toString()}`;
    }
}

export class SessionItem {
    time = new Date();
    id = this.time.toISOString();
    title = "";
    chatList = new Array<ChatItem>();

    addChatItem(chatItem: ChatItem) {
        this.chatList.push(chatItem);
        this.title = this.chatList[0].humanMessage.content;
    }

    addChatList(list: ChatItem[]) {
        for (const chat of list) {
            const hmMsg = new HumanMessage(chat.humanMessage.content);
            const aiMsg = new AIMessage(chat.aiMessage.content);
            const item = new ChatItem(hmMsg, aiMsg);
            if (chat.aiMsgId) {
                item.aiMsgId = chat.aiMsgId;
            }
            this.addChatItem(item);
        }
    }

    getSlicePrompt(start:number, end:number) {
        let history = "";
        for (let i = start; i <= end; i++) {
            const chatItem = this.chatList[i];
            if (history.length > 0) {
                history += "\n";
            }
            history += chatItem.toString();
            if (i < end) {
                history += "|<end>|";
            }
        }
        return history;
    }
}

export class SessionStore {
    private _storeKey = "sessionHistory";

    constructor(private readonly _extensionContext: ExtensionContext) {
        const keys = this._extensionContext.globalState.keys();
        for (const key of keys) {
            const value = this._extensionContext.globalState.get(key);
            console.log(key, value);
        }
        // this._extensionContext.globalState.update(this._storeKey, undefined);
    }

    update(updateItem: SessionItem) {
        // console.log("updateItem:", updateItem);
        if (updateItem.chatList.length === 0) {
            return;
        }
        const sessionHistory = this.getSessionHistory();

        let exist = false;
        for (let i = 0; i < sessionHistory.length; i++) {
            let item = sessionHistory[i];
            if (item.id === updateItem.id) {
                sessionHistory[i] = updateItem;
                exist = true;
                break;
            }
        }
        if (!exist) {
            sessionHistory.push(updateItem);
        }
        this._extensionContext.globalState.update(this._storeKey, sessionHistory);
    }

    delete(deleteItem: SessionItem) {
        const sessionHistory = this.getSessionHistory();
        const newArray = new Array<SessionItem>();
        for (const item of sessionHistory) {
            if (item.id !== deleteItem.id) {
                newArray.push(item);
            }
        }
        this._extensionContext.globalState.update(this._storeKey, newArray);
    }

    getSessionItemById(itemId: string): SessionItem {
        const sessionHistory = this.getSessionHistory();
        for (const item of sessionHistory) {
            if (item.id === itemId) {
                return item;
            }
        }
        return new SessionItem();
    }

    getSessionHistory(): SessionItem[] {
        let oldArray = this._extensionContext.globalState.get<Array<SessionItem>>(this._storeKey);
        if (!oldArray) {
            oldArray = new Array<SessionItem>();
        }
        let newArray = new Array<SessionItem>();
        for (var item of oldArray) {
            if (item.chatList.length === 0) {
                continue;
            }
            let newObj = new SessionItem();
            newObj.id = item.id;
            newObj.time = new Date(item.time);
            newObj.addChatList(item.chatList);
            newArray.push(newObj);
        }
        return newArray.sort((a: SessionItem, b: SessionItem): number => {
            return a.time < b.time ? 1 : -1;
        });
    }

}