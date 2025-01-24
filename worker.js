addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Check if it's a request for SSE
  if (request.url.includes('/events')) {
    return handleSSE(request)
  }
  
  // Return 404 for other routes
  return new Response('Not found', { status: 404 })
}

async function handleSSE(request) {
  let stream = new TransformStream()
  const writer = stream.writable.getWriter()
  const encoder = new TextEncoder()

  // Start sending events in the background
  sendEvents(writer, encoder)

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

async function sendEvents(writer, encoder) {
  try {
    // Send 15 updates, one per second
    for (let i = 1; i <= 15; i++) {
      const data = `Update ${i} at ${new Date().toISOString()}`
      const message = `data: ${data}\n\n`
      await writer.write(encoder.encode(message))
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Send final message
    await writer.write(encoder.encode('data: END\n\n'))
    await writer.close()
  } catch (err) {
    writer.close()
  }
}
