const net = require("net"),
  fs = require("fs").promises;

const bannedServers = require("./banned servers.json"),
  server = net.createServer(),
  PORT = 3000,
  ACCESS_DENIED = "HTTP/1.1 403 Forbidden";

function getServerURL(data) {
  return /(?<=Host: )[^\:\r\n]*/m.exec(data.toString())[0];
}

function getPort(data) {
  const port = /(?<=:).*/m.exec(/(?<=Host: ).*/m.exec(data.toString())[0]);
  return port === null ? 80 : Number(port[0]);
}

function getURL(data) {
  console.log(/http:\/\/[^ ]*/m.exec(data.toString())[0]);
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
      let deniedPage;
      if (Math.random() > 0.5) {
        deniedPage = "./reject.html";
      } else {
        deniedPage = "./reject hotline.html";
      }
      const rejectHTML = await fs.readFile(deniedPage);
      clientToProxy.write(ACCESS_DENIED);
      clientToProxy.write(rejectHTML);
      clientToProxy.end();
    } else {
      const httpPort = getPort(data);
      const proxyToServer = net.createConnection(
        {
          host: serverURL,
          port: httpPort,
        },
        async () => {
          data = data.toString().replace(/(?<=^GET )http:\/\/[^/]*/, "");
          proxyToServer.write(data);
          proxyToServer.pipe(clientToProxy);
        }
      );

      proxyToServer.on("data", async (data) => {
        let response = /HTTP.*$/m.exec(data.toString());
        response = response !== null ? response[0] : "HTTP/1.1";
        fs.appendFile(
          "./records of visited sites.txt",
          `Дата: ${new Date()}\nURL: ${urls.pop()}\nURL сервера: ${serverURL}\nОтвет: ${response}\n\n`
        );
      });
    }
  });
});
