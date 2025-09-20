const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,       // your live key id
  key_secret: process.env.RAZORPAY_KEY_SECRET // your live key secret
});

// Health check
app.get('/', (req, res) => res.send('WaveTravel Razorpay Backend is live!'));

// Create Razorpay order
app.post('/create-order', async (req, res) => {
  try {
    const { amount, currency, receipt } = req.body;

    if (!amount || !currency) {
      return res.status(400).json({ error: 'Amount and currency are required' });
    }

    const options = {
      amount: Number(amount), // in paise
      currency: currency,
      receipt: receipt || `rcpt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);

    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Start server
const PORT = process.env.PORT || 1000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
