var admin = require("firebase-admin");
var serviceAccount = require("./serviceAccountKey.json");
const express = require('express');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
app.use(express.json());

// Endpoint to receive device tokens
app.post('/register-token', (req, res) => {
  const deviceToken = req.body.device_token;
  console.log('Received device token:', deviceToken);

  // Save the token to a database or in-memory storage
  // (e.g., for later use when sending notifications)

  res.status(200).send('Token received');
});

// Endpoint to send FCM notifications
app.post('/send-notification', async (req, res) => {
  const { deviceToken, title, body } = req.body;

  const message = {
    token: deviceToken,
    notification: {
      title: title,
      body: body,
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    res.status(200).send('Notification sent');
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).send('Failed to send notification');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
