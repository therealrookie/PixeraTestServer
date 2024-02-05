const express = require('express');
const net = require('net');
const app = express();
const port = 3000;

const targetIP = '10.10.10.49';
const targetPort = 1400;

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Utility function for creating and handling TCP client connections
function createTcpClient(requestMessage, onSuccess, onError) {
  const client = new net.Socket();
  client.connect(targetPort, targetIP, () => {
    console.log('Connected, sending data...');
    client.write(requestMessage);
  });

  client.on('data', (data) => {
    onSuccess(data); // Process received data
    client.end(); // Close the connection
  });

  client.on('error', (err) => {
    console.error('TCP Client error:', err);
    onError(err);
  });
}

// Routes
app.get('/get-timelines', (req, res) => {
  handleGetTimelines(req, res);
});

app.post('/get-timeline-name', (req, res) => {
  handleGetTimelineName(req, res);
});

app.post('/set-transport-mode', (req, res) => {
  handleSetTransportmode(req, res);
});

app.post('/create-timeline', (req, res) => {
  // Create Timeline
  const createTimelineMsg = reqMsgCreateTimeline();
  createTcpClient(createTimelineMsg, (data) => {
    const timelineResult = JSON.parse(data.toString().replace('0xPX', ''));
    const timelineHandle = timelineResult.result; // Extract the timeline handle

  }, (err) => {
    console.error('Failed to create timeline:', err);
    res.status(500).send('Failed to create timeline');
  });
});

// Add this route to app.js
app.post('/create-layer', (req, res) => {
  const timelineHandle = req.body.handle;
  const requestMessageForLayer = reqMsgCreateLayer(timelineHandle);

  createTcpClient(requestMessageForLayer, (layerData) => {
    const layerResult = JSON.parse(layerData.toString().replace('0xPX', ''));
    const layerHandle = layerResult.result; // Extract the layer handle

    // After successfully creating the layer, create a clip at time 0.0
    const requestMessageForClip = reqMsgCreateClipAtTime(layerHandle);
    createTcpClient(requestMessageForClip, (clipData) => {
      const clipResult = JSON.parse(clipData.toString().replace('0xPX', ''));
      const clipHandle = clipResult.result; // Extract the clip handle

      console.log('Clip created successfully:', clipHandle);
      res.json({ layerHandle: layerHandle, clipHandle: clipHandle }); // Send both handles back to the client
    }, (err) => {
      console.error('Failed to create clip:', err);
      res.status(500).send('Failed to create clip');
    });
  }, (err) => {
    console.error('Failed to create layer:', err);
    res.status(500).send('Failed to create layer');
  });
});

app.post('/get-layers', (req, res) => {
  const timelineHandle = req.body.handle;
  const requestMessage = reqMsgGetLayers(timelineHandle);

  createTcpClient(requestMessage, (data) => {
    console.log('Layers fetched successfully:', data.toString());
    res.json(JSON.parse(data.toString().replace('0xPX', '')));
  }, (err) => {
    console.error('Failed to fetch layers:', err);
    res.status(500).send('Failed to fetch layers');
  });
});

app.post('/get-resources', (req, res) => {
  const namePath = 'Live Inputs/Local/HDMI 2.0'; // Use your actual path here
  //const namePath = 'Media/Standard Content'; // Use your actual path here

  const requestMessage = reqMsgGetResourceFolderWithNamePath(namePath);

  createTcpClient(requestMessage, (folderData) => {
    const folderResult = JSON.parse(folderData.toString().replace('0xPX', ''));
    const folderHandle = folderResult.result;
    console.log("folderResult: ", folderResult);

    const resourcesRequestMessage = reqMsgGetResources(folderHandle);
    createTcpClient(resourcesRequestMessage, (resourcesData) => {
      console.log('Resources fetched successfully:', resourcesData.toString());
      res.json(JSON.parse(resourcesData.toString().replace('0xPX', '')));
    }, (err) => {
      console.error('Failed to fetch resources:', err);
      res.status(500).send('Failed to fetch resources');
    });
  }, (err) => {
    console.error('Failed to fetch resource folder:', err);
    res.status(500).send('Failed to fetch resource folder');
  });
});

