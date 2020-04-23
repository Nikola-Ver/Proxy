console.error = () => {};
const net = require("net"),
  fs = require("fs").promises;

const bannedServers = require("./banned servers.json"),
  server = net.createServer(),
  PORT = 3000,
  ACCESS_DENIED = "HTTP/1.1 403 Forbidden";

function getServerURL(data) {
  return /(?<=Host: ).*$/m.exec(data.toString())[0];
}

function getURL(data) {
  return /http:\/\/[^ ]*/m.exec(data.toString())[0];
}

server.listen(PORT, () => {
  console.log("Сервер запущен http://localhost:" + PORT);
});

server.on("connection", (clientToProxy) => {
  const urls = [];

  clientToProxy.on("data", async (data) => {
    urls.push(getURL(data));
    const serverURL = getServerURL(data);

    if (bannedServers.includes(serverURL)) {
      fs.appendFile(
        "./records of visited sites.txt",
        `Дата: ${new Date()}\nURL: ${urls.pop()}\nURL сервера: ${serverURL}\nОтвет: ${ACCESS_DENIED}\n\n`
      );

      const rejectHTML = await fs.readFile("./reject.html");
      clientToProxy.write(ACCESS_DENIED);
      clientToProxy.write(rejectHTML);
      clientToProxy.end();
    } else {
      const DEFAULT_HTTP_PORT = 80;
      const proxyToServer = net.createConnection(
        {
          host: serverURL,
          port: DEFAULT_HTTP_PORT,
        },
        async () => {
          proxyToServer.write(data);
          proxyToServer.pipe(clientToProxy);
        }
      );

      proxyToServer.on("data", async (data) => {
        const response = /HTTP.*$/m.exec(data.toString())[0];
        fs.appendFile(
          "./records of visited sites.txt",
          `Дата: ${new Date()}\nURL: ${urls.pop()}\nURL сервера: ${serverURL}\nОтвет: ${response}\n\n`
        );
      });
    }
  });
});
