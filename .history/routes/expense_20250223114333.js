const express = require("express");
const { admin, db } = require("../config/firebaseConfig");

const router = express.Router();

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
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

// Route to add an expense & update budget dynamically
router.post("/add-expense", async (req, res) => {
  const { userId, description, amount, category, date, month, year, budgetId } = req.body;

  if (!userId || !description || !amount || !category || !date || !month || !year || !budgetId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // 1️⃣ Find the budget inside `users/{userId}/budgets`
    const budgetRef = db
      .collection("users")
      .doc(userId)
      .collection("budgets")
      .doc(budgetId);

    const budgetDoc = await budgetRef.get();

    if (!budgetDoc.empty) {
      return res.status(404).json({ error: "Budget not found" });
    }
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
    };

    const expenseRef = await db.collection("users").doc(userId).collection("expenses").add(expenseData);

    // 3️⃣ Dynamically update the budget's used amount
    const newUsedAmount = used + amount;
    await budgetDoc.ref.update({ used: newUsedAmount });

    // 4️⃣ Compare `used` and `total`, send notification if exceeded
    if (newUsedAmount > total) {
      const title = "⚠️ Budget Exceeded!";
      const body = `You've spent ${newUsedAmount} out of ${total} for ${month} ${year}. Consider reducing expenses.`;
      await sendNotification(userId, title, body);
    }

    const updatedBudgetDoc = await budgetRef.get();
    console.log("Budget updated:", updatedBudgetDoc.data());

    res.status(200).json({ success: "Expense added & budget updated!", expenseId: expenseRef.id });
  } catch (error) {
    console.error("Error adding expense:", error);
    res.status(500).json({ error: "Failed to add expense" });
  }
});

module.exports = router;
