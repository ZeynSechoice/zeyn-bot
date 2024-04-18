const a = require('./client')
a.connect().catch(() => a.connect())