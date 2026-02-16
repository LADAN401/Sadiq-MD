const express = require("express")
const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason
} = require("@whiskeysockets/baileys")
const P = require("pino")

const app = express()
app.use(express.json())

app.get("/", (req, res) => {
    res.send(`
    <h2>🦅 ELITE DEGEN SCAN - Session Generator</h2>
    <form action="/pair" method="get">
        <input type="text" name="number" placeholder="234XXXXXXXXXX" required />
        <button type="submit">Generate Pair Code</button>
    </form>
    `)
})

app.get("/pair", async (req, res) => {
    const number = req.query.number

    if (!number) return res.send("❌ Number Required")

    const { state, saveCreds } = await useMultiFileAuthState("./session")

    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        logger: P({ level: "silent" }),
        auth: state,
        version
    })

    sock.ev.on("creds.update", saveCreds)

    if (!sock.authState.creds.registered) {
        const code = await sock.requestPairingCode(number)
        res.send(`
            <h2>✅ Pair Code Generated</h2>
            <p>Your Code:</p>
            <h1>${code}</h1>
            <p>Go to WhatsApp → Linked Devices → Enter Code</p>
        `)
    } else {
        res.send("✅ Already Registered")
    }

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update

        if (connection === "close") {
            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            if (shouldReconnect) {
                console.log("Reconnecting...")
            }
        }

        if (connection === "open") {
            console.log("✅ WhatsApp Connected Successfully")
        }
    })
})

app.listen(3000, () => {
    console.log("🌐 Session Generator Running on Port 3000")
})
