const express = require("express");
const admin = require("../config/firebaseConfig");

const router = express.Router();

router.post("/send-notification", async (req, res) => {
  const { deviceToken, title, body } = req.body;

  if (!deviceToken || !title || !body) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const message = {
    token: deviceToken,
    notification: {
      title: title,
      body: body,
    },
  };

  try {
    await admin.messaging().send(message);
    res.status(200).json({ success: "Notification sent successfully!" });
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({ error: "Failed to send notification" });
  }
});

module.exports = router;
