const baileys = require('@whiskeysockets/baileys');
const { default: makeWaSocket, useMultiFileAuthState, PHONENUMBER_MCC } = baileys;
const Pino = require('pino'),
  fs = require('fs'),
  colors = require('@colors/colors/safe')

const connect = async () => {
  console.log(colors.green('Connecting...'))
  const { state, saveCreds } = await useMultiFileAuthState('session');
  const config = JSON.parse(fs.readFileSync('./pairing.json', 'utf-8'))

  const sock = makeWaSocket({
    printQRInTerminal: (config.pairing && config.pairing.state && config.pairing.number) ? false : true,
    auth: state,
    browser: ['Chrome (Linux)', '', ''],
    logger: Pino({ level: 'silent' })
  });
  if (config.pairing && config.pairing.state && !sock.authState.creds.registered) {
    var phoneNumber = config.pairing.number
      if (!Object.keys(PHONENUMBER_MCC).some(v => String(phoneNumber).startsWith(v))) {
        console.log(colors.red('Invalid phone number'));
        return;
      }
    setInterval(async () => {
      try {
        let code = await sock.requestPairingCode(phoneNumber);
        code = code?.match(/.{1,4}/g)?.join("-") || code
        console.log(colors.yellow('Pairing Code:' + code))
      } catch {}
    }, 3000)
  }
  sock.ev.on('creds.update', saveCreds);
  /*sock.ev.on('connection.update', async (update) => {
      const {
         connection,
         lastDisconnect
      } = update
      if (connection === 'connecting') {
      //if (global.db.bots.length > 0) global.db.bots.map(v => v.is_connected = false)
     } else if (connection === 'open') {
         spinnies.succeed('start', {
            text: `Connected, you login as ${sock || sock.user.verifiedName || 'WhatsApp Bot'}`
         })
      } else if (connection === 'close') {
         if (lastDisconnect.error.output.statusCode == baileys.DisconnectReason.loggedOut) {
            spinnies.fail('start', {
               text: `Can't connect to Web Socket`
            })
            process.exit(0)
         } else {
            connect().catch(() => connect())
         }
      }
   })*/
  sock.ev.on('connection.update', async (update) => {
    //console.log(update);
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
      console.log(colors.green('Succesfully Connected With ') + colors.cyan(sock.user.name))
    }
    if (connection === 'close') {
      if (lastDisconnect?.output?.statusCode !== baileys.DisconnectReason.loggedOut)
        connect();
    }
  })
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    const pesan = (m.message?.extendedTextMessage?.text ?? m.message?.ephemeralMessage?.message?.extendedTextMessage?.text ?? m.message?.conversation)?.toLowerCase() || "";
    const reply = (jid, text) => sock.sendMessage(jid, { text: text }, { quoted: m })
    //console.log(pesan)
    if (pesan == '!ping') {
      await reply(m.key.remoteJid, 'pong!!', m)
    }
  })
};

module.exports = { connect }

//connect().catch(() => connect())