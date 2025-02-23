const express = require("express");
const { admin, db } = require("../config/firebaseConfig");

const router = express.Router();

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

// Route to add an expense and check budget
router.post("/add-expense", async (req, res) => {
    const { userId, amount } = req.body;
  
    if (!userId || !amount) {
      return res.status(400).json({ error: "Missing userId or amount" });
    }
  
    try {
      // Get user's budget info from Firestore
      const userRef = db.collection("users").doc(userId);
      const userSnap = await userRef.get();
  
      if (!userSnap.exists) {
        return res.status(404).json({ error: "User not found" });
      }
  
      const userData = userSnap.data();
      const { budgetTotal, usedAmount, deviceToken } = userData;
  
      // Update usedAmount
      const newUsedAmount = (usedAmount || 0) + amount;
      await userRef.update({ usedAmount: newUsedAmount });
  
      // Check if the newUsedAmount exceeds budgetTotal
      if (newUsedAmount > budgetTotal) {
        const title = "Budget Limit Exceeded!";
        const body = `You've spent ${newUsedAmount} out of ${budgetTotal}. Reduce expenses!`;
  
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
