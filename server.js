const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['https://wavetravel.vercel.app', 'http://localhost:3000', 'https://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Razorpay instance
const razorpay = new Razorpay({
  key_id: 'rzp_live_RJxLTulsCPKQqD',
  key_secret: process.env.RAZORPAY_KEY_SECRET // Store this in environment variables
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'WaveTravel Razorpay Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Create order endpoint
app.post('/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, notes } = req.body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount provided'
      });
    }

    // Create order options
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: notes || {}
    };

    console.log('Creating Razorpay order with options:', options);

    // Create order with Razorpay
    const order = await razorpay.orders.create(options);

    console.log('Order created successfully:', order.id);

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        created_at: order.created_at
      }
    });

  } catch (error) {
    console.error('Error creating order:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create order',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

// Verify payment endpoint
app.post('/verify-payment', async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      booking_details 
    } = req.body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment verification parameters'
      });
    }

    // Create signature for verification
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    console.log('Verifying payment signature...');
    console.log('Expected signature:', expectedSignature);
    console.log('Received signature:', razorpay_signature);

    // Verify signature
    const isSignatureValid = expectedSignature === razorpay_signature;

    if (!isSignatureValid) {
      console.error('Payment signature verification failed');
      return res.status(400).json({
        success: false,
        error: 'Payment signature verification failed'
      });
    }

    // Optional: Fetch payment details from Razorpay for additional verification
    try {
      const payment = await razorpay.payments.fetch(razorpay_payment_id);
      
      console.log('Payment verified successfully:', {
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        amount: payment.amount,
        status: payment.status
      });

      res.json({
        success: true,
        message: 'Payment verified successfully',
        payment: {
          id: payment.id,
          order_id: payment.order_id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          method: payment.method,
          created_at: payment.created_at
        }
      });

    } catch (paymentFetchError) {
      console.error('Error fetching payment details:', paymentFetchError);
      
      // Even if we can't fetch payment details, signature verification passed
      res.json({
        success: true,
        message: 'Payment verified successfully (signature valid)',
        payment: {
          id: razorpay_payment_id,
          order_id: razorpay_order_id
        }
      });
    }

  } catch (error) {
    console.error('Error verifying payment:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify payment',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

// Get order details endpoint
app.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    const order = await razorpay.orders.fetch(orderId);

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        created_at: order.created_at,
        notes: order.notes
      }
    });

  } catch (error) {
    console.error('Error fetching order:', error);
    
    if (error.statusCode === 400) {
      res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch order'
      });
    }
  }
});

// Get payment details endpoint
app.get('/payment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'Payment ID is required'
      });
    }

    const payment = await razorpay.payments.fetch(paymentId);

    res.json({
      success: true,
      payment: {
        id: payment.id,
        order_id: payment.order_id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        created_at: payment.created_at,
        captured: payment.captured
      }
    });

  } catch (error) {
    console.error('Error fetching payment:', error);
    
    if (error.statusCode === 400) {
      res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch payment'
      });
    }
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    available_endpoints: [
      'POST /create-order',
      'POST /verify-payment',
      'GET /order/:orderId',
      'GET /payment/:paymentId'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`🚀 WaveTravel Razorpay Backend running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/`);
  console.log(`💳 Razorpay Key ID: rzp_live_RJxLTulsCPKQqD`);
});

module.exports = app;
