export default {
  fetch: async (request, env, ctx) => {
    const handler = sse(sseHandler, {
      customHeaders: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });

    // Handle OPTIONS request for CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    return handler(request, env, ctx);
  },
};

async function* generateEvents() {
  // Send 15 updates, one per second
  for (let i = 1; i <= 15; i++) {
    const date = new Date();
    const zurichTime = date.toLocaleString("de-CH", {
      timeZone: "Europe/Zurich",
      dateStyle: "medium",
      timeStyle: "medium",
    });

    yield {
      data: `Update ${i} – ${zurichTime}`,
    };
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  yield {
    data: "END",
  };
}

const sseHandler = async function* (request, env, ctx) {
  yield* generateEvents();
};

function sse(sseHandler, options = {}) {
  const stream = new TransformStream();

  async function run(request, env, ctx) {
    const writer = stream.writable.getWriter();
    try {
      for await (const event of sseHandler(request, env, ctx)) {
        await writer.write(encodeEvent(event));
      }
    } finally {
      await writer.close();
    }
  }

  return async function fetchHandler(request, env, ctx) {
    ctx.waitUntil(run(request, env, ctx));
    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        ...(options?.customHeaders ?? {}),
      },
    });
  };
}

const textEncoder = new TextEncoder();

function encodeEvent(event) {
  let payload = "";
  if (event.id) {
    payload = `id: ${event.id}\n`;
  }
  if (event.event) {
    payload += `event: ${event.event}\n`;
  }
  payload += `data: ${JSON.stringify(event.data ?? null)}\n\n`;
  return textEncoder.encode(payload);
}
