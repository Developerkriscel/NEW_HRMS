// Render sets HOSTNAME to the container name. Next standalone may bind to that
// instead of all interfaces, which can leave Render's proxy seeing 502.
process.env.HOSTNAME = '0.0.0.0'
process.env.PORT = process.env.PORT || '10000'

await import('../.next/standalone/server.js')
