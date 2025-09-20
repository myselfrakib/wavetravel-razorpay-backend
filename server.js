// server.js — Razorpay order server for mobile web / intent flow
const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());                // allow cross-origin requests
app.use(express.json());        // parse JSON bodies

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RZP_KEY_ID,       // your Razorpay public key
  key_secret: process.env.RZP_KEY_SECRET // your Razorpay secret key
});

// Health check endpoint
app.get('/', (req, res) => res.send('Razorpay Order Server is running'));

// Create Order endpoint
app.post('/create-order', async (req, res) => {
  try {
    const amount = req.body.amount; // amount in paise
    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const options = {
      amount: parseInt(amount, 10), // Razorpay expects integer in paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      payment_capture: 1 // auto-capture payment
    };

    const order = await razorpay.orders.create(options);

    res.json(order); // return order object to client
  } catch (err) {
    console.error('Error creating Razorpay order:', err);
    res.status(500).json({ error: 'Order creation failed' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Razorpay Order Server running on port ${PORT}`));