app.post('/assign-resource', (req, res) => {
  const { layerHandle, resourceId } = req.body;
  const requestMessage = reqMsgAssignResource(layerHandle, resourceId);

  createTcpClient(requestMessage, (data) => {
    console.log('Resource assigned successfully');
    res.json({ message: 'Resource assigned successfully' });
  }, (err) => {
    console.error('Failed to assign resource:', err);
    res.status(500).send('Failed to assign resource');
  });
});

// Listen on configured port
app.listen(port, () => {
  console.log(`Express server running at http://localhost:${port}`);
});

// Handler functions
function handleGetTimelines(req, res) {
  const requestMessage = reqMsgGetTimelines();

  createTcpClient(requestMessage, (data) => {
    console.log('Received timeline data:', data.toString());
    res.json(JSON.parse(data.toString().replace('0xPX', '')));
  }, (err) => {
    res.status(500).send('Failed to fetch timelines');
  });
}

function handleGetTimelineName(req, res) {
  const requestMessage = reqMsgGetTimeineNames(req.body.handle)

  createTcpClient(requestMessage, (data) => {
    const timelineInfo = JSON.parse(JSON.parse(data.toString().replace('0xPX', '')).result);
    res.json({ name: timelineInfo.name });
  }, (err) => {
    res.status(500).send('Failed to fetch timeline name');
  });
}

function handleSetTransportmode(req, res) {
  const handle = req.body.handle; // Extract handle and mode from request body
  const mode = req.body.mode;
  console.log("handle: ", handle, " mode: ", mode);
  const requestMessage = reqMsgSetTransportmodeForTimeline(handle, mode);

  createTcpClient(requestMessage, (data) => {
    console.log('Transport mode set successfully:', data.toString());
    res.send('Transport mode updated');
  }, (err) => {
    res.status(500).send('Failed to set transport mode');
  });
}

function reqMsgGetTimelines() {
  return JSON.stringify({
    "jsonrpc": "2.0",
    "id": 341,
    "method": "Pixera.Timelines.getTimelines"
  }) + "0xPX";
}

function reqMsgGetTimeineNames(handle) {
  return JSON.stringify({
    "jsonrpc": "2.0",
    "id": 404,
    "method": "Pixera.Timelines.Timeline.getTimelineInfosAsJsonString",
    "params": { "handle": handle }
  }) + "0xPX";
}

function reqMsgSetTransportmodeForTimeline(handle, mode) {
  return JSON.stringify({
    "jsonrpc": "2.0",
    "id": 375,
    "method": "Pixera.Timelines.Timeline.setTransportMode",
    "params": {
      "handle": handle,
      "mode": mode
    }
  }) + "0xPX";
}

function reqMsgCreateTimeline() {
  return JSON.stringify({
    "jsonrpc": "2.0",
    "id": 343,
    "method": "Pixera.Timelines.createTimeline"
  }) + "0xPX";
}

function reqMsgCreateLayer(timelineHandle) {
  return JSON.stringify({
    "jsonrpc": "2.0",
    "id": 355,
    "method": "Pixera.Timelines.Timeline.createLayer",
    "params": { "handle": timelineHandle }
  }) + "0xPX";
}

function reqMsgGetLayers(handle) {
  return JSON.stringify({
    "jsonrpc": "2.0",
    "id": 350,
    "method": "Pixera.Timelines.Timeline.getLayers",
    "params": { "handle": handle }
  }) + "0xPX";
}

function reqMsgGetResourceFolderWithNamePath(namePath) {
  return JSON.stringify({
    "jsonrpc": "2.0",
    "id": 223,
    "method": "Pixera.Resources.getResourceFolderWithNamePath",
    "params": { "namePath": namePath }
  }) + "0xPX";
}

function reqMsgGetResources(handle) {
  return JSON.stringify({
    "jsonrpc": "2.0",
    "id": 230,
    "method": "Pixera.Resources.ResourceFolder.getResources",
    "params": { "handle": handle }
  }) + "0xPX";
}

function reqMsgAssignResource(layerHandle, resourceId) {
  return JSON.stringify({
    "jsonrpc": "2.0",
    "id": 441,
    "method": "Pixera.Timelines.Layer.assignResource",
    "params": { "handle": layerHandle, "id": resourceId }
  }) + "0xPX";
}

function reqMsgCreateClipAtTime(layerHandle) {
  return JSON.stringify({
    "jsonrpc": "2.0",
    "id": 449,
    "method": "Pixera.Timelines.Layer.createClipAtTime",
    "params": { "handle": layerHandle, "time": 0.0 }
  }) + "0xPX";
}
