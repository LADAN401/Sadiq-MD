const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys")
const P = require("pino")
const qrcode = require("qrcode-terminal")
const settings = require("./settings")

async function startBot() {

    const { state, saveCreds } = await useMultiFileAuthState("./session")

    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        logger: P({ level: "silent" }),
        auth: state
    })

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("connection.update", (update) => {
        const { connection, qr } = update

        if (qr) {
            console.log("Scan this QR code:")
            qrcode.generate(qr, { small: true })
        }

        if (connection === "open") {
            console.log("✅ Bot Connected Successfully!")
        }

        if (connection === "close") {
            console.log("❌ Connection closed. Reconnecting...")
            startBot()
        }
    })

    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0]
        if (!msg.message) return

        const from = msg.key.remoteJid
        const isGroup = from.endsWith("@g.us")

        const messageText =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text

        if (!messageText) return

        if (!messageText.startsWith(settings.prefix)) return

        const args = messageText.slice(settings.prefix.length).trim().split(/ +/)
        const command = args.shift().toLowerCase()

        // COMMANDS

        if (command === "ping") {
            await sock.sendMessage(from, { text: "🏓 Pong! Bot is alive." })
        }

        if (command === "owner") {
            await sock.sendMessage(from, { text: `👑 Owner: wa.me/${settings.ownerNumber}` })
        }

        if (command === "menu") {
            await sock.sendMessage(from, {
                text: `
🦅 *${settings.botName}*

Available Commands:
!ping
!owner
!menu
                `
            })
        }
    })
}

startBot()
