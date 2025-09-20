require('dotenv').config();
const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Health check
app.get('/', (req, res) => {
  res.send('WaveTravel Razorpay backend running!');
});

// Create order endpoint
app.post('/create-order', async (req, res) => {
  const { amount } = req.body;
  if (!amount || isNaN(amount)) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    const order = await razorpay.orders.create({
      amount: amount * 100, // amount in paise
      currency: 'INR',
      payment_capture: 1
    });
    res.json(order);
  } catch (err) {
    console.error('Razorpay order creation failed:', err);
    res.status(500).json({ error: 'Order creation failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
