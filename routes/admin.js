const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const supabase = require('../config/supabase');

// Path to store jobs data
const jobsDataPath = path.join(__dirname, '../data/jobs.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize jobs file if it doesn't exist
if (!fs.existsSync(jobsDataPath)) {
  fs.writeFileSync(jobsDataPath, JSON.stringify([], null, 2));
}

// Helper function to read jobs
function readJobs() {
  try {
    const data = fs.readFileSync(jobsDataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading jobs:', error);
    return [];
  }
}

// Helper function to write jobs
function writeJobs(jobs) {
  try {
    fs.writeFileSync(jobsDataPath, JSON.stringify(jobs, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing jobs:', error);
    return false;
  }
}

// Get all jobs
router.get('/jobs', async (req, res) => {
  try {
    const jobs = readJobs();
    res.json({ jobs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Add new job
router.post('/jobs', async (req, res) => {
  try {
    const {
      title,
      company,
      location,
      state,
      type,
      category,
      salary,
      description,
      tags
    } = req.body;

    // Validate required fields
    if (!title || !company || !location || !state || !type || !category || !salary || !description) {
      return res.status(400).json({ error: 'All required fields must be filled' });
    }

    const jobs = readJobs();
    
    // Generate new ID - start from 1000 to avoid conflicts with hardcoded jobs (1-36)
    const newId = jobs.length > 0 ? Math.max(...jobs.map(j => j.id)) + 1 : 1000;

    const newJob = {
      id: newId,
      title,
      company,
      location,
      state,
      type,
      category,
      salary,
      description,
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',') : [])
    };

    jobs.push(newJob);
    
    if (writeJobs(jobs)) {
      res.json({ 
        message: 'Job added successfully!',
        job: newJob
      });
    } else {
      res.status(500).json({ error: 'Failed to save job' });
    }

  } catch (error) {
    console.error('Error adding job:', error);
    res.status(500).json({ error: 'Failed to add job' });
  }
});

// Delete job
router.delete('/jobs/:id', async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    const jobs = readJobs();
    
    const filteredJobs = jobs.filter(job => job.id !== jobId);
    
    if (jobs.length === filteredJobs.length) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (writeJobs(filteredJobs)) {
      res.json({ message: 'Job deleted successfully!' });
    } else {
      res.status(500).json({ error: 'Failed to delete job' });
    }

  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// Update job
router.put('/jobs/:id', async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    const jobs = readJobs();
    
    const jobIndex = jobs.findIndex(job => job.id === jobId);
    
    if (jobIndex === -1) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const updatedJob = {
      ...jobs[jobIndex],
      ...req.body,
      id: jobId // Ensure ID doesn't change
    };

    jobs[jobIndex] = updatedJob;
    
    if (writeJobs(jobs)) {
      res.json({ 
        message: 'Job updated successfully!',
        job: updatedJob
      });
    } else {
      res.status(500).json({ error: 'Failed to update job' });
    }

  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

module.exports = router;

