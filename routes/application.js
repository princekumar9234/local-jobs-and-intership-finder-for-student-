const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const supabase = require('../config/supabase');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const MAX_UPLOAD_MB = parseInt(process.env.MAX_UPLOAD_MB || '25');
const localBaseDir = path.join(__dirname, '../data/local_storage');
const localResumesDir = path.join(localBaseDir, 'resumes');
const localApplicationsDir = path.join(localBaseDir, 'applications');
const applicationsDataPath = path.join(__dirname, '../data/applications.json');
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(localBaseDir)) {
  fs.mkdirSync(localBaseDir, { recursive: true });
}
if (!fs.existsSync(localResumesDir)) {
  fs.mkdirSync(localResumesDir, { recursive: true });
}
if (!fs.existsSync(localApplicationsDir)) {
  fs.mkdirSync(localApplicationsDir, { recursive: true });
}
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(applicationsDataPath)) {
  fs.writeFileSync(applicationsDataPath, JSON.stringify([], null, 2));
}

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
    fileSize: MAX_UPLOAD_MB * 1024 * 1024
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

    let resumeInfo = null;
    let supabaseResumePath = null;
    let supabaseApplicationPath = null;
    const uploadErrors = [];
    let applicationData = null;

    async function ensureBuckets() {
      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const names = (buckets || []).map(b => b.name);
        if (!names.includes('resumes')) {
          await supabase.storage.createBucket('resumes', { public: false });
        }
        if (!names.includes('applications')) {
          await supabase.storage.createBucket('applications', { public: false });
        }
      } catch (e) {}
    }

    await ensureBuckets();
    if (req.file) {
      resumeInfo = {
        filename: req.file.filename,
        originalname: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      };
      try {
        const fileBuffer = fs.readFileSync(req.file.path);
        const resumeStoragePath = `resumes/${Date.now()}-${(applicantEmail || 'unknown').replace(/[^a-zA-Z0-9@._-]/g, '')}-${req.file.originalname}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(resumeStoragePath, fileBuffer, { contentType: req.file.mimetype });
        if (uploadError) {
          console.error('Supabase resume upload error:', uploadError.message);
          uploadErrors.push({ stage: 'resume', message: uploadError.message || 'Unknown error' });
        } else {
          supabaseResumePath = uploadData.path;
        }
      } catch (e) {
        console.error('Resume upload processing error:', e.message);
        uploadErrors.push({ stage: 'resume', message: e.message || 'Processing error' });
      }
    }

    try {
      applicationData = {
        jobId: jobId || null,
        jobTitle,
        companyName,
        applicantName,
        applicantEmail,
        applicantPhone,
        applicantLocation,
        coverLetter,
        resume: {
          originalname: resumeInfo?.originalname || null,
          size: resumeInfo?.size || null,
          mimetype: resumeInfo?.mimetype || null,
          supabasePath: supabaseResumePath
        },
        submittedAt: new Date().toISOString()
      };
      const jsonBuffer = Buffer.from(JSON.stringify(applicationData));
      const applicationStoragePath = `applications/${Date.now()}-${(applicantEmail || 'unknown').replace(/[^a-zA-Z0-9@._-]/g, '')}-${(jobTitle || 'job').replace(/[^a-zA-Z0-9._-]/g, '_')}.json`;
      const { data: appUploadData, error: appUploadError } = await supabase.storage
        .from('applications')
        .upload(applicationStoragePath, jsonBuffer, { contentType: 'application/json' });
      if (appUploadError) {
        console.error('Supabase application JSON upload error:', appUploadError.message);
        uploadErrors.push({ stage: 'application_json', message: appUploadError.message || 'Unknown error' });
      } else {
        supabaseApplicationPath = appUploadData.path;
      }
    } catch (e) {
      console.error('Application JSON upload error:', e.message);
      uploadErrors.push({ stage: 'application_json', message: e.message || 'Processing error' });
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

    let emailOk = true;
    try {
      await transporter.sendMail(applicantMailOptions);
      await transporter.sendMail(employerMailOptions);
    } catch (emailErr) {
      emailOk = false;
      console.error('Email send failure:', emailErr.message);
    }

    // Clean up: Delete file after sending (optional - you might want to keep it)
    // if (resumeInfo) {
    //   fs.unlinkSync(resumeInfo.path);
    // }

    if (!supabaseResumePath && !supabaseApplicationPath) {
      try {
        let localResumePath = null;
        if (req.file) {
          const destResume = path.join(localResumesDir, req.file.filename);
          fs.copyFileSync(req.file.path, destResume);
          localResumePath = destResume;
        }
        const appFileName = `${Date.now()}-${(applicantEmail || 'unknown').replace(/[^a-zA-Z0-9@._-]/g, '')}-${(jobTitle || 'job').replace(/[^a-zA-Z0-9._-]/g, '_')}.json`;
        const destApp = path.join(localApplicationsDir, appFileName);
        const localData = {
          ...applicationData,
          resume: {
            ...applicationData.resume,
            localPath: localResumePath
          }
        };
        fs.writeFileSync(destApp, JSON.stringify(localData));
        supabaseResumePath = localResumePath ? `local:${localResumePath}` : null;
        supabaseApplicationPath = `local:${destApp}`;
      } catch (e) {
        return res.status(500).json({ 
          error: 'Failed to store application in Supabase storage',
          details: 'Resume and application JSON uploads failed',
          errors: uploadErrors,
          fallbackError: e.message
        });
      }
    }

    res.json({ 
      message: 'Application submitted successfully',
      success: true,
      storage: {
        resumePath: supabaseResumePath || null,
        applicationPath: supabaseApplicationPath || null
      },
      emailSent: emailOk
    });

    try {
      const raw = fs.readFileSync(applicationsDataPath, 'utf8');
      const list = JSON.parse(raw || '[]');
      const id = `${Date.now()}-${Math.floor(Math.random()*1e9)}`;
      const item = {
        id,
        status: 'pending',
        createdAt: new Date().toISOString(),
        jobId: jobId?.toString() || null,
        jobTitle,
        companyName,
        applicantName,
        applicantEmail,
        applicantPhone,
        applicantLocation,
        coverLetter,
        storage: {
          resumePath: supabaseResumePath || null,
          applicationPath: supabaseApplicationPath || null
        },
        updatedAt: new Date().toISOString()
      };
      list.push(item);
      fs.writeFileSync(applicationsDataPath, JSON.stringify(list, null, 2));
    } catch (e) {}

  } catch (error) {
    console.error('Application submission error:', error);
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    res.status(500).json({ 
      error: 'Failed to submit application',
      details: error.message 
    });
  }
});

module.exports = router;

