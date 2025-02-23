const express = require("express");
const cron = require("node-cron");
const { admin, db } = require("../config/firebaseConfig");

const router = express.Router();

// Function to send notifications
const sendNotification = async (userId, title, body) => {
  try {
    // 1️⃣ Get the user's FCM token
    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists || !userSnap.data().fcmToken) {
      console.log("User FCM token not found.");
      return;
    }

    const deviceToken = userSnap.data().fcmToken;

    // 2️⃣ Prepare the notification
    const message = {
      token: deviceToken,
      notification: { title, body },
    };

    // 3️⃣ Send the notification
    await admin.messaging().send(message);
    console.log(`📩 Notification sent to ${userId}: ${title}`);
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

// Function to check reminders and send notifications
const checkReminders = async () => {
  try {
    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, "0");
    const currentMinute = String(now.getMinutes()).padStart(2, "0");
    const currentTime = `${currentHour}:${currentMinute}`;

    console.log("⏳ Checking reminders for:", currentTime);

    // Fetch reminders matching the current time
    const remindersSnap = await db.collection("reminders").where("time", "==", currentTime).get();

    if (remindersSnap.empty) {
      console.log("✅ No reminders at this time.");
      return;
    }

    remindersSnap.forEach(async (doc) => {
      const reminder = doc.data();
      const { userId, name, repeat } = reminder;

      // Check if notification should be sent
      if (shouldSendNotification(now, repeat)) {
        const title = "⏰ Reminder Notification";
        const body = `Don't forget: ${name}`;
        await sendNotification(userId, title, body);
      }
    });
  } catch (error) {
    console.error("Error checking reminders:", error);
  }
};

// Function to check repeat conditions
const shouldSendNotification = (now, repeat) => {
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const dayOfMonth = now.getDate();

  switch (repeat) {
    case "daily":
      return true; // Always send
    case "weekly":
      return dayOfWeek === 0; // Send every Sunday
    case "monthly":
      return dayOfMonth === 1; // Send on the 1st of every month
    default:
      return false;
  }
};

// Schedule the reminder checker to run every minute
cron.schedule("* * * * *", async () => {
  console.log("🔄 Running reminder check...");
  await checkReminders();
});

// Export the router
module.exports = router;
