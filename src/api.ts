export type ChatPass = string
export type ChatToken = string
export type ObjectID = string
export type RubyDate = number
export type Channel = string
export type Username = string

export type Chat = {
    id: ObjectID,
    t: RubyDate,
    from_user: Username,
    msg: string,
    is_join?: true,
    is_leave?: true,
    channel?: Channel,
}

type HMError = {
    ok: boolean;
    msg: string;
};

async function _fetch(path: string, body: object): Promise<any> {
    const req = await fetch("https://www.hackmud.com" + path, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    
    let res: string | object = await req.text();
    try {
        res = JSON.parse(res);
    } catch (_) {}

    if (req.status >= 400) {
        let hme = res as HMError;
        if (hme.ok === false && typeof hme.msg === "string") {
            throw new Error(hme.msg);
        } else {
            throw new Error(path + " " + req.status + " " + JSON.stringify(res));
        }
    }

    return res;
}

export type GetTokenResponse = {
    ok: true;
    chat_token: ChatToken;
}

export async function getToken(pass: ChatPass): Promise<GetTokenResponse> {
    return await _fetch("/mobile/get_token.json", {
        pass,
    });
}

export type AccountDataRequest = {
    chat_token: ChatToken;
}

export type AccountDataResponse = {
    ok: true;
    users: Record<Username, Record<Channel, Username[]>>;
}

export async function accountData(req: AccountDataRequest): Promise<AccountDataResponse> {
    return await _fetch("/mobile/account_data.json", req);
}

export type ChatsRequest = {
    chat_token: ChatToken;
    usernames: Username[];
    before?: RubyDate;
    after?: RubyDate;
}

export type ChatsResponse = {
    ok: true,
    chats: Record<Username, Chat[]>,
}

export async function chats(req: ChatsRequest): Promise<ChatsResponse> {
    return await _fetch("/mobile/chats.json", req);
}

export type CreateChatRequest = {
    chat_token: ChatToken;
    username: Username;
    msg: string;
} & ({
    channel: Channel;
} | {
    tell: Username;  
})

export type CreateChatResponse = { ok: true };

export async function createChat(req: CreateChatRequest): Promise<CreateChatResponse> {
    return await _fetch("/mobile/create_chat.json", req);
}
