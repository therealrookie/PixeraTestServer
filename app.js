const express = require('express');
const app = express();
const port = 3000;
const net = require('net');

app.use(express.json()); // Middleware to parse JSON bodies

app.use(express.static('public'));

app.use(express.urlencoded({ extended: true })); // For URL-encoded data

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

app.post('/send-json', (req, res) => {
  //console.log(req);
  const targetIP = '10.10.10.49';
  const targetPort = 1400;
  const jsonData = {"jsonrpc": "2.0", "id": 27, "method": "Pixera.Compound.startFirstTimeline"};

  // Debugging: Log the received data
  console.log('Received data:', { targetIP, targetPort, jsonData });

  // Basic validation
  if (!targetIP || !targetPort) {
    return res.status(400).send('Missing target IP or Port');
  }

  const dataToSend = JSON.stringify(jsonData) + "0xPX";

  const client = new net.Socket();
  client.connect(targetPort, targetIP, function () {
    console.log('Connected');
    client.write(dataToSend);
  });

  client.on('timeout', () => {
    console.log('Connection timed out');
    client.end(); // Make sure to close the connection
    res.status(504).send('Connection timed out');
  });

  client.on('close', function () {
    console.log('Connection closed');
    res.send('JSON sent successfully');
  });

  client.on('error', function (err) {
    console.error('Socket error:', err);
    res.status(500).send('Socket error');
  });
});

const tcpServer = net.createServer((socket) => {
  console.log('TCP client connected');

  socket.on('data', (data) => {
    console.log('Received data:', data.toString());
    // Process the data here
  });

  socket.on('end', () => {
    console.log('TCP client disconnected');
  });
});

tcpServer.listen(4000, () => {
  console.log('TCP Server listening on port 4000');
});