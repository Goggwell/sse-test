import { Hono } from "hono";
import { cors } from "hono/cors";
import { html } from "hono/html";
import { streamSSE } from "hono/streaming";
import { jsxRenderer } from "hono/jsx-renderer";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET"],
    allowHeaders: ["Content-Type"],
  })
);

app.get(
  "*",
  jsxRenderer(
    ({ children }) => {
      return (
        <html>
          <head>
            {html`
              <script>
                const source = new EventSource("http://localhost:8787/sse");
                source.addEventListener("time-update", (e) => {
                  document.getElementById("title").innerHTML = e.data;
                });
              </script>
            `}
          </head>
          <body>
            <h1>SSE</h1>
            <main>{children}</main>
          </body>
        </html>
      );
    },
    { stream: true }
  )
);

app.get("/", async (c) => await c.render(<h2 id="title">welcome</h2>));

/**
 * set up headers for server sent events routes
 * must support realtime updates, so no caching
 * Keep-Alive is for HTTP/1.1 (as HTTP/2 connections are persistent)
 */
app.use("/sse/*", async (c, next) => {
  c.header("Content-Type", "text/event-stream");
  c.header("Cache-Control", "no-cache");
  c.header("Connection", "keep-alive");
  await next();
});

app.get("/sse", async (c) => {
  return streamSSE(c, async (stream) => {
    while (true) {
      const message = `It is ${new Date().toISOString()}`;
      await stream.writeSSE({ data: message, event: "time-update" });
      await stream.sleep(1000);
    }
  });
});

export default app;
