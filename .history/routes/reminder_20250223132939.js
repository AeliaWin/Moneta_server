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

const convertTo24HourFormat = (time12hr) => {
    const [time, modifier] = time12hr.split(" ");
    let [hours, minutes] = time.split(":");

    if (modifier === "PM" && hours !== 12) {
        hours = parseInt(hours) +12;
    } else if (modifier === "AM" && hours === 12) {
        hours = "00";
    }
    return `${hours}:${minutes}`;
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
    const remindersSnap = await db.collection("reminders").get();

    if (remindersSnap.empty) {
      console.log("✅ No reminders at this time.");
      return;
    }

    remindersSnap.forEach(async (doc) => {
      const reminder = doc.data();
      const { userId, name,time, repeat } = reminder;

      const reminderTime24Hr = convertTo24HourFormat(time);
      if (currentTime === reminderTime24Hr) {
        if (shouldSendNotification(now, repeat)) {
          const title = `⏰ ${name}!`;
          const body = "Time to record your accounts!";
          await sendNotification(userId, title, body);
        }
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
    case "Daily":
      return true; // Always send
    case "Weekly":
      return dayOfWeek === 0; // Send every Sunday
    case "Monthly":
      return dayOfMonth === 1; // Send on the 1st of every month
    case "Yearly":
        return dayOfMonth === 1 && now.getMonth() === 0; // Send on Jan 1st
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
