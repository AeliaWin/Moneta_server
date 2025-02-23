const express = require("express");
const { admin, db } = require("../config/firebaseConfig");

const router = express.Router();

// Function to send notification
const sendNotification = async (deviceToken, title, body) => {
  if (!deviceToken) return;

  const message = {
    token: deviceToken,
    notification: { title, body },
  };

  try {
    await admin.messaging().send(message);
    console.log("Notification sent successfully!");
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

// Route to add an expense for a specific month & year
router.post("/add-expense", async (req, res) => {
  const { month, year, amount } = req.body;

  if (!month || !year || !amount) {
    return res.status(400).json({ error: "Missing month, year, or amount" });
  }

  try {
    // Find the budget document for the specified month & year
    const budgetRef = db
      .collection("budgets")
      .where("month", "==", month)
      .where("year", "==", year);
    const budgetSnap = await budgetRef.get();

    if (budgetSnap.empty) {
      return res.status(404).json({ error: "Budget not found" });
    }

    // Get the first document (assuming one budget per month)
    const budgetDoc = budgetSnap.docs[0];
    const budgetData = budgetDoc.data();
    const { total, used, deviceToken } = budgetData;

    // Update used amount
    const newUsedAmount = (used || 0) + amount;
    await budgetDoc.ref.update({ used: newUsedAmount });

    // Check if the used amount exceeds total
    if (newUsedAmount > total) {
      const title = "Budget Limit Exceeded!";
      const body = `You've spent ${newUsedAmount} out of ${total} for ${month} ${year}. Reduce expenses!`;

      // Send notification
      await sendNotification(deviceToken, title, body);
    }

    res.status(200).json({ success: "Expense added successfully!" });
  } catch (error) {
    console.error("Error adding expense:", error);
    res.status(500).json({ error: "Failed to add expense" });
  }
});

module.exports = router;
