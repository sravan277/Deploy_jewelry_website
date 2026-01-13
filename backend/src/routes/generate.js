import express from 'express';
import multer from 'multer';
import { auth } from '../middleware/auth.js';
import axios from 'axios';
import FormData from 'form-data';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// This function forwards the request to the Python ML service
const forwardToMlService = async (req, res) => {
  try {
    console.log('\n=== Node.js Generate Route Called ===');
    console.log('User:', req.user);
    
    if (!req.file) {
      console.log('ERROR: No file in request');
      return res.status(400).json({ error: 'No image file provided.' });
    }

    console.log('File received:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    // Get description from request body, default to "beautiful gold jewelry" if not provided
    const description = req.body.description || 'beautiful gold jewelry';
    console.log('Description:', description);

    const form = new FormData();
    form.append('file', req.file.buffer, { 
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });
    form.append('description', description);

    console.log(`Forwarding to Flask at ${process.env.ML_SERVICE_URL}/api/generate`);

    // Call the Python Flask server
    const flaskResponse = await axios.post(`${process.env.ML_SERVICE_URL}/api/generate`, form, {
      headers: {
        ...form.getHeaders(),
      },
      responseType: 'arraybuffer',
      timeout: 120000, // 2 minutes for AI processing
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    console.log('Flask response received:', {
      status: flaskResponse.status,
      contentType: flaskResponse.headers['content-type'],
      dataSize: flaskResponse.data.length
    });

    // Send the generated image back to the frontend
    res.set('Content-Type', 'image/png');
    res.send(flaskResponse.data);
    
    console.log('✓ Successfully sent image to frontend');

  } catch (error) {
    console.error('\n✗ ERROR in forwardToMlService:');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    
    if (error.response) {
      // The Flask server responded with an error
      console.error('Flask server error response:');
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
      console.error('Data:', error.response.data);
      
      // Try to parse error data if it's JSON
      try {
        const errorData = JSON.parse(error.response.data.toString());
        return res.status(error.response.status).json({
          error: 'Error from ML service',
          details: errorData
        });
      } catch (parseError) {
        return res.status(error.response.status).json({
          error: 'Error from ML service',
          details: error.response.data.toString()
        });
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from Flask server');
      console.error('Request details:', error.request);
      return res.status(503).json({ 
        error: 'ML service is not responding. Is the Flask server running on port 4000?',
        details: 'Please ensure the Python Flask server is running with: python app.py'
      });
    } else {
      // Something else happened
      console.error('Error details:', error);
      console.error('Stack trace:', error.stack);
      return res.status(500).json({ 
        error: 'Error generating image via ML service.',
        details: error.message
      });
    }
  }
};

// Single route for all generation requests
// POST /api/generate
router.post('/', auth, upload.single('file'), (req, res) => {
  forwardToMlService(req, res);
});

export default router;