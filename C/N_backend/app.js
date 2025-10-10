require('dotenv').config(); 

const express = require('express');
const cors = require('cors'); 
const authRoutes = require('./routes/auth'); 
const chatRoutes = require('./routes/chat'); 

const app = express();
const PORT = process.env.PORT || 3000; 

const corsOptions = {
    origin: 'http://localhost:8080', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', 
    credentials: true, 
    optionsSuccessStatus: 204 
};
app.use(cors(corsOptions)); 

app.use(express.json());

app.use('/api/auth', authRoutes); 
app.use('/api/chat', chatRoutes); 

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});