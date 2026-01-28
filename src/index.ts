import { pEvent } from "p-event"

declare global {
    var WebSocketStream: undefined | Function
}

export interface BetterWebSocketStreamOptions {
    protocols?: string[] | undefined
    signal?: AbortSignal | undefined
}

const constructorKeyForBetterWebSocketStream = Symbol("constructorKeyForBetterWebSocketStream")
export class BetterWebSocketStream {
    static {
        // Fake inheritance
        if (typeof WebSocketStream !== "undefined") {
            Object.setPrototypeOf(this, WebSocketStream)
            Object.setPrototypeOf(this.prototype, WebSocketStream.prototype)
        }
    }

    static async open(url: string | URL, options: BetterWebSocketStreamOptions = {}): Promise<BetterWebSocketStream> {
        const { signal = new AbortController().signal } = options
        const ws = new WebSocket(url, options.protocols)
        try {
            await pEvent(ws, "open", { signal })
        } catch (error) {
            if (error?.name === "WebSocketError") {
                const { closeCode: code = null, reason = "" } = error
                ws.close(code, reason)
            }
            throw error
        }
        return new BetterWebSocketStream(constructorKeyForBetterWebSocketStream, ws)
    }
    #ws: WebSocket
    #readable: ReadableStream<string | Uint8Array>
    #writable: WritableStream<string | BufferSource>
    #closed: Promise<{}>
    private constructor(key: symbol, ws: WebSocket) {
        if (key !== constructorKeyForBetterWebSocketStream) {
            throw new TypeError("Illegal constructor")
        }
        this.#ws = ws
        this.#readable = new ReadableStream({})
        this.#writable = new WritableStream({})
    }

    get url(): string {
        return this.#ws.url
    }

    get extensions(): string {
        return this.#ws.extensions
    }

    get protocol(): string {
        return this.#ws.protocol
    }

    get readable(): ReadableStream<string | Uint8Array> {
        return this.#readable
    }

    get writable(): WritableStream<string | BufferSource> {
        return this.#writable
    }

    get closed(): Promise<{}> {
        return this.#closed
    }

    close(closeCode: number = 1000, reason: string = ""): void {
        this.#ws.close(closeCode, reason)
    }
}
