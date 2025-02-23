const express = require("express");
const { admin, db } = require("../config/firebaseConfig");

const router = express.Router();

// Function to send notification
const sendNotification = async (userId, title, body) => {
  try {
    // 1️⃣ Get user's FCM token from Firestore
    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists || !userSnap.data().fcmToken) {
      console.log("User FCM token not found.");
      return;
    }

    const deviceToken = userSnap.data().fcmToken;

    // 2️⃣ Prepare notification message
    const message = {
      token: deviceToken,
      notification: { title, body },
    };

    // 3️⃣ Send the notification
    await admin.messaging().send(message);
    console.log("Notification sent successfully!");
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

// Route to add a daily expense
router.post("/add-expense", async (req, res) => {
  const { userId, description, amount, category, date, month, year } = req.body;

  if (!userId || !description || !amount || !category || !date || !month || !year) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // 1️⃣ Find the budget inside `users/{userId}/budgets`
    const budgetRef = db
      .collection("users")
      .doc(userId)
      .collection("budgets")
      .where("month", "==", month)
      .where("year", "==", year);
    const budgetSnap = await budgetRef.get();

    if (budgetSnap.empty) {
      return res.status(404).json({ error: "Budget not found" });
    }

    const budgetDoc = budgetSnap.docs[0];
    const budgetData = budgetDoc.data();
    const { total, used } = budgetData;

    // 2️⃣ Store the expense in Firestore under `users/{userId}/expenses`
    const expenseData = {
      userId,
      description,
      amount,
      category,
      date: new Date(date),
    };

    const expenseRef = await db.collection("users").doc(userId).collection("expenses").add(expenseData);

    // 3️⃣ Update the budget's used amount
    const newUsedAmount = (used || 0) + amount;
    await budgetDoc.ref.update({ used: newUsedAmount });

    // 4️⃣ Check if used exceeds total & send notification
    if (newUsedAmount > total) {
      const title = "Budget Exceeded!";
      const body = `You've spent ${newUsedAmount} out of ${total} for ${month} ${year}. Reduce expenses!`;
      await sendNotification(userId, title, body);
    }

    res.status(200).json({ success: "Expense added!", expenseId: expenseRef.id });
  } catch (error) {
    console.error("Error adding expense:", error);
    res.status(500).json({ error: "Failed to add expense" });
  }
});

module.exports = router;
