import { Channel, Chat as ApiChat, ObjectID, Username, accountData, chats as getChats, getToken } from "./api";

export type HMChatConfig = {
    pollFrequency: number;
    accountFrequency: number;
};

export type AccountData = Map<Username, Map<Channel, Set<Username>>>;

export type Chat = Omit<ApiChat, "t"> & {
    to_users: Set<Username>;
    t: Date;
};

export enum HMChatStatus {
    UNAUTHED = "unauthed",
    RUNNING = "running",
    PAUSED = "paused",
    ERRORED = "errored",
}

export type HMEvents = "started" | "stopped" | "error" | "chats" | "accountData";
export type HMEventHandler<K extends HMEvents> =
    K extends "error" ? ((e: any) => void) :
    K extends "chats" ? ((chats: Chat[]) => void) :
    K extends "accountData" ? ((accountData: AccountData) => void) :
    (() => void);

export default class HMChat {
    config: HMChatConfig;
    token?: string;
    accountData: AccountData = new Map();
    chats: Map<ObjectID, Chat> = new Map();
    status: HMChatStatus = HMChatStatus.UNAUTHED;

    #lastAccountPoll: number = 0;
    #lastChatsPoll: number = Date.now();
    #loopTimer: any | undefined = undefined;
    #eventHandlers: { [e in HMEvents]: Set<HMEventHandler<e>> } = {
        started: new Set(),
        stopped: new Set(),
        error: new Set(),
        chats: new Set(),
        accountData: new Set(),
    };

    get users() {
        return [...this.accountData.keys()];
    }

    get channels() {
        let a = [...this.accountData.values()];
        return a.reduce((a, x) => {
            x.forEach((v, k) => {
                a.set(k, v);
            });

            return a;
        }, new Map());
    }

    constructor(config: Partial<HMChatConfig>) {
        this.config = Object.assign({
            pollFrequency: 2 * 1000,
            accountFrequency: 5 * 60 * 1000,
        }, config);
    }

    async login(token: string, start = true) {
        if (token.length === 5) { // chat pass
            this.token = (await getToken(token)).chat_token;
        } else { // token
            this.token = token;
        }

        if (start) {
            this.start();
        }
    }

    on<K extends HMEvents>(event: K, handler: HMEventHandler<K>) {
        this.#eventHandlers[event].add(handler);
    }

    removeEventHandler<K extends HMEvents>(event: K, handler: HMEventHandler<K>) {
        this.#eventHandlers[event].delete(handler);
    }

    #emit<K extends HMEvents>(event: K, data: Parameters<HMEventHandler<K>>) {
        this.#eventHandlers[event].forEach(handler => {
            /* @ts-expect-error: stupid shit */
            handler(...data);
        })
    }

    start() {
        this.status = HMChatStatus.RUNNING;
        this.#emit("started", []);
        this.#loop();
    }

    pause() {
        this.status = HMChatStatus.PAUSED;
        this.#emit("stopped", []);
        if (this.#loopTimer !== undefined) {
            clearTimeout(this.#loopTimer);
            this.#loopTimer = undefined;
        }
    }

    async #fetchAccountData(): Promise<AccountData> {
        this.#lastAccountPoll = Date.now();

        let _ad = await accountData({
            chat_token: this.token ?? "",
        })

        let ad: AccountData = new Map();

        for (let user in _ad.users) {
            let _channels = _ad.users[user];
            let channels: Map<Channel, Set<Username>> = new Map();

            for (let channel in _channels) {
                let _users = _channels[channel];
                channels.set(channel, new Set(_users));
            }

            ad.set(user, channels);
        }
        
        this.accountData = ad;
        this.#emit("accountData", [ad]);
        return ad;
    }

    async #pollChats(): Promise<Chat[]> {
        this.#lastChatsPoll = Date.now();

        let _chats = (await getChats({
            chat_token: this.token ?? "",
            usernames: this.users,
            after: Math.floor(Math.max(this.#lastChatsPoll - 2000, Date.now() - 5 * 60 * 1000) / 1000),
        }));

        let newChats: Chat[] = [];

        for (let user in _chats.chats) {
            let chats = _chats.chats[user];

            for (let _chat of chats) {
                if (this.chats.has(_chat.id)) {
                    let chat = this.chats.get(_chat.id) as Chat;
                    chat.to_users.add(user);
                } else {
                    let chat: Chat = {
                        ..._chat,
                        t: new Date(_chat.t * 1000),
                        to_users: new Set([user]),
                    }

                    this.chats.set(chat.id, chat);
                    newChats.push(chat);
                }
            }
        }

        this.#emit("chats", [newChats]);
        return newChats;
    }

    async #loop() {
        if (this.status !== HMChatStatus.RUNNING) return;

        try {
            if (this.#lastAccountPoll + this.config.accountFrequency <= Date.now()) {
                await this.#fetchAccountData();
            }
    
            if (this.#lastChatsPoll + this.config.pollFrequency <= Date.now()) {
                await this.#pollChats();
            }
        } catch (e) {
            this.status = HMChatStatus.ERRORED;
            this.#emit("error", [e]);
            this.#emit("stopped", []);
        }

        if (this.status === HMChatStatus.RUNNING) {
            this.#loopTimer = setTimeout(this.#loop.bind(this), this.config.pollFrequency);
        }
    }
}