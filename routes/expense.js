const express = require("express");
const { admin, db } = require("../config/firebaseConfig");

const router = express.Router();

// Function to save notification history
const saveNotificationHistory = async (userId, title, body) => {
  try {
    // 1️⃣ Create a new document in the notification history collection
    const notificationRef = db.collection("notifications").doc();
    const timestamp = new Date().toISOString();

    const notificationData = {
      userId,
      title,
      body,
      timestamp,
    };

    await notificationRef.set(notificationData);
    console.log("📝 Notification history saved:", notificationData);
  } catch (error) {
    console.error("Error saving notification history:", error);
  }
};

// Function to send notification
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
    console.log("Notification sent successfully!");

    await saveNotificationHistory(userId, title, body);
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

// Route to add an expense & update budget dynamically
router.post("/add-expense", async (req, res) => {
  const { userId, description, amount, category, date } = req.body;

  if (!userId || !description || !amount || !category || !date) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Extract month and year from the date
    const expenseDate = new Date(date);
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthIndex = expenseDate.getMonth(); // Get month index (0-11)
    const monthName = monthNames[monthIndex]; // Get month name
    const year = expenseDate.getFullYear();
    
    // 1️⃣ Find the budget inside `users/{userId}/budgets`
    const budgetRef = db
      .collection("users")
      .doc(userId)
      .collection("budgets")
      .where("month", "==", monthName)
      .where("year", "==", year);

    const budgetSnap = await budgetRef.get();

    if (budgetSnap.empty) {
      return res.status(404).json({ error: "Budget not found" });
    }

    const budgetDoc = budgetSnap.docs[0];
    const budgetData = budgetDoc.data();
    const { total, used = 0 } = budgetData; // Default used to 0 if not set
    console.log("Budget found:", budgetData);

    // 2️⃣ Add the expense under `users/{userId}/expenses`
    const expenseData = {
      userId,
      description,
      amount,
      category,
      date: new Date(date),
      timestamp: new Date().toISOString(),
    };

    const expenseRef = await db.collection("users").doc(userId).collection("expenses").add(expenseData);

    // Add the document ID as the 'id' field in the expense data
    const expenseId = expenseRef.id;
    await expenseRef.update({ id: expenseId });

    // 3️⃣ Dynamically update the budget's used amount
    const newUsedAmount = used + amount;
    await budgetDoc.ref.update({ used: newUsedAmount });

    // 4️⃣ Compare `used` and `total`, send notification if exceeded
    if (newUsedAmount > total) {
      const title = "⚠️ Budget Exceeded!";
      const body = `You've spent ${newUsedAmount} out of ${total} for ${monthName} ${year}. Consider reducing expenses.`;
      await sendNotification(userId, title, body);
    }

    res.status(200).json({ success: "Expense added & budget updated!", expenseId: expenseRef.id });
  } catch (error) {
    console.error("Error adding expense:", error);
    res.status(500).json({ error: "Failed to add expense" });
  }
});

module.exports = { router, saveNotificationHistory };

