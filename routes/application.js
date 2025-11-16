const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../public/uploads/resumes');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp + original name
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
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Create transporter for sending emails
// Note: You'll need to configure this with your email service
const transporter = nodemailer.createTransport({
  service: 'gmail', // You can use other services like 'outlook', 'yahoo', etc.
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com', // Your email
    pass: process.env.EMAIL_PASS || 'your-app-password' // Your app password
  }
});

// Application submission route
router.post('/apply', upload.single('resumeFile'), async (req, res) => {
  try {
    const {
      jobId,
      jobTitle,
      companyName,
      applicantName,
      applicantEmail,
      applicantPhone,
      applicantLocation,
      coverLetter
    } = req.body;

    // Validate required fields
    if (!jobTitle || !applicantName || !applicantEmail || !applicantPhone || !coverLetter) {
      // Delete uploaded file if validation fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'All required fields must be filled' });
    }

    // Get resume file info if uploaded
    let resumeInfo = null;
    if (req.file) {
      resumeInfo = {
        filename: req.file.filename,
        originalname: req.file.originalname,
        path: req.file.path,
        size: req.file.size
      };
    }

    // Email content for applicant
    const applicantMailOptions = {
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: applicantEmail,
      subject: `Application Confirmation - ${jobTitle} at ${companyName}`,
      attachments: resumeInfo ? [{
        filename: resumeInfo.originalname,
        path: resumeInfo.path
      }] : [],
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">Application Received!</h2>
          <p>Dear ${applicantName},</p>
          <p>Thank you for applying for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.</p>
          <p>We have received your application and will review it shortly. You will hear from us soon.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <h3>Application Details:</h3>
          <ul style="line-height: 1.8;">
            <li><strong>Position:</strong> ${jobTitle}</li>
            <li><strong>Company:</strong> ${companyName}</li>
            <li><strong>Your Name:</strong> ${applicantName}</li>
            <li><strong>Email:</strong> ${applicantEmail}</li>
            <li><strong>Phone:</strong> ${applicantPhone}</li>
            <li><strong>Location:</strong> ${applicantLocation}</li>
            ${resumeInfo ? `<li><strong>Resume:</strong> Attached (${resumeInfo.originalname})</li>` : ''}
          </ul>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <h3>Your Cover Letter:</h3>
          <p style="background: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${coverLetter}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 14px;">Best regards,<br>JobFinder Team</p>
        </div>
      `
    };

    // Email content for employer (you can change this email)
    const employerEmail = process.env.EMPLOYER_EMAIL || applicantEmail; // Change this to employer's email
    const employerMailOptions = {
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: employerEmail,
      subject: `New Job Application - ${jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">New Job Application Received</h2>
          <p>You have received a new application for the position: <strong>${jobTitle}</strong></p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <h3>Applicant Information:</h3>
          <ul style="line-height: 1.8;">
            <li><strong>Name:</strong> ${applicantName}</li>
            <li><strong>Email:</strong> ${applicantEmail}</li>
            <li><strong>Phone:</strong> ${applicantPhone}</li>
            <li><strong>Location:</strong> ${applicantLocation}</li>
            ${resumeInfo ? `<li><strong>Resume:</strong> Attached (${resumeInfo.originalname})</li>` : ''}
          </ul>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <h3>Cover Letter:</h3>
          <p style="background: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${coverLetter}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 14px;">This is an automated email from JobFinder.</p>
        </div>
      `,
      attachments: resumeInfo ? [{
        filename: resumeInfo.originalname,
        path: resumeInfo.path
      }] : []
    };

    // Send emails
    await transporter.sendMail(applicantMailOptions);
    await transporter.sendMail(employerMailOptions);

    // Clean up: Delete file after sending (optional - you might want to keep it)
    // if (resumeInfo) {
    //   fs.unlinkSync(resumeInfo.path);
    // }

    res.json({ 
      message: 'Application submitted successfully! Check your email for confirmation.',
      success: true 
    });

  } catch (error) {
    console.error('Error sending email:', error);
    
    // Delete uploaded file if error occurs
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to submit application. Please try again later.',
      details: error.message 
    });
  }
});

module.exports = router;

