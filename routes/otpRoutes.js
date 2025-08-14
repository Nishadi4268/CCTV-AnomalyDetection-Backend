const express = require("express");
const nodemailer = require("nodemailer");
const User = require("../models/User"); // adjust path if needed

const router = express.Router();

router.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found");
      return res.status(404).json({ message: "Email not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Thabili App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP Code",
      text: `Your 6-digit OTP is: ${otp}`,
    });

    // ✅ Save OTP to user document
    user.otp = otp;
    await user.save();

console.log("Saved OTP to user:", user);
    console.log("OTP saved and email sent");
    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error sending OTP:", error.message);
    res.status(500).json({ message: "Failed to send OTP", error: error.message });
  }
});



router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("Stored OTP:", user.otp, "Received OTP:", otp);

    if (String(user.otp) !== String(otp)) {
      return res.status(401).json({ message: "Invalid OTP" });
    }

    user.otp = null;
    await user.save();

    res.status(200).json({ message: "OTP verified successfully" });

  } catch (error) {
    console.error("OTP verification error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});




module.exports = router;
