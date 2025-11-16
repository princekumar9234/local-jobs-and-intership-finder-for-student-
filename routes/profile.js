const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const MAX_UPLOAD_MB = parseInt(process.env.MAX_UPLOAD_MB || '25');
const supabase = require('../config/supabase');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../public/uploads/resumes');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for resume upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: userId_timestamp_originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

// File filter - only allow PDF, DOC, DOCX
const fileFilter = (req, file, cb) => {
  const allowedTypes = /\.(pdf|doc|docx)$/i;
  const extname = allowedTypes.test(path.extname(file.originalname));
  const mimetype = file.mimetype === 'application/pdf' || 
                   file.mimetype === 'application/msword' ||
                   file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, and DOCX files are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_UPLOAD_MB * 1024 * 1024
  },
  fileFilter: fileFilter
});

// Upload resume route
router.post('/upload-resume', upload.single('resumeFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get user from request (you might need to add authentication middleware)
    // For now, we'll use the filename to identify user
    const resumeUrl = `/uploads/resumes/${req.file.filename}`;
    
    res.json({ 
      message: 'Resume uploaded successfully!',
      resumeUrl: resumeUrl,
      filename: req.file.filename
    });

  } catch (error) {
    console.error('Error uploading resume:', error);
    
    // Delete uploaded file if error occurs
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to upload resume. Please try again later.',
      details: error.message 
    });
  }
});

// Update profile route
router.post('/update', async (req, res) => {
  try {
    const { firstName, lastName, phone, education, skills, location } = req.body;

    // Note: This route would need authentication middleware
    // For now, we'll return success
    res.json({ 
      message: 'Profile updated successfully!',
      data: { firstName, lastName, phone, education, skills, location }
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ 
      error: 'Failed to update profile. Please try again later.',
      details: error.message 
    });
  }
});

module.exports = router;

