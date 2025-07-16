require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Конфигурация из переменных окружения
const {
  TOCHKA_CLIENT_ID,
  TOCHKA_CLIENT_SECRET,
  TOCHKA_API_URL = 'https://api.tochka.com',
  PORT = 3000
} = process.env;

// 1. Получение токена
app.post('/api/auth', async (req, res) => {
  try {
    const response = await axios.post(`${TOCHKA_API_URL}/connect/token`, 
      new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'payments'
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${TOCHKA_CLIENT_ID}:${TOCHKA_CLIENT_SECRET}`).toString('base64')}`
        }
      });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

// 2. Создание платежа
app.post('/api/payments', async (req, res) => {
  try {
    const { amount, contact, isEmail } = req.body;
    
    // Валидация
    if (!amount || amount < 1000) throw new Error('Минимальная сумма - 1000₽');
    
    const paymentData = {
      amount,
      currency: "RUB",
      payment_method: {
        type: isEmail ? "email" : "phone",
        value: isEmail ? contact : contact.replace('+7', '7')
      },
      purpose: "Оплата аренды автомобиля",
      fiscalization: {
        enabled: true,
        email: isEmail ? contact : null,
        phone: !isEmail ? contact.replace('+7', '7') : null
      }
    };

    const auth = await axios.post(`${TOCHKA_API_URL}/connect/token`, /*...*/);
    const response = await axios.post(`${TOCHKA_API_URL}/v2/payments`, paymentData, {
      headers: {
        'Authorization': `Bearer ${auth.data.access_token}`
      }
    });

    res.json(response.data);
  } catch (error) {
    res.status(400).json({ 
      error: error.response?.data?.error || error.message 
    });
  }
});

app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));