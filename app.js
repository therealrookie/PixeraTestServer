const express = require('express');
const net = require('net'); // No need for WebSocket in this scenario
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.get('/get-timelines', (req, res) => {
  const targetIP = '10.10.10.49';
  const targetPort = 1400;
  const requestMessage = JSON.stringify({
    "jsonrpc": "2.0",
    "id": 341,
    "method": "Pixera.Timelines.getTimelines"
  }) + "0xPX";

  const client = new net.Socket();
  client.connect(targetPort, targetIP, () => {
    console.log('Requesting timeline data...');
    client.write(requestMessage);
  });

  client.on('data', (data) => {
    console.log('Received timeline data:', data.toString());
    const responseData = JSON.parse(data.toString().replace('0xPX', ''));
    res.json(responseData); // Send timelines back to the client
    client.end();
  });

  client.on('error', (err) => {
    console.error('Error:', err);
    res.status(500).send('Failed to fetch timelines');
  });
});

app.post('/get-timeline-name', (req, res) => {
  const targetIP = '10.10.10.49';
  const targetPort = 1400;
  const handle = req.body.handle;
  const requestMessage = JSON.stringify({
    "jsonrpc": "2.0",
    "id": 404,
    "method": "Pixera.Timelines.Timeline.getTimelineInfosAsJsonString",
    "params": { "handle": handle }
  }) + "0xPX";

  const client = new net.Socket();
  client.connect(targetPort, targetIP, () => {
    console.log(`Requesting name for timeline with handle ${handle}...`);
    client.write(requestMessage);
  });

  client.on('data', (data) => {
    //console.log('Received timeline name data:', data.toString());
    // Extracting the JSON string and parsing it
    const responseJson = JSON.parse(data.toString().replace('0xPX', ''));
    // The result field is a JSON string, so parse it again to get an object
    const timelineInfo = JSON.parse(responseJson.result);
    // Now, extract the name from the timelineInfo object
    const timelineName = timelineInfo.name;
    console.log(timelineName);
    res.json({ name: timelineName }); // Send timeline name back to the client
    client.end();
  });

  client.on('error', (err) => {
    console.error('Error:', err);
    res.status(500).send('Failed to fetch timeline name');
  });
});

app.post('/send-json', (req, res) => {
  const targetIP = '10.10.10.49';
  const targetPort = 1400;
  console.log(req.body)
  const jsonData = parseJsonData(req.body);

  const client = new net.Socket();
  client.connect(targetPort, targetIP, () => {
    console.log('Connected to TCP Server, sending data');
    client.write(jsonData);
  });

  client.on('data', (data) => {
    console.log('Received response via TCP:', data.toString());
    res.send('Received data: ' + data.toString());
    client.end(); // Close the connection after receiving the response
  });

  client.on('close', () => {
    console.log('TCP connection closed');
  });

  client.on('error', (err) => {
    console.error('TCP Client error:', err);
    res.status(500).send('Failed to send JSON via TCP: ' + err.message);
  });
});

app.listen(port, () => {
  console.log(`Express server running at http://localhost:${port}`);
});

function parseJsonData(jsonData) {
  const dataToSend = JSON.stringify(jsonData) + "0xPX";
  return dataToSend;
}